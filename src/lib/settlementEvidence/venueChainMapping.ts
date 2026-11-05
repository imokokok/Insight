/**
 * Venue-chain mapping for prediction-market settlement evidence.
 *
 * The prediction guard is chain-agnostic: it screens event-market metadata,
 * it does NOT execute or risk-manage trades on any chain. This module keeps
 * one narrow question accurate inside that chain-agnostic frame:
 *
 *   "After this market resolves, can Insight produce settlement evidence,
 *    and on which chain would that evidence actually live?"
 *
 * A single "venue" label is no longer enough. The 2026 prediction landscape
 * separates the ENTRY chain (where the user meets the market) from the
 * SETTLEMENT chain (where the outcome is actually finalized). In particular,
 * Polymarket reached Solana in Feb 2026 through an embedded Jupiter
 * Prediction tab -- the ENTRY is on Solana, but SETTLEMENT remains primarily
 * on Polygon. Treating that Solana entry as Solana settlement would fabricate
 * settlement evidence that does not exist.
 *
 * Registered venue classes (no program ids / settlement addresses are
 * invented; Solana-native projects are UNVERIFIED name-only placeholders):
 *   - polymarket-direct            Polygon settlement (UMA / CLOB)
 *   - jupiter-polymarket-embedded  entry Solana, settlement Polygon
 *   - solana-native                entry + settlement Solana (UNVERIFIED)
 *   - offchain-regulated           Kalshi / Coinbase distribution (no chain)
 *   - unknown                      cannot be classified -> fail closed
 *
 * Everything here is a pure, offline classification over declared metadata.
 * It never fetches, never assumes, and never defaults to "verifiable".
 */

export const VENUE_CHAIN_SCHEMA_VERSION = 'insight.venue-chain-mapping.v1';

export const VENUE_CHAIN_CLASSES = [
  'polymarket-direct',
  'jupiter-polymarket-embedded',
  'solana-native',
  'offchain-regulated',
  'unknown',
] as const;
export type VenueClass = (typeof VENUE_CHAIN_CLASSES)[number];

/** Chains referenced by the mapping. `offchain` is an explicit non-chain
 *  answer, `other` covers an entry wallet/front end on an unregistered chain,
 *  and `unknown` means the chain cannot be established at all. */
export type ChainRef = 'polygon' | 'solana' | 'other' | 'offchain' | 'unknown';

/** The kind of settlement evidence that can be observed for the venue. */
export type EvidenceKind =
  | 'onchain_tx'
  | 'oracle_resolution'
  | 'official_api'
  | 'none'
  | 'unverified';

/** Evidence-strength grading. `strong` means a third party can independently
 *  recompute the settlement from chain data; `weak`/`unverified`/`none` are
 *  never treated as independently verifiable. */
export type EvidenceStrength = 'strong' | 'partial' | 'weak' | 'none' | 'unverified';

export type VenueChainReasonCode =
  | 'POLYGON_ONCHAIN_RESOLUTION_AVAILABLE'
  | 'ENTRY_SOLANA_SETTLEMENT_POLYGON'
  | 'SOLANA_NATIVE_VENUE_UNVERIFIED'
  | 'OFFCHAIN_SETTLEMENT_NOT_INDEPENDENTLY_VERIFIABLE'
  | 'VENUE_CHAIN_UNCLASSIFIED'
  | 'POLYMARKET_RESOLUTION_NOT_OBSERVABLE'
  | 'ENTRY_CHAIN_EVIDENCE_NOT_SETTLEMENT_EVIDENCE';

/**
 * Name-only placeholders from the Solana Feb 2026 ecosystem report
 * (Inframarkets / energy, Epoch / Arcium privacy, WAVE / zero-fee, TBD).
 * Registered as names ONLY: no program id or settlement address is asserted
 * without first-party evidence, and none is fabricated here.
 */
export const UNVERIFIED_SOLANA_NATIVE_PROJECTS = [
  'Inframarkets',
  'Epoch (Arcium)',
  'WAVE',
  'TBD',
] as const;

export interface FailClosedPolicy {
  verdict: 'CAUTION';
  reasonCode: VenueChainReasonCode;
  conclusion: string;
}

