import {
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  isAddress,
  keccak256,
  parseAbi,
} from 'viem';

export type UniswapV3Hex = `0x${string}`;
/**
 * Protocols whose reviewed pools expose the canonical Uniswap V3 pool and
 * quoter interfaces.  This is deliberately a protocol label, not an ABI
 * inference: every non-Uniswap deployment still needs its own identity pins.
 */
export type UniswapV3CompatibleVenue = 'uniswap-v3' | 'pancakeswap-v3';

export interface UniswapV3MarketToken {
  address: UniswapV3Hex;
  symbol: string;
  decimals: number;
}

/**
 * Runtime bytecode pins for a reviewed V3 deployment.  A shared ABI is not
 * sufficient provenance: forks can retain the ABI while replacing the
 * implementation or periphery contracts.
 */
export interface UniswapV3CodeIdentity {
  factory: UniswapV3Hex;
  quoterV2: UniswapV3Hex;
  pool: UniswapV3Hex;
}

/**
 * Reviewed configuration for one Uniswap V3 pool on one EVM network.
 *
 * This is deliberately a market-evidence profile rather than an oracle
 * configuration. A profile pins the contracts and pool that a caller asks
 * Insight to observe; it never claims one venue is a fair-price oracle.
 */
export interface UniswapV3MarketProfile {
  id: string;
  chainId: number;
  venue: UniswapV3CompatibleVenue;
  market: string;
  factory: UniswapV3Hex;
  quoterV2: UniswapV3Hex;
  pool: UniswapV3Hex;
  /** Optional for legacy profiles; mandatory for new allowlisted integrations. */
  codeIdentity?: UniswapV3CodeIdentity;
  token0: UniswapV3MarketToken;
  token1: UniswapV3MarketToken;
  feeTier: number;
  twapWindowSeconds: number;
  /** Exact-input quote ladder expressed in whole token0 units. */
  quoteAmountsToken0?: readonly number[];
  /**
   * Exact-input quote ladder expressed in token0 base units.  This is used by
   * the pre-trade path, where rounding an intended amount to a whole token
   * would make the evidence describe a different trade.  It is deliberately
   * not accepted at an HTTP boundary: reviewed callers construct it only after
   * strict decimal parsing.
   */
  quoteAmountsToken0Raw?: readonly bigint[];
  /** Independently configured HTTPS JSON-RPC endpoints for this network. */
  rpcEndpoints: readonly string[];
  /** Maximum permitted age of the block that supplies a live observation. */
  maxSourceAgeSeconds: number;
  /** Short cache for equivalent live evidence requests. */
  cacheTtlMs: number;
}

export interface UniswapV3MarketBlock {
  number: bigint;
  hash: UniswapV3Hex;
  timestamp: number;
}

export interface UniswapV3RawLog {
  address: UniswapV3Hex;
  blockHash: UniswapV3Hex;
  blockNumber: bigint;
  data: UniswapV3Hex;
  logIndex: bigint;
  topics: UniswapV3Hex[];
  transactionHash: UniswapV3Hex;
}

export interface UniswapV3MarketQuote {
  amountIn: number;
  amountInRaw: string;
  amountOut: number;
  amountOutRaw: string;
  /** token1 received per token0 submitted. */
  effectiveToken1PerToken0: number;
  initializedTicksCrossed: number;
  priceImpactBps: number;
}

export interface UniswapV3MarketSnapshot {
  source: 'dex-market';
  venue: UniswapV3CompatibleVenue;
  chainId: number;
  market: string;
  sourceFreshnessSeconds: number;
  observedAt: string;
  block: {
    number: string;
    hash: UniswapV3Hex;
    timestamp: string;
  };
  contracts: {
    factory: UniswapV3Hex;
    quoterV2: UniswapV3Hex;
    pool: UniswapV3Hex;
    token0: UniswapV3Hex;
    token1: UniswapV3Hex;
    feeTier: number;
    /** Runtime identities re-verified at the pinned block when configured. */
    codeIdentity?: UniswapV3CodeIdentity;
  };
  spot: {
    tick: number;
    token1PerToken0: number;
  };
  twap: {
    windowSeconds: number;
    tick: number;
    token1PerToken0: number;
    deviationBpsFromSpot: number;
  };
  activeLiquidityRaw: string;
  poolBalances: {
    token0Raw: string;
    token0: number;
    token1Raw: string;
    token1: number;
  };
  quotes: UniswapV3MarketQuote[];
}

