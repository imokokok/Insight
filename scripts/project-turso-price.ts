/* eslint-disable no-console */
/**
 * Delivers Turso-captured price slots to Supabase's hourly business projection.
 *
 * This runs independently from collection so a transient Supabase issue cannot
 * delay or fail a durable Turso capture. The outbox payload is immutable and
 * the Supabase receipt makes every retry idempotent.
 */
import { getTursoPriceClient, readTursoPriceWriteMode } from '@/lib/turso/price/client';
import { readTursoPriceProjectionMaxLagSeconds } from '@/lib/turso/price/projectionConfig';
import {
  getTursoPriceProjectionBacklog,
  pruneExpiredTursoPriceEvents,
} from '@/lib/turso/price/slotRepository';
import { ensureTursoPriceSchema } from '@/lib/turso/price/schema';
import { reconcilePendingTursoPriceSlots } from '@/lib/supabase/adaptiveSnapshotPersistence';

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
  const maximumLagSeconds = readTursoPriceProjectionMaxLagSeconds();
  const client = getTursoPriceClient();
  await ensureTursoPriceSchema(client);
  const before = await getTursoPriceProjectionBacklog(client);
  const projected = await reconcilePendingTursoPriceSlots(limit);
  const maintenance = await pruneExpiredTursoPriceEvents(client);
  const after = await getTursoPriceProjectionBacklog(client);
  const oldestLagSeconds =
    after.oldestSlotMs === null
      ? 0
      : Math.max(0, Math.floor((Date.now() - after.oldestSlotMs) / 1000));

  console.log(
    JSON.stringify({
      event: 'turso-price-projection',
      before,
      projected,
      after,
      oldestLagSeconds,
      ...maintenance,
    })
  );

  if (after.pendingCount > 0 && oldestLagSeconds > maximumLagSeconds) {
    throw new Error(
      `Turso price projection backlog exceeded ${maximumLagSeconds}s: ` +
        `${after.pendingCount} pending slot(s), oldest=${oldestLagSeconds}s`
    );
  }
}

main().catch((error) => {
  console.error(
    '[project-turso-price] failed:',
    error instanceof Error ? error.message : String(error)
  );
  process.exitCode = 1;
});
