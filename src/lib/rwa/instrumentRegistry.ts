import committedRegistry from '../../../protocol/rwa-instrument-registry.v1.json';
import {
  evaluateRobinhoodInstrumentAdmission,
  validateRwaInstrumentRegistry,
  type RwaInstrumentAdmission,
} from '../../../sdk/src/rwa-instrument-registry';

import { getRobinhoodRwaContext, type RobinhoodRwaContextOptions } from './robinhoodClient';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

const registry = deepFreeze(validateRwaInstrumentRegistry(committedRegistry));

/**
 * Cross-check committed FIGI/MIC identity against current issuer UID, ISIN and
 * deployment. The result remains non-authorizing and outside oracle quorum.
 */
export async function getRobinhoodInstrumentAdmission(
  symbol: string,
  options: RobinhoodRwaContextOptions = {}
): Promise<RwaInstrumentAdmission> {
  const context = await getRobinhoodRwaContext(symbol, options);
  const evaluatedAt = Math.floor((options.now ?? Date.now)() / 1000);
  return evaluateRobinhoodInstrumentAdmission(registry, context, evaluatedAt);
}