export class UniswapV3MarketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UniswapV3MarketError';
  }
}

const FACTORY_ABI = parseAbi(['function getPool(address,address,uint24) view returns (address)']);
const POOL_ABI = parseAbi([
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)',
  'function liquidity() view returns (uint128)',
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function observe(uint32[] secondsAgos) view returns (int56[] tickCumulatives, uint160[] secondsPerLiquidityCumulativeX128s)',
]);
const ERC20_ABI = parseAbi(['function balanceOf(address) view returns (uint256)']);
const QUOTER_ABI = parseAbi([
  'function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)',
]);
const MAX_UINT24 = 2 ** 24 - 1;
const MAX_UINT32 = 2 ** 32 - 1;

type RpcRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RpcRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asHex(value: unknown, field: string): UniswapV3Hex {
  if (typeof value !== 'string' || !/^0x(?:[0-9a-fA-F]{2})*$/.test(value)) {
    throw new UniswapV3MarketError(`Uniswap V3 RPC returned an invalid ${field}.`);
  }
  return value as UniswapV3Hex;
}

function asHexQuantity(value: unknown, field: string): bigint {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]+$/.test(value)) {
    throw new UniswapV3MarketError(`Uniswap V3 RPC returned an invalid ${field}.`);
  }
  try {
    return BigInt(value);
  } catch {
    throw new UniswapV3MarketError(`Uniswap V3 RPC returned an invalid ${field}.`);
  }
}

function isSafePositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

/** Validate every runtime-controlled boundary in a reviewed profile. */
export function assertUniswapV3MarketProfile(profile: UniswapV3MarketProfile): void {
  if (!profile.id || !profile.market || !isSafePositiveInteger(profile.chainId)) {
    throw new UniswapV3MarketError('Uniswap V3 market profile has invalid identity metadata.');
  }
  if (profile.venue !== 'uniswap-v3' && profile.venue !== 'pancakeswap-v3') {
    throw new UniswapV3MarketError('Uniswap V3 market profile has an unsupported venue.');
  }
  for (const [label, address] of [
    ['factory', profile.factory],
    ['quoterV2', profile.quoterV2],
    ['pool', profile.pool],
    ['token0', profile.token0.address],
    ['token1', profile.token1.address],
  ] as const) {
    if (!isAddress(address)) {
      throw new UniswapV3MarketError(`Uniswap V3 market profile has an invalid ${label} address.`);
    }
  }
  if (profile.token0.address.toLowerCase() === profile.token1.address.toLowerCase()) {
    throw new UniswapV3MarketError('Uniswap V3 market profile reuses one token address.');
  }
  if (
    !profile.token0.symbol ||
    !profile.token1.symbol ||
    !Number.isSafeInteger(profile.token0.decimals) ||
    !Number.isSafeInteger(profile.token1.decimals) ||
    profile.token0.decimals < 0 ||
    profile.token0.decimals > 36 ||
    profile.token1.decimals < 0 ||
    profile.token1.decimals > 36
  ) {
    throw new UniswapV3MarketError('Uniswap V3 market profile has invalid token metadata.');
  }
  if (
    !isSafePositiveInteger(profile.feeTier) ||
    profile.feeTier > MAX_UINT24 ||
    !isSafePositiveInteger(profile.twapWindowSeconds) ||
    profile.twapWindowSeconds > MAX_UINT32 ||
    !isSafePositiveInteger(profile.maxSourceAgeSeconds) ||
    !isSafePositiveInteger(profile.cacheTtlMs) ||
    ((!profile.quoteAmountsToken0 || profile.quoteAmountsToken0.length === 0) &&
      (!profile.quoteAmountsToken0Raw || profile.quoteAmountsToken0Raw.length === 0)) ||
    (profile.quoteAmountsToken0 !== undefined && profile.quoteAmountsToken0Raw !== undefined) ||
    (profile.quoteAmountsToken0 !== undefined &&
      profile.quoteAmountsToken0.some(
        (amount, index) =>
          !Number.isSafeInteger(amount) ||
          amount <= 0 ||
          (index > 0 && amount <= profile.quoteAmountsToken0![index - 1]!)
      )) ||
    (profile.quoteAmountsToken0Raw !== undefined &&
      profile.quoteAmountsToken0Raw.some(
        (amount, index) =>
          amount <= 0n || (index > 0 && amount <= profile.quoteAmountsToken0Raw![index - 1]!)
      ))
  ) {
    throw new UniswapV3MarketError('Uniswap V3 market profile has invalid numeric configuration.');
  }
  if (
    profile.codeIdentity &&
    Object.values(profile.codeIdentity).some((hash) => !/^0x[0-9a-fA-F]{64}$/.test(hash))
  ) {
    throw new UniswapV3MarketError('Uniswap V3 market profile has an invalid code identity.');
  }
  if (
    profile.rpcEndpoints.length === 0 ||
    profile.rpcEndpoints.some((endpoint) => {
      try {
        return new URL(endpoint).protocol !== 'https:';
      } catch {
        return true;
      }
    })
  ) {
    throw new UniswapV3MarketError('Uniswap V3 market profile has no valid HTTPS RPC endpoint.');
  }
}

