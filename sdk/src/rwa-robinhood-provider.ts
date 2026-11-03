// Copyright (c) 2026 Insight. MIT. Robinhood issuer context adapter for RWA preflight.
import { rwaInstrumentId, type RwaMarketState } from './rwa';
import {
  RwaActionPreflightError,
  type RwaActionEvidenceProvider,
  type RwaActionPreflightContext,
} from './rwa-preflight';
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_RWA_CONTEXT_SCHEMA,
  ROBINHOOD_RWA_SOURCE_ID,
  type RobinhoodRwaContext,
} from './rwa-robinhood';
import {
  readRobinhoodRwaSessionObservation,
  type RobinhoodRwaSessionResolver,
} from './rwa-robinhood-session';

export interface RobinhoodRwaContextLoaderInput {
  symbol: string;
  context: Readonly<RwaActionPreflightContext>;
}

export type RobinhoodRwaContextLoader = (input: RobinhoodRwaContextLoaderInput) => Promise<unknown>;

export interface RobinhoodRwaMarketProviderOptions {
  /** Ticker lookup is corroborated against chain and token deployment. */
  symbol: string;
  loadContext: RobinhoodRwaContextLoader;
  /** Required with sessionResolver; policy-pinned ID for the combined issuer + session state. */
  marketSourceId?: string;
  /** A separate app-authenticated venue-session source shared with the Chainlink price adapter. */
  sessionResolver?: RobinhoodRwaSessionResolver;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    Boolean(value) && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
  );
}

function isNullableSecond(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0);
}

function readContext(
  value: unknown,
  symbol: string,
  context: Readonly<RwaActionPreflightContext>
): RobinhoodRwaContext {
  if (!isRecord(value) || value.schema !== ROBINHOOD_RWA_CONTEXT_SCHEMA) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
  }

  const source = value.source;
  const asset = value.asset;
  const verification = value.verification;
  const marketEvidence = value.marketEvidence;
  const integrity = value.integrity;
  if (
    !isRecord(source) ||
    source.id !== ROBINHOOD_RWA_SOURCE_ID ||
    source.type !== 'issuer-first-party' ||
    source.independent !== false ||
    source.countsTowardOracleQuorum !== false ||
    !isRecord(asset) ||
    !isRecord(asset.deployment) ||
    !isRecord(verification) ||
    !isRecord(marketEvidence) ||
    !isRecord(integrity)
  ) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
  }

  const expectedAddress = context.instrument.tokenAddress.toLowerCase();
  const deployedAddress = asset.deployment.contractAddress;
  if (
    context.instrument.issuer !== ROBINHOOD_RWA_SOURCE_ID ||
    context.instrument.tokenChainId !== ROBINHOOD_CHAIN_ID ||
    context.transaction.chainId !== ROBINHOOD_CHAIN_ID ||
    typeof asset.tokenSymbol !== 'string' ||
    asset.tokenSymbol.toUpperCase() !== symbol ||
    typeof deployedAddress !== 'string' ||
    !/^0x[0-9a-f]{40}$/i.test(deployedAddress) ||
    deployedAddress.toLowerCase() !== expectedAddress ||
    asset.deployment.chainId !== ROBINHOOD_CHAIN_ID
  ) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
  }

  const verificationFlags = [
    verification.assetDeploymentRegistered,
    verification.quoteSymbolMatchesAsset,
    verification.quoteDeploymentMatchesAsset,
    verification.corporateActionSymbolsMatchAsset,
    verification.corporateActionDeploymentsMatchAsset,
  ];
  const assetIdMatchesOnchain = verification.assetIdMatchesOnchain;
  if (
    verificationFlags.some((flag) => typeof flag !== 'boolean' || flag === false) ||
    ![null, true, false].includes(assetIdMatchesOnchain as boolean | null) ||
    assetIdMatchesOnchain === false ||
    !['CLEAR', 'CAUTION', 'BLOCK'].includes(String(integrity.status)) ||
    !['CLEAR', 'HALTED', 'UNKNOWN'].includes(String(marketEvidence.halt)) ||
    !['CLEAR', 'PENDING', 'UNKNOWN'].includes(String(marketEvidence.corporateAction)) ||
    !['REGULAR', 'PRE', 'POST', 'OVERNIGHT', 'CLOSED', 'UNKNOWN'].includes(
      String(marketEvidence.session)
    ) ||
    !isNullableSecond(marketEvidence.observedAt) ||
    !isNullableSecond(marketEvidence.validUntil)
  ) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
  }

  return value as unknown as RobinhoodRwaContext;
}

