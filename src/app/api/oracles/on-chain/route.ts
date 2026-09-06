import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler } from '@/lib/api/handler';
import { createCachedJsonResponse } from '@/lib/api/utils';
import { BLOCKCHAIN_TO_CHAIN_ID } from '@/lib/oracles/constants/chainMapping';
import { REFLECTOR_ASSET_CONTRACT_MAP } from '@/lib/oracles/constants/reflectorConstants';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { getDIADataService } from '@/lib/oracles/services/diaDataService';
import { getReflectorDataService } from '@/lib/oracles/services/reflectorDataService';
import { twapOnChainService } from '@/lib/oracles/services/twapOnChainService';
import { getWINkLinkRealDataService } from '@/lib/oracles/services/winklinkRealDataService';
import { SafeChainSchema, SafeProviderSchema, SafeSymbolSchema } from '@/lib/security/validation';
import { Blockchain, OracleProvider, type AnyOnChainData } from '@/types/oracle';

async function fetchReflectorData(
  symbol: string,
  signal: AbortSignal
): Promise<AnyOnChainData | null> {
  const contractId = REFLECTOR_ASSET_CONTRACT_MAP[symbol];
  if (!contractId) return null;

  const service = getReflectorDataService();
  const [priceData, decimalsResult, resolution, version, assets, lastTimestamp] = await Promise.all(
    [
      service.fetchLatestPrice(symbol, signal),
      service.fetchDecimals(contractId, signal),
      service.fetchResolution(contractId, signal).catch(() => null),
      service.fetchVersion(contractId, signal).catch(() => null),
      service.fetchAssets(signal),
      service.fetchLastTimestamp(contractId, signal).catch(() => null),
    ]
  );

  if (!priceData) return null;

  return {
    symbol: priceData.symbol,
    price: priceData.price,
    decimals: decimalsResult.decimals,
    resolution: resolution ?? 300,
    version: version ?? 0,
    assets: assets ?? [],
    lastTimestamp: lastTimestamp ?? 0,
    nodeCount: 7,
    threshold: 4,
    baseAsset: 'USD',
    dataAge: priceData.timestamp ? Math.round((Date.now() - priceData.timestamp) / 1000) : null,
    lastUpdated: priceData.timestamp,
    source: 'SEP-40',
  };
}

async function fetchTwapData(
  symbol: string,
  chain: Blockchain | undefined,
  signal: AbortSignal
): Promise<AnyOnChainData | null> {
  const chainKey = chain ?? Blockchain.ETHEREUM;
  const chainId = BLOCKCHAIN_TO_CHAIN_ID[chainKey];
  if (!chainId) return null;

  const data = await twapOnChainService.getTwapPrice(symbol, chainId, undefined, signal);
  const priceDeviation =
    data.spotPrice > 0 ? Math.abs(data.twapPrice - data.spotPrice) / data.spotPrice : 0;

  return {
    poolAddress: data.poolAddress,
    feeTier: data.feeTier,
    liquidity: data.liquidity.toString(),
    twapInterval: data.twapInterval,
    twapPrice: data.twapPrice,
    spotPrice: data.spotPrice,
    priceDeviation,
    tick: data.tick,
    sqrtPriceX96: data.sqrtPriceX96.toString(),
    confidence: data.confidence,
  };
}

async function fetchOnChainData(
  provider: OracleProvider,
  symbol: string,
  chain: Blockchain | undefined,
  signal: AbortSignal
): Promise<AnyOnChainData | null> {
  if (provider === OracleProvider.DIA) {
    return getDIADataService().getTokenOnChainData(symbol, chain);
  }
  if (provider === OracleProvider.WINKLINK) {
    return getWINkLinkRealDataService().getTokenOnChainData(symbol);
  }
  if (provider === OracleProvider.TWAP) {
    return fetchTwapData(symbol, chain, signal);
  }
  if (provider === OracleProvider.REFLECTOR) {
    return fetchReflectorData(symbol, signal);
  }

  const client = getDefaultFactory().getClient(provider) as ReturnType<
    ReturnType<typeof getDefaultFactory>['getClient']
  > & {
    getTokenOnChainData?: (targetSymbol: string) => Promise<AnyOnChainData | null>;
  };
  return client.getTokenOnChainData?.(symbol) ?? null;
}

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const providerResult = SafeProviderSchema.safeParse(
      request.nextUrl.searchParams.get('provider')
    );
    const symbolResult = SafeSymbolSchema.safeParse(request.nextUrl.searchParams.get('symbol'));
    const rawChain = request.nextUrl.searchParams.get('chain');
    const chainResult = rawChain ? SafeChainSchema.safeParse(rawChain) : null;

    if (!providerResult.success || !symbolResult.success || (chainResult && !chainResult.success)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters' },
        },
        { status: 400 }
      );
    }

    const data = await fetchOnChainData(
      providerResult.data as OracleProvider,
      symbolResult.data.toUpperCase(),
      chainResult?.data as Blockchain | undefined,
      request.signal
    );

    return createCachedJsonResponse({ success: true, data }, { preset: 'realtime' });
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: false },
    },
    skipInternalAuthAndRateLimit: true,
  }
);
