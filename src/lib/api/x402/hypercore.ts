/**
 * Server-only client for the self-hosted HyperCore x402 facilitator. Core
 * `usdSend` is not an ERC-20 permit, so it intentionally bypasses the EVM
 * exact scheme while preserving x402's verify → business → settle lifecycle.
 */
export const HYPERCORE_X402_MAINNET = 'hyperliquid:mainnet' as const;
export const HYPERCORE_X402_TESTNET = 'hyperliquid:testnet' as const;
export type HypercoreX402Network = typeof HYPERCORE_X402_MAINNET | typeof HYPERCORE_X402_TESTNET;

export interface HypercoreX402Config {
  network: HypercoreX402Network;
  payTo: string;
  facilitatorUrl: string;
  merchantId: string;
  merchantSecret: string;
  timeoutMs: number;
  maxTimeoutSeconds: number;
}

type HypercoreRequirement = {
  scheme: 'exact';
  network: HypercoreX402Network;
  amount: string;
  asset: 'USDC';
  payTo: string;
  maxTimeoutSeconds: number;
  extra: { assetTransferMethod: 'hypercore-usd-send'; protocolVersion: '1'; quoteId: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function parseRequirement(value: unknown, config: HypercoreX402Config): HypercoreRequirement {
  if (
    !isRecord(value) ||
    value.scheme !== 'exact' ||
    value.network !== config.network ||
    value.asset !== 'USDC' ||
    typeof value.amount !== 'string' ||
    typeof value.payTo !== 'string' ||
    value.payTo.toLowerCase() !== config.payTo.toLowerCase() ||
    typeof value.maxTimeoutSeconds !== 'number' ||
    !isRecord(value.extra) ||
    value.extra.assetTransferMethod !== 'hypercore-usd-send' ||
    value.extra.protocolVersion !== '1' ||
    typeof value.extra.quoteId !== 'string'
  ) {
    throw new Error('HyperCore facilitator returned an invalid payment requirement');
  }
  return value as HypercoreRequirement;
}

function responseError(value: unknown): string {
  return isRecord(value) && typeof value.error === 'string'
    ? value.error
    : 'facilitator_request_failed';
}

function parseConfiguredUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('X402_HYPERCORE_FACILITATOR_URL must be a valid URL');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error(
      'X402_HYPERCORE_FACILITATOR_URL must be HTTPS without credentials, query, or fragment'
    );
  }
  return url.toString().replace(/\/+$/, '');
}

/** Parse the disabled-by-default HyperCore merchant credentials. */
export function parseHypercoreX402Config(env: NodeJS.ProcessEnv): HypercoreX402Config | null {
  if (env.X402_HYPERCORE_ENABLED !== 'true') return null;
  const network = env.X402_HYPERCORE_NETWORK?.trim() || HYPERCORE_X402_MAINNET;
  if (network !== HYPERCORE_X402_MAINNET && network !== HYPERCORE_X402_TESTNET) {
    throw new Error('X402_HYPERCORE_NETWORK must be hyperliquid:mainnet or hyperliquid:testnet');
  }
  const payTo = env.X402_HYPERCORE_PAY_TO?.trim() ?? '';
  const facilitatorUrl = env.X402_HYPERCORE_FACILITATOR_URL?.trim() ?? '';
  const merchantId = env.X402_HYPERCORE_MERCHANT_ID?.trim() ?? '';
  const merchantSecret = env.X402_HYPERCORE_MERCHANT_SECRET?.trim() ?? '';
  if (!/^0x[a-fA-F0-9]{40}$/.test(payTo))
    throw new Error('X402_HYPERCORE_PAY_TO must be a 20-byte address');
  if (
    !/^[a-z][a-z0-9_-]{1,63}$/.test(merchantId) ||
    merchantSecret.length < 24 ||
    merchantSecret.length > 512 ||
    /\s/.test(merchantSecret)
  ) {
    throw new Error('X402_HYPERCORE_MERCHANT_ID or X402_HYPERCORE_MERCHANT_SECRET is invalid');
  }
  const timeoutMs = Number(env.X402_HYPERCORE_TIMEOUT_MS ?? '15000');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 30_000)
    throw new Error('X402_HYPERCORE_TIMEOUT_MS must be between 1000 and 30000');
  return {
    network,
    payTo,
    facilitatorUrl: parseConfiguredUrl(facilitatorUrl),
    merchantId,
    merchantSecret,
    timeoutMs,
    maxTimeoutSeconds: 60,
  };
}

