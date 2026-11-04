import { ExactEvmScheme } from '@x402/evm/exact/client';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

import { createMandateSignerFromKey, ExactEvmMandateScheme } from './aeonMandate.js';
import { MANDATE_NETWORKS } from './settings.js';
import type { InsightSettings } from './settings.js';

export interface PreTradeQuery {
  asset: string;
  chainId: number;
  action: string;
  tradeAmountUsd?: number;
  destinationAsset?: string;
  /** Opt in to on-chain reputation anchoring of this check (ERC-8004). */
  reputationOptIn?: boolean;
  /** Caller's ERC-8004 agentId on the BNB Identity Registry (required with opt-in). */
  reputationAgentId?: number;
}

export interface PreTradeOutcome {
  verdict: string;
  reasonCodes: string[];
  warnings: string[];
  attestation: unknown;
  paymentSettled: boolean;
  paymentNetwork?: string;
  raw: unknown;
}

export interface InsightRequestError extends Error {
  status?: number;
  paymentRequired?: boolean;
  accepts?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function buildPreTradeUrl(baseUrl: string, query: PreTradeQuery): string {
  const base = baseUrl.replace(/\/+$/, '');
  const params = new URLSearchParams({
    asset: query.asset,
    chainId: String(query.chainId),
    action: query.action,
    schemaVersion: '3',
  });
  if (query.tradeAmountUsd !== undefined)
    params.set('tradeAmountUsd', String(query.tradeAmountUsd));
  if (query.destinationAsset) params.set('destinationAsset', query.destinationAsset);
  if (query.reputationOptIn && query.reputationAgentId) {
    params.set('reputationOptIn', '1');
    params.set('reputationAgentId', String(query.reputationAgentId));
  }
  return `${base}/api/v1/safety/pre-trade?${params.toString()}`;
}

/**
 * Build a fetch that transparently settles x402 v2 payment challenges from the
 * configured key. Returns null when no key is configured; callers then fall
 * back to a plain fetch and surface the 402 to the agent with setup guidance.
 */
export function buildPaidFetch(settings: InsightSettings): typeof fetch | null {
  if (!settings.x402PrivateKey) return null;
  const signer = privateKeyToAccount(settings.x402PrivateKey as `0x${string}`);
  const client = x402Client.fromConfig({
    schemes: settings.payableNetworks.map((network) => ({
      network: network as `${string}:${string}`,
      client: MANDATE_NETWORKS.includes(network)
        ? // BNB Smart Chain: Binance-bridged USDC has no on-chain EIP-3009, so
          // the AEON facilitator mandate flow signs here (incl. one-time
          // unlimited approve on first use).
          new ExactEvmMandateScheme(
            createMandateSignerFromKey({
              privateKey: settings.x402PrivateKey as string,
              chain: bsc,
              rpcUrl: settings.bnbRpcUrl,
            })
          )
        : new ExactEvmScheme(signer),
      x402Version: 2,
    })),
  });
  return wrapFetchWithPayment(globalThis.fetch, client);
}

export function parsePreTradeResponse(
  body: unknown,
  paymentSettled: boolean,
  paymentNetwork?: string
): PreTradeOutcome {
  const envelope = asRecord(body);
  const data = asRecord(envelope.data);
  const verdict = typeof data.verdict === 'string' ? data.verdict : 'UNKNOWN';
  const reasonCodes = Array.isArray(data.reasonCodes) ? data.reasonCodes.map(String) : [];
  const warnings = Array.isArray(data.warnings) ? data.warnings.map(String) : [];
  return {
    verdict,
    reasonCodes,
    warnings,
    attestation: data.attestation ?? null,
    paymentSettled,
    paymentNetwork,
    raw: body,
  };
}

export async function runPreTrade(
  settings: InsightSettings,
  query: PreTradeQuery,
  paidFetch: typeof fetch | null
): Promise<PreTradeOutcome> {
  const url = buildPreTradeUrl(settings.baseUrl, query);
  const fetcher = paidFetch ?? globalThis.fetch;
  const response = await fetcher(url, { headers: { accept: 'application/json' } });

  if (response.status === 402 && !paidFetch) {
    const error = new Error(
      'Insight pre-trade check requires x402 payment (0.02 USDC). Configure ' +
        'ORACLE_INSIGHT_X402_PRIVATE_KEY to let this agent pay per call, or provide ' +
        'an Insight API key deployment URL via ORACLE_INSIGHT_BASE_URL.'
    ) as InsightRequestError;
    error.status = 402;
    error.paymentRequired = true;
    const required = response.headers.get('payment-required');
    if (required) {
      try {
        const decoded = JSON.parse(Buffer.from(required, 'base64url').toString('utf8'));
        error.accepts = decoded;
      } catch {
        /* quote header unreadable — surface the status alone */
      }
    }
    throw error;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Insight pre-trade check failed: HTTP ${response.status} ${text.slice(0, 300)}`
    );
  }

  const paymentNetwork =
    response.headers.get('payment-response') !== null
      ? (new URL(url).searchParams.get('chainId') ?? undefined)
      : undefined;
  const body: unknown = await response.json();
  return parsePreTradeResponse(
    body,
    response.headers.get('payment-response') !== null,
    paymentNetwork
  );
}

export interface AttestationVerifyResult {
  valid: boolean;
  detail: unknown;
}

/** Free endpoint: verify an EIP-712 pre-trade attestation signature + window. */
export async function verifyAttestation(
  settings: InsightSettings,
  attestation: unknown
): Promise<AttestationVerifyResult> {
  const response = await fetch(`${settings.baseUrl}/api/v1/safety/attestation/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ attestation }),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    return { valid: false, detail: body ?? `HTTP ${response.status}` };
  }
  const record = asRecord(body);
  const data = asRecord(record.data);
  return {
    valid: data.valid === true,
    detail: data,
  };
}
