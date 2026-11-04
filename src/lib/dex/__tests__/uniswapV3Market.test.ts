import { encodeFunctionResult, keccak256, parseAbi } from 'viem';

import {
  assertUniswapV3MarketProfile,
  getUniswapV3MarketSnapshot,
  uniswapV3ArithmeticMeanTick,
  uniswapV3Token1PerToken0FromTick,
  UniswapV3MarketRpcClient,
  type UniswapV3MarketProfile,
} from '../uniswapV3Market';

const baseProfile: UniswapV3MarketProfile = {
  id: 'example-uniswap-v3-token-usdc',
  chainId: 8453,
  venue: 'uniswap-v3',
  market: 'TOKEN/USDC',
  factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
  pool: '0x0000000000000000000000000000000000000001',
  token0: { address: '0x0000000000000000000000000000000000000002', symbol: 'TOKEN', decimals: 18 },
  token1: { address: '0x0000000000000000000000000000000000000003', symbol: 'USDC', decimals: 6 },
  feeTier: 3_000,
  twapWindowSeconds: 900,
  quoteAmountsToken0: [1, 1_000],
  rpcEndpoints: ['https://example.invalid'],
  maxSourceAgeSeconds: 120,
  cacheTtlMs: 10_000,
};

const factoryAbi = parseAbi(['function getPool(address,address,uint24) view returns (address)']);
const poolAbi = parseAbi([
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)',
  'function liquidity() view returns (uint128)',
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function observe(uint32[] secondsAgos) view returns (int56[] tickCumulatives, uint160[] secondsPerLiquidityCumulativeX128s)',
]);
const erc20Abi = parseAbi(['function balanceOf(address) view returns (uint256)']);
const quoterAbi = parseAbi([
  'function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)',
]);

const fixtureRuntimeCode = {
  factory: '0x60016000',
  quoter: '0x60026000',
  pool: '0x60036000',
} as const;

class FixtureRpc extends UniswapV3MarketRpcClient {
  private quoteCalls = 0;

  constructor() {
    super(baseProfile.chainId, baseProfile.rpcEndpoints);
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

  override async getCode(address: `0x${string}`): Promise<`0x${string}`> {
    if (address.toLowerCase() === baseProfile.factory.toLowerCase())
      return fixtureRuntimeCode.factory;
    if (address.toLowerCase() === baseProfile.quoterV2.toLowerCase())
      return fixtureRuntimeCode.quoter;
    if (address.toLowerCase() === baseProfile.pool.toLowerCase()) return fixtureRuntimeCode.pool;
    throw new Error(`Unexpected fixture code request ${address}`);
  }

  override async call(_to: `0x${string}`, data: `0x${string}`): Promise<`0x${string}`> {
    switch (data.slice(0, 10)) {
      case '0x1698ee82':
        return encodeFunctionResult({
          abi: factoryAbi,
          functionName: 'getPool',
          result: baseProfile.pool,
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
      case '0xddca3f43':
        return encodeFunctionResult({ abi: poolAbi, functionName: 'fee', result: 3_000 });
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
          result: [79228162514264337593543950336n, 0, 0, 2, 2, 0, true],
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
      case '0xc6a5026a': {
        const amountOut = this.quoteCalls++ === 0 ? 1_000_000n : 990_000_000n;
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

describe('shared Uniswap V3 market evidence primitives', () => {
  it('keeps negative arithmetic-mean ticks aligned with Uniswap floor division', () => {
    expect(uniswapV3ArithmeticMeanTick(0n, -283_347_001n, 900)).toBe(-314_831);
  });

  it('calculates a token1-per-token0 price from each profile decimal scale', () => {
    expect(uniswapV3Token1PerToken0FromTick(-314_841, 18, 6)).toBeCloseTo(0.0212477391, 10);
    expect(uniswapV3Token1PerToken0FromTick(0, 6, 6)).toBe(1);
  });

  it('admits a non-Monad reviewed profile without inheriting Monad identity', () => {
    expect(() => assertUniswapV3MarketProfile(baseProfile)).not.toThrow();
  });

  it('rejects a profile whose token metadata cannot identify two assets', () => {
    expect(() =>
      assertUniswapV3MarketProfile({
        ...baseProfile,
        token1: { ...baseProfile.token0 },
      })
    ).toThrow('reuses one token address');
  });

  it('returns a block-pinned snapshot with generic profile labels and an exact quote ladder', async () => {
    const snapshot = await getUniswapV3MarketSnapshot(baseProfile, {
      rpc: new FixtureRpc(),
      nowMs: Date.now(),
    });

    expect(snapshot).toMatchObject({
      chainId: 8453,
      market: 'TOKEN/USDC',
      venue: 'uniswap-v3',
      block: { number: '123' },
      contracts: { pool: baseProfile.pool },
      poolBalances: { token0: 0.000000000002, token1: 2 },
    });
    expect(snapshot.quotes[0]).toMatchObject({ amountIn: 1, amountOut: 1, priceImpactBps: 0 });
    expect(snapshot.quotes[1]).toMatchObject({ amountIn: 1_000, amountOut: 990 });
    expect(snapshot.quotes[1]?.priceImpactBps).toBeCloseTo(100, 8);
  });

  it('re-verifies a configured factory, quoter, and pool code identity at the pinned block', async () => {
    const profile: UniswapV3MarketProfile = {
      ...baseProfile,
      codeIdentity: {
        factory: keccak256(fixtureRuntimeCode.factory),
        quoterV2: keccak256(fixtureRuntimeCode.quoter),
        pool: keccak256(fixtureRuntimeCode.pool),
      },
    };
    const snapshot = await getUniswapV3MarketSnapshot(profile, {
      rpc: new FixtureRpc(),
      nowMs: Date.now(),
    });
    expect(snapshot.contracts.codeIdentity).toEqual(profile.codeIdentity);

    await expect(
      getUniswapV3MarketSnapshot(
        {
          ...profile,
          id: 'bad-code',
          codeIdentity: { ...profile.codeIdentity, pool: `0x${'00'.repeat(32)}` },
        },
        { rpc: new FixtureRpc(), nowMs: Date.now() }
      )
    ).rejects.toThrow('runtime code');
  });

  it('rejects an unordered quote ladder before it can distort price-impact evidence', () => {
    expect(() =>
      assertUniswapV3MarketProfile({ ...baseProfile, quoteAmountsToken0: [1_000, 1] })
    ).toThrow('invalid numeric configuration');
  });

  it('admits exact base-unit quote amounts for a transaction-bound pre-trade read', () => {
    expect(() =>
      assertUniswapV3MarketProfile({
        ...baseProfile,
        id: 'example-exact-input',
        quoteAmountsToken0: undefined,
        quoteAmountsToken0Raw: [1_234_567_890_123_456_789n],
      })
    ).not.toThrow();
  });

  it('rejects values that do not fit the Uniswap ABI integer fields', () => {
    expect(() => assertUniswapV3MarketProfile({ ...baseProfile, feeTier: 2 ** 24 })).toThrow(
      'invalid numeric configuration'
    );
    expect(() =>
      assertUniswapV3MarketProfile({ ...baseProfile, twapWindowSeconds: 2 ** 32 })
    ).toThrow('invalid numeric configuration');
  });
});
