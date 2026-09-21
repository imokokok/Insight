import {
  buildRwaReport,
  rwaInstrumentId,
  type RwaInput,
  type RwaInstrument,
  type RwaPolicy,
  type RwaReport,
} from './rwa';
import { ROBINHOOD_RWA_SOURCE_ID, type RobinhoodRwaContext } from './rwa-robinhood';
import { buildRwaReportV2, type RwaReportV2, type RwaV2Context } from './rwa-v2';

export const RWA_INSTRUMENT_REGISTRY_SCHEMA = 'insight.rwa-instrument-registry.v1' as const;
export const RWA_INSTRUMENT_ADMISSION_SCHEMA = 'insight.rwa-instrument-admission.v1' as const;

export type RwaInstrumentRegistryStatus = 'SHADOW' | 'ACTIVE' | 'RETIRED';

export interface RwaMicReference {
  mic: string;
  operatingMic: string;
  type: 'OPRT' | 'SGMT';
  marketName: string;
  legalEntityName: string;
  lei: string | null;
  countryCode: string;
  status: 'ACTIVE' | 'EXPIRED';
  lastValidationDate: string | null;
}

export interface RwaFigiReference {
  /** Stable across venues for the same class of shares. */
  shareClassFigi: string;
  /** Country-level composite used as corroborating reference data. */
  compositeFigi: string;
}

export interface RwaIssuerInstrumentBinding {
  source: typeof ROBINHOOD_RWA_SOURCE_ID;
  nativeAssetId: `0x${string}`;
  symbol: string;
  isin: string;
  chainId: number;
  tokenAddress: `0x${string}`;
}

export interface RwaInstrumentRegistryEntry {
  status: RwaInstrumentRegistryStatus;
  instrumentId: `0x${string}`;
  instrument: RwaInstrument;
  figi: RwaFigiReference;
  mic: RwaMicReference;
  issuerBinding: RwaIssuerInstrumentBinding;
  reviewedAt: string;
}

export interface RwaInstrumentRegistry {
  schema: typeof RWA_INSTRUMENT_REGISTRY_SCHEMA;
  version: string;
  publishedAt: string;
  sources: {
    isoMic: {
      url: string;
      publicationDate: string;
      effectiveDate: string;
    };
    openFigi: {
      url: string;
      mappingIdType: 'ID_ISIN';
    };
    robinhood: {
      url: string;
    };
  };
  entries: RwaInstrumentRegistryEntry[];
}

export type RwaInstrumentAdmissionReason =
  | 'REGISTRY_ENTRY_NOT_FOUND'
  | 'REGISTRY_ENTRY_NOT_ACTIVE'
  | 'REGISTRY_NATIVE_ASSET_ID_MISMATCH'
  | 'REGISTRY_SYMBOL_MISMATCH'
  | 'REGISTRY_ISIN_UNAVAILABLE'
  | 'REGISTRY_ISIN_MISMATCH'
  | 'REGISTRY_DEPLOYMENT_MISMATCH';

export interface RwaInstrumentAdmission {
  schema: typeof RWA_INSTRUMENT_ADMISSION_SCHEMA;
  registryVersion: string;
  evaluatedAt: number;
  entry: RwaInstrumentRegistryEntry | null;
  observedIssuerBinding: {
    source: typeof ROBINHOOD_RWA_SOURCE_ID;
    nativeAssetId: `0x${string}`;
    symbol: string;
    isin: string | null;
    chainId: number;
    tokenAddress: `0x${string}`;
    issuerContextRetrievedAt: number;
    issuerIntegrityStatus: RobinhoodRwaContext['integrity']['status'];
  };
  evaluation: {
    identityStatus: 'MATCH' | 'MISMATCH' | 'NOT_FOUND';
    reasonCodes: RwaInstrumentAdmissionReason[];
    productionIdentityAdmitted: boolean;
    countsTowardOracleQuorum: false;
    mayAuthorizeExecution: false;
  };
}

const FIGI_PATTERN = /^[A-Z0-9]{12}$/;
const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
const MIC_PATTERN = /^[A-Z0-9]{4}$/;
const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.-]{0,15}$/;
const ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/;
const UID_PATTERN = /^0x[0-9a-f]{64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export class RwaInstrumentRegistryError extends TypeError {
  constructor(
    readonly code: string,
    readonly fieldPath: string
  ) {
    super(`${code}: ${fieldPath}`);
    this.name = 'RwaInstrumentRegistryError';
  }
}

function requireField(condition: unknown, code: string, fieldPath: string): asserts condition {
  if (!condition) throw new RwaInstrumentRegistryError(code, fieldPath);
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  return (
    Boolean(value) && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
  );
}

function validDate(value: unknown): value is string {
  return (
    typeof value === 'string' && DATE_PATTERN.test(value) && Number.isFinite(Date.parse(value))
  );
}

function validTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' && TIMESTAMP_PATTERN.test(value) && Number.isFinite(Date.parse(value))
  );
}

