/**
 * verify-insight-receipt
 *
 * Verify Insight oracle-safety receipts on your own machine. No network call,
 * no API key, no dependency on Insight being online or even existing.
 *
 * ```ts
 * import { verifyReceipt } from 'verify-insight-receipt';
 *
 * const result = await verifyReceipt(receipt, { keyRegistry });
 * if (result.code !== 'ok') throw new Error(`bad receipt: ${result.code}`);
 * ```
 *
 * The package can only verify. It holds no signing key, reads no environment
 * variable, and makes no outbound request — that is a property of the code in
 * ./verify, not a configuration default.
 */

export { verifyReceipt, type VerifyOptions } from './verify';
export {
  reportVerification,
  REPORT_SCHEMA_VERSION,
  type ReportOptions,
  type VerificationReport,
} from './report';
export { resolveKeyStatus } from './keyRegistry';
export {
  verifyExecutionReceipt,
  verifyExecutionPair,
  executionTypesForSchemaVersion,
  EXECUTION_DOMAIN,
  EXECUTION_PRIMARY_TYPE,
  EXECUTION_TYPES_V1,
  EXECUTION_TYPES_V2,
  EXECUTION_TYPES_V3,
  EXECUTION_TYPES_V4,
  type ExecutionReceipt,
  type ExecutionVerificationResult,
  type ExecutionPairResult,
} from './execution';

export {
  DOMAIN_BY_SCHEMA,
  PRIMARY_TYPE_BY_SCHEMA,
  RECHECK_DOMAIN,
  RECHECK_PRIMARY_TYPE,
  RECHECK_TYPE,
  RECHECK_TYPES,
  RECHECK_V3_DOMAIN,
  RECHECK_V3_PRIMARY_TYPE,
  RECHECK_V3_TYPES,
  TYPES_BY_SCHEMA,
  V1_DOMAIN,
  V1_PRIMARY_TYPE,
  V1_TYPES,
  V2_DOMAIN,
  V2_PRIMARY_TYPE,
  V2_TYPES,
  V3_DOMAIN,
  V3_PRIMARY_TYPE,
  V3_TYPES,
  layoutFingerprint,
  toRecheckMessage,
  toRecheckV3Message,
  toV1Message,
  toV2Message,
  toV3Message,
  type RecheckMessage,
  type RecheckV3Message,
  type SchemaId,
  type V1Message,
  type V2Message,
  type V3Message,
} from './schemas';

export type {
  KeyEntry,
  KeyRegistry,
  KeyStatus,
  RevokedKey,
  RoutableAttestation,
  VerifyCode,
  VerifyResult,
} from './types';
