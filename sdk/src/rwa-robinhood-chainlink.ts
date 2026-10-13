// Copyright (c) 2026 Insight. MIT. Robinhood tokenized-equity Chainlink adapter.
import { createPublicClient, getAddress, http, parseAbi } from 'viem';
import { robinhood } from 'viem/chains';

import { normalizeRwaChainlinkRound, rwaInstrumentId } from './rwa';
import { RwaActionPreflightError, type RwaActionEvidenceProvider } from './rwa-preflight';
import { ROBINHOOD_CHAIN_ID, ROBINHOOD_RWA_SOURCE_ID } from './rwa-robinhood';
import {
  readRobinhoodRwaSessionObservation,
  type RobinhoodRwaSessionResolver,
} from './rwa-robinhood-session';

const ROBINHOOD_PUBLIC_RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';
const ROBINHOOD_READ_TIMEOUT_MS = 10_000;
const MULTIPLIER_SCALE = 10n ** 18n;
const CHAINLINK_AGGREGATOR_ABI = parseAbi([
  'function decimals() view returns (uint8)',
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
]);

const ROBINHOOD_TOKEN_ABI = parseAbi([
  'function uid() view returns (bytes32)',
  'function uiMultiplier() view returns (uint256)',
  'function newUIMultiplier() view returns (uint256)',
  'function effectiveAt() view returns (uint256)',
  'function oraclePaused() view returns (bool)',
]);

export interface RobinhoodChainlinkPriceProviderOptions {
  /** Ticker must match the instrument configured by the consuming application. */
  symbol: string;
  /** Policy-pinned feed ID; must equal the Chainlink source key in policy.feeds. */
  feedId: string;
  /** Feed proxy address, pinned by the consuming application from Chainlink's official directory. */
  feedAddress: string;
  /** Robinhood issuer UID from the admitted instrument registry. */
  expectedTokenUid: string;
  rpcUrl?: string;
  /** Share the exact observation used by createRobinhoodRwaMarketProvider; omitted means UNKNOWN. */
  sessionResolver?: RobinhoodRwaSessionResolver;
}

function assertConfig(options: RobinhoodChainlinkPriceProviderOptions): `0x${string}` {
  if (
    !options ||
    typeof options !== 'object' ||
    typeof options.feedId !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(options.feedId) ||
    typeof options.symbol !== 'string' ||
    !/^[A-Z][A-Z0-9.-]{0,15}$/.test(options.symbol.toUpperCase()) ||
    typeof options.expectedTokenUid !== 'string' ||
    !/^0x[0-9a-f]{64}$/i.test(options.expectedTokenUid)
  ) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_PROVIDER_INVALID');
  }

  let feedAddress: `0x${string}`;
  try {
    feedAddress = getAddress(options.feedAddress);
  } catch {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_PROVIDER_INVALID');
  }

  const rpcUrl = options.rpcUrl?.trim();
  if (rpcUrl) {
    try {
      const parsed = new URL(rpcUrl);
      if (
        !['http:', 'https:'].includes(parsed.protocol) ||
        parsed.username.length > 0 ||
        parsed.password.length > 0
      ) {
        throw new Error('invalid RPC URL');
      }
    } catch {
      throw new RwaActionPreflightError('RWA_PREFLIGHT_PROVIDER_INVALID');
    }
  }
  if (
    options.sessionResolver !== undefined &&
    (typeof options.sessionResolver.sourceId !== 'string' ||
      !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(options.sessionResolver.sourceId) ||
      typeof options.sessionResolver.resolve !== 'function')
  ) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_PROVIDER_INVALID');
  }
  return feedAddress;
}

function underlyingSpotPriceE8(tokenReferencePriceE8: string, multiplierAtomic: bigint): string {
  if (multiplierAtomic <= 0n) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
  }
  const numerator = BigInt(tokenReferencePriceE8) * MULTIPLIER_SCALE;
  const quotient = numerator / multiplierAtomic;
  const remainder = numerator % multiplierAtomic;
  // Fixed-point half-up rounding, bounded to half of one 1e-8 quote unit.
  return (remainder * 2n >= multiplierAtomic ? quotient + 1n : quotient).toString();
}

function rpcEndpoint(configuredRpcUrl?: string): string {
  return (
    configuredRpcUrl?.trim() || process.env.ROBINHOOD_RPC_URL?.trim() || ROBINHOOD_PUBLIC_RPC_URL
  );
}

/**
 * Read a caller-pinned Robinhood Chainlink feed and normalize its multiplier-adjusted token
 * reference value back to the registry's underlying-spot price basis. This is one price source;
 * it does not attest feed-address provenance or infer the current market session.
 */
