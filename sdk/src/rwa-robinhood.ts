/**
 * Robinhood Stock Token issuer context.
 *
 * This module deliberately does not model Robinhood as an oracle provider.
 * Robinhood is the first-party issuer source for token identity, trading
 * capabilities, corporate actions and the ERC-8056 multiplier. Consumers
 * should compare this context with independent oracle and on-chain evidence.
 */

export const ROBINHOOD_RWA_CONTEXT_SCHEMA = 'insight.robinhood-rwa-context.v1' as const;
export const ROBINHOOD_RWA_SOURCE_ID = 'robinhood-rhj' as const;
export const ROBINHOOD_CHAIN_ID = 4663;
export const ROBINHOOD_MULTIPLIER_DECIMALS = 18;
export const ROBINHOOD_QUOTE_MAX_AGE_SECONDS = 30;

export type RobinhoodTradingStatus =
  | 'TRADING_STATUS_UNSPECIFIED'
  | 'TRADING_STATUS_TRADABLE'
  | 'TRADING_STATUS_UNTRADABLE'
  | 'TRADING_STATUS_POSITION_CLOSING_ONLY'
  | 'TRADING_STATUS_POSITION_OPENING_ONLY';

export interface RobinhoodTradingCapability {
  whole: RobinhoodTradingStatus | string | null;
  fractional: RobinhoodTradingStatus | string | null;
}

export interface RobinhoodTradingCapabilities {
  market?: RobinhoodTradingCapability | null;
  extended?: RobinhoodTradingCapability | null;
  overnight?: RobinhoodTradingCapability | null;
}

export interface RobinhoodDeployment {
  contractAddress: `0x${string}`;
  chainId: number;
  networkName?: string;
}

export interface RobinhoodStockTokenAsset {
  id: `0x${string}`;
  tokenSymbol: string;
  tokenName: string;
  deployments: RobinhoodDeployment[];
  currentMultiplier: string;
  pendingMultiplier: string | null;
  pendingMultiplierEffectiveTime?: string | null;
  tradingCapabilities?: RobinhoodTradingCapabilities | null;
  status: 'ASSET_STATUS_UNSPECIFIED' | 'ASSET_STATUS_ACTIVE' | 'ASSET_STATUS_INACTIVE';
  tokenDecimals?: number;
  isin?: string;
  logoUrl?: string;
}

export interface RobinhoodStockTokenQuote {
  tokenSymbol: string;
  deployments: RobinhoodDeployment[];
  bid: string;
  ask: string;
  currency: string;
  dailyTradingVolume: string;
  isTradingHalt: boolean;
  generatedAt: string;
}

export interface RobinhoodCorporateAction {
  id: `0x${string}`;
  type: string;
  status:
    | 'CORPORATE_ACTION_STATUS_UNSPECIFIED'
    | 'CORPORATE_ACTION_STATUS_IN_PROGRESS'
    | 'CORPORATE_ACTION_STATUS_COMPLETED';
  processDate?: { year: number; month: number; day: number } | null;
  tokenSymbol: string;
  deployments: RobinhoodDeployment[];
  details: Record<string, unknown>;
}

export interface RobinhoodOnchainMultiplierState {
  attempted: boolean;
  available: boolean;
  complete: boolean;
  rpcMode: 'configured' | 'public-rate-limited' | 'not-requested';
  tokenUid: `0x${string}` | null;
  currentMultiplierAtomic: string | null;
  newMultiplierAtomic: string | null;
  effectiveAt: number | null;
  oraclePaused: boolean | null;
  verifiedAt: number | null;
  errorCode: string | null;
}