export interface VenueChainDescriptor {
  venueClass: VenueClass;
  label: string;
  /** Where the user meets the market (entry / distribution surface). */
  entryChain: ChainRef;
  /** Where the outcome is actually finalized. */
  settlementChain: ChainRef;
  /** Whether the entry chain is also the settlement chain. */
  entryIsSettlement: boolean;
  /** Explicit "entry != settlement" annotation, when applicable. */
  entryIsNotSettlementNote: string | null;
  settlementMechanism: string;
  evidenceKind: EvidenceKind;
  /** What a third party can actually observe after resolution. */
  observableEvidence: string[];
  /** Can the settlement be independently recomputed from evidence? */
  independentlyRecomputable: boolean;
  /** Can the settlement be independently verified at all? */
  independentlyVerifiable: boolean;
  evidenceStrength: EvidenceStrength;
  verificationStatus: 'DECLARED' | 'UNVERIFIED';
  /** Conclusion to emit when evidence is insufficient / uncertain. */
  failClosedPolicy: FailClosedPolicy;
  notes: string;
}

export const VENUE_CHAIN_DESCRIPTORS: Record<VenueClass, VenueChainDescriptor> = {
  'polymarket-direct': {
    venueClass: 'polymarket-direct',
    label: 'Polymarket direct (Polygon settlement)',
    entryChain: 'polygon',
    settlementChain: 'polygon',
    entryIsSettlement: true,
    entryIsNotSettlementNote: null,
    settlementMechanism: 'UMA optimistic-oracle resolution + CLOB settlement on Polygon',
    evidenceKind: 'oracle_resolution',
    observableEvidence: [
      'Polygon on-chain UMA resolution transaction for the market',
      'Polygon CLOB settlement / redemption transaction',
      'Declared resolution source (e.g. Chainlink data streams or a Binance candle)',
    ],
    independentlyRecomputable: true,
    independentlyVerifiable: true,
    evidenceStrength: 'strong',
    verificationStatus: 'DECLARED',
    failClosedPolicy: {
      verdict: 'CAUTION',
      reasonCode: 'POLYMARKET_RESOLUTION_NOT_OBSERVABLE',
      conclusion:
        'If no Polygon resolution/settlement transaction can be observed, do not claim post-hoc settlement evidence is available.',
    },
    notes:
      'Entry may be a Polygon wallet/front end or another chain; the settlement chain is always Polygon. An entry-chain transaction is NOT settlement evidence.',
  },

  'jupiter-polymarket-embedded': {
    venueClass: 'jupiter-polymarket-embedded',
    label: 'Polymarket via embedded Jupiter Prediction tab',
    entryChain: 'solana',
    settlementChain: 'polygon',
    entryIsSettlement: false,
    entryIsNotSettlementNote:
      'ENTRY != SETTLEMENT: the Jupiter Prediction tab is a Solana entry point; settlement remains primarily on Polygon, NOT on Solana.',
    settlementMechanism:
      'Same Polymarket UMA / CLOB settlement on Polygon; Jupiter only supplies the Solana entry/distribution surface',
    evidenceKind: 'oracle_resolution',
    observableEvidence: [
      'Polygon on-chain UMA resolution transaction (settlement layer)',
      'Polygon CLOB settlement / redemption transaction (settlement layer)',
      'Solana entry/route transaction (entry evidence ONLY, never settlement evidence)',
    ],
    independentlyRecomputable: true,
    independentlyVerifiable: true,
    evidenceStrength: 'strong',
    verificationStatus: 'DECLARED',
    failClosedPolicy: {
      verdict: 'CAUTION',
      reasonCode: 'ENTRY_CHAIN_EVIDENCE_NOT_SETTLEMENT_EVIDENCE',
      conclusion:
        'If only a Solana entry transaction is available, fail closed: Solana entry data is not settlement evidence for a Polygon-settled Polymarket market.',
    },
    notes:
      'Polymarket entered Solana in Feb 2026 via an embedded Jupiter Prediction tab. This is NOT a migration to Solana and NOT Solana settlement.',
  },

  'solana-native': {
    venueClass: 'solana-native',
    label: 'Solana-native prediction market (UNVERIFIED)',
    entryChain: 'solana',
    settlementChain: 'solana',
    entryIsSettlement: true,
    entryIsNotSettlementNote: null,
    settlementMechanism:
      'Declared as entry + settlement on Solana; no first-party settlement program is registered',
    evidenceKind: 'unverified',
    observableEvidence: [
      'UNVERIFIED: no program id, settlement address or resolution mechanism has been registered from first-party evidence',
    ],
    independentlyRecomputable: false,
    independentlyVerifiable: false,
    evidenceStrength: 'unverified',
    verificationStatus: 'UNVERIFIED',
    failClosedPolicy: {
      verdict: 'CAUTION',
      reasonCode: 'SOLANA_NATIVE_VENUE_UNVERIFIED',
      conclusion:
        'No first-party settlement program evidence exists; fail closed and do not treat this venue as independently verifiable.',
    },
    notes:
      'Name-only placeholders from the Solana Feb 2026 ecosystem report: ' +
      UNVERIFIED_SOLANA_NATIVE_PROJECTS.join(', ') +
      '. No program ids or settlement addresses are registered. Unregistered venues (e.g. Limitless on Base) are NOT folded into this class and must fail closed as unknown.',
  },

  'offchain-regulated': {
    venueClass: 'offchain-regulated',
    label: 'Off-chain regulated market (Kalshi / Coinbase distribution)',
    entryChain: 'offchain',
    settlementChain: 'offchain',
    entryIsSettlement: true,
    entryIsNotSettlementNote: null,
    settlementMechanism:
      'Off-chain / traditional-finance settlement; no on-chain settlement transaction exists',
    evidenceKind: 'official_api',
    observableEvidence: [
      'Official exchange/venue API settlement result (declared outcome)',
      'Regulated venue result publication / statement',
      'No on-chain settlement transaction (none exists)',
    ],
    independentlyRecomputable: false,
    independentlyVerifiable: false,
    evidenceStrength: 'weak',
    verificationStatus: 'DECLARED',
    failClosedPolicy: {
      verdict: 'CAUTION',
      reasonCode: 'OFFCHAIN_SETTLEMENT_NOT_INDEPENDENTLY_VERIFIABLE',
      conclusion:
        'Off-chain settlement has no on-chain evidence and cannot be independently recomputed; fail closed rather than claiming verifiability.',
    },
    notes:
      'Coinbase pushed Kalshi markets to all 50 US states in Jan 2026. Distribution scale does not create on-chain settlement evidence.',
  },

  unknown: {
    venueClass: 'unknown',
    label: 'Unclassified venue',
    entryChain: 'unknown',
    settlementChain: 'unknown',
    entryIsSettlement: false,
    entryIsNotSettlementNote:
      'Entry and settlement chains are both unresolved; do not infer either.',
    settlementMechanism: 'Unknown',
    evidenceKind: 'none',
    observableEvidence: ['No recognized settlement evidence'],
    independentlyRecomputable: false,
    independentlyVerifiable: false,
    evidenceStrength: 'none',
    verificationStatus: 'UNVERIFIED',
    failClosedPolicy: {
      verdict: 'CAUTION',
      reasonCode: 'VENUE_CHAIN_UNCLASSIFIED',
      conclusion:
        'Venue cannot be mapped to a registered entry/settlement chain pair; fail closed and never default to verifiable.',
    },
    notes:
      'Any venue not covered by the four registered classes (including unregistered Base/EVM-native prediction venues) lands here.',
  },
};

