import type { PriceRecord } from '@/lib/supabase/queries';
import { createLogger, normalizeError } from '@/lib/utils/logger';

import { getTursoPriceClient } from './client';
import { listTursoPriceRecords, type TursoPriceRecordsFilters } from './recordsRepository';
import { ensureTursoPriceSchema } from './schema';

const logger = createLogger('turso-price-records');

/**
 * Read path shared by the export and signals routes. Returns null when Turso
 * is unavailable so the caller can decide whether to fall back to Supabase;
 * an empty array is a valid empty result and must stay distinct from failure.
 */
export async function loadTursoPriceRecords(
  filters: TursoPriceRecordsFilters
): Promise<PriceRecord[] | null> {
  try {
    const client = getTursoPriceClient();
    await ensureTursoPriceSchema(client);
    return await listTursoPriceRecords(client, filters);
  } catch (error) {
    logger.error('Failed to read price_records from Turso', normalizeError(error));
    return null;
  }
}
