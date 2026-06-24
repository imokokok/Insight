import { NextResponse } from 'next/server';

import { calculateConsensusPrice } from '@/lib/analytics/consensusPrice';
import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import {
  reportService,
  REPORT_ASSETS,
  REPORT_PROVIDERS,
  type HourlySnapshotInput,
} from '@/lib/reports/reportService';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, type PriceData } from '@/types/oracle';

const logger = createLogger('CronDailyReport');

interface BatchResultItem {
  provider: string;
  symbol: string;
  chain?: string;
  price: PriceData | null;
  error: string | null;
}

function getReportDate(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .split('T')[0];
}

function getSnapshotHour(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())
  );
}

async function fetchBatchPrices(): Promise<BatchResultItem[]> {
  const queries = REPORT_ASSETS.flatMap((symbol) =>
    REPORT_PROVIDERS.map((provider) => ({ provider, symbol }))
  );

  return Promise.all(
    queries.map(async ({ provider, symbol }): Promise<BatchResultItem> => {
      try {
        const price = await fetchPriceWithDatabase(provider, symbol, undefined, true, true);
        return {
          provider,
          symbol,
          price,
          error: null,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Daily report price fetch failed for ${provider}/${symbol}: ${message}`);
        return {
          provider,
          symbol,
          price: null,
          error: message,
        };
      }
    })
  );
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
    const reportDate = getReportDate();
    const snapshotHour = getSnapshotHour();
    const results = await fetchBatchPrices();
    const consensusBySymbol = calculateConsensusBySymbol(results);

    const inputs = results.map((item): HourlySnapshotInput => {
      const consensus = item.symbol ? consensusBySymbol[item.symbol] : undefined;
      const consensusPrice = consensus?.price ?? null;

      let deviationPct: number | null = null;
      if (consensusPrice && item.price && item.price.price > 0) {
        deviationPct = ((item.price.price - consensusPrice) / consensusPrice) * 100;
      }

      const refTime = item.price?.ingestionTimestamp ?? item.price?.timestamp;
      const dataAgeSeconds = refTime ? Math.floor((Date.now() - refTime) / 1000) : null;

      return {
        snapshotHour,
        provider: item.provider as OracleProvider,
        symbol: item.symbol,
        price: item.price?.price ?? 0,
        consensusPrice,
        deviationPct,
        latencyMs: null,
        dataAgeSeconds,
        confidence: item.price?.confidence ?? null,
        isSuccess: item.error === null && !!item.price && item.price.price > 0,
        errorMessage: item.error,
      };
    });

    const inserted = await reportService.upsertHourlySnapshots(inputs);
    const report = await reportService.generateDailyReport(reportDate);

    logger.info(
      `Daily report completed for ${reportDate}: ${inserted} snapshots, report persisted`
    );

    return NextResponse.json({
      success: true,
      reportDate,
      inserted,
      metrics: {
        totalSnapshots: report.metrics.totalSnapshots,
        successRate: report.metrics.overallSuccessRate,
        anomalies: report.metrics.totalAnomalies,
      },
    });
  } catch (error) {
    logger.error(
      'Daily report cron failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ success: false, error: 'Daily report failed' }, { status: 500 });
  }
}
