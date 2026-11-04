import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import { syncMonadUniswapV3Volume } from '@/lib/dex/monadUniswapV3Volume';
import { createLogger, normalizeError } from '@/lib/utils/logger';

const logger = createLogger('CronMonadDexMarket');

export interface MonadDexMarketCronResult {
  status: number;
  body: Record<string, unknown>;
}

/** Shared by the authenticated HTTP fallback and the GitHub Actions runner. */
export async function runMonadDexMarketSync(): Promise<MonadDexMarketCronResult> {
  try {
    const result = await syncMonadUniswapV3Volume();
    logger.info('Monad DEX market sync complete', {
      fromBlock: result.fromBlock,
      toBlock: result.toBlock,
      indexedSwapCount: result.indexedSwapCount,
      headBlock: result.headBlock,
      caughtUp: result.caughtUp,
    });
    return { status: 200, body: { success: true, data: result } };
  } catch (error) {
    logger.error('Monad DEX market sync failed', normalizeError(error));
    return { status: 500, body: { success: false, error: 'Monad DEX market sync failed.' } };
  }
}

export async function GET(request: Request) {
  const authResponse = verifyCronSecret(request);
  if (authResponse) return authResponse;

  const { status, body } = await runMonadDexMarketSync();
  return NextResponse.json(body, { status });
}
