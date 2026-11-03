import { createPublicClient, decodeFunctionResult, encodeFunctionData, http } from 'viem';
import { mainnet } from 'viem/chains';

import {
  fetchChainlinkMarketReference,
  type ChainlinkMarketReference,
} from '@/lib/marketReference/chainlink';
import { ETHEREUM_TOKEN_ADDRESSES } from '@/lib/oracles/constants/ethereumTokenAddresses';
import { getChainlinkRPCConfig } from '@/lib/oracles/services/chainlinkDataSources';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('DecisionInputOnchainRouteQuote');

const QUOTER_V2 = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e' as const;
const MAX_UINT256 = (1n << 256n) - 1n;
const MAX_RPC_HEAD_DIVERGENCE = 2n;
const MAX_QUOTE_AGE_SECONDS = 300;
const RPC_TIMEOUT_MS = 8_000;

const QUOTER_V2_ABI = [
  {
    type: 'function',
    name: 'quoteExactInput',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'path', type: 'bytes' },
      { name: 'amountIn', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96AfterList', type: 'uint160[]' },
      { name: 'initializedTicksCrossedList', type: 'uint32[]' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const;

type SupportedSymbol = 'WETH' | 'USDC' | 'WBTC';

interface TokenInfo {
  symbol: SupportedSymbol;
  address: `0x${string}`;
  decimals: number;
}

export interface OnchainRouteQuoteEvidence {
  provider: 'uniswap-v3-quoter-v2';
  chainId: 1;
  blockNumber: string;
  blockHash: `0x${string}`;
  quoterAddress: `0x${string}`;
  path: `0x${string}`;
  routeSymbols: SupportedSymbol[];
  routeTokens: `0x${string}`[];
  feeTiers: number[];
  amountInRaw: string;
  amountOutRaw: string;
  rpcWitnessCount: 2;
  rpcWitnessHosts: [string, string];
  notionalPrice: {
    provider: 'chainlink-data-feed';
    assetSymbol: SupportedSymbol;
    priceReferenceSymbol: 'ETH' | 'USDC' | 'BTC';
    pricingBasis: 'chainlink-usd' | 'chainlink-btc-usd-wbtc-peg-assumption';
    priceUsd: number;
    feedAddress: `0x${string}`;
    roundId: string;
    updatedAt: string;
    heartbeatSeconds: number;
  };
}

export interface OnchainRouteQuote {
  price: number;
  observedAt: string;
  evidence: OnchainRouteQuoteEvidence;
}

export class OnchainRouteQuoteError extends Error {
  constructor(
    readonly code:
      | 'unsupported_chain'
      | 'unsupported_pair'
      | 'invalid_size'
      | 'rpc_unavailable'
      | 'rpc_disagreement'
      | 'stale_quote'
      | 'quote_unavailable',
    message: string
  ) {
    super(message);
    this.name = 'OnchainRouteQuoteError';
  }
}

function tokenFor(symbol: string): TokenInfo | null {
  const normalized = symbol.trim().toUpperCase();
  if (normalized === 'ETH' || normalized === 'WETH') {
    return { symbol: 'WETH', address: ETHEREUM_TOKEN_ADDRESSES.WETH, decimals: 18 };
  }
  if (normalized === 'USDC') {
    return { symbol: 'USDC', address: ETHEREUM_TOKEN_ADDRESSES.USDC, decimals: 6 };
  }
  if (normalized === 'WBTC') {
    return { symbol: 'WBTC', address: ETHEREUM_TOKEN_ADDRESSES.WBTC, decimals: 8 };
  }
  return null;
}

function routeFor(
  source: TokenInfo,
  destination: TokenInfo
): { tokens: TokenInfo[]; feeTiers: number[] } | null {
  if (source.symbol === destination.symbol) return null;
  if (
    (source.symbol === 'WETH' && destination.symbol === 'USDC') ||
    (source.symbol === 'USDC' && destination.symbol === 'WETH')
  ) {
    return { tokens: [source, destination], feeTiers: [500] };
  }
  if (
    (source.symbol === 'WETH' && destination.symbol === 'WBTC') ||
    (source.symbol === 'WBTC' && destination.symbol === 'WETH')
  ) {
    return { tokens: [source, destination], feeTiers: [3_000] };
  }
  if (source.symbol === 'USDC' && destination.symbol === 'WBTC') {
    return {
      tokens: [source, tokenFor('WETH')!, destination],
      feeTiers: [500, 3_000],
    };
  }
  if (source.symbol === 'WBTC' && destination.symbol === 'USDC') {
    return {
      tokens: [source, tokenFor('WETH')!, destination],
      feeTiers: [3_000, 500],
    };
  }
  return null;
}

function encodePath(tokens: TokenInfo[], feeTiers: number[]): `0x${string}` {
  let path = tokens[0].address.slice(2).toLowerCase();
  for (let index = 0; index < feeTiers.length; index += 1) {
    path += feeTiers[index].toString(16).padStart(6, '0');
    path += tokens[index + 1].address.slice(2).toLowerCase();
  }
  return `0x${path}`;
}

function decimalFraction(value: number): { numerator: bigint; denominator: bigint } {
  if (!Number.isFinite(value) || value <= 0) {
    throw new OnchainRouteQuoteError(
      'invalid_size',
      'Quote size and price must be finite and positive.'
    );
  }
  const [mantissa, exponentPart] = value.toString().toLowerCase().split('e');
  const exponent = exponentPart ? Number(exponentPart) : 0;
  const [whole, fraction = ''] = mantissa.split('.');
  let numerator = BigInt(`${whole}${fraction}`);
  const scale = fraction.length - exponent;
  if (scale < 0) numerator *= 10n ** BigInt(-scale);
  return {
    numerator,
    denominator: scale > 0 ? 10n ** BigInt(scale) : 1n,
  };
}

function amountInForUsdNotional(
  tradeAmountUsd: number,
  sourcePriceUsd: number,
  sourceDecimals: number
): bigint {
  const usd = decimalFraction(tradeAmountUsd);
  const price = decimalFraction(sourcePriceUsd);
  const amount =
    (usd.numerator * price.denominator * 10n ** BigInt(sourceDecimals)) /
    (usd.denominator * price.numerator);
  if (amount <= 0n || amount > MAX_UINT256) {
    throw new OnchainRouteQuoteError(
      'invalid_size',
      'Trade notional cannot be represented by the route quote.'
    );
  }
  return amount;
}

function rpcEndpoints(): string[] {
  const endpoints = getChainlinkRPCConfig(1)?.endpoints ?? [];
  const seenHosts = new Set<string>();
  return endpoints.filter((endpoint) => {
    try {
      const host = new URL(endpoint).hostname.toLowerCase();
      if (seenHosts.has(host)) return false;
      seenHosts.add(host);
      return true;
    } catch {
      return false;
    }
  });
}

function createClient(endpoint: string) {
  return createPublicClient({
    chain: mainnet,
    transport: http(endpoint, { timeout: RPC_TIMEOUT_MS, retryCount: 0 }),
  });
}

async function quoteAtBlock(
  client: ReturnType<typeof createClient>,
  path: `0x${string}`,
  amountIn: bigint,
  blockHash: `0x${string}`
): Promise<bigint> {
  const data = encodeFunctionData({
    abi: QUOTER_V2_ABI,
    functionName: 'quoteExactInput',
    args: [path, amountIn],
  });
  const result = await client.call({
    to: QUOTER_V2,
    data,
    blockHash,
    requireCanonical: true,
  });
  if (!result.data) throw new Error('quoter returned empty call data');
  const decoded = decodeFunctionResult({
    abi: QUOTER_V2_ABI,
    functionName: 'quoteExactInput',
    data: result.data,
  });
  const amountOut = decoded[0];
  if (amountOut <= 0n || amountOut > MAX_UINT256)
    throw new Error('quoter returned an invalid amount');
  return amountOut;
}

/**
 * Quote an exact USD notional through reviewed Ethereum mainnet pools. Two
 * distinct configured RPC hosts must agree on chain, block hash, and output.
 */
export async function getOnchainRouteQuote(input: {
  asset: string;
  destinationAsset: string;
  chainId: number;
  tradeAmountUsd: number;
  maxAgeSeconds: number;
  now?: Date;
}): Promise<OnchainRouteQuote> {
  if (input.chainId !== 1) {
    throw new OnchainRouteQuoteError(
      'unsupported_chain',
      'Independent route quotes are currently available only on Ethereum mainnet.'
    );
  }
  const source = tokenFor(input.asset);
  const destination = tokenFor(input.destinationAsset);
  if (!source || !destination) {
    throw new OnchainRouteQuoteError(
      'unsupported_pair',
      'Independent route quotes currently cover ETH/WETH, USDC, and WBTC pairs.'
    );
  }
  const route = routeFor(source, destination);
  if (!route) {
    throw new OnchainRouteQuoteError(
      'unsupported_pair',
      'Source and destination assets must differ.'
    );
  }
  if (!Number.isSafeInteger(input.maxAgeSeconds) || input.maxAgeSeconds < 1) {
    throw new OnchainRouteQuoteError(
      'invalid_size',
      'Quote maximum age must be a positive integer.'
    );
  }

  let notionalPrice: ChainlinkMarketReference;
  const priceReferenceSymbol =
    source.symbol === 'WETH' ? 'ETH' : source.symbol === 'WBTC' ? 'BTC' : 'USDC';
  try {
    notionalPrice = await fetchChainlinkMarketReference({
      symbol: priceReferenceSymbol,
      chainId: 1,
      now: () => (input.now ?? new Date()).getTime(),
    });
  } catch {
    throw new OnchainRouteQuoteError(
      'quote_unavailable',
      'A fresh Chainlink USD price is required to size the route quote.'
    );
  }
  if (!notionalPrice.isFresh || notionalPrice.symbol !== priceReferenceSymbol) {
    throw new OnchainRouteQuoteError(
      'stale_quote',
      'A fresh matching Chainlink USD price is required to size the route quote.'
    );
  }

  let amountIn: bigint;
  try {
    amountIn = amountInForUsdNotional(input.tradeAmountUsd, notionalPrice.price, source.decimals);
  } catch (error) {
    if (error instanceof OnchainRouteQuoteError) throw error;
    throw new OnchainRouteQuoteError(
      'invalid_size',
      'Trade notional cannot be represented by the route quote.'
    );
  }

  const endpoints = rpcEndpoints();
  if (endpoints.length < 2) {
    throw new OnchainRouteQuoteError(
      'rpc_unavailable',
      'Two distinct Ethereum RPC endpoints are required.'
    );
  }
  const selectedEndpoints = endpoints.slice(0, 3);
  const clients = selectedEndpoints.map(createClient);
  const path = encodePath(route.tokens, route.feeTiers);
  const nowMs = (input.now ?? new Date()).getTime();

  try {
    const headResults = await Promise.allSettled(
      clients.map(async (client) => {
        const [chainId, blockNumber] = await Promise.all([
          client.getChainId(),
          client.getBlockNumber(),
        ]);
        if (chainId !== 1) throw new Error('RPC chain ID mismatch');
        return blockNumber;
      })
    );
    const headWitnesses = headResults.flatMap((result, index) =>
      result.status === 'fulfilled'
        ? [
            {
              client: clients[index],
              host: new URL(selectedEndpoints[index]).hostname,
              head: result.value,
            },
          ]
        : []
    );
    if (headWitnesses.length < 2) {
      throw new OnchainRouteQuoteError(
        'rpc_unavailable',
        'Fewer than two Ethereum RPC endpoints returned the expected chain.'
      );
    }
    const highestHead = headWitnesses.reduce(
      (highest, witness) => (witness.head > highest ? witness.head : highest),
      headWitnesses[0].head
    );
    const recentHeadWitnesses = headWitnesses.filter(
      (witness) => highestHead - witness.head <= MAX_RPC_HEAD_DIVERGENCE
    );
    if (recentHeadWitnesses.length < 2) {
      throw new OnchainRouteQuoteError('rpc_disagreement', 'Ethereum RPC heads are too far apart.');
    }
    const blockNumber = recentHeadWitnesses.reduce(
      (minimum, witness) => (witness.head < minimum ? witness.head : minimum),
      recentHeadWitnesses[0].head
    );

    const blockResults = await Promise.allSettled(
      recentHeadWitnesses.map(({ client }) => client.getBlock({ blockNumber }))
    );
    const blockWitnesses = blockResults.flatMap((result, index) =>
      result.status === 'fulfilled' && result.value.hash
        ? [{ ...recentHeadWitnesses[index], block: result.value }]
        : []
    );
    const blockGroups = new Map<string, typeof blockWitnesses>();
    for (const witness of blockWitnesses) {
      const key = `${witness.block.hash!.toLowerCase()}:${witness.block.timestamp.toString()}`;
      const group = blockGroups.get(key) ?? [];
      group.push(witness);
      blockGroups.set(key, group);
    }
    const agreedBlockWitnesses = [...blockGroups.values()]
      .filter((group) => group.length >= 2)
      .sort((left, right) => right.length - left.length)[0];
    if (!agreedBlockWitnesses) {
      throw new OnchainRouteQuoteError(
        'rpc_disagreement',
        'Fewer than two Ethereum RPC endpoints agree on the quote block.'
      );
    }
    const agreedBlock = agreedBlockWitnesses[0].block;

    const observedAt = new Date(Number(agreedBlock.timestamp) * 1000).toISOString();
    const ageSeconds = (nowMs - Number(agreedBlock.timestamp) * 1000) / 1000;
    const maximumAge = Math.min(input.maxAgeSeconds, MAX_QUOTE_AGE_SECONDS);
    if (!Number.isFinite(ageSeconds) || ageSeconds < 0 || ageSeconds > maximumAge) {
      throw new OnchainRouteQuoteError(
        'stale_quote',
        'The agreed Ethereum quote block is outside the freshness limit.'
      );
    }

    const outputResults = await Promise.allSettled(
      agreedBlockWitnesses.map(({ client }) =>
        quoteAtBlock(client, path, amountIn, agreedBlock.hash!)
      )
    );
    const outputGroups = new Map<string, Array<{ amountOut: bigint; host: string }>>();
    for (let index = 0; index < outputResults.length; index += 1) {
      const result = outputResults[index];
      if (result.status !== 'fulfilled') continue;
      const key = result.value.toString();
      const group = outputGroups.get(key) ?? [];
      group.push({ amountOut: result.value, host: agreedBlockWitnesses[index].host });
      outputGroups.set(key, group);
    }
    const agreedOutputs = [...outputGroups.values()]
      .filter((group) => group.length >= 2)
      .sort((left, right) => right.length - left.length)[0];
    if (!agreedOutputs) {
      throw new OnchainRouteQuoteError(
        'rpc_disagreement',
        'Fewer than two Ethereum RPC endpoints agree on the route output.'
      );
    }

    const amountOut = agreedOutputs[0].amountOut;
    const price =
      (Number(amountOut) / Number(amountIn)) * 10 ** (source.decimals - destination.decimals);
    if (!Number.isFinite(price) || price <= 0) {
      throw new OnchainRouteQuoteError('quote_unavailable', 'The route returned an invalid price.');
    }

    return {
      price,
      observedAt,
      evidence: {
        provider: 'uniswap-v3-quoter-v2',
        chainId: 1,
        blockNumber: blockNumber.toString(),
        blockHash: agreedBlock.hash!,
        quoterAddress: QUOTER_V2,
        path,
        routeSymbols: route.tokens.map((token) => token.symbol),
        routeTokens: route.tokens.map((token) => token.address),
        feeTiers: route.feeTiers,
        amountInRaw: amountIn.toString(),
        amountOutRaw: amountOut.toString(),
        rpcWitnessCount: 2,
        rpcWitnessHosts: [agreedOutputs[0].host, agreedOutputs[1].host],
        notionalPrice: {
          provider: 'chainlink-data-feed',
          assetSymbol: source.symbol,
          priceReferenceSymbol,
          pricingBasis:
            source.symbol === 'WBTC' ? 'chainlink-btc-usd-wbtc-peg-assumption' : 'chainlink-usd',
          priceUsd: notionalPrice.price,
          feedAddress: notionalPrice.feedAddress,
          roundId: notionalPrice.roundId,
          updatedAt: notionalPrice.updatedAt,
          heartbeatSeconds: notionalPrice.heartbeatSeconds,
        },
      },
    };
  } catch (error) {
    if (error instanceof OnchainRouteQuoteError) throw error;
    logger.warn('Independent on-chain route quote unavailable', {
      errorName: error instanceof Error ? error.name : 'unknown',
    });
    throw new OnchainRouteQuoteError(
      'rpc_unavailable',
      'Independent on-chain route quote could not be verified by two RPC endpoints.'
    );
  }
}
