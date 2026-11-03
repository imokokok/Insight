/* eslint-disable no-console */
/**
 * Delivers Turso-captured price slots to Supabase's hourly business projection.
 *
 * This runs independently from collection so a transient Supabase issue cannot
 * delay or fail a durable Turso capture. The outbox payload is immutable and
 * the Supabase receipt makes every retry idempotent.
 */
import { readTursoPriceWriteMode } from '@/lib/turso/price/client';
import {
  assertTursoPriceProjectionHealthy,
  runTursoPriceProjection,
} from '@/lib/turso/price/projectionRunner';

function readPositiveInteger(name: string, fallback: number, maximum: number): number {
  const raw = process.env[name] ?? String(fallback);
  if (!/^\d+$/.test(raw)) throw new Error(`Invalid ${name}`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`Invalid ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  if (readTursoPriceWriteMode() !== 'primary') {
    console.log('[project-turso-price] skipped: Turso primary mode is not enabled');
    return;
  }

  const limit = readPositiveInteger('TURSO_PRICE_PROJECTION_BATCH_SIZE', 16, 32);
  const result = await runTursoPriceProjection(limit, 1);

  console.log(
    JSON.stringify({
      event: 'turso-price-projection',
      ...result,
    })
  );

  assertTursoPriceProjectionHealthy(result);
}

main().catch((error) => {
  console.error(
    '[project-turso-price] failed:',
    error instanceof Error ? error.message : String(error)
  );
  process.exitCode = 1;
});
