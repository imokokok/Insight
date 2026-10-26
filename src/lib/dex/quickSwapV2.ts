import {
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  isAddress,
  keccak256,
  parseAbi,
} from 'viem';

import { CHAINLINK_RPC_CONFIG } from '@/lib/oracles/services/chainlinkDataSources/rpcConfig';

import { UniswapV3MarketRpcClient, type UniswapV3Hex } from './uniswapV3Market';

/**
 * A deliberately single-pool, read-only QuickSwap V2 integration. Insight
 * pins the factory, router, pair, token order, and reserves at the same Base
 * block; it does not expose transaction preparation for this pair.
 */
export const QUICKSWAP_V2_BASE_CHAIN_ID = 8453;
export const QUICKSWAP_V2_BASE_FACTORY = '0xEC6540261aaaE13F236A032d454dc9287E52e56A' as const;
export const QUICKSWAP_V2_BASE_ROUTER = '0x4a012af2b05616Fb390ED32452641C3F04633bb5' as const;
export const QUICKSWAP_V2_BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
export const QUICKSWAP_V2_BASE_USDT = '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2' as const;

export const QUICKSWAP_V2_BASE_CODE_IDENTITY = {
  factory: '0xbab145d02e7005f0d84c6c1639d39b799b0ea16df99ebbdaf5a14d9da820b4e0',
  router: '0xb5e20c5b15af401f9eb25bf99e713c71d2fa9c3ef0f003cd602358e3c9f7b6a1',
  pair: '0x5b83bdbcc56b2e630f2807bbadd2b0c21619108066b92a58de081261089e9ce5',
} as const;

export const QUICKSWAP_V2_BASE_USDC_USDT = {
  pair: '0x7fb81993af9c46a5b487be991f44feed77e82074' as const,
  /** Classic V2 fee encoded by the reviewed router's `997 / 1000` formula. */
  feeBps: 30,
  token0: QUICKSWAP_V2_BASE_USDC,
  token1: QUICKSWAP_V2_BASE_USDT,
} as const;

export const REVIEWED_QUICKSWAP_V2_PROFILE_IDS = ['base-quickswap-v2-usdc-usdt'] as const;

const FACTORY_ABI = parseAbi([
  'function getPair(address tokenA,address tokenB) view returns (address)',
]);
const PAIR_ABI = parseAbi([
  'function factory() view returns (address)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint112 reserve0,uint112 reserve1,uint32 blockTimestampLast)',
]);
const ROUTER_ABI = parseAbi([
  'function factory() view returns (address)',
  'function WETH() view returns (address)',
]);
const MAX_SOURCE_AGE_SECONDS = 120;
/** Both sides must clear this floor before the pair can leave the unavailable state. */
const MINIMUM_EXECUTION_RESERVE_RAW = 1_000_000_000n; // 1,000 units at six decimals

export interface QuickSwapV2MarketSnapshot {
  source: 'dex-market';
  venue: 'quickswap-v2';
  chainId: typeof QUICKSWAP_V2_BASE_CHAIN_ID;
  market: 'USDC/USDT';
  sourceFreshnessSeconds: number;
  observedAt: string;
  block: { number: string; hash: UniswapV3Hex; timestamp: string };
  contracts: {
    factory: typeof QUICKSWAP_V2_BASE_FACTORY;
    router: typeof QUICKSWAP_V2_BASE_ROUTER;
    pair: typeof QUICKSWAP_V2_BASE_USDC_USDT.pair;
    token0: typeof QUICKSWAP_V2_BASE_USDC;
    token1: typeof QUICKSWAP_V2_BASE_USDT;
    feeBps: number;
    codeIdentity: typeof QUICKSWAP_V2_BASE_CODE_IDENTITY;
  };
  reserves: { token0Raw: string; token0: number; token1Raw: string; token1: number };
  executionReadiness: {
    status: 'unavailable' | 'review-required';
    reason: string;
  };
  spot: { token1PerToken0: number };
  quotes: Array<{
    amountIn: number;
    amountInRaw: string;
    amountOut: number;
    amountOutRaw: string;
    effectiveToken1PerToken0: number;
    priceImpactBps: number;
  }>;
}

export class QuickSwapV2MarketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuickSwapV2MarketError';
  }
}

function baseRpcEndpoints(): string[] {
  return [
    ...new Set(
      (CHAINLINK_RPC_CONFIG[QUICKSWAP_V2_BASE_CHAIN_ID]?.endpoints ?? []).filter((endpoint) => {
        try {
          return new URL(endpoint).protocol === 'https:';
        } catch {
          return false;
        }
      })
    ),
  ];
}

export class QuickSwapV2BaseRpcClient extends UniswapV3MarketRpcClient {
  constructor(endpoints: string[] = baseRpcEndpoints()) {
    super(QUICKSWAP_V2_BASE_CHAIN_ID, endpoints);
  }
}

function decodeAddress(
  data: UniswapV3Hex,
  abi: typeof FACTORY_ABI | typeof PAIR_ABI | typeof ROUTER_ABI,
  functionName: string,
  field: string
): UniswapV3Hex {
  const value = String(
    decodeFunctionResult({ abi, functionName: functionName as never, data } as never)
  );
  if (!isAddress(value))
    throw new QuickSwapV2MarketError(`QuickSwap V2 returned an invalid ${field}.`);
  return getAddress(value) as UniswapV3Hex;
}

