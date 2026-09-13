import { ExactEvmScheme } from '@x402/evm/exact/client';
import {
  wrapFetchWithPayment,
  x402Client,
  type PaymentPolicy,
  type PaymentRequirements,
} from '@x402/fetch';
import { privateKeyToAccount } from 'viem/accounts';

/** Headless's published Option A terms (/.well-known/x402.json, 2026-09-08). */
export const HEADLESS_X402_NETWORK = 'eip155:8453' as const;
export const HEADLESS_X402_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const HEADLESS_X402_PAY_TO = '0x26D4Ffe98017D2f160E2dAaE9d119e3d8b860AD3';
export const HEADLESS_X402_AMOUNT_ATOMIC = '1000'; // 0.001 USDC

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

/**
 * Payment policy for the production market-state endpoint.
 *
 * A 402 response is untrusted input. Never let it redirect the payer to a
 * different network, asset, recipient, scheme, or amount. If Headless rotates
 * any published payment term, this intentionally fails closed until the new
 * declaration is independently reviewed and this allowlist is updated.
 */
export const selectHeadlessOptionAPayment: PaymentPolicy = (
  x402Version,
  requirements
): PaymentRequirements[] => {
  if (x402Version !== 2) return [];
  return requirements.filter(
    (requirement) =>
      requirement.scheme === 'exact' &&
      requirement.network === HEADLESS_X402_NETWORK &&
      sameAddress(requirement.asset, HEADLESS_X402_USDC) &&
      sameAddress(requirement.payTo, HEADLESS_X402_PAY_TO) &&
      requirement.amount === HEADLESS_X402_AMOUNT_ATOMIC
  );
};

function getDedicatedPayerPrivateKey(): `0x${string}` {
  const raw = process.env.HEADLESS_X402_PRIVATE_KEY?.trim();
  if (!raw) {
    throw new Error('HEADLESS_X402_PRIVATE_KEY is required when HEADLESS_X402_ENABLED=true');
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error('HEADLESS_X402_PRIVATE_KEY must be a 32-byte 0x-prefixed hex key');
  }
  return raw as `0x${string}`;
}

/**
 * Return native fetch during the trial/bridge-key phase, or a stock x402 2.x
 * fetch client when the operator explicitly enables payment.
 *
 * Enabling this on an anonymous public route lets callers trigger real spend.
 * Use a dedicated, balance-limited payer wallet and an operator-approved
 * cumulative budget; never reuse an attestation or treasury key.
 */
export function getHeadlessStatusFetch(
  baseFetch: typeof globalThis.fetch = globalThis.fetch
): typeof globalThis.fetch {
  if (process.env.HEADLESS_X402_ENABLED !== 'true') return baseFetch;

  const signer = privateKeyToAccount(getDedicatedPayerPrivateKey());
  const client = x402Client.fromConfig({
    schemes: [
      {
        network: HEADLESS_X402_NETWORK,
        client: new ExactEvmScheme(signer),
        x402Version: 2,
      },
    ],
    // The SDK rejects even recognized USD assets above this amount before our
    // stricter full-term policy runs.
    spendControls: { maxAmountPerPayment: '$0.001' },
    policies: [selectHeadlessOptionAPayment],
  });

  return wrapFetchWithPayment(baseFetch, client);
}

/** Optional bridge/API key offered by Headless while the payer is wired. */
export function getHeadlessRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = { accept: 'application/json' };
  const apiKey = process.env.HEADLESS_ORACLE_API_KEY?.trim();
  if (apiKey) headers['X-Oracle-Key'] = apiKey;
  return headers;
}
