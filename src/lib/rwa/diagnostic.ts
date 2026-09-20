import { ValidationError } from '@/lib/errors';

import {
  buildRwaReport,
  RwaValidationError,
  type RwaInput,
  type RwaPolicy,
} from '../../../sdk/src/rwa';

/** Caller assertions are deliberately unsigned; never attest user input with an Insight key. */
export function diagnoseRwa(
  input: RwaInput,
  policy: RwaPolicy,
  now = Math.floor(Date.now() / 1000)
) {
  try {
    return {
      mode: 'diagnostic' as const,
      mayAuthorizeExecution: false as const,
      evidenceProvenance: 'caller-supplied-unverified' as const,
      report: buildRwaReport(input, policy, now),
    };
  } catch (error) {
    const code =
      error instanceof Error && /^RWA_[A-Z0-9_]+$/.test(error.message)
        ? error.message
        : 'RWA_INVALID_INPUT';
    throw new ValidationError(code, {
      field: error instanceof RwaValidationError ? error.fieldPath : 'inputOrPolicy',
      constraints: { code, retryable: false },
    });
  }
}