/**
 * Adapt Robinhood's first-party halt/corporate-action context into preflight market state. Its
 * quote remains excluded from price quorum. A separately supplied session resolver can provide
 * the venue session; when used, the output must have its own policy-pinned composite source ID.
 */
export function createRobinhoodRwaMarketProvider(
  options: RobinhoodRwaMarketProviderOptions
): RwaActionEvidenceProvider {
  if (!options || typeof options !== 'object') {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_PROVIDER_INVALID');
  }
  if (typeof options.symbol !== 'string') {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_PROVIDER_INVALID');
  }
  const symbol = options.symbol.toUpperCase();
  const marketSourceId = options.marketSourceId ?? ROBINHOOD_RWA_SOURCE_ID;
  const loadContext = options.loadContext;
  const sessionResolver = options.sessionResolver;
  const sessionSourceId = sessionResolver?.sourceId;
  if (
    !/^[A-Z][A-Z0-9.-]{0,15}$/.test(symbol) ||
    typeof options.loadContext !== 'function' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(marketSourceId) ||
    (options.marketSourceId !== undefined && !options.sessionResolver) ||
    (options.sessionResolver !== undefined &&
      (!options.marketSourceId ||
        typeof options.sessionResolver.sourceId !== 'string' ||
        !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(options.sessionResolver.sourceId) ||
        options.marketSourceId === ROBINHOOD_RWA_SOURCE_ID ||
        typeof options.sessionResolver.resolve !== 'function'))
  ) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_PROVIDER_INVALID');
  }

  return {
    sourceId: marketSourceId,
    async collect(context) {
      const [rawContext, rawSessionObservation] = await Promise.all([
        loadContext({ symbol, context }),
        sessionResolver?.resolve({
          symbol,
          mic: context.instrument.venueMic,
          context,
        }) ?? Promise.resolve(null),
      ]);
      const sessionObservation = rawSessionObservation
        ? readRobinhoodRwaSessionObservation(
            rawSessionObservation,
            sessionSourceId!,
            context.instrument.venueMic
          )
        : null;
      const sourceContext = readContext(rawContext, symbol, context);
      const issuerObservedAt = sourceContext.marketEvidence.observedAt;
      const issuerValidUntil = sourceContext.marketEvidence.validUntil;
      const observedAt =
        issuerObservedAt === null
          ? null
          : sessionObservation
            ? Math.min(issuerObservedAt, sessionObservation.observedAt)
            : issuerObservedAt;
      const validUntil =
        issuerValidUntil === null
          ? null
          : sessionObservation
            ? Math.min(issuerValidUntil, sessionObservation.validUntil)
            : issuerValidUntil;
      if (observedAt === null || validUntil === null) return {};
      if (observedAt <= 0 || validUntil <= 0 || observedAt > validUntil) {
        throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
      }

      // Unresolved issuer-integrity conditions cannot clear otherwise clear fields.
      const integrityClear = sourceContext.integrity.status === 'CLEAR';
      const knownHalt = sourceContext.marketEvidence.halt === 'HALTED';
      const knownCorporateAction = sourceContext.marketEvidence.corporateAction === 'PENDING';
      const market: RwaMarketState = {
        instrumentId: rwaInstrumentId(context.instrument),
        mic: context.instrument.venueMic,
        source: marketSourceId,
        session: sessionObservation?.session ?? sourceContext.marketEvidence.session,
        halt: knownHalt ? 'HALTED' : integrityClear ? sourceContext.marketEvidence.halt : 'UNKNOWN',
        corporateAction: knownCorporateAction
          ? 'PENDING'
          : integrityClear
            ? sourceContext.marketEvidence.corporateAction
            : 'UNKNOWN',
        observedAt,
        validUntil,
      };
      return { market };
    },
  };
}
