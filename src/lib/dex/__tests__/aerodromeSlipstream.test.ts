import { encodeFunctionResult, parseAbi } from 'viem';

import {
  AERODROME_SLIPSTREAM_WETH_USDC,
  AerodromeSlipstreamRpcClient,
  aerodromeSlipstreamWethUsdcProfile,
  assertAerodromeSlipstreamMarketProfile,
  getAerodromeSlipstreamMarketSnapshot,
  type AerodromeSlipstreamMarketProfile,
} from '../aerodromeSlipstream';

const baseProfile: AerodromeSlipstreamMarketProfile = {
  ...aerodromeSlipstreamWethUsdcProfile(),
  rpcEndpoints: ['https://example.invalid'],
};

const factoryAbi = parseAbi([
  'function getPool(address tokenA,address tokenB,int24 tickSpacing) view returns (address)',
]);
const poolAbi = parseAbi([
  'function factory() view returns (address)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function tickSpacing() view returns (int24)',
  'function fee() view returns (uint24)',
  'function liquidity() view returns (uint128)',
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, bool unlocked)',
  'function observe(uint32[] secondsAgos) view returns (int56[] tickCumulatives, uint160[] secondsPerLiquidityCumulativeX128s)',
]);
const erc20Abi = parseAbi(['function balanceOf(address) view returns (uint256)']);
const quoterAbi = parseAbi([
  'function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,int24 tickSpacing,uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)',
]);

class FixtureRpc extends AerodromeSlipstreamRpcClient {
  private quoteCalls = 0;

  constructor() {
    super(baseProfile.rpcEndpoints);
  }

  override async getBlockNumber(): Promise<bigint> {
    return 123n;
  }

  override async getBlock(): Promise<{ number: bigint; hash: `0x${string}`; timestamp: number }> {
    return {
      number: 123n,
      hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  override async call(_to: `0x${string}`, data: `0x${string}`): Promise<`0x${string}`> {
    switch (data.slice(0, 10)) {
      case '0x28af8d0b':
        return encodeFunctionResult({
          abi: factoryAbi,
          functionName: 'getPool',
          result: baseProfile.pool,
        });
      case '0xc45a0155':
        return encodeFunctionResult({
          abi: poolAbi,
          functionName: 'factory',
          result: baseProfile.factory,
        });
      case '0x0dfe1681':
        return encodeFunctionResult({
          abi: poolAbi,
          functionName: 'token0',
          result: baseProfile.token0.address,
        });
      case '0xd21220a7':
        return encodeFunctionResult({
          abi: poolAbi,
          functionName: 'token1',
          result: baseProfile.token1.address,
        });
      case '0xd0c93a7c':
        return encodeFunctionResult({
          abi: poolAbi,
          functionName: 'tickSpacing',
          result: baseProfile.tickSpacing,
        });
      case '0xddca3f43':
        return encodeFunctionResult({ abi: poolAbi, functionName: 'fee', result: 150 });
      case '0x1a686502':
        return encodeFunctionResult({
          abi: poolAbi,
          functionName: 'liquidity',
          result: 1_000_000n,
        });
      case '0x3850c7bd':
        return encodeFunctionResult({
          abi: poolAbi,
          functionName: 'slot0',
          result: [79228162514264337593543950336n, 0, 0, 2, 2, true],
        });
      case '0x883bdbfd':
        return encodeFunctionResult({
          abi: poolAbi,
          functionName: 'observe',
          result: [
            [0n, 0n],
            [0n, 0n],
          ],
        });
      case '0x70a08231':
        return encodeFunctionResult({
          abi: erc20Abi,
          functionName: 'balanceOf',
          result: 2_000_000n,
        });
      case '0x9e7defe6': {
        const amountOut = [1_000_000n, 9_900_000n, 90_000_000n][this.quoteCalls++]!;
        return encodeFunctionResult({
          abi: quoterAbi,
          functionName: 'quoteExactInputSingle',
          result: [amountOut, 0n, 1, 100_000n],
        });
      }
      default:
        throw new Error(`Unexpected fixture call selector ${data.slice(0, 10)}`);
    }
  }
}

describe('Aerodrome Slipstream Base market evidence', () => {
  it('pins Aerodrome’s reviewed Base WETH/USDC CL100 identity', () => {
    expect(AERODROME_SLIPSTREAM_WETH_USDC).toMatchObject({
      pool: '0xb2cc224c1c9feE385f8ad6a55b4d94E92359DC59',
      tickSpacing: 100,
      token0Symbol: 'WETH',
      token1Symbol: 'USDC',
      twapWindowSeconds: 1_800,
    });
    expect(aerodromeSlipstreamWethUsdcProfile()).toMatchObject({
      id: 'base-aerodrome-slipstream-weth-usdc-cl100',
      venue: 'aerodrome-slipstream',
      chainId: 8453,
      market: 'WETH/USDC',
      quoteAmountsToken0: [1, 10, 100],
    });
  });

  it('rejects an invalid Slipstream tick spacing before any RPC read', () => {
    expect(() =>
      assertAerodromeSlipstreamMarketProfile({ ...baseProfile, tickSpacing: 16_384 })
    ).toThrow('invalid numeric configuration');
  });

  it('returns block-pinned Slipstream evidence with provenance and live fee checks', async () => {
    const snapshot = await getAerodromeSlipstreamMarketSnapshot({
      rpc: new FixtureRpc(),
      nowMs: Date.now(),
    });

    expect(snapshot).toMatchObject({
      chainId: 8453,
      market: 'WETH/USDC',
      venue: 'aerodrome-slipstream',
      block: { number: '123' },
      contracts: {
        factory: baseProfile.factory,
        quoterV2: baseProfile.quoterV2,
        pool: baseProfile.pool,
        tickSpacing: 100,
        feePips: 150,
      },
      poolBalances: { token0: 0.000000000002, token1: 2 },
    });
    expect(snapshot.quotes[0]).toMatchObject({ amountIn: 1, amountOut: 1, priceImpactBps: 0 });
    expect(snapshot.quotes[1]).toMatchObject({ amountIn: 10, amountOut: 9.9 });
    expect(snapshot.quotes[1]?.priceImpactBps).toBeCloseTo(100, 8);
  });
});