/** Decode only enough to decide whether the header is a HyperCore payment. */
export function hypercorePayloadFromHeader(
  raw: string | null,
  config: HypercoreX402Config
): Record<string, unknown> | null {
  if (
    !raw ||
    raw.length > 64 * 1024 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(raw)
  )
    return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    return isRecord(value) &&
      value.x402Version === 2 &&
      isRecord(value.accepted) &&
      value.accepted.network === config.network &&
      isRecord(value.payload)
      ? value
      : null;
  } catch {
    return null;
  }
}

/** Create a merchant-authenticated client; it is never safe in browser code. */
export function createHypercoreFacilitatorClient(config: HypercoreX402Config) {
  const call = async (
    path: '/v1/quotes' | '/verify' | '/settle',
    body: Record<string, unknown>
  ): Promise<unknown> => {
    const raw = JSON.stringify(body);
    const timestamp = String(Date.now());
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(config.merchantSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${timestamp}.${raw}`)
    );
    const response = await fetch(`${config.facilitatorUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-hypercore-merchant-id': config.merchantId,
        'x-hypercore-merchant-timestamp': timestamp,
        'x-hypercore-merchant-signature': base64Url(new Uint8Array(signature)),
      },
      body: raw,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    const value: unknown = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(`HyperCore facilitator ${path} failed: ${responseError(value)}`);
    return value;
  };
  return {
    async quote(resource: string, amount: string): Promise<HypercoreRequirement> {
      const value = await call('/v1/quotes', { resource, amount });
      if (!isRecord(value))
        throw new Error('HyperCore facilitator returned an invalid quote response');
      return parseRequirement(value.requirement, config);
    },
    async verify(
      paymentPayload: Record<string, unknown>
    ): Promise<{ isValid: boolean; payer?: string; invalidReason?: string }> {
      const value = await call('/verify', { paymentPayload });
      if (!isRecord(value) || typeof value.isValid !== 'boolean')
        throw new Error('HyperCore facilitator returned an invalid verification response');
      return {
        isValid: value.isValid,
        ...(typeof value.payer === 'string' ? { payer: value.payer } : {}),
        ...(typeof value.invalidReason === 'string' ? { invalidReason: value.invalidReason } : {}),
      };
    },
    async settle(paymentPayload: Record<string, unknown>): Promise<{
      success: boolean;
      transaction: string;
      network: HypercoreX402Network;
      payer?: string;
      amount?: string;
      errorReason?: string;
    }> {
      const value = await call('/settle', { paymentPayload });
      if (
        !isRecord(value) ||
        typeof value.success !== 'boolean' ||
        typeof value.transaction !== 'string' ||
        value.network !== config.network ||
        !/^hcx_[0-9a-f]{32}$/.test(value.transaction)
      ) {
        throw new Error('HyperCore facilitator returned an invalid settlement response');
      }
      return {
        success: value.success,
        transaction: value.transaction,
        network: config.network,
        ...(typeof value.payer === 'string' ? { payer: value.payer } : {}),
        ...(typeof value.amount === 'string' ? { amount: value.amount } : {}),
        ...(typeof value.errorReason === 'string' ? { errorReason: value.errorReason } : {}),
      };
    },
  };
}

export function coreUsdAmountFromAtomic(microUsd: string): string {
  if (!/^\d+$/.test(microUsd)) throw new Error('x402 amount must be a positive integer');
  const value = BigInt(microUsd);
  if (value <= 0n) throw new Error('x402 amount must be positive');
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
