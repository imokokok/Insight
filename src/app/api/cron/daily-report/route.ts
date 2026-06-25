import { NextResponse } from 'next/server';

import { calculateConsensusPrice } from '@/lib/analytics/consensusPrice';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { getDefaultFactory } from '@/lib/oracles/factory';
import {
  reportService,
  REPORT_ASSETS,
  REPORT_PROVIDERS,
  type HourlySnapshotInput,
} from '@/lib/reports/reportService';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type PriceData } from '@/types/oracle';

const logger = createLogger('DailyReportSnapshot');

// Hard-coded unsupported pairs observed in production cron runs.
// These providers advertise the symbol but either have no active feed
// or return unusable prices for the default chain used by the report.
const EXCLUDED_REPORT_PAIRS: Partial<Record<OracleProvider, string[]>> = {
  api3: ['SOL', 'BNB', 'LINK'],
  dia: ['XRP', 'DOGE'],
  reflector: ['DOGE'],
  twap: ['BNB'],
};

// DECIMAL(24, 8) max absolute value
const MAX_SNAPSHOT_PRICE = 9_999_999_999_999_999.99999999;
// DECIMAL(10, 4) max absolute value
const MAX_DEVIATION_PCT = 9_999.9999;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function sanitizePriceForSnapshot(
  price: number
): { valid: true; price: number } | { valid: false; reason: string } {
  if (!isFiniteNumber(price) || price <= 0) {
    return { valid: false, reason: 'price is not a positive finite number' };
  }
  if (price > MAX_SNAPSHOT_PRICE) {
    return { valid: false, reason: `price ${price} exceeds DECIMAL(24,8) range` };
  }
  return { valid: true, price };
}

function sanitizeDeviationPct(value: number): number {
  if (!isFiniteNumber(value)) return 0;
  return Math.max(-MAX_DEVIATION_PCT, Math.min(MAX_DEVIATION_PCT, value));
}

interface BatchResultItem {
  provider: string;
  symbol: string;
  chain?: string;
  price: PriceData | null;
  error: string | null;
  skipped: boolean;
}

async function fetchBatchPrices(): Promise<BatchResultItem[]> {
  const factory = getDefaultFactory();
  const queries: { provider: OracleProvider; symbol: string }[] = [];
  const skipped: BatchResultItem[] = [];

  for (const symbol of REPORT_ASSETS) {
    for (const provider of REPORT_PROVIDERS) {
      const excluded = EXCLUDED_REPORT_PAIRS[provider]?.includes(symbol);
      if (excluded) {
        skipped.push({
          provider,
          symbol,
          price: null,
          error: 'Excluded from daily report based on observed unsupported pairs',
          skipped: true,
        });
        continue;
      }

      const client = factory.getClient(provider);
      if (client.isSymbolSupported(symbol)) {
        queries.push({ provider, symbol });
      } else {
        skipped.push({
          provider,
          symbol,
          price: null,
          error: 'Symbol not supported by provider',
          skipped: true,
        });
      }
    }
  }

  logger.info(
    `Price batch: ${queries.length} queries, ${skipped.length} unsupported pairs skipped`
  );

  const fetched = await Promise.all(
    queries.map(async ({ provider, symbol }): Promise<BatchResultItem> => {
      try {
        const price = await fetchPriceWithDatabase(provider, symbol, undefined, true, true);
        const check = sanitizePriceForSnapshot(price.price);
        if (!check.valid) {
          logger.warn(`Price validation failed for ${provider}/${symbol}: ${check.reason}`);
          return {
            provider,
            symbol,
            price: null,
            error: `Price validation failed: ${check.reason}`,
            skipped: false,
          };
        }
        return { provider, symbol, price, error: null, skipped: false };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.warn(`Price fetch failed for ${provider}/${symbol}: ${message}`);
        return { provider, symbol, price: null, error: message, skipped: false };
      }
    })
  );

  return [...fetched, ...skipped];
}

