/**
 * SLO for the asynchronous Turso-to-Supabase projection. This lives outside
 * the shared database client so an operations-only setting does not rewrite
 * every generated collector bundle that depends on the client.
 */
export function readTursoPriceProjectionMaxLagSeconds(
  env: NodeJS.ProcessEnv = process.env
): number {
  const raw = env.TURSO_PRICE_PROJECTION_MAX_LAG_SECONDS ?? '1800';
  if (!/^\d+$/.test(raw)) {
    throw new Error('Invalid TURSO_PRICE_PROJECTION_MAX_LAG_SECONDS');
  }
  const seconds = Number(raw);
  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 86_400) {
    throw new Error('Invalid TURSO_PRICE_PROJECTION_MAX_LAG_SECONDS');
  }
  return seconds;
}