/** Minimal validated JSON-RPC reader reusable by reviewed EVM market profiles. */
export class UniswapV3MarketRpcClient {
  private readonly endpoints: readonly string[];

  constructor(
    private readonly chainId: number,
    endpoints: readonly string[]
  ) {
    this.endpoints = endpoints;
  }

  private async request(method: string, params: unknown[], signal?: AbortSignal): Promise<unknown> {
    if (this.endpoints.length === 0) {
      throw new UniswapV3MarketError('No Uniswap V3 RPC endpoint is configured.');
    }

    for (const endpoint of this.endpoints) {
      const timeout = new AbortController();
      const timeoutId = setTimeout(() => timeout.abort(), 8_000);
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
          signal: signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal,
        });
        if (!response.ok) continue;
        const body: unknown = await response.json();
        if (!isRecord(body) || !('result' in body) || body.error !== undefined) continue;
        return body.result;
      } catch {
        // Try the next independently configured endpoint. Provider-specific
        // errors and URLs may include credentials and never reach callers.
      } finally {
        clearTimeout(timeoutId);
      }
    }
    throw new UniswapV3MarketError(`Uniswap V3 RPC ${method} is unavailable.`);
  }

  async getChainId(signal?: AbortSignal): Promise<number> {
    const chainId = asHexQuantity(await this.request('eth_chainId', [], signal), 'chain ID');
    if (chainId !== BigInt(this.chainId)) {
      throw new UniswapV3MarketError('Uniswap V3 RPC returned an unexpected chain ID.');
    }
    return Number(chainId);
  }

  async getBlockNumber(signal?: AbortSignal): Promise<bigint> {
    await this.getChainId(signal);
    return asHexQuantity(await this.request('eth_blockNumber', [], signal), 'block number');
  }

  async getBlock(blockNumber: bigint, signal?: AbortSignal): Promise<UniswapV3MarketBlock> {
    const raw = await this.request(
      'eth_getBlockByNumber',
      [`0x${blockNumber.toString(16)}`, false],
      signal
    );
    if (!isRecord(raw)) throw new UniswapV3MarketError('Uniswap V3 RPC returned an invalid block.');
    const number = asHexQuantity(raw.number, 'block number');
    const timestamp = asHexQuantity(raw.timestamp, 'block timestamp');
    const hash = asHex(raw.hash, 'block hash');
    if (
      number !== blockNumber ||
      timestamp > BigInt(Number.MAX_SAFE_INTEGER) ||
      !/^0x[0-9a-fA-F]{64}$/.test(hash)
    ) {
      throw new UniswapV3MarketError('Uniswap V3 RPC returned an inconsistent block.');
    }
    return { number, hash, timestamp: Number(timestamp) };
  }

  async call(
    to: UniswapV3Hex,
    data: UniswapV3Hex,
    blockNumber: bigint,
    signal?: AbortSignal
  ): Promise<UniswapV3Hex> {
    return asHex(
      await this.request('eth_call', [{ to, data }, `0x${blockNumber.toString(16)}`], signal),
      'contract call result'
    );
  }

  /**
   * Return runtime code at a pinned block. Reviewed transaction-preparation
   * paths use this to reject a target whose bytecode no longer matches the
   * deployed contract they were audited against.
   */
  async getCode(
    address: UniswapV3Hex,
    blockNumber: bigint,
    signal?: AbortSignal
  ): Promise<UniswapV3Hex> {
    return asHex(
      await this.request('eth_getCode', [address, `0x${blockNumber.toString(16)}`], signal),
      'contract runtime code'
    );
  }

  /**
   * Read one storage slot at a pinned block.  A small number of reviewed
   * integrations use EIP-1967 proxies, where pinning only the proxy shell
   * would not identify the code that actually processes an order or quote.
   */
  async getStorageAt(
    address: UniswapV3Hex,
    slot: UniswapV3Hex,
    blockNumber: bigint,
    signal?: AbortSignal
  ): Promise<UniswapV3Hex> {
    return asHex(
      await this.request(
        'eth_getStorageAt',
        [address, slot, `0x${blockNumber.toString(16)}`],
        signal
      ),
      'contract storage value'
    );
  }

  async getLogs(
    input: { address: UniswapV3Hex; topic0: UniswapV3Hex; fromBlock: bigint; toBlock: bigint },
    signal?: AbortSignal
  ): Promise<UniswapV3RawLog[]> {
    const raw = await this.request(
      'eth_getLogs',
      [
        {
          address: input.address,
          topics: [input.topic0],
          fromBlock: `0x${input.fromBlock.toString(16)}`,
          toBlock: `0x${input.toBlock.toString(16)}`,
        },
      ],
      signal
    );
    if (!Array.isArray(raw))
      throw new UniswapV3MarketError('Uniswap V3 RPC returned invalid logs.');

    return raw.map((item) => {
      if (!isRecord(item) || !Array.isArray(item.topics)) {
        throw new UniswapV3MarketError('Uniswap V3 RPC returned an invalid log.');
      }
      return {
        address: asHex(item.address, 'log address'),
        blockHash: asHex(item.blockHash, 'log block hash'),
        blockNumber: asHexQuantity(item.blockNumber, 'log block number'),
        data: asHex(item.data, 'log data'),
        logIndex: asHexQuantity(item.logIndex, 'log index'),
        topics: item.topics.map((topic) => asHex(topic, 'log topic')),
        transactionHash: asHex(item.transactionHash, 'log transaction hash'),
      };
    });
  }
}