export function rwaShareClassFigiUnderlyingId(shareClassFigi: string): string {
  requireField(FIGI_PATTERN.test(shareClassFigi), 'RWA_REGISTRY_INVALID_FIGI', 'shareClassFigi');
  return `figi-share-class:${shareClassFigi}`;
}

/**
 * Validate a committed registry without contacting a third party. Runtime
 * authorization paths consume only this pinned data; live sync is an
 * onboarding/governance operation.
 */
export function validateRwaInstrumentRegistry(value: unknown): RwaInstrumentRegistry {
  requireField(plainRecord(value), 'RWA_REGISTRY_INVALID_SHAPE', 'registry');
  const registry = value as unknown as RwaInstrumentRegistry;
  requireField(
    registry.schema === RWA_INSTRUMENT_REGISTRY_SCHEMA,
    'RWA_REGISTRY_INVALID_SCHEMA',
    'schema'
  );
  requireField(
    typeof registry.version === 'string' && registry.version.length > 0,
    'RWA_REGISTRY_INVALID_VERSION',
    'version'
  );
  requireField(
    validTimestamp(registry.publishedAt),
    'RWA_REGISTRY_INVALID_TIMESTAMP',
    'publishedAt'
  );
  requireField(plainRecord(registry.sources), 'RWA_REGISTRY_INVALID_SOURCES', 'sources');
  requireField(
    plainRecord(registry.sources.isoMic) &&
      registry.sources.isoMic.url.startsWith('https://www.iso20022.org/') &&
      validDate(registry.sources.isoMic.publicationDate) &&
      validDate(registry.sources.isoMic.effectiveDate),
    'RWA_REGISTRY_INVALID_MIC_SOURCE',
    'sources.isoMic'
  );
  requireField(
    plainRecord(registry.sources.openFigi) &&
      registry.sources.openFigi.url === 'https://api.openfigi.com/v3/mapping' &&
      registry.sources.openFigi.mappingIdType === 'ID_ISIN',
    'RWA_REGISTRY_INVALID_FIGI_SOURCE',
    'sources.openFigi'
  );
  requireField(
    plainRecord(registry.sources.robinhood) &&
      registry.sources.robinhood.url === 'https://api.robinhood.com/rhj/assets',
    'RWA_REGISTRY_INVALID_ISSUER_SOURCE',
    'sources.robinhood'
  );
  requireField(
    Array.isArray(registry.entries) && registry.entries.length <= 10_000,
    'RWA_REGISTRY_INVALID_ENTRIES',
    'entries'
  );

  const instrumentIds = new Set<string>();
  const nativeIds = new Set<string>();
  const sourceSymbols = new Set<string>();
  for (const [index, entry] of registry.entries.entries()) {
    const path = `entries.${index}`;
    requireField(plainRecord(entry), 'RWA_REGISTRY_INVALID_ENTRY', path);
    requireField(
      ['SHADOW', 'ACTIVE', 'RETIRED'].includes(entry.status),
      'RWA_REGISTRY_INVALID_STATUS',
      `${path}.status`
    );
    const computedInstrumentId = rwaInstrumentId(entry.instrument);
    requireField(
      entry.instrumentId === computedInstrumentId,
      'RWA_REGISTRY_INSTRUMENT_ID_MISMATCH',
      `${path}.instrumentId`
    );
    requireField(
      FIGI_PATTERN.test(entry.figi.shareClassFigi) && FIGI_PATTERN.test(entry.figi.compositeFigi),
      'RWA_REGISTRY_INVALID_FIGI',
      `${path}.figi`
    );
    requireField(
      entry.instrument.underlyingId === rwaShareClassFigiUnderlyingId(entry.figi.shareClassFigi),
      'RWA_REGISTRY_UNDERLYING_FIGI_MISMATCH',
      `${path}.instrument.underlyingId`
    );
    requireField(
      MIC_PATTERN.test(entry.mic.mic) && MIC_PATTERN.test(entry.mic.operatingMic),
      'RWA_REGISTRY_INVALID_MIC',
      `${path}.mic`
    );
    requireField(
      ['OPRT', 'SGMT'].includes(entry.mic.type) &&
        (entry.mic.type === 'SGMT' || entry.mic.mic === entry.mic.operatingMic),
      'RWA_REGISTRY_INVALID_MIC_RELATION',
      `${path}.mic`
    );
    requireField(
      entry.mic.status === 'ACTIVE',
      'RWA_REGISTRY_MIC_NOT_ACTIVE',
      `${path}.mic.status`
    );
    requireField(
      entry.instrument.venueMic === entry.mic.mic,
      'RWA_REGISTRY_INSTRUMENT_MIC_MISMATCH',
      `${path}.instrument.venueMic`
    );
    requireField(
      typeof entry.mic.marketName === 'string' &&
        entry.mic.marketName.length > 0 &&
        typeof entry.mic.legalEntityName === 'string' &&
        entry.mic.legalEntityName.length > 0 &&
        (entry.mic.lei === null || /^[A-Z0-9]{20}$/.test(entry.mic.lei)) &&
        /^[A-Z]{2}$/.test(entry.mic.countryCode) &&
        (entry.mic.lastValidationDate === null || validDate(entry.mic.lastValidationDate)),
      'RWA_REGISTRY_INVALID_MIC_METADATA',
      `${path}.mic`
    );
    requireField(
      entry.issuerBinding.source === ROBINHOOD_RWA_SOURCE_ID &&
        UID_PATTERN.test(entry.issuerBinding.nativeAssetId) &&
        SYMBOL_PATTERN.test(entry.issuerBinding.symbol) &&
        ISIN_PATTERN.test(entry.issuerBinding.isin) &&
        Number.isSafeInteger(entry.issuerBinding.chainId) &&
        entry.issuerBinding.chainId > 0 &&
        ADDRESS_PATTERN.test(entry.issuerBinding.tokenAddress),
      'RWA_REGISTRY_INVALID_ISSUER_BINDING',
      `${path}.issuerBinding`
    );
    requireField(
      entry.instrument.issuer === entry.issuerBinding.source &&
        entry.instrument.tokenChainId === entry.issuerBinding.chainId &&
        entry.instrument.tokenAddress === entry.issuerBinding.tokenAddress,
      'RWA_REGISTRY_INSTRUMENT_BINDING_MISMATCH',
      path
    );
    requireField(
      validTimestamp(entry.reviewedAt),
      'RWA_REGISTRY_INVALID_TIMESTAMP',
      `${path}.reviewedAt`
    );
    requireField(
      Date.parse(entry.reviewedAt) <= Date.parse(registry.publishedAt),
      'RWA_REGISTRY_REVIEW_AFTER_PUBLICATION',
      `${path}.reviewedAt`
    );
    if (entry.status === 'ACTIVE') {
      requireField(
        Date.parse(`${registry.sources.isoMic.effectiveDate}T00:00:00Z`) <=
          Date.parse(registry.publishedAt),
        'RWA_REGISTRY_MIC_SOURCE_NOT_EFFECTIVE',
        'sources.isoMic.effectiveDate'
      );
    }

    const sourceSymbol = `${entry.issuerBinding.source}:${entry.issuerBinding.symbol}`;
    requireField(
      !instrumentIds.has(entry.instrumentId),
      'RWA_REGISTRY_DUPLICATE_INSTRUMENT',
      `${path}.instrumentId`
    );
    requireField(
      !nativeIds.has(entry.issuerBinding.nativeAssetId),
      'RWA_REGISTRY_DUPLICATE_NATIVE_ASSET',
      `${path}.issuerBinding.nativeAssetId`
    );
    requireField(
      !sourceSymbols.has(sourceSymbol),
      'RWA_REGISTRY_DUPLICATE_SYMBOL',
      `${path}.issuerBinding.symbol`
    );
    instrumentIds.add(entry.instrumentId);
    nativeIds.add(entry.issuerBinding.nativeAssetId);
    sourceSymbols.add(sourceSymbol);
  }

  return registry;
}

