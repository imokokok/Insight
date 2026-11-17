import {
  assessKalshiGuard,
  KalshiGuardInputSchema,
  type KalshiGuardInput,
  type KalshiGuardResult,
} from './kalshiGuard';
import {
  assessPolymarketGuard,
  PolymarketGuardInputSchema,
  type PolymarketGuardInput,
  type PolymarketGuardResult,
} from './polymarketGuard';

export const PredictionGuardInputSchema = PolymarketGuardInputSchema.or(KalshiGuardInputSchema);
export type PredictionGuardInput = PolymarketGuardInput | KalshiGuardInput;
export type PredictionGuardResult = PolymarketGuardResult | KalshiGuardResult;

export async function assessPredictionGuard(
  input: PredictionGuardInput
): Promise<PredictionGuardResult> {
  if (input.protocolId === 'polymarket-prediction-mainnet') {
    return assessPolymarketGuard(input);
  }
  return assessKalshiGuard(input);
}
