/**
 * Facilitator profile registry: the canonical hosts of the third-party x402
 * facilitators this deployment understands, plus the URL-classification
 * helpers derived from them. Single source of truth shared by config parsing
 * (auth requirements, Solana default) and the resource server (CDP auth
 * attachment, PayAI Solana blockhash hint).
 *
 * Adding a facilitator with special behavior = one entry here + the behavior
 * switch at its (single) consumption site; host strings exist exactly once.
 */

/** Canonical facilitator hosts (no scheme, no path). */
export const FACILITATOR_HOSTS = {
  /** Coinbase Developer Platform; requires per-request Bearer JWT auth (cdpAuth.ts). */
  CDP: 'api.cdp.coinbase.com',
  /** Daydreams; /supported is public but the payment path requires a Bearer token. */
  DAYDREAMS: 'facilitator.daydreams.systems',
  /** PayAI; the only Solana facilitator that advertises canonical networks with fresh blockhash hints. */
  PAYAI_SOLANA: 'facilitator.payai.network',
} as const;

/** Default Solana facilitator URL (PayAI). */
export const PAYAI_SOLANA_FACILITATOR_URL = `https://${FACILITATOR_HOSTS.PAYAI_SOLANA}`;

/** Extract the host of a facilitator URL, or null if it is not parseable. */
function urlHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/** True only for the CDP facilitator host, never for a lookalike URL. */
export function isCdpFacilitatorUrl(url: string): boolean {
  return urlHost(url) === FACILITATOR_HOSTS.CDP;
}

/** True only for the production Daydreams facilitator host. */
export function isDaydreamsFacilitatorUrl(url: string): boolean {
  return urlHost(url) === FACILITATOR_HOSTS.DAYDREAMS;
}

/** True only for the PayAI Solana facilitator host. */
export function isPayAiSolanaFacilitatorUrl(url: string): boolean {
  return urlHost(url) === FACILITATOR_HOSTS.PAYAI_SOLANA;
}