function assertCode(code: UniswapV3Hex, expected: string, label: string): void {
  if (code === '0x' || keccak256(code).toLowerCase() !== expected.toLowerCase()) {
    throw new QuickSwapV2MarketError(
      `${label} runtime code does not match the reviewed deployment.`
    );
  }
}

function priceImpactBps(
  amountIn: bigint,
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  const spot = Number(reserveOut) / Number(reserveIn);
  const effective = Number(amountOut) / Number(amountIn);
  if (!Number.isFinite(spot) || !Number.isFinite(effective) || spot <= 0 || effective <= 0) {
    throw new QuickSwapV2MarketError('QuickSwap V2 quote cannot derive price impact.');
  }
  return ((spot - effective) / spot) * 10_000;
}

/** Exact V2 output under the audited router's 0.30% pool fee formula. */
export function quickSwapV2AmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) {
    throw new QuickSwapV2MarketError('QuickSwap V2 reserves or amount are not positive.');
  }
  const amountInWithFee = amountIn * 997n;
  const denominator = reserveIn * 1_000n + amountInWithFee;
  const amountOut = (amountInWithFee * reserveOut) / denominator;
  if (amountOut <= 0n || amountOut >= reserveOut) {
    throw new QuickSwapV2MarketError('QuickSwap V2 pool cannot quote the requested exact input.');
  }
  return amountOut;
}

