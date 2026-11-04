/* eslint-disable no-console */
import { getTursoPriceClient, readTursoPriceConfig } from '@/lib/turso/price/client';
import { ensureTursoPriceSchema } from '@/lib/turso/price/schema';
import { requeueQuarantinedTursoPriceSlot } from '@/lib/turso/price/slotRepository';

function readSlotMs(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) {
    throw new Error(
      'Set TURSO_PRICE_REQUEUE_SLOT_MS to the exact quarantined slot timestamp in milliseconds'
    );
  }
  const slotMs = Number(value);
  if (!Number.isSafeInteger(slotMs) || slotMs < 0) {
    throw new Error('Invalid TURSO_PRICE_REQUEUE_SLOT_MS');
  }
  return slotMs;
}

function readInputHash(value: string | undefined): string {
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error('Set TURSO_PRICE_REQUEUE_INPUT_HASH to the immutable 64-character slot hash');
  }
  return value.toLowerCase();
}

// This is intentionally an explicit, evidence-preserving recovery action.
// It never overwrites a payload and only makes the reviewed slot eligible for
// the normal idempotent projection worker again.
readTursoPriceConfig();
const client = getTursoPriceClient();

try {
  const slotMs = readSlotMs(process.env.TURSO_PRICE_REQUEUE_SLOT_MS);
  const inputHash = readInputHash(process.env.TURSO_PRICE_REQUEUE_INPUT_HASH);
  await ensureTursoPriceSchema(client);
  await requeueQuarantinedTursoPriceSlot(client, slotMs, inputHash);
  console.log(
    JSON.stringify({
      event: 'turso-price-slot-requeued',
      slotMs,
      slotAt: new Date(slotMs).toISOString(),
      inputHash,
    })
  );
} finally {
  client.close();
}