const CLASSIFICATION_REASON_CODES: Record<VenueClass, VenueChainReasonCode> = {
  'polymarket-direct': 'POLYGON_ONCHAIN_RESOLUTION_AVAILABLE',
  'jupiter-polymarket-embedded': 'ENTRY_SOLANA_SETTLEMENT_POLYGON',
  'solana-native': 'SOLANA_NATIVE_VENUE_UNVERIFIED',
  'offchain-regulated': 'OFFCHAIN_SETTLEMENT_NOT_INDEPENDENTLY_VERIFIABLE',
  unknown: 'VENUE_CHAIN_UNCLASSIFIED',
};

function isVenueClass(value: string): value is VenueClass {
  return (VENUE_CHAIN_CLASSES as readonly string[]).includes(value);
}

export interface VenueChainInput {
  /** Explicit venue hint supplied by the caller. If it cannot be recognized
   *  the result is a hard fail-closed `unknown`, never a fallback guess. */
  venueHint?: string | null;
  description?: string | null;
  resolutionSource?: string | null;
  marketSlug?: string | null;
  entryChainHint?: string | null;
  /** Explicitly declaring the resolution as NOT observed forces fail-closed
   *  even for the on-chain-settled classes. */
  resolutionObserved?: boolean;
  /** Verified fallback used only by callers that have already established the
   *  venue (e.g. the prediction guard's reviewed Polymarket scope). It never
   *  applies when an explicit but unrecognized `venueHint` is present. */
  fallbackVenueClass?: VenueClass;
}

export interface VenueChainClassification {
  venueClass: VenueClass;
  descriptor: VenueChainDescriptor;
  reasonCode: VenueChainReasonCode;
  matchedOn: string;
}

function classification(venueClass: VenueClass, matchedOn: string): VenueChainClassification {
  return {
    venueClass,
    descriptor: VENUE_CHAIN_DESCRIPTORS[venueClass],
    reasonCode: CLASSIFICATION_REASON_CODES[venueClass],
    matchedOn,
  };
}