export function createRobinhoodChainlinkPriceProvider(
  options: RobinhoodChainlinkPriceProviderOptions
): RwaActionEvidenceProvider {
  const feedAddress = assertConfig(options);
  const tokenUid = options.expectedTokenUid.toLowerCase();
  const feedId = options.feedId;
  const symbol = options.symbol.toUpperCase();
  const configuredRpcUrl = options.rpcUrl;
  const sessionResolver = options.sessionResolver;
  const sessionSourceId = sessionResolver?.sourceId;

  return {
    sourceId: feedId,
    async collect(context) {
      const { instrument, policy } = context;
      const policyFeed = policy.feeds[feedId];
      if (
        instrument.issuer !== ROBINHOOD_RWA_SOURCE_ID ||
        instrument.tokenChainId !== ROBINHOOD_CHAIN_ID ||
        context.transaction.chainId !== ROBINHOOD_CHAIN_ID ||
        instrument.priceBasis !== 'underlying-spot' ||
        policyFeed?.evidenceChainId !== ROBINHOOD_CHAIN_ID
      ) {
        throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
      }

      let tokenAddress: `0x${string}`;
      try {
        tokenAddress = getAddress(instrument.tokenAddress);
      } catch {
        throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
      }

      const client = createPublicClient({
        chain: robinhood,
        transport: http(rpcEndpoint(configuredRpcUrl), {
          timeout: ROBINHOOD_READ_TIMEOUT_MS,
          retryCount: 0,
          ...(context.signal ? { fetchOptions: { signal: context.signal } } : {}),
        }),
      });
      const chainId = await client.getChainId();
      if (chainId !== ROBINHOOD_CHAIN_ID) {
        throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
      }

      // Pin every read to one block so the feed round and multiplier cannot straddle an update.
      const blockNumber = await client.getBlockNumber();
      const [block, decimals, round, uid, multiplier, newMultiplier, effectiveAt, oraclePaused] =
        await Promise.all([
          client.getBlock({ blockNumber }),
          client.readContract({
            address: feedAddress,
            abi: CHAINLINK_AGGREGATOR_ABI,
            functionName: 'decimals',
            blockNumber,
          }),
          client.readContract({
            address: feedAddress,
            abi: CHAINLINK_AGGREGATOR_ABI,
            functionName: 'latestRoundData',
            blockNumber,
          }),
          client.readContract({
            address: tokenAddress,
            abi: ROBINHOOD_TOKEN_ABI,
            functionName: 'uid',
            blockNumber,
          }),
          client.readContract({
            address: tokenAddress,
            abi: ROBINHOOD_TOKEN_ABI,
            functionName: 'uiMultiplier',
            blockNumber,
          }),
          client.readContract({
            address: tokenAddress,
            abi: ROBINHOOD_TOKEN_ABI,
            functionName: 'newUIMultiplier',
            blockNumber,
          }),
          client.readContract({
            address: tokenAddress,
            abi: ROBINHOOD_TOKEN_ABI,
            functionName: 'effectiveAt',
            blockNumber,
          }),
          client.readContract({
            address: tokenAddress,
            abi: ROBINHOOD_TOKEN_ABI,
            functionName: 'oraclePaused',
            blockNumber,
          }),
        ]);

      if (uid.toLowerCase() !== tokenUid || multiplier <= 0n) {
        throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
      }
      // A paused feed holds its last value; a staged multiplier can make that value unsafe as
      // current underlying spot. Keep it out of the price quorum until the issuer completes the update.
      if (
        oraclePaused ||
        newMultiplier !== 0n ||
        (effectiveAt !== 0n && effectiveAt > block.timestamp)
      ) {
        return {};
      }

      const [roundId, answer, , updatedAt, answeredInRound] = round;
      const blockTimestamp = Number(block.timestamp);
      const feedUpdatedAt = Number(updatedAt);
      if (
        !Number.isSafeInteger(blockTimestamp) ||
        !Number.isSafeInteger(feedUpdatedAt) ||
        blockTimestamp <= 0 ||
        feedUpdatedAt > blockTimestamp ||
        decimals > 36
      ) {
        throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
      }

      const resolvedSession = sessionResolver
        ? readRobinhoodRwaSessionObservation(
            await sessionResolver.resolve({
              context,
              symbol,
              mic: instrument.venueMic,
            }),
            sessionSourceId!,
            instrument.venueMic
          ).session
        : 'UNKNOWN';

      const instrumentId = rwaInstrumentId(instrument);
      const normalizedTokenPrice = normalizeRwaChainlinkRound(
        {
          roundId: roundId.toString(),
          answer: answer.toString(),
          decimals,
          updatedAt: updatedAt.toString(),
          answeredInRound: answeredInRound.toString(),
        },
        {
          feedId,
          instrumentId,
          evidenceChainId: ROBINHOOD_CHAIN_ID,
          currency: instrument.currency,
          // Temporary basis for the feed's total-return token reference value.
          priceBasis: 'token-nav',
          corporateActionVersion: instrument.corporateActionVersion,
          session: resolvedSession,
          retrievedAt: context.nowSeconds,
        }
      );

      return {
        prices: [
          {
            ...normalizedTokenPrice,
            priceBasis: 'underlying-spot',
            priceE8: underlyingSpotPriceE8(normalizedTokenPrice.priceE8, multiplier),
          },
        ],
      };
    },
  };
}