async function quickSwapV2Snapshot(
  quoteAmountsRaw: readonly bigint[],
  options: { rpc?: QuickSwapV2BaseRpcClient; nowMs?: number; signal?: AbortSignal } = {}
): Promise<QuickSwapV2MarketSnapshot> {
  if (quoteAmountsRaw.length === 0 || quoteAmountsRaw.some((value) => value <= 0n)) {
    throw new QuickSwapV2MarketError('QuickSwap V2 quote ladder is invalid.');
  }
  const rpc = options.rpc ?? new QuickSwapV2BaseRpcClient();
  const nowMs = options.nowMs ?? Date.now();
  const blockNumber = await rpc.getBlockNumber(options.signal);
  const [
    block,
    factoryCode,
    routerCode,
    pairCode,
    pairAddressData,
    pairFactoryData,
    token0Data,
    token1Data,
    reservesData,
    routerFactoryData,
    wethData,
  ] = await Promise.all([
    rpc.getBlock(blockNumber, options.signal),
    rpc.getCode(QUICKSWAP_V2_BASE_FACTORY, blockNumber, options.signal),
    rpc.getCode(QUICKSWAP_V2_BASE_ROUTER, blockNumber, options.signal),
    rpc.getCode(QUICKSWAP_V2_BASE_USDC_USDT.pair, blockNumber, options.signal),
    rpc.call(
      QUICKSWAP_V2_BASE_FACTORY,
      encodeFunctionData({
        abi: FACTORY_ABI,
        functionName: 'getPair',
        args: [QUICKSWAP_V2_BASE_USDC, QUICKSWAP_V2_BASE_USDT],
      }),
      blockNumber,
      options.signal
    ),
    rpc.call(
      QUICKSWAP_V2_BASE_USDC_USDT.pair,
      encodeFunctionData({ abi: PAIR_ABI, functionName: 'factory' }),
      blockNumber,
      options.signal
    ),
    rpc.call(
      QUICKSWAP_V2_BASE_USDC_USDT.pair,
      encodeFunctionData({ abi: PAIR_ABI, functionName: 'token0' }),
      blockNumber,
      options.signal
    ),
    rpc.call(
      QUICKSWAP_V2_BASE_USDC_USDT.pair,
      encodeFunctionData({ abi: PAIR_ABI, functionName: 'token1' }),
      blockNumber,
      options.signal
    ),
    rpc.call(
      QUICKSWAP_V2_BASE_USDC_USDT.pair,
      encodeFunctionData({ abi: PAIR_ABI, functionName: 'getReserves' }),
      blockNumber,
      options.signal
    ),
    rpc.call(
      QUICKSWAP_V2_BASE_ROUTER,
      encodeFunctionData({ abi: ROUTER_ABI, functionName: 'factory' }),
      blockNumber,
      options.signal
    ),
    rpc.call(
      QUICKSWAP_V2_BASE_ROUTER,
      encodeFunctionData({ abi: ROUTER_ABI, functionName: 'WETH' }),
      blockNumber,
      options.signal
    ),
  ]);
  const sourceFreshnessSeconds = Math.max(0, nowMs / 1_000 - block.timestamp);
  if (sourceFreshnessSeconds > MAX_SOURCE_AGE_SECONDS || block.timestamp * 1_000 > nowMs + 1_000) {
    throw new QuickSwapV2MarketError('QuickSwap V2 Base source block is stale or future-dated.');
  }
  assertCode(factoryCode, QUICKSWAP_V2_BASE_CODE_IDENTITY.factory, 'QuickSwap V2 factory');
  assertCode(routerCode, QUICKSWAP_V2_BASE_CODE_IDENTITY.router, 'QuickSwap V2 router');
  assertCode(pairCode, QUICKSWAP_V2_BASE_CODE_IDENTITY.pair, 'QuickSwap V2 pair');
  const pairAddress = decodeAddress(pairAddressData, FACTORY_ABI, 'getPair', 'factory pair');
  const pairFactory = decodeAddress(pairFactoryData, PAIR_ABI, 'factory', 'pair factory');
  const token0 = decodeAddress(token0Data, PAIR_ABI, 'token0', 'pair token0');
  const token1 = decodeAddress(token1Data, PAIR_ABI, 'token1', 'pair token1');
  const routerFactory = decodeAddress(routerFactoryData, ROUTER_ABI, 'factory', 'router factory');
  const routerWeth = decodeAddress(wethData, ROUTER_ABI, 'WETH', 'router WETH');
  if (
    pairAddress.toLowerCase() !== QUICKSWAP_V2_BASE_USDC_USDT.pair ||
    pairFactory.toLowerCase() !== QUICKSWAP_V2_BASE_FACTORY.toLowerCase() ||
    routerFactory.toLowerCase() !== QUICKSWAP_V2_BASE_FACTORY.toLowerCase() ||
    token0.toLowerCase() !== QUICKSWAP_V2_BASE_USDC.toLowerCase() ||
    token1.toLowerCase() !== QUICKSWAP_V2_BASE_USDT.toLowerCase() ||
    routerWeth.toLowerCase() !== '0x4200000000000000000000000000000000000006'
  ) {
    throw new QuickSwapV2MarketError(
      'QuickSwap V2 router or pair bindings do not match the reviewed pool.'
    );
  }
  const decodedReserves = decodeFunctionResult({
    abi: PAIR_ABI,
    functionName: 'getReserves',
    data: reservesData,
  });
  const reserve0 = decodedReserves[0];
  const reserve1 = decodedReserves[1];
  if (reserve0 <= 0n || reserve1 <= 0n)
    throw new QuickSwapV2MarketError('QuickSwap V2 pair has no usable reserves.');
  const spot = Number(reserve1) / Number(reserve0);
  if (!Number.isFinite(spot) || spot <= 0)
    throw new QuickSwapV2MarketError('QuickSwap V2 pair spot price is invalid.');
  return {
    source: 'dex-market',
    venue: 'quickswap-v2',
    chainId: QUICKSWAP_V2_BASE_CHAIN_ID,
    market: 'USDC/USDT',
    sourceFreshnessSeconds,
    observedAt: new Date(nowMs).toISOString(),
    block: {
      number: block.number.toString(),
      hash: block.hash,
      timestamp: new Date(block.timestamp * 1_000).toISOString(),
    },
    contracts: {
      factory: QUICKSWAP_V2_BASE_FACTORY,
      router: QUICKSWAP_V2_BASE_ROUTER,
      pair: QUICKSWAP_V2_BASE_USDC_USDT.pair,
      token0: QUICKSWAP_V2_BASE_USDC,
      token1: QUICKSWAP_V2_BASE_USDT,
      feeBps: QUICKSWAP_V2_BASE_USDC_USDT.feeBps,
      codeIdentity: QUICKSWAP_V2_BASE_CODE_IDENTITY,
    },
    reserves: {
      token0Raw: reserve0.toString(),
      token0: Number(reserve0) / 1e6,
      token1Raw: reserve1.toString(),
      token1: Number(reserve1) / 1e6,
    },
    executionReadiness:
      reserve0 < MINIMUM_EXECUTION_RESERVE_RAW || reserve1 < MINIMUM_EXECUTION_RESERVE_RAW
        ? {
            status: 'unavailable',
            reason:
              'Reviewed pair reserves are below Insight’s minimum execution-capacity floor; transaction preparation remains fail-closed.',
          }
        : {
            status: 'review-required',
            reason:
              'Reserve capacity is present, but enabling a new V2 transaction lane still requires a separately reviewed profile and settlement test.',
          },
    spot: { token1PerToken0: spot },
    quotes: quoteAmountsRaw.map((amountInRaw) => {
      const amountOutRaw = quickSwapV2AmountOut(amountInRaw, reserve0, reserve1);
      return {
        amountIn: Number(amountInRaw) / 1e6,
        amountInRaw: amountInRaw.toString(),
        amountOut: Number(amountOutRaw) / 1e6,
        amountOutRaw: amountOutRaw.toString(),
        effectiveToken1PerToken0: Number(amountOutRaw) / Number(amountInRaw),
        priceImpactBps: priceImpactBps(amountInRaw, amountOutRaw, reserve0, reserve1),
      };
    }),
  };
}

export async function getQuickSwapV2BaseMarketSnapshot(
  options: { rpc?: QuickSwapV2BaseRpcClient; nowMs?: number; signal?: AbortSignal } = {}
): Promise<QuickSwapV2MarketSnapshot> {
  return quickSwapV2Snapshot([1_000_000n, 10_000_000n, 100_000_000n], options);
}
