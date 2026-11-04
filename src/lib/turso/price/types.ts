export type PriceWriteReason =
  | 'full_resolution'
  | 'initial'
  | 'state_transition'
  | 'error_change'
  | 'hourly_baseline'
  | 'price_change'
  | 'deviation_change'
  | 'data_age_change'
  | 'confidence_change'
  | 'stable';

export interface TursoPriceInput {
  provider: string;
  symbol: string;
  chainId: number;
  price: number;
  consensusPrice: number | null;
  deviationPct: number | null;
  latencyMs: number | null;
  dataAgeSeconds: number | null;
  confidence: number | null;
  isSuccess: boolean;
  errorMessage: string | null;
  snapshotHourMs: number;
}

export interface TursoPricePolicy {
  policyKey: string;
  resolution: 'full' | 'adaptive';
  priceChangeBps: number;
  deviationChangeBps: number;
  dataAgeChangeSeconds: number;
  confidenceChangeE4: number;
}

/**
 * The adaptive-write baseline copied from the primary store when a shadow
 * session is first enabled or resumes after a gap. Decimal fields keep the
 * same public units as the Supabase persistence-state table.
 */
export interface TursoPricePersistenceState {
  provider: string;
  symbol: string;
  chainId: number;
  lastSnapshotMs: number;
  lastPrice: number;
  lastDeviationPct: number | null;
  lastDataAgeSeconds: number | null;
  lastConfidence: number | null;
  lastIsSuccess: boolean;
  lastErrorMessage: string | null;
}

export interface TursoPriceSlotSummary {
  received: number;
  candidates: number;
  persisted: number;
  fullResolution: number;
  initial: number;
  stateTransition: number;
  errorChange: number;
  hourlyBaseline: number;
  priceChange: number;
  deviationChange: number;
  dataAgeChange: number;
  confidenceChange: number;
  stableSkipped: number;
}

export interface CapturedTursoPriceSlot {
  slotMs: number;
  inputHash: string;
  rawDigest: string;
  inputs: TursoPriceInput[];
  summary: TursoPriceSlotSummary;
  replayed: boolean;
}