function encodeGetPool(profile: UniswapV3MarketProfile): UniswapV3Hex {
  return encodeFunctionData({
    abi: FACTORY_ABI,
    functionName: 'getPool',
    args: [profile.token0.address, profile.token1.address, profile.feeTier],
  });
}

function encodePoolCall(
  functionName: 'token0' | 'token1' | 'fee' | 'liquidity' | 'slot0'
): UniswapV3Hex {
  return encodeFunctionData({ abi: POOL_ABI, functionName });
}

function encodeObserve(profile: UniswapV3MarketProfile): UniswapV3Hex {
  return encodeFunctionData({
    abi: POOL_ABI,
    functionName: 'observe',
    args: [[profile.twapWindowSeconds, 0]],
  });
}

function encodeBalanceOf(owner: UniswapV3Hex): UniswapV3Hex {
  return encodeFunctionData({ abi: ERC20_ABI, functionName: 'balanceOf', args: [owner] });
}

function encodeQuote(profile: UniswapV3MarketProfile, amountIn: bigint): UniswapV3Hex {
  return encodeFunctionData({
    abi: QUOTER_ABI,
    functionName: 'quoteExactInputSingle',
    args: [
      {
        tokenIn: profile.token0.address,
        tokenOut: profile.token1.address,
        amountIn,
        fee: profile.feeTier,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
}

function decodeAddressResult(
  data: UniswapV3Hex,
  abi: typeof FACTORY_ABI | typeof POOL_ABI,
  functionName: string
): UniswapV3Hex {
  const result = decodeFunctionResult({ abi, functionName: functionName as never, data });
  const address = String(result);
  if (!isAddress(address))
    throw new UniswapV3MarketError('Uniswap V3 contract returned an invalid address.');
  return getAddress(address) as UniswapV3Hex;
}

function decodeUintResult(
  data: UniswapV3Hex,
  abi: typeof POOL_ABI | typeof ERC20_ABI,
  functionName: string
): bigint {
  const result = decodeFunctionResult({ abi, functionName: functionName as never, data });
  if (typeof result === 'number') {
    if (!Number.isSafeInteger(result) || result < 0) {
      throw new UniswapV3MarketError('Uniswap V3 contract returned an invalid unsigned value.');
    }
    return BigInt(result);
  }
  if (typeof result !== 'bigint' || result < 0n) {
    throw new UniswapV3MarketError('Uniswap V3 contract returned an invalid unsigned value.');
  }
  return result;
}

function floorDivide(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error('denominator must be positive');
  const quotient = numerator / denominator;
  return numerator < 0n && numerator % denominator !== 0n ? quotient - 1n : quotient;
}

/** Uniswap arithmetic-mean ticks use floor division for negative values. */
export function uniswapV3ArithmeticMeanTick(
  olderCumulative: bigint,
  currentCumulative: bigint,
  windowSeconds: number
): number {
  if (!Number.isSafeInteger(windowSeconds) || windowSeconds <= 0) {
    throw new UniswapV3MarketError('Uniswap V3 pool returned an invalid TWAP window.');
  }
  const tick = Number(floorDivide(currentCumulative - olderCumulative, BigInt(windowSeconds)));
  if (!Number.isSafeInteger(tick) || tick < -887_272 || tick > 887_272) {
    throw new UniswapV3MarketError('Uniswap V3 pool returned an invalid TWAP tick.');
  }
  return tick;
}

/** Return token1 units per token0 unit for a Uniswap V3 tick. */
export function uniswapV3Token1PerToken0FromTick(
  tick: number,
  token0Decimals: number,
  token1Decimals: number
): number {
  if (!Number.isInteger(tick) || tick < -887_272 || tick > 887_272) {
    throw new UniswapV3MarketError('Uniswap V3 pool returned an invalid tick.');
  }
  const price = Math.pow(1.0001, tick) * 10 ** (token0Decimals - token1Decimals);
  if (!Number.isFinite(price) || price <= 0) {
    throw new UniswapV3MarketError('Uniswap V3 pool returned an invalid price.');
  }
  return price;
}

function unitsToNumber(raw: bigint, decimals: number): number {
  const value = Number(raw) / 10 ** decimals;
  if (!Number.isFinite(value) || value < 0) {
    throw new UniswapV3MarketError('Uniswap V3 contract returned an out-of-range balance.');
  }
  return value;
}

function boundedBps(numerator: number, denominator: number): number {
  const value = (numerator / denominator) * 10_000;
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000) {
    throw new UniswapV3MarketError('Uniswap V3 quote returned an invalid price impact.');
  }
  return value;
}

async function fetchSnapshot(
  profile: UniswapV3MarketProfile,
  rpc: UniswapV3MarketRpcClient,
  nowMs: number,
  signal?: AbortSignal
): Promise<UniswapV3MarketSnapshot> {
  const blockNumber = await rpc.getBlockNumber(signal);
  const block = await rpc.getBlock(blockNumber, signal);
  const blockTag = block.number;
  const quoteInputs =
    profile.quoteAmountsToken0Raw ??
    profile.quoteAmountsToken0!.map(
      (amount) => BigInt(amount) * 10n ** BigInt(profile.token0.decimals)
    );
  const [marketReads, quoteData, runtimeCodes] = await Promise.all([
    Promise.all([
      rpc.call(profile.factory, encodeGetPool(profile), blockTag, signal),
      rpc.call(profile.pool, encodePoolCall('token0'), blockTag, signal),
      rpc.call(profile.pool, encodePoolCall('token1'), blockTag, signal),
      rpc.call(profile.pool, encodePoolCall('fee'), blockTag, signal),
      rpc.call(profile.pool, encodePoolCall('liquidity'), blockTag, signal),
      rpc.call(profile.pool, encodePoolCall('slot0'), blockTag, signal),
      rpc.call(profile.pool, encodeObserve(profile), blockTag, signal),
      rpc.call(profile.token0.address, encodeBalanceOf(profile.pool), blockTag, signal),
      rpc.call(profile.token1.address, encodeBalanceOf(profile.pool), blockTag, signal),
    ]),
    Promise.all(
      quoteInputs.map((amount) =>
        rpc.call(profile.quoterV2, encodeQuote(profile, amount), blockTag, signal)
      )
    ),
    profile.codeIdentity
      ? Promise.all([
          rpc.getCode(profile.factory, blockTag, signal),
          rpc.getCode(profile.quoterV2, blockTag, signal),
          rpc.getCode(profile.pool, blockTag, signal),
        ])
      : Promise.resolve(undefined),
  ]);
  const [
    factoryPoolData,
    token0Data,
    token1Data,
    feeData,
    liquidityData,
    slot0Data,
    observeData,
    token0BalanceData,
    token1BalanceData,
  ] = marketReads;
  if (
    profile.codeIdentity &&
    (!runtimeCodes ||
      runtimeCodes.some((code) => code === '0x') ||
      keccak256(runtimeCodes[0]) !== profile.codeIdentity.factory ||
      keccak256(runtimeCodes[1]) !== profile.codeIdentity.quoterV2 ||
      keccak256(runtimeCodes[2]) !== profile.codeIdentity.pool)
  ) {
    throw new UniswapV3MarketError(
      'Uniswap V3 runtime code does not match the reviewed deployment.'
    );
  }

  const factoryPool = decodeAddressResult(factoryPoolData, FACTORY_ABI, 'getPool');
  const token0 = decodeAddressResult(token0Data, POOL_ABI, 'token0');
  const token1 = decodeAddressResult(token1Data, POOL_ABI, 'token1');
  const fee = decodeUintResult(feeData, POOL_ABI, 'fee');
  const activeLiquidity = decodeUintResult(liquidityData, POOL_ABI, 'liquidity');
  const token0Balance = decodeUintResult(token0BalanceData, ERC20_ABI, 'balanceOf');
  const token1Balance = decodeUintResult(token1BalanceData, ERC20_ABI, 'balanceOf');

  if (
    factoryPool.toLowerCase() !== profile.pool.toLowerCase() ||
    token0.toLowerCase() !== profile.token0.address.toLowerCase() ||
    token1.toLowerCase() !== profile.token1.address.toLowerCase() ||
    fee !== BigInt(profile.feeTier) ||
    activeLiquidity <= 0n
  ) {
    throw new UniswapV3MarketError('Uniswap V3 pool provenance or liquidity validation failed.');
  }

  const slot0 = decodeFunctionResult({ abi: POOL_ABI, functionName: 'slot0', data: slot0Data });
  const spotTick = Number(slot0[1]);
  const observe = decodeFunctionResult({
    abi: POOL_ABI,
    functionName: 'observe',
    data: observeData,
  });
  const tickCumulatives = observe[0];
  const olderCumulative = tickCumulatives[0];
  const currentCumulative = tickCumulatives[1];
  if (
    !Array.isArray(tickCumulatives) ||
    tickCumulatives.length !== 2 ||
    typeof olderCumulative !== 'bigint' ||
    typeof currentCumulative !== 'bigint'
  ) {
    throw new UniswapV3MarketError('Uniswap V3 pool returned an invalid TWAP observation.');
  }
  const twapTick = uniswapV3ArithmeticMeanTick(
    olderCumulative,
    currentCumulative,
    profile.twapWindowSeconds
  );
  const spotPrice = uniswapV3Token1PerToken0FromTick(
    spotTick,
    profile.token0.decimals,
    profile.token1.decimals
  );
  const twapPrice = uniswapV3Token1PerToken0FromTick(
    twapTick,
    profile.token0.decimals,
    profile.token1.decimals
  );

  const decodedQuotes = quoteData.map((data, index) => {
    const quote = decodeFunctionResult({
      abi: QUOTER_ABI,
      functionName: 'quoteExactInputSingle',
      data,
    });
    const amountOut = quote[0];
    const ticksCrossed = quote[2];
    if (typeof amountOut !== 'bigint' || amountOut <= 0n || typeof ticksCrossed !== 'number') {
      throw new UniswapV3MarketError('Uniswap V3 Quoter returned an invalid quote.');
    }
    const amountInRaw = quoteInputs[index];
    if (amountInRaw === undefined) {
      throw new UniswapV3MarketError('Uniswap V3 quote ladder is inconsistent.');
    }
    const amountIn = unitsToNumber(amountInRaw, profile.token0.decimals);
    const amountOutNumber = unitsToNumber(amountOut, profile.token1.decimals);
    return {
      amountIn,
      amountInRaw: amountInRaw.toString(),
      amountOut: amountOutNumber,
      amountOutRaw: amountOut.toString(),
      effectiveToken1PerToken0: amountOutNumber / amountIn,
      initializedTicksCrossed: ticksCrossed,
    };
  });
  const referencePrice = decodedQuotes[0]?.effectiveToken1PerToken0;
  if (!referencePrice || !Number.isFinite(referencePrice) || referencePrice <= 0) {
    throw new UniswapV3MarketError('Uniswap V3 Quoter returned an invalid reference quote.');
  }

  const observedAtMs = Math.max(nowMs, Date.now());
  const rawSourceFreshnessSeconds = (observedAtMs - block.timestamp * 1000) / 1000;
  if (
    !Number.isFinite(rawSourceFreshnessSeconds) ||
    rawSourceFreshnessSeconds < -60 ||
    rawSourceFreshnessSeconds > profile.maxSourceAgeSeconds
  ) {
    throw new UniswapV3MarketError('Uniswap V3 market block is outside the freshness limit.');
  }
  const sourceFreshnessSeconds = Math.max(0, rawSourceFreshnessSeconds);

  return {
    source: 'dex-market',
    venue: profile.venue,
    chainId: profile.chainId,
    market: profile.market,
    sourceFreshnessSeconds,
    observedAt: new Date(observedAtMs).toISOString(),
    block: {
      number: block.number.toString(),
      hash: block.hash,
      timestamp: new Date(block.timestamp * 1000).toISOString(),
    },
    contracts: {
      factory: profile.factory,
      quoterV2: profile.quoterV2,
      pool: profile.pool,
      token0,
      token1,
      feeTier: Number(fee),
      ...(profile.codeIdentity
        ? {
            codeIdentity: {
              factory: keccak256(runtimeCodes![0]),
              quoterV2: keccak256(runtimeCodes![1]),
              pool: keccak256(runtimeCodes![2]),
            },
          }
        : {}),
    },
    spot: { tick: spotTick, token1PerToken0: spotPrice },
    twap: {
      windowSeconds: profile.twapWindowSeconds,
      tick: twapTick,
      token1PerToken0: twapPrice,
      deviationBpsFromSpot: boundedBps(Math.abs(twapPrice - spotPrice), spotPrice),
    },
    activeLiquidityRaw: activeLiquidity.toString(),
    poolBalances: {
      token0Raw: token0Balance.toString(),
      token0: unitsToNumber(token0Balance, profile.token0.decimals),
      token1Raw: token1Balance.toString(),
      token1: unitsToNumber(token1Balance, profile.token1.decimals),
    },
    quotes: decodedQuotes.map((quote) => ({
      ...quote,
      priceImpactBps: boundedBps(
        Math.max(0, referencePrice - quote.effectiveToken1PerToken0),
        referencePrice
      ),
    })),
  };
}

const cachedSnapshots = new Map<string, { value: UniswapV3MarketSnapshot; expiresAt: number }>();
const inFlightSnapshots = new Map<string, Promise<UniswapV3MarketSnapshot>>();

/** Test hook for the short, per-profile live-data cache. */
export function resetUniswapV3MarketCacheForTests(profileId?: string): void {
  if (profileId) {
    cachedSnapshots.delete(profileId);
    inFlightSnapshots.delete(profileId);
    return;
  }
  cachedSnapshots.clear();
  inFlightSnapshots.clear();
}

/**
 * Fetch reproducible, block-pinned market evidence for a reviewed Uniswap V3
 * pool. A shared ABI is not proof of cross-chain support: each network and
 * market must supply its own validated profile.
 */
export async function getUniswapV3MarketSnapshot(
  profile: UniswapV3MarketProfile,
  options: {
    rpc?: UniswapV3MarketRpcClient;
    nowMs?: number;
    signal?: AbortSignal;
    /** Disable the shared profile cache for an untrusted exact-input amount. */
    cache?: boolean;
  } = {}
): Promise<UniswapV3MarketSnapshot> {
  assertUniswapV3MarketProfile(profile);
  const nowMs = options.nowMs ?? Date.now();
  const cacheEnabled = !options.rpc && options.cache !== false;
  if (cacheEnabled) {
    const cached = cachedSnapshots.get(profile.id);
    if (cached && cached.expiresAt > nowMs) return cached.value;
    const inFlight = inFlightSnapshots.get(profile.id);
    if (inFlight) return inFlight;
  }

  const rpc = options.rpc ?? new UniswapV3MarketRpcClient(profile.chainId, profile.rpcEndpoints);
  const request = fetchSnapshot(profile, rpc, nowMs, options.signal);
  if (cacheEnabled) inFlightSnapshots.set(profile.id, request);
  try {
    const value = await request;
    if (cacheEnabled) {
      cachedSnapshots.set(profile.id, { value, expiresAt: nowMs + profile.cacheTtlMs });
    }
    return value;
  } finally {
    if (cacheEnabled) inFlightSnapshots.delete(profile.id);
  }
}
