import { NextRequest, NextResponse } from 'next/server';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythNetworkClient,
  API3Client,
} from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/lib/types/oracle';

const clients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH_NETWORK]: new PythNetworkClient(),
  [OracleProvider.API3]: new API3Client(),
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const chain = searchParams.get('chain');
  const period = searchParams.get('period');

  if (!symbol) {
    return NextResponse.json({ error: 'Missing required parameter: symbol' }, { status: 400 });
  }

  const providerKey = provider as OracleProvider;
  if (!Object.values(OracleProvider).includes(providerKey)) {
    return NextResponse.json(
      {
        error: `Invalid provider: ${provider}. Valid providers: ${Object.values(OracleProvider).join(', ')}`,
      },
      { status: 400 }
    );
  }

  const client = clients[providerKey];

  const chainValue = chain ? (chain as Blockchain) : undefined;

  try {
    if (period) {
      const periodNum = parseInt(period, 10);
      if (isNaN(periodNum) || periodNum < 1) {
        return NextResponse.json(
          { error: 'Invalid period. Must be a positive integer.' },
          { status: 400 }
        );
      }

      const historicalPrices = await client.getHistoricalPrices(symbol, chainValue, periodNum);

      return NextResponse.json({
        provider: providerKey,
        symbol,
        chain: chain || null,
        period: periodNum,
        data: historicalPrices,
        count: historicalPrices.length,
        timestamp: Date.now(),
      });
    }

    const priceData = await client.getPrice(symbol, chainValue);

    return NextResponse.json({
      provider: providerKey,
      symbol,
      chain: chain || null,
      data: priceData,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error(`Error fetching data from ${provider}:`, error);
    return NextResponse.json(
      {
        error: 'Failed to fetch oracle data',
        message: error instanceof Error ? error.message : 'Unknown error',
        provider: providerKey,
        symbol,
      },
      { status: 500 }
    );
  }
}
