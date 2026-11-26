/**
 * Configuration values known when the Cloudflare Worker is built. Vite
 * replaces these reads with literals so they do not consume Worker variables.
 */
const buildEnvironment = {
  MPP_ENABLED: process.env.MPP_ENABLED,
  MPP_MCP_ENABLED: process.env.MPP_MCP_ENABLED,
  RATE_LIMIT_STORE: process.env.RATE_LIMIT_STORE,
  TURSO_COVERAGE_SLO_MODE: process.env.TURSO_COVERAGE_SLO_MODE,
  TURSO_DAILY_REPORTS_MODE: process.env.TURSO_DAILY_REPORTS_MODE,
  TURSO_DEX_MARKET_MODE: process.env.TURSO_DEX_MARKET_MODE,
  TURSO_FEED_CADENCE_MODE: process.env.TURSO_FEED_CADENCE_MODE,
  TURSO_MANIP_COST_MODE: process.env.TURSO_MANIP_COST_MODE,
  TURSO_MARKET_REF_MODE: process.env.TURSO_MARKET_REF_MODE,
  TURSO_ORACLE_WATCH_HISTORY_MODE: process.env.TURSO_ORACLE_WATCH_HISTORY_MODE,
  TURSO_PRICE_PROJECTION_MODE: process.env.TURSO_PRICE_PROJECTION_MODE,
  TURSO_PRICE_RECORDS_MODE: process.env.TURSO_PRICE_RECORDS_MODE,
  TURSO_PRICE_RECORDS_FALLBACK_ON_MISS: process.env.TURSO_PRICE_RECORDS_FALLBACK_ON_MISS,
  TURSO_PRICE_READ_CUTOVER_AT: process.env.TURSO_PRICE_READ_CUTOVER_AT,
  TURSO_PRICE_WRITE_MODE: process.env.TURSO_PRICE_WRITE_MODE,
  WAK_P1_EXTENDED_VALIDITY_UNTIL: process.env.WAK_P1_EXTENDED_VALIDITY_UNTIL,
  WAK_P1_SIGNED_TTL_SECONDS: process.env.WAK_P1_SIGNED_TTL_SECONDS,
  X402_EVM_ENABLED: process.env.X402_EVM_ENABLED,
  X402_EVM_NETWORKS: process.env.X402_EVM_NETWORKS,
  X402_HYPERCORE_ENABLED: process.env.X402_HYPERCORE_ENABLED,
  X402_HYPERCORE_FACILITATOR_URL: process.env.X402_HYPERCORE_FACILITATOR_URL,
  X402_HYPERCORE_MERCHANT_ID: process.env.X402_HYPERCORE_MERCHANT_ID,
  X402_HYPERCORE_NETWORK: process.env.X402_HYPERCORE_NETWORK,
  X402_HYPERCORE_PAY_TO: process.env.X402_HYPERCORE_PAY_TO,
  X402_HYPERCORE_TIMEOUT_MS: process.env.X402_HYPERCORE_TIMEOUT_MS,
  X402_SOLANA_ENABLED: process.env.X402_SOLANA_ENABLED,
  X402_SOLANA_FACILITATOR_URL: process.env.X402_SOLANA_FACILITATOR_URL,
  X402_SOLANA_FEE_PAYER: process.env.X402_SOLANA_FEE_PAYER,
  X402_SOLANA_NETWORK: process.env.X402_SOLANA_NETWORK,
  X402_SOLANA_PAY_TO: process.env.X402_SOLANA_PAY_TO,
};

export const INSIGHT_BUILD_VARIABLE_NAMES = Object.keys(buildEnvironment) as Array<
  keyof typeof buildEnvironment
>;

/** Fill removed Worker bindings from build-time values while preserving an explicitly supplied env. */
export function readInsightRuntimeEnvironment(
  environment: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv {
  const result = { ...environment };
  for (const name of INSIGHT_BUILD_VARIABLE_NAMES) {
    result[name] ??= buildEnvironment[name];
  }
  return result;
}