function calculateConsensusBySymbol(results: BatchResultItem[]): Record<string, { price: number }> {
  const bySymbol = new Map<string, BatchResultItem[]>();

  for (const item of results) {
    if (!item.price || item.price.price <= 0) continue;
    const list = bySymbol.get(item.symbol) ?? [];
    list.push(item);
    bySymbol.set(item.symbol, list);
  }

  const consensusBySymbol: Record<string, { price: number }> = {};

  for (const [symbol, items] of bySymbol) {
    const inputs = items.map((item) => ({
      provider: item.provider,
      price: item.price!.price,
      timestamp: item.price!.timestamp,
      ingestionTimestamp: item.price!.ingestionTimestamp,
      confidence: item.price!.confidence,
    }));

    try {
      const consensus = calculateConsensusPrice(inputs, 'weighted_median', `${symbol}/USD`);
      if (consensus.price > 0) {
        consensusBySymbol[symbol] = { price: consensus.price };
      }
    } catch {
      logger.warn(`Failed to calculate consensus for ${symbol}`);
    }
  }

  return consensusBySymbol;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const snapshotDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    )
      .toISOString()
      .split('T')[0];
    const snapshotHour = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())
    );
    const results = await fetchBatchPrices();
    const consensusBySymbol = calculateConsensusBySymbol(results);

    const inputs = results
      .filter((item) => !item.skipped)
      .map((item): HourlySnapshotInput => {
        const rawConsensus = item.symbol ? consensusBySymbol[item.symbol] : undefined;
        const consensusPrice =
          rawConsensus && rawConsensus.price > 0 && rawConsensus.price <= MAX_SNAPSHOT_PRICE
            ? rawConsensus.price
            : null;

        let deviationPct: number | null = null;
        if (consensusPrice && item.price && item.price.price > 0) {
          const rawDeviation = ((item.price.price - consensusPrice) / consensusPrice) * 100;
          deviationPct = sanitizeDeviationPct(rawDeviation);
          if (rawDeviation !== deviationPct) {
            logger.warn(
              `Deviation clamped for ${item.provider}/${item.symbol}: ${rawDeviation} -> ${deviationPct}`
            );
          }
        }

        const refTime = item.price?.ingestionTimestamp ?? item.price?.timestamp;
        const dataAgeSeconds = refTime ? Math.floor((Date.now() - refTime) / 1000) : null;

        const priceCheck = item.price ? sanitizePriceForSnapshot(item.price.price) : null;
        const isSuccess = item.error === null && priceCheck?.valid === true;

        return {
          snapshotHour,
          provider: item.provider as OracleProvider,
          symbol: item.symbol,
          price: priceCheck?.valid ? priceCheck.price : 0,
          consensusPrice,
          deviationPct,
          latencyMs: null,
          dataAgeSeconds,
          confidence: item.price?.confidence ?? null,
          isSuccess,
          errorMessage: item.error,
        };
      });

    const successCount = inputs.filter((i) => i.isSuccess).length;
    const failedCount = inputs.length - successCount;
    const skippedCount = results.filter((r) => r.skipped).length;
    logger.info(
      `Price batch completed for ${snapshotDate}: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped out of ${results.length}`
    );

    let inserted = 0;
    try {
      inserted = await reportService.upsertHourlySnapshots(inputs);
      logger.info(`Upserted ${inserted} hourly snapshots for ${snapshotDate}`);
    } catch (upsertError) {
      const error = upsertError instanceof Error ? upsertError : new Error(String(upsertError));
      logger.error(
        `Failed to upsert hourly snapshots for ${snapshotDate}: ${error.message}`,
        error,
        {
          sampleInputs: inputs.slice(0, 5).map((i) => ({
            provider: i.provider,
            symbol: i.symbol,
            price: i.price,
            consensusPrice: i.consensusPrice,
            deviationPct: i.deviationPct,
          })),
        }
      );
      return NextResponse.json(
        { success: false, stage: 'upsert_snapshots', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      snapshotDate,
      inserted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      'Daily report snapshot failed',
      error instanceof Error ? error : new Error(message)
    );
    return NextResponse.json({ success: false, stage: 'unknown', error: message }, { status: 500 });
  }
}