export function findRwaInstrumentRegistryEntry(
  registryValue: unknown,
  source: string,
  symbol: string
): RwaInstrumentRegistryEntry | null {
  const registry = validateRwaInstrumentRegistry(registryValue);
  const normalizedSymbol = symbol.trim().toUpperCase();
  return (
    registry.entries.find(
      (entry) =>
        entry.issuerBinding.source === source && entry.issuerBinding.symbol === normalizedSymbol
    ) ?? null
  );
}

/** Production report builders call this before evaluating prices or market state. */
export function assertRwaInstrumentAdmitted(
  registryValue: unknown,
  instrument: RwaInstrument
): RwaInstrumentRegistryEntry {
  const registry = validateRwaInstrumentRegistry(registryValue);
  const instrumentId = rwaInstrumentId(instrument);
  const entry = registry.entries.find((candidate) => candidate.instrumentId === instrumentId);
  requireField(entry, 'RWA_REGISTRY_ENTRY_NOT_FOUND', 'instrument');
  requireField(entry.status === 'ACTIVE', 'RWA_REGISTRY_ENTRY_NOT_ACTIVE', 'instrument');
  return entry;
}

/** Build v1 only after the exact instrument hash has active registry admission. */
export function buildAdmittedRwaReport(
  registryValue: unknown,
  input: RwaInput,
  policy: RwaPolicy,
  now: number
): RwaReport {
  assertRwaInstrumentAdmitted(registryValue, input.instrument);
  return buildRwaReport(input, policy, now);
}

