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
