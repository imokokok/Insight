import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createPublicClient, getAddress, http, parseAbi } from 'viem';
import { robinhood } from 'viem/chains';

import committedRegistry from '../protocol/rwa-instrument-registry.v1.json';
import type { RwaInstrument } from '../sdk/src/rwa';
import { createIsOpenNowRwaSessionResolver } from '../sdk/src/rwa-isopennow-session';
import type { RwaActionPreflightContext } from '../sdk/src/rwa-preflight';
import { validateRwaInstrumentRegistry } from '../sdk/src/rwa-instrument-registry';
import { getRobinhoodRwaContext } from '../src/lib/rwa/robinhoodClient';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const evidenceDirectory = path.join(repositoryRoot, '.local', 'rwa-action-preflight', 'readiness');
const aaplFeedId = 'chainlink-rh-aapl';
const robinhoodChainId = 4663;
const tokenAbi = parseAbi([
  'function uid() view returns (bytes32)',
  'function uiMultiplier() view returns (uint256)',
  'function newUIMultiplier() view returns (uint256)',
  'function effectiveAt() view returns (uint256)',
  'function oraclePaused() view returns (bool)',
]);
const feedAbi = parseAbi([
  'function description() view returns (string)',
  'function decimals() view returns (uint8)',
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
]);

type ProbeStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'INVALID' | 'NOT_CONFIGURED';
type Probe<T extends Record<string, unknown>> = {
  status: ProbeStatus;
  reasonCode?: string;
  observation?: T;
};

function sanitizedCode(error: unknown): string {
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(record.code)) {
      return record.code;
    }
    if (error instanceof Error && /^[A-Z0-9_]{1,80}$/.test(error.message)) {
      return error.message;
    }
    if (typeof record.name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(record.name)) {
      return `UPSTREAM_${record.name.toUpperCase()}`;
    }
  }
  return 'UPSTREAM_UNAVAILABLE';
}

function isExplicitValidationError(error: unknown): boolean {
  return error instanceof TypeError && /^[A-Z0-9_]{1,80}$/.test(error.message);
}

async function probeMarketSession(
  instrument: RwaInstrument,
  nowSeconds: number
): Promise<
  Probe<{
    sourceId: string;
    mic: string;
    session: string;
    observedAt: number;
    validUntil: number;
  }>
> {
  try {
    const resolver = createIsOpenNowRwaSessionResolver({
      sourceId: 'isopennow-us-equity-session',
    });
    // The resolver only consumes the request identity, timestamp and optional AbortSignal here.
    const context = {
      instrument,
      request: {},
      policy: {},
      transaction: {},
      callProfile: {},
      nowSeconds,
    } as unknown as Readonly<RwaActionPreflightContext>;
    const result = await resolver.resolve({
      symbol: 'AAPL',
      mic: instrument.venueMic,
      context,
    });
    return {
      status: 'AVAILABLE',
      observation: {
        sourceId: result.sourceId,
        mic: result.mic,
        session: result.session,
        observedAt: result.observedAt,
        validUntil: result.validUntil,
      },
    };
  } catch (error) {
    return { status: 'UNAVAILABLE', reasonCode: sanitizedCode(error) };
  }
}

async function probeRobinhoodContext(): Promise<
  Probe<{
    sourceId: string;
    integrity: string;
    halt: string;
    corporateAction: string;
    session: string;
    onchainComplete: boolean;
    assetDeploymentRegistered: boolean;
    quoteDeploymentMatchesAsset: boolean;
  }>
> {
  try {
    const context = await getRobinhoodRwaContext('AAPL', { verifyOnchain: true });
    return {
      status: 'AVAILABLE',
      observation: {
        sourceId: context.source.id,
        integrity: context.integrity.status,
        halt: context.marketEvidence.halt,
        corporateAction: context.marketEvidence.corporateAction,
        session: context.marketEvidence.session,
        onchainComplete: context.multiplier.onchain.complete,
        assetDeploymentRegistered: context.verification.assetDeploymentRegistered,
        quoteDeploymentMatchesAsset: context.verification.quoteDeploymentMatchesAsset,
      },
    };
  } catch (error) {
    return { status: 'UNAVAILABLE', reasonCode: sanitizedCode(error) };
  }
}