export type RobinhoodRwaReasonCode =
  | 'ASSET_INACTIVE'
  | 'ASSET_STATUS_UNKNOWN'
  | 'ASSET_ID_MISMATCH'
  | 'ASSET_DEPLOYMENT_MISMATCH'
  | 'TRADING_HALTED'
  | 'TRADING_CAPABILITIES_UNKNOWN'
  | 'TRADING_CAPABILITIES_RESTRICTED'
  | 'CORPORATE_ACTION_PENDING'
  | 'CORPORATE_ACTION_STATUS_UNKNOWN'
  | 'CORPORATE_ACTION_SYMBOL_MISMATCH'
  | 'CORPORATE_ACTION_DEPLOYMENT_MISMATCH'
  | 'MULTIPLIER_UPDATE_PENDING'
  | 'PENDING_MULTIPLIER_TIME_INVALID'
  | 'MULTIPLIER_MISMATCH'
  | 'PENDING_MULTIPLIER_MISMATCH'
  | 'MULTIPLIER_EFFECTIVE_TIME_MISMATCH'
  | 'ORACLE_PAUSED'
  | 'QUOTE_SYMBOL_MISMATCH'
  | 'QUOTE_DEPLOYMENT_MISMATCH'
  | 'QUOTE_STALE'
  | 'QUOTE_TIME_FUTURE'
  | 'QUOTE_TIME_INVALID'
  | 'ONCHAIN_VERIFICATION_PARTIAL'
  | 'ONCHAIN_VERIFICATION_UNAVAILABLE'
  | 'ONCHAIN_VERIFICATION_NOT_REQUESTED';

export interface RobinhoodRwaContext {
  schema: typeof ROBINHOOD_RWA_CONTEXT_SCHEMA;
  source: {
    id: typeof ROBINHOOD_RWA_SOURCE_ID;
    type: 'issuer-first-party';
    independent: false;
    countsTowardOracleQuorum: false;
    issuer: 'Robinhood Assets (Jersey) Limited';
  };
  retrievedAt: number;
  asset: RobinhoodStockTokenAsset & { deployment: RobinhoodDeployment };
  quote: RobinhoodStockTokenQuote & {
    midpointUsd: string;
    ageSeconds: number | null;
  };
  multiplier: {
    decimals: typeof ROBINHOOD_MULTIPLIER_DECIMALS;
    apiCurrent: string;
    apiCurrentAtomic: string;
    apiPending: string | null;
    apiPendingAtomic: string | null;
    apiPendingEffectiveAt: number | null;
    onchain: RobinhoodOnchainMultiplierState;
    currentMatchesOnchain: boolean | null;
    pendingMatchesOnchain: boolean | null;
    effectiveTimeMatchesOnchain: boolean | null;
  };
  verification: {
    assetIdMatchesOnchain: boolean | null;
    assetDeploymentRegistered: boolean;
    quoteSymbolMatchesAsset: boolean;
    quoteDeploymentMatchesAsset: boolean;
    corporateActionSymbolsMatchAsset: boolean;
    corporateActionDeploymentsMatchAsset: boolean;
  };
  priceNormalization: {
    rawUnderlyingMidUsd: string;
    tokenReferencePriceUsd: string;
    formula: 'underlying-midpoint * currentMultiplier';
    note: string;
    countsTowardOracleQuorum: false;
  };
  corporateActions: RobinhoodCorporateAction[];
  marketEvidence: {
    halt: 'CLEAR' | 'HALTED' | 'UNKNOWN';
    corporateAction: 'CLEAR' | 'PENDING' | 'UNKNOWN';
    observedAt: number | null;
    validUntil: number | null;
    quoteObservedAt: number | null;
    quoteValidUntil: number | null;
    corporateActionsRetrievedAt: number;
    session: 'UNKNOWN';
    note: string;
  };
  integrity: {
    status: 'CLEAR' | 'CAUTION' | 'BLOCK';
    reasonCodes: RobinhoodRwaReasonCode[];
    mayAuthorizeExecution: false;
  };
}

export interface BuildRobinhoodRwaContextInput {
  asset: RobinhoodStockTokenAsset;
  deployment: RobinhoodDeployment;
  quote: RobinhoodStockTokenQuote;
  corporateActions: RobinhoodCorporateAction[];
  onchain: RobinhoodOnchainMultiplierState;
  retrievedAt: number;
  quoteMaxAgeSeconds?: number;
}

