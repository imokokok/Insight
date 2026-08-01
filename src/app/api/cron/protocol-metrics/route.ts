import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import {
  fetchAllProtocolRiskParams,
  fetchAllProtocolTvls,
  type ProtocolRiskParamsResult,
  type ProtocolTvlResult,
} from '@/lib/protocols/services';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CronProtocolMetrics');

interface SyncSummary {
  tvl: {
    total: number;
    updated: number;
    fallback: number;
    errors: number;
    details: ProtocolTvlResult[];
  };
  riskParams: {
    total: number;
    updated: number;
    fallback: number;
    errors: number;
    details: ProtocolRiskParamsResult[];
  };
}

/** Structured result returned by `runProtocolMetrics` for both the HTTP route and the GH Actions script. */
export interface ProtocolMetricsResult {
  status: number;
  body: Record<string, unknown>;
}

async function upsertProtocolMetrics(results: ProtocolTvlResult[]): Promise<number> {
  const rows = results
    .filter((r) => r.tvlUsd != null)
    .map((r) => ({
      protocol_id: r.protocolId,
      tvl_usd: r.tvlUsd!,
      fetched_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return 0;

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('protocol_metrics')
    .upsert(rows, { onConflict: 'protocol_id' });

  if (error) {
    logger.error(
      `Failed to batch upsert ${rows.length} protocol metrics`,
      error instanceof Error ? error : new Error(String(error))
    );
    return 0;
  }

  return rows.length;
}

async function upsertProtocolRiskParams(results: ProtocolRiskParamsResult[]): Promise<number> {
  const fetchedAt = new Date().toISOString();
  const rows: Array<{
    protocol_id: string;
    asset_symbol: string;
    liquidation_threshold: number;
    max_ltv: number;
    collateral_factor: number;
    exchange_rate: number;
    fetched_at: string;
  }> = [];

  for (const result of results) {
    for (const param of result.params) {
      rows.push({
        protocol_id: result.protocolId,
        asset_symbol: param.symbol,
        liquidation_threshold: param.liquidationThreshold,
        max_ltv: param.maxLtv,
        collateral_factor: param.collateralFactor,
        exchange_rate: param.exchangeRate,
        fetched_at: fetchedAt,
      });
    }
  }

  if (rows.length === 0) return 0;

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('protocol_asset_risk_params')
    .upsert(rows, { onConflict: 'protocol_id, asset_symbol' });

  if (error) {
    logger.error(
      `Failed to batch upsert ${rows.length} risk params`,
      error instanceof Error ? error : new Error(String(error))
    );
    return 0;
  }

  return rows.length;
}

/**
 * Core protocol-metrics pipeline, extracted from the GET handler so the same
 * logic runs from both the Vercel route AND the GitHub Actions
 * `scripts/protocol-metrics.ts` job. The GH Actions job escapes Vercel's 60s
 * serverless timeout — risk-params mode scrapes per-asset parameters from
 * every lending protocol and can exceed the ceiling.
 *
 * @param mode `tvl` | `risk-params` | `all`
 * @returns `{ status, body }` — the HTTP route wraps this in NextResponse;
 *          the script reads `status` to decide its exit code.
 */
export async function runProtocolMetrics(mode: string): Promise<ProtocolMetricsResult> {
  try {
    const summary: SyncSummary = {
      tvl: { total: 0, updated: 0, fallback: 0, errors: 0, details: [] },
      riskParams: { total: 0, updated: 0, fallback: 0, errors: 0, details: [] },
    };

    const requestStart = Date.now();

    if (mode === 'all' || mode === 'tvl') {
      const tvlStart = Date.now();
      const tvlResults = await fetchAllProtocolTvls();
      logger.info(`TVL fetch completed in ${Date.now() - tvlStart}ms`, {
        protocolCount: tvlResults.length,
      });

      summary.tvl.details = tvlResults;
      summary.tvl.total = tvlResults.length;
      summary.tvl.fallback = tvlResults.filter((r) => r.source === 'fallback').length;
      summary.tvl.errors = tvlResults.filter((r) => r.error).length;

      const upsertStart = Date.now();
      summary.tvl.updated = await upsertProtocolMetrics(tvlResults);
      logger.info(`TVL upsert completed in ${Date.now() - upsertStart}ms`, {
        updated: summary.tvl.updated,
      });
    }

    if (mode === 'all' || mode === 'risk-params') {
      const riskStart = Date.now();
      const riskResults = await fetchAllProtocolRiskParams();
      logger.info(`Risk params fetch completed in ${Date.now() - riskStart}ms`, {
        protocolCount: riskResults.length,
      });

      summary.riskParams.details = riskResults;
      summary.riskParams.total = riskResults.length;

      const upsertStart = Date.now();
      summary.riskParams.updated = await upsertProtocolRiskParams(riskResults);
      logger.info(`Risk params upsert completed in ${Date.now() - upsertStart}ms`, {
        updated: summary.riskParams.updated,
      });
      summary.riskParams.fallback = riskResults.filter((r) => r.source === 'fallback').length;
      summary.riskParams.errors = riskResults.filter((r) => r.error).length;
    }

    logger.info(`Protocol metrics sync finished in ${Date.now() - requestStart}ms`, { mode });

    logger.info('Protocol metrics sync completed', {
      mode,
      tvlUpdated: summary.tvl.updated,
      riskParamsUpdated: summary.riskParams.updated,
    });

    return { status: 200, body: { success: true, mode, summary } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      'Protocol metrics sync failed',
      error instanceof Error ? error : new Error(message)
    );
    return { status: 500, body: { success: false, error: message } };
  }
}

/**
 * GET /api/cron/protocol-metrics
 *
 * Syncs protocol TVL and/or risk params. `mode` query param controls scope:
 *   - `tvl`         → TVL only (every 4h via protocol-tvl-cron.yml)
 *   - `risk-params` → risk params only (every 6h via protocol-risk-params-cron.yml)
 *   - `all`         → both (default)
 *
 * Auth: CRON_SECRET Bearer token (see verifyCronSecret).
 * This route does NOT use createApiHandler — it's a simple cron trigger,
 * not a user-facing API.
 */
export async function GET(request: Request) {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'all';

  const { status, body } = await runProtocolMetrics(mode);
  return NextResponse.json(body, { status });
}