async function probeChainAndFeed(
  instrument: RwaInstrument,
  expectedTokenUid: string,
  nowSeconds: number
): Promise<{
  chain: Probe<{
    chainId: number;
    blockNumber: string;
    blockTimestamp: number;
    tokenUid: string;
    multiplierAtomic: string;
    pendingMultiplierAtomic: string;
    effectiveAt: string;
    oraclePaused: boolean;
  }>;
  feed: Probe<{
    feedId: string;
    feedAddress: string;
    description: string;
    decimals: number;
    roundId: string;
    updatedAt: number;
    ageSeconds: number;
    freshnessEvaluatedAgainstPolicy: false;
  }>;
}> {
  const configuredRpcUrl = process.env.ROBINHOOD_RPC_URL?.trim();
  const client = createPublicClient({
    chain: robinhood,
    transport: http(configuredRpcUrl || undefined, { timeout: 10_000, retryCount: 0 }),
  });

  let chain: Probe<{
    chainId: number;
    blockNumber: string;
    blockTimestamp: number;
    tokenUid: string;
    multiplierAtomic: string;
    pendingMultiplierAtomic: string;
    effectiveAt: string;
    oraclePaused: boolean;
  }>;
  let blockNumber: bigint | null = null;
  let tokenUpdateSafe = false;
  try {
    const chainId = await client.getChainId();
    if (chainId !== robinhoodChainId) throw new TypeError('ROBINHOOD_CHAIN_ID_MISMATCH');
    blockNumber = await client.getBlockNumber();
    const tokenAddress = getAddress(instrument.tokenAddress);
    const [block, tokenUid, multiplier, pendingMultiplier, effectiveAt, oraclePaused] =
      await Promise.all([
        client.getBlock({ blockNumber }),
        client.readContract({
          address: tokenAddress,
          abi: tokenAbi,
          functionName: 'uid',
          blockNumber,
        }),
        client.readContract({
          address: tokenAddress,
          abi: tokenAbi,
          functionName: 'uiMultiplier',
          blockNumber,
        }),
        client.readContract({
          address: tokenAddress,
          abi: tokenAbi,
          functionName: 'newUIMultiplier',
          blockNumber,
        }),
        client.readContract({
          address: tokenAddress,
          abi: tokenAbi,
          functionName: 'effectiveAt',
          blockNumber,
        }),
        client.readContract({
          address: tokenAddress,
          abi: tokenAbi,
          functionName: 'oraclePaused',
          blockNumber,
        }),
      ]);
    const blockTimestamp = Number(block.timestamp);
    if (
      tokenUid.toLowerCase() !== expectedTokenUid.toLowerCase() ||
      multiplier <= 0n ||
      !Number.isSafeInteger(blockTimestamp) ||
      blockTimestamp <= 0
    ) {
      throw new TypeError('ROBINHOOD_TOKEN_IDENTITY_MISMATCH');
    }
    tokenUpdateSafe =
      pendingMultiplier === 0n &&
      !oraclePaused &&
      (effectiveAt === 0n || effectiveAt <= block.timestamp);
    chain = {
      status: 'AVAILABLE',
      observation: {
        chainId,
        blockNumber: blockNumber.toString(),
        blockTimestamp,
        tokenUid,
        multiplierAtomic: multiplier.toString(),
        pendingMultiplierAtomic: pendingMultiplier.toString(),
        effectiveAt: effectiveAt.toString(),
        oraclePaused,
      },
    };
  } catch (error) {
    chain = {
      status: isExplicitValidationError(error) ? 'INVALID' : 'UNAVAILABLE',
      reasonCode: sanitizedCode(error),
    };
  }

  const feedAddressValue = process.env.CHAINLINK_RHJ_AAPL_FEED?.trim();
  if (!feedAddressValue) {
    return {
      chain,
      feed: { status: 'NOT_CONFIGURED', reasonCode: 'AAPL_FEED_ADDRESS_NOT_CONFIGURED' },
    };
  }

  let feedAddress: `0x${string}`;
  try {
    feedAddress = getAddress(feedAddressValue);
  } catch {
    return {
      chain,
      feed: { status: 'INVALID', reasonCode: 'CHAINLINK_FEED_ADDRESS_INVALID' },
    };
  }

  try {
    if (blockNumber === null) throw new Error('ROBINHOOD_RPC_UNAVAILABLE');
    if (!tokenUpdateSafe) throw new TypeError('CHAINLINK_AAPL_TOKEN_STATE_UNSAFE');
    const [description, decimals, round] = await Promise.all([
      client.readContract({
        address: feedAddress,
        abi: feedAbi,
        functionName: 'description',
        blockNumber,
      }),
      client.readContract({
        address: feedAddress,
        abi: feedAbi,
        functionName: 'decimals',
        blockNumber,
      }),
      client.readContract({
        address: feedAddress,
        abi: feedAbi,
        functionName: 'latestRoundData',
        blockNumber,
      }),
    ]);
    const [roundId, answer, , updatedAt, answeredInRound] = round;
    const roundTime = Number(updatedAt);
    const blockTime = chain.observation?.blockTimestamp ?? 0;
    if (
      !description.toUpperCase().includes('AAPL') ||
      !description.toUpperCase().includes('USD') ||
      decimals > 36 ||
      answer <= 0n ||
      roundId === 0n ||
      answeredInRound < roundId ||
      !Number.isSafeInteger(roundTime) ||
      roundTime <= 0 ||
      roundTime > blockTime ||
      roundTime > nowSeconds
    ) {
      throw new TypeError('CHAINLINK_AAPL_FEED_INVALID');
    }
    return {
      chain,
      feed: {
        status: 'AVAILABLE',
        observation: {
          feedId: aaplFeedId,
          feedAddress,
          description,
          decimals,
          roundId: roundId.toString(),
          updatedAt: roundTime,
          ageSeconds: nowSeconds - roundTime,
          freshnessEvaluatedAgainstPolicy: false,
        },
      },
    };
  } catch (error) {
    return {
      chain,
      feed: {
        status: isExplicitValidationError(error) ? 'INVALID' : 'UNAVAILABLE',
        reasonCode: sanitizedCode(error),
      },
    };
  }
}

