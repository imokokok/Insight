import { getRobinhoodRwaContext } from '../robinhoodClient';
import { RobinhoodAssetsResponseSchema } from '../robinhoodSchema';

const NOW_MS = 1_800_000_000_000;
const TOKEN = `0x${'12'.repeat(20)}`;
const ID = `0x${'34'.repeat(32)}`;
const ACTION_ID = `0x${'56'.repeat(32)}`;

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function upstreamFetch() {
  return jest.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/assets')) {
      return response({
        assets: [
          {
            id: ID,
            tokenSymbol: 'AAPL',
            tokenName: 'Apple • Robinhood Token',
            deployments: [
              { contractAddress: TOKEN, chainId: 4663, networkName: 'Robinhood Chain' },
            ],
            currentMultiplier: '1.001000000000000000',
            pendingMultiplier: '',
            status: 'ASSET_STATUS_ACTIVE',
            tokenDecimals: 18,
            tradingCapabilities: {
              market: {
                whole: 'TRADING_STATUS_TRADABLE',
                fractional: 'TRADING_STATUS_TRADABLE',
              },
            },
          },
        ],
      });
    }
    if (url.endsWith('/prices/AAPL')) {
      return response({
        quotes: [
          {
            tokenSymbol: 'AAPL',
            deployments: [{ contractAddress: TOKEN, chainId: 4663 }],
            bid: '100',
            ask: '100.2',
            currency: 'USD',
            dailyTradingVolume: '1000',
            isTradingHalt: false,
            generatedAt: new Date(((NOW_MS - 5_000) / 1000) * 1000).toISOString(),
          },
        ],
      });
    }
    if (url.endsWith('/corporate-actions')) {
      return response({
        corpActions: [
          {
            id: ACTION_ID,
            type: 'CORPORATE_ACTION_TYPE_CASH_DIVIDEND',
            status: 'CORPORATE_ACTION_STATUS_COMPLETED',
            processDate: { year: 2026, month: 9, day: 20 },
            tokenSymbol: 'AAPL',
            deployments: [{ contractAddress: TOKEN, chainId: 4663 }],
            details: { cashDividend: { underlyingSymbol: 'AAPL', rate: '0.25' } },
          },
        ],
      });
    }
    return response({}, 404);
  });
}

describe('Robinhood RWA issuer context', () => {
  it('combines official REST data with on-chain multiplier verification', async () => {
    const fetchImpl = upstreamFetch();
    const readOnchain = jest.fn(async () => ({
      attempted: true as const,
      available: true,
      complete: true,
      rpcMode: 'configured' as const,
      tokenUid: ID as `0x${string}`,
      currentMultiplierAtomic: '1001000000000000000',
      newMultiplierAtomic: '1001000000000000000',
      effectiveAt: 0,
      oraclePaused: false,
      verifiedAt: NOW_MS / 1000,
      errorCode: null,
    }));

    const context = await getRobinhoodRwaContext('aapl', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      readOnchain,
      now: () => NOW_MS,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(
      fetchImpl.mock.calls.map(
        ([, init]) => (init as RequestInit & { next: { revalidate: number } }).next.revalidate
      )
    ).toEqual([60, 15, 3600]);
    expect(readOnchain).toHaveBeenCalledWith(TOKEN, expect.any(Object));
    expect(context.asset.tokenSymbol).toBe('AAPL');
    expect(context.source.countsTowardOracleQuorum).toBe(false);
    expect(context.verification.assetIdMatchesOnchain).toBe(true);
    expect(context.verification.quoteDeploymentMatchesAsset).toBe(true);
    expect(context.multiplier.currentMatchesOnchain).toBe(true);
    expect(context.priceNormalization.tokenReferencePriceUsd).toBe('100.2001');
    expect(context.integrity).toMatchObject({ status: 'CLEAR', mayAuthorizeExecution: false });
  });

  it('marks skipped on-chain verification as caution, never as independent evidence', async () => {
    const context = await getRobinhoodRwaContext('AAPL', {
      fetchImpl: upstreamFetch() as unknown as typeof fetch,
      verifyOnchain: false,
      now: () => NOW_MS,
    });

    expect(context.multiplier.onchain.rpcMode).toBe('not-requested');
    expect(context.integrity.status).toBe('CAUTION');
    expect(context.integrity.reasonCodes).toContain('ONCHAIN_VERIFICATION_NOT_REQUESTED');
    expect(context.source.independent).toBe(false);
  });

  it('deduplicates REST reads inside their upstream cache windows', async () => {
    const fetchImpl = upstreamFetch();
    const options = {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      verifyOnchain: false,
      now: () => NOW_MS,
    };

    await Promise.all([
      getRobinhoodRwaContext('AAPL', options),
      getRobinhoodRwaContext('AAPL', options),
    ]);

    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('rejects symbols not present in both the asset and quote registries', async () => {
    await expect(
      getRobinhoodRwaContext('NVDA', {
        fetchImpl: upstreamFetch() as unknown as typeof fetch,
        verifyOnchain: false,
        now: () => NOW_MS,
      })
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_SYMBOL' });
  });

  it('normalizes the documented legacy trading-capability shape', () => {
    const parsed = RobinhoodAssetsResponseSchema.parse({
      assets: [
        {
          id: ID,
          tokenSymbol: 'AAPL',
          tokenName: 'Apple • Robinhood Token',
          deployments: [{ contractAddress: TOKEN, chainId: 4663 }],
          currentMultiplier: '1.000000000000000000',
          pendingMultiplier: '',
          status: 'ASSET_STATUS_ACTIVE',
          tradingCapabilities: {
            fractionalTradability: 'tradable',
            allDayTradability: 'position_closing_only',
            extendedHoursFractionalTradability: false,
          },
        },
      ],
    });

    expect(parsed.assets[0].tradingCapabilities).toEqual({
      market: { whole: null, fractional: 'TRADING_STATUS_TRADABLE' },
      extended: { whole: null, fractional: 'TRADING_STATUS_UNTRADABLE' },
      overnight: { whole: 'TRADING_STATUS_POSITION_CLOSING_ONLY', fractional: null },
    });
  });
});