const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/;

/** Parse a non-negative decimal string without floating-point loss. */
export function robinhoodDecimalToAtomic(value: string, decimals: number): bigint {
  if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new TypeError('ROBINHOOD_DECIMALS_INVALID');
  }
  const match = DECIMAL_PATTERN.exec(value);
  if (!match) throw new TypeError('ROBINHOOD_DECIMAL_INVALID');
  const fraction = match[2] ?? '';
  if (fraction.length > decimals) throw new TypeError('ROBINHOOD_DECIMAL_PRECISION');
  const base = 10n ** BigInt(decimals);
  return (
    BigInt(match[1]) * base + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals) || '0')
  );
}

export function robinhoodAtomicToDecimal(value: bigint, decimals: number): string {
  if (value < 0n) throw new TypeError('ROBINHOOD_ATOMIC_NEGATIVE');
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = (value % base).toString().padStart(decimals, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function parseIsoSeconds(value: string | null | undefined): number | null {
  if (!value) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : null;
}

function normalizedMidpointAndTokenPrice(
  bid: string,
  ask: string,
  multiplier: string
): { midpoint: string; tokenPrice: string } {
  const scale = 10n ** BigInt(ROBINHOOD_MULTIPLIER_DECIMALS);
  const bidAtomic = robinhoodDecimalToAtomic(bid, ROBINHOOD_MULTIPLIER_DECIMALS);
  const askAtomic = robinhoodDecimalToAtomic(ask, ROBINHOOD_MULTIPLIER_DECIMALS);
  if (bidAtomic <= 0n || askAtomic <= 0n || askAtomic < bidAtomic) {
    throw new TypeError('ROBINHOOD_QUOTE_INVALID');
  }
  const midpointAtomic = (bidAtomic + askAtomic) / 2n;
  const multiplierAtomic = robinhoodDecimalToAtomic(multiplier, ROBINHOOD_MULTIPLIER_DECIMALS);
  if (multiplierAtomic <= 0n) throw new TypeError('ROBINHOOD_MULTIPLIER_INVALID');
  const tokenPriceAtomic = (midpointAtomic * multiplierAtomic + scale / 2n) / scale;
  return {
    midpoint: robinhoodAtomicToDecimal(midpointAtomic, ROBINHOOD_MULTIPLIER_DECIMALS),
    tokenPrice: robinhoodAtomicToDecimal(tokenPriceAtomic, ROBINHOOD_MULTIPLIER_DECIMALS),
  };
}

function capabilityStatuses(capabilities?: RobinhoodTradingCapabilities | null): string[] {
  if (!capabilities) return [];
  return [capabilities.market, capabilities.extended, capabilities.overnight].flatMap((session) =>
    session
      ? [session.whole, session.fractional].filter((v): v is string => typeof v === 'string')
      : []
  );
}

function includesDeployment(
  deployments: RobinhoodDeployment[],
  expected: RobinhoodDeployment
): boolean {
  return deployments.some(
    (candidate) =>
      candidate.chainId === expected.chainId &&
      candidate.contractAddress.toLowerCase() === expected.contractAddress.toLowerCase()
  );
}

const ROBINHOOD_BLOCKING_REASONS = new Set<RobinhoodRwaReasonCode>([
  'ASSET_INACTIVE',
  'ASSET_STATUS_UNKNOWN',
  'ASSET_ID_MISMATCH',
  'ASSET_DEPLOYMENT_MISMATCH',
  'TRADING_CAPABILITIES_RESTRICTED',
  'TRADING_HALTED',
  'CORPORATE_ACTION_PENDING',
  'CORPORATE_ACTION_STATUS_UNKNOWN',
  'CORPORATE_ACTION_SYMBOL_MISMATCH',
  'CORPORATE_ACTION_DEPLOYMENT_MISMATCH',
  'MULTIPLIER_UPDATE_PENDING',
  'PENDING_MULTIPLIER_TIME_INVALID',
  'MULTIPLIER_MISMATCH',
  'PENDING_MULTIPLIER_MISMATCH',
  'MULTIPLIER_EFFECTIVE_TIME_MISMATCH',
  'ORACLE_PAUSED',
  'QUOTE_SYMBOL_MISMATCH',
  'QUOTE_DEPLOYMENT_MISMATCH',
  'QUOTE_STALE',
  'QUOTE_TIME_FUTURE',
  'QUOTE_TIME_INVALID',
]);

interface RobinhoodIntegrityFacts {
  observedAt: number | null;
  quoteAge: number | null;
  quoteMaxAge: number;
  pendingActionCount: number;
  unknownActionCount: number;
  apiPendingAtomic: string | null;
  pendingEffectiveAt: number | null;
  currentMatchesOnchain: boolean | null;
  pendingMatchesOnchain: boolean | null;
  effectiveTimeMatchesOnchain: boolean | null;
  assetIdMatchesOnchain: boolean | null;
  assetDeploymentRegistered: boolean;
  quoteSymbolMatchesAsset: boolean;
  quoteDeploymentMatchesAsset: boolean;
  corporateActionSymbolsMatchAsset: boolean;
  corporateActionDeploymentsMatchAsset: boolean;
}

function collectIntegrityReasons(
  input: BuildRobinhoodRwaContextInput,
  facts: RobinhoodIntegrityFacts
): RobinhoodRwaReasonCode[] {
  const reasons = new Set<RobinhoodRwaReasonCode>();
  if (input.asset.status === 'ASSET_STATUS_INACTIVE') reasons.add('ASSET_INACTIVE');
  if (input.asset.status === 'ASSET_STATUS_UNSPECIFIED') reasons.add('ASSET_STATUS_UNKNOWN');
  if (facts.assetIdMatchesOnchain === false) reasons.add('ASSET_ID_MISMATCH');
  if (!facts.assetDeploymentRegistered) reasons.add('ASSET_DEPLOYMENT_MISMATCH');
  if (input.quote.isTradingHalt) reasons.add('TRADING_HALTED');
  if (facts.observedAt == null) reasons.add('QUOTE_TIME_INVALID');
  else if (facts.quoteAge != null && facts.quoteAge < 0) reasons.add('QUOTE_TIME_FUTURE');
  else if (facts.quoteAge != null && facts.quoteAge > facts.quoteMaxAge) reasons.add('QUOTE_STALE');
  if (facts.pendingActionCount > 0) reasons.add('CORPORATE_ACTION_PENDING');
  if (facts.unknownActionCount > 0) reasons.add('CORPORATE_ACTION_STATUS_UNKNOWN');
  if (!facts.corporateActionSymbolsMatchAsset) reasons.add('CORPORATE_ACTION_SYMBOL_MISMATCH');
  if (!facts.corporateActionDeploymentsMatchAsset)
    reasons.add('CORPORATE_ACTION_DEPLOYMENT_MISMATCH');
  if (facts.apiPendingAtomic != null) reasons.add('MULTIPLIER_UPDATE_PENDING');
  if (facts.apiPendingAtomic != null && facts.pendingEffectiveAt == null)
    reasons.add('PENDING_MULTIPLIER_TIME_INVALID');
  if (facts.currentMatchesOnchain === false) reasons.add('MULTIPLIER_MISMATCH');
  if (facts.pendingMatchesOnchain === false) reasons.add('PENDING_MULTIPLIER_MISMATCH');
  if (facts.effectiveTimeMatchesOnchain === false)
    reasons.add('MULTIPLIER_EFFECTIVE_TIME_MISMATCH');
  if (input.onchain.oraclePaused === true) reasons.add('ORACLE_PAUSED');
  if (!facts.quoteSymbolMatchesAsset) reasons.add('QUOTE_SYMBOL_MISMATCH');
  if (!facts.quoteDeploymentMatchesAsset) reasons.add('QUOTE_DEPLOYMENT_MISMATCH');
  if (!input.onchain.attempted) reasons.add('ONCHAIN_VERIFICATION_NOT_REQUESTED');
  else if (!input.onchain.available) reasons.add('ONCHAIN_VERIFICATION_UNAVAILABLE');
  else if (!input.onchain.complete) reasons.add('ONCHAIN_VERIFICATION_PARTIAL');

  const statuses = capabilityStatuses(input.asset.tradingCapabilities);
  if (statuses.length === 0) reasons.add('TRADING_CAPABILITIES_UNKNOWN');
  else if (!statuses.includes('TRADING_STATUS_TRADABLE'))
    reasons.add('TRADING_CAPABILITIES_RESTRICTED');
  return [...reasons];
}

/**
 * Build non-authorizing issuer context. A CLEAR result means the supplied
 * issuer facts are internally consistent; it is not a trade authorization and
 * never counts as an independent oracle observation.
 */
export function buildRobinhoodRwaContext(
  input: BuildRobinhoodRwaContextInput
): RobinhoodRwaContext {
  const quoteMaxAge = input.quoteMaxAgeSeconds ?? ROBINHOOD_QUOTE_MAX_AGE_SECONDS;
  if (!Number.isSafeInteger(input.retrievedAt) || input.retrievedAt < 0) {
    throw new TypeError('ROBINHOOD_RETRIEVED_AT_INVALID');
  }
  if (!Number.isSafeInteger(quoteMaxAge) || quoteMaxAge < 1) {
    throw new TypeError('ROBINHOOD_QUOTE_MAX_AGE_INVALID');
  }
  if (input.quote.currency !== 'USD') {
    throw new TypeError('ROBINHOOD_QUOTE_CURRENCY_UNSUPPORTED');
  }

  const { midpoint, tokenPrice } = normalizedMidpointAndTokenPrice(
    input.quote.bid,
    input.quote.ask,
    input.asset.currentMultiplier
  );
  const observedAt = parseIsoSeconds(input.quote.generatedAt);
  const quoteAge = observedAt == null ? null : input.retrievedAt - observedAt;
  const pendingEffectiveAt = parseIsoSeconds(input.asset.pendingMultiplierEffectiveTime);
  const apiCurrentAtomic = robinhoodDecimalToAtomic(
    input.asset.currentMultiplier,
    ROBINHOOD_MULTIPLIER_DECIMALS
  ).toString();
  const apiPendingAtomic = input.asset.pendingMultiplier
    ? robinhoodDecimalToAtomic(
        input.asset.pendingMultiplier,
        ROBINHOOD_MULTIPLIER_DECIMALS
      ).toString()
    : null;
  const currentMatchesOnchain = input.onchain.available
    ? input.onchain.currentMultiplierAtomic === apiCurrentAtomic
    : null;
  const pendingMatchesOnchain =
    input.onchain.available && apiPendingAtomic != null && input.onchain.newMultiplierAtomic != null
      ? input.onchain.newMultiplierAtomic === apiPendingAtomic
      : null;
  const effectiveTimeMatchesOnchain =
    input.onchain.available && pendingEffectiveAt != null && input.onchain.effectiveAt != null
      ? input.onchain.effectiveAt === pendingEffectiveAt
      : null;
  const assetIdMatchesOnchain = input.onchain.tokenUid
    ? input.onchain.tokenUid.toLowerCase() === input.asset.id.toLowerCase()
    : null;
  const assetDeploymentRegistered = includesDeployment(input.asset.deployments, input.deployment);
  const quoteSymbolMatchesAsset =
    input.quote.tokenSymbol.toUpperCase() === input.asset.tokenSymbol.toUpperCase();
  const quoteDeploymentMatchesAsset = includesDeployment(input.quote.deployments, input.deployment);
  const corporateActionSymbolsMatchAsset = input.corporateActions.every(
    (action) => action.tokenSymbol.toUpperCase() === input.asset.tokenSymbol.toUpperCase()
  );
  const corporateActionDeploymentsMatchAsset = input.corporateActions.every((action) =>
    includesDeployment(action.deployments, input.deployment)
  );

  const pendingActions = input.corporateActions.filter(
    (action) => action.status === 'CORPORATE_ACTION_STATUS_IN_PROGRESS'
  );
  const unknownActions = input.corporateActions.filter(
    (action) => action.status === 'CORPORATE_ACTION_STATUS_UNSPECIFIED'
  );
  const reasonCodes = collectIntegrityReasons(input, {
    observedAt,
    quoteAge,
    quoteMaxAge,
    pendingActionCount: pendingActions.length,
    unknownActionCount: unknownActions.length,
    apiPendingAtomic,
    pendingEffectiveAt,
    currentMatchesOnchain,
    pendingMatchesOnchain,
    effectiveTimeMatchesOnchain,
    assetIdMatchesOnchain,
    assetDeploymentRegistered,
    quoteSymbolMatchesAsset,
    quoteDeploymentMatchesAsset,
    corporateActionSymbolsMatchAsset,
    corporateActionDeploymentsMatchAsset,
  });
  const status = reasonCodes.some((reason) => ROBINHOOD_BLOCKING_REASONS.has(reason))
    ? 'BLOCK'
    : reasonCodes.length > 0
      ? 'CAUTION'
      : 'CLEAR';
  const corporateAction =
    pendingActions.length > 0 || apiPendingAtomic != null
      ? 'PENDING'
      : unknownActions.length > 0 || !corporateActionDeploymentsMatchAsset
        ? 'UNKNOWN'
        : 'CLEAR';
  const halt = input.quote.isTradingHalt
    ? 'HALTED'
    : observedAt == null || (quoteAge != null && (quoteAge < 0 || quoteAge > quoteMaxAge))
      ? 'UNKNOWN'
      : 'CLEAR';

  return {
    schema: ROBINHOOD_RWA_CONTEXT_SCHEMA,
    source: {
      id: ROBINHOOD_RWA_SOURCE_ID,
      type: 'issuer-first-party',
      independent: false,
      countsTowardOracleQuorum: false,
      issuer: 'Robinhood Assets (Jersey) Limited',
    },
    retrievedAt: input.retrievedAt,
    asset: { ...input.asset, deployment: input.deployment },
    quote: { ...input.quote, midpointUsd: midpoint, ageSeconds: quoteAge },
    multiplier: {
      decimals: ROBINHOOD_MULTIPLIER_DECIMALS,
      apiCurrent: input.asset.currentMultiplier,
      apiCurrentAtomic,
      apiPending: input.asset.pendingMultiplier,
      apiPendingAtomic,
      apiPendingEffectiveAt: pendingEffectiveAt,
      onchain: input.onchain,
      currentMatchesOnchain,
      pendingMatchesOnchain,
      effectiveTimeMatchesOnchain,
    },
    verification: {
      assetIdMatchesOnchain,
      assetDeploymentRegistered,
      quoteSymbolMatchesAsset,
      quoteDeploymentMatchesAsset,
      corporateActionSymbolsMatchAsset,
      corporateActionDeploymentsMatchAsset,
    },
    priceNormalization: {
      rawUnderlyingMidUsd: midpoint,
      tokenReferencePriceUsd: tokenPrice,
      formula: 'underlying-midpoint * currentMultiplier',
      note: 'Robinhood REST prices are raw underlying quotes. Chainlink Stock Token feeds are already multiplier-adjusted; do not apply the multiplier to them again.',
      countsTowardOracleQuorum: false,
    },
    corporateActions: input.corporateActions,
    marketEvidence: {
      halt,
      corporateAction,
      observedAt,
      validUntil: observedAt == null ? null : observedAt + quoteMaxAge,
      quoteObservedAt: observedAt,
      quoteValidUntil: observedAt == null ? null : observedAt + quoteMaxAge,
      corporateActionsRetrievedAt: input.retrievedAt,
      session: 'UNKNOWN',
      note: 'Trading capabilities do not prove the current market session. Combine with an authenticated market-status source before authorization.',
    },
    integrity: { status, reasonCodes, mayAuthorizeExecution: false },
  };
}