/** Pure offline classification over declared market metadata. */
export function classifyVenueChain(input: VenueChainInput): VenueChainClassification {
  const hint = (input.venueHint ?? '').trim().toLowerCase();
  const text = [
    input.venueHint,
    input.description,
    input.resolutionSource,
    input.marketSlug,
    input.entryChainHint,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase();

  if (isVenueClass(hint)) return classification(hint, 'explicit venueHint');

  // Jupiter's embedded tab is a Solana ENTRY, not Solana settlement. This
  // check MUST precede any Solana keyword so the entry is never mistaken for
  // the settlement chain.
  if (/\bjupiter\b/.test(text)) {
    return classification('jupiter-polymarket-embedded', 'jupiter entry keyword');
  }
  if (/\bkalshi\b|\bcoinbase\b/.test(text)) {
    return classification('offchain-regulated', 'offchain regulated keyword');
  }
  if (
    /inframarkets|arcium|\bepoch\b|\bwave\b|\btbd\b|solana[- ]native|solana prediction/.test(text)
  ) {
    return classification('solana-native', 'solana-native project keyword');
  }
  if (/polymarket|\buma\b|\bclob\b|polygon/.test(text)) {
    return classification('polymarket-direct', 'polymarket/polygon keyword');
  }

  // An explicitly supplied but unrecognized hint is a hard fail-closed, not
  // something a verified fallback is allowed to paper over.
  if (hint.length > 0) return classification('unknown', 'unrecognized venueHint');
  if (input.fallbackVenueClass) {
    return classification(input.fallbackVenueClass, 'verified fallback from caller');
  }
  return classification('unknown', 'no classifiable signal');
}

export interface SettlementChainAssessment {
  venueClass: VenueClass;
  entryChain: ChainRef;
  settlementChain: ChainRef;
  evidenceKind: EvidenceKind;
  independentlyVerifiable: boolean;
  independentlyRecomputable: boolean;
  evidenceStrength: EvidenceStrength;
  reasonCode: VenueChainReasonCode;
  /** Post-hoc evidence availability, NOT an execution permission. */
  verdict: 'ALLOW' | 'CAUTION';
  /** True whenever we must not claim "verifiable". */
  failClosed: boolean;
  conclusion: string;
  entryIsSettlement: boolean;
}

/**
 * Structured settlement-evidence judgement for one market's metadata.
 * Any unclassified / unverified / off-chain / unobserved-resolution case is
 * fail-closed CAUTION with `independentlyVerifiable: false`. There is no
 * default "verifiable" answer.
 */
export function assessVenueChainEvidence(input: VenueChainInput): SettlementChainAssessment {
  const { venueClass, descriptor, reasonCode } = classifyVenueChain(input);
  const hasOnchainSettlement =
    venueClass === 'polymarket-direct' || venueClass === 'jupiter-polymarket-embedded';
  const resolutionMissing = input.resolutionObserved === false;
  const failClosed = !hasOnchainSettlement || resolutionMissing;
  const finalReasonCode: VenueChainReasonCode =
    resolutionMissing && hasOnchainSettlement ? 'POLYMARKET_RESOLUTION_NOT_OBSERVABLE' : reasonCode;

  let conclusion: string;
  if (resolutionMissing) {
    conclusion =
      'Declared resolution was not observed on the settlement chain; fail closed - do not treat as verifiable.';
  } else if (failClosed) {
    conclusion = descriptor.failClosedPolicy.conclusion;
  } else if (venueClass === 'jupiter-polymarket-embedded') {
    conclusion =
      'Post-hoc settlement evidence is obtainable from Polygon on-chain resolution/settlement data; the Solana entry is NOT the settlement chain and Solana entry transactions are NOT settlement evidence.';
  } else {
    conclusion =
      'Post-hoc settlement evidence is obtainable from Polygon on-chain resolution/settlement data and can be independently recomputed.';
  }

  return {
    venueClass,
    entryChain: descriptor.entryChain,
    settlementChain: descriptor.settlementChain,
    evidenceKind: descriptor.evidenceKind,
    independentlyVerifiable: descriptor.independentlyVerifiable && !resolutionMissing,
    independentlyRecomputable: descriptor.independentlyRecomputable && !resolutionMissing,
    evidenceStrength: resolutionMissing ? 'none' : descriptor.evidenceStrength,
    reasonCode: finalReasonCode,
    verdict: failClosed ? 'CAUTION' : 'ALLOW',
    failClosed,
    conclusion,
    entryIsSettlement: descriptor.entryIsSettlement,
  };
}