async function main(): Promise<void> {
  const registry = validateRwaInstrumentRegistry(committedRegistry);
  const registryEntry = registry.entries.find((entry) => entry.issuerBinding.symbol === 'AAPL');
  if (!registryEntry) throw new TypeError('AAPL_NOT_IN_INSTRUMENT_REGISTRY');
  const instrument = registryEntry.instrument;
  const nowSeconds = Math.floor(Date.now() / 1000);

  const [session, robinhoodContext, chainAndFeed] = await Promise.all([
    probeMarketSession(instrument, nowSeconds),
    probeRobinhoodContext(),
    probeChainAndFeed(instrument, registryEntry.issuerBinding.nativeAssetId, nowSeconds),
  ]);

  const blockers = [
    ...(session.status !== 'AVAILABLE' ? ['MARKET_SESSION_SOURCE_UNAVAILABLE'] : []),
    ...(robinhoodContext.status !== 'AVAILABLE' ? ['ROBINHOOD_ISSUER_CONTEXT_UNAVAILABLE'] : []),
    ...(robinhoodContext.status === 'AVAILABLE' &&
    robinhoodContext.observation?.integrity !== 'CLEAR'
      ? ['ROBINHOOD_CONTEXT_NOT_CLEAR']
      : []),
    ...(chainAndFeed.chain.status !== 'AVAILABLE' ? ['ROBINHOOD_CHAIN_READ_UNAVAILABLE'] : []),
    ...(chainAndFeed.feed.status !== 'AVAILABLE' ? ['CHAINLINK_AAPL_FEED_UNAVAILABLE'] : []),
    'SECOND_INDEPENDENT_PRICE_SOURCE_NOT_CONFIGURED',
    'SENDER_AND_RECEIVER_ELIGIBILITY_NOT_CONFIGURED',
    'ACTUAL_UNSIGNED_TRANSACTION_NOT_PROVIDED',
  ];

  const report = {
    schema: 'insight.rwa-action-preflight-readiness.v1',
    mode: 'shadow-readiness',
    mayAuthorizeExecution: false,
    generatedAt: new Date().toISOString(),
    registryVersion: registry.version,
    instrumentId: registryEntry.instrumentId,
    symbol: 'AAPL',
    probes: {
      marketSession: session,
      robinhoodIssuerContext: robinhoodContext,
      robinhoodChain: chainAndFeed.chain,
      chainlinkAapl: chainAndFeed.feed,
    },
    sourceProbesAvailable: [session, robinhoodContext, chainAndFeed.chain, chainAndFeed.feed].every(
      (probe) => probe.status === 'AVAILABLE'
    ),
    fullActionPreflightReady: false,
    blockers,
    nextRequiredInputs: [
      'Add a second policy-pinned independent AAPL price observation.',
      'Add an issuer or app-owned source for sender and decoded receiver eligibility.',
      'Supply the exact unsigned transaction fields and call profile for one intended shadow action.',
    ],
  };

  await mkdir(evidenceDirectory, { recursive: true });
  const fileName = `${report.generatedAt.replaceAll(':', '-').replaceAll('.', '-')}.json`;
  await writeFile(path.join(evidenceDirectory, fileName), `${JSON.stringify(report, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  });
  console.log(JSON.stringify({ ...report, evidenceFile: path.join(evidenceDirectory, fileName) }));
  if (!report.sourceProbesAvailable) process.exitCode = 1;
  else process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(sanitizedCode(error));
    process.exitCode = 1;
  });
}
