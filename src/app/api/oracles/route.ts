import { NextRequest, NextResponse } from 'next/server';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythNetworkClient,
  API3Client,
} from '@/lib/oracles';
import { OracleProvider, Blockchain } from '@/lib/types/oracle';

const clients: Record<OracleProvider, InstanceType<typeof ChainlinkClient>> = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH_NETWORK]: new PythNetworkClient(),
  [OracleProvider.API3]: new API3Client(),
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get('provider') as OracleProvider | null;
  const symbol = searchParams.get('symbol');
  const chain = searchParams.get('chain') as Blockchain | null;
  const period = searchParams.get('period');

  if (!provider || !symbol) {
    return NextResponse.json(
      { error: 'Missing required parameters: provider, symbol' },
      { status: 400 }
    );
  }

  if (!Object.values(OracleProvider).includes(provider)) {
    return NextResponse.json(
      {
        error: `Invalid provider: ${provider}. Valid providers: ${Object.values(OracleProvider).join(', ')}`,
      },
      { status: 400 }
    );
  }

  const client = clients[provider];
  if (!client) {
    return NextResponse.json(
      { error: `Client not found for provider: ${provider}` },
      { status: 500 }
    );
  }

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
        provider,
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
      provider,
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
        provider,
        symbol,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requests } = body;

    if (!Array.isArray(requests)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { requests: [...] }' },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      requests.map(
        async (req: { provider: OracleProvider; symbol: string; chain?: Blockchain }) => {
          const { provider, symbol, chain } = req;
          const client = clients[provider];

          if (!client) {
            throw new Error(`Invalid provider: ${provider}`);
          }

          const priceData = await client.getPrice(symbol, chain);
          return { provider, symbol, chain, data: priceData };
        }
      )
    );

    const data = results.map((result, index) => ({
      request: requests[index],
      status: result.status,
      data: result.status === 'fulfilled' ? result.value.data : null,
      error: result.status === 'rejected' ? result.reason : null,
    }));

    return NextResponse.json({
      timestamp: Date.now(),
      results: data,
    });
  } catch (error) {
    console.error('Error processing batch request:', error);
    return NextResponse.json(
      {
        error: 'Failed to process batch request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