/** Build v2 only after the same identity gate; semantic exact-call checks still run in v2. */
export function buildAdmittedRwaReportV2(
  registryValue: unknown,
  input: RwaInput,
  policy: RwaPolicy,
  now: number,
  context: RwaV2Context
): RwaReportV2 {
  assertRwaInstrumentAdmitted(registryValue, input.instrument);
  return buildRwaReportV2(input, policy, now, context);
}

export function evaluateRobinhoodInstrumentAdmission(
  registryValue: unknown,
  context: RobinhoodRwaContext,
  evaluatedAt = Math.floor(Date.now() / 1000)
): RwaInstrumentAdmission {
  const registry = validateRwaInstrumentRegistry(registryValue);
  const entry = findRwaInstrumentRegistryEntry(
    registry,
    ROBINHOOD_RWA_SOURCE_ID,
    context.asset.tokenSymbol
  );
  const observedIssuerBinding: RwaInstrumentAdmission['observedIssuerBinding'] = {
    source: ROBINHOOD_RWA_SOURCE_ID,
    nativeAssetId: context.asset.id,
    symbol: context.asset.tokenSymbol.toUpperCase(),
    isin: context.asset.isin?.toUpperCase() ?? null,
    chainId: context.asset.deployment.chainId,
    tokenAddress: context.asset.deployment.contractAddress.toLowerCase() as `0x${string}`,
    issuerContextRetrievedAt: context.retrievedAt,
    issuerIntegrityStatus: context.integrity.status,
  };
  if (!entry) {
    return {
      schema: RWA_INSTRUMENT_ADMISSION_SCHEMA,
      registryVersion: registry.version,
      evaluatedAt,
      entry: null,
      observedIssuerBinding,
      evaluation: {
        identityStatus: 'NOT_FOUND',
        reasonCodes: ['REGISTRY_ENTRY_NOT_FOUND'],
        productionIdentityAdmitted: false,
        countsTowardOracleQuorum: false,
        mayAuthorizeExecution: false,
      },
    };
  }

  const reasons: RwaInstrumentAdmissionReason[] = [];
  if (entry.status !== 'ACTIVE') reasons.push('REGISTRY_ENTRY_NOT_ACTIVE');
  if (context.asset.id.toLowerCase() !== entry.issuerBinding.nativeAssetId) {
    reasons.push('REGISTRY_NATIVE_ASSET_ID_MISMATCH');
  }
  if (context.asset.tokenSymbol.toUpperCase() !== entry.issuerBinding.symbol) {
    reasons.push('REGISTRY_SYMBOL_MISMATCH');
  }
  if (!context.asset.isin) reasons.push('REGISTRY_ISIN_UNAVAILABLE');
  else if (context.asset.isin.toUpperCase() !== entry.issuerBinding.isin) {
    reasons.push('REGISTRY_ISIN_MISMATCH');
  }
  if (
    context.asset.deployment.chainId !== entry.issuerBinding.chainId ||
    context.asset.deployment.contractAddress.toLowerCase() !== entry.issuerBinding.tokenAddress
  ) {
    reasons.push('REGISTRY_DEPLOYMENT_MISMATCH');
  }

  const identityMismatch = reasons.some((reason) => reason !== 'REGISTRY_ENTRY_NOT_ACTIVE');
  return {
    schema: RWA_INSTRUMENT_ADMISSION_SCHEMA,
    registryVersion: registry.version,
    evaluatedAt,
    entry,
    observedIssuerBinding,
    evaluation: {
      identityStatus: identityMismatch ? 'MISMATCH' : 'MATCH',
      reasonCodes: reasons,
      productionIdentityAdmitted: entry.status === 'ACTIVE' && !identityMismatch,
      countsTowardOracleQuorum: false,
      mayAuthorizeExecution: false,
    },
  };
}
