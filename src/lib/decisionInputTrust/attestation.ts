/**
 * EIP-712 commitment for a decision-input assessment.
 *
 * The signature commits to the exact JSON assessment returned to the caller,
 * including its policy, caller-provided quotes, and summarized source
 * evidence. It proves integrity and issuer identity, not quote-source
 * authenticity, correctness of external data, or authorization to transact.
 */

import { hashTypedData, keccak256, verifyTypedData } from 'viem';
import { z } from 'zod';

import {
  getAttesterAccount,
  getAttesterAddress,
  getSampleAttesterAddress,
} from '@/lib/attestations/attesterAccount';
import { buildKeyRegistryConfig, trustedAttesterEntry } from '@/lib/attestations/keyRegistryConfig';
import { DecisionInputQuoteTimestampSchema } from '@/lib/decisionInputTrust/validation';
import { canonicalJsonString } from '@/lib/utils/canonicalJson';
import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import { DecisionInputAssessmentSchema, type DecisionInputAssessment } from './assessment';
import {
  DECISION_INPUT_ATTESTATION_DOMAIN,
  DECISION_INPUT_ATTESTATION_LABEL,
  DECISION_INPUT_ATTESTATION_PRIMARY_TYPE,
  DECISION_INPUT_ATTESTATION_SCHEMA_VERSION,
  DECISION_INPUT_ATTESTATION_TYPES,
  DECISION_INPUT_ATTESTATION_VALID_FOR_SECONDS,
  type DecisionInputAssessmentAttestation,
  type DecisionInputAssessmentAttestationData,
  type DecisionInputAssessmentVerificationResult,
} from './attestationContract';

// Spec constants and shape types live in attestationContract.ts (dependency-free);
// re-exported here for compatibility with existing importers.
export {
  DECISION_INPUT_ATTESTATION_SCHEMA_VERSION,
  DECISION_INPUT_ATTESTATION_VALID_FOR_SECONDS,
  DECISION_INPUT_ATTESTATION_PRIMARY_TYPE,
  DECISION_INPUT_ATTESTATION_LABEL,
  DECISION_INPUT_ATTESTATION_DOMAIN,
  DECISION_INPUT_ATTESTATION_TYPES,
  type DecisionInputAssessmentAttestationData,
  type DecisionInputAssessmentAttestation,
  type DecisionInputAssessmentVerificationResult,
} from './attestationContract';

const logger = createLogger('DecisionInputAssessmentAttestation');

const ZERO_UID = `0x${'0'.repeat(64)}` as const;
const HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const SIGNATURE_PATTERN = /^0x[0-9a-fA-F]{130}$/;

function verifyUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000');
  return new URL('/api/v1/safety/decision-input/verify', `${base.replace(/\/+$/, '')}/`).toString();
}

const AttestationDataSchema = z
  .object({
    assessmentHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    linkedPreTradeUid: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    verifyUrlHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    issuedAt: z.number().int().nonnegative().safe(),
    validUntil: z.number().int().nonnegative().safe(),
    schemaVersion: z.literal(DECISION_INPUT_ATTESTATION_SCHEMA_VERSION),
  })
  .strict();

const AttestationEnvelopeSchema = z
  .object({
    type: z.literal(DECISION_INPUT_ATTESTATION_PRIMARY_TYPE),
    schemaVersion: z.literal(DECISION_INPUT_ATTESTATION_SCHEMA_VERSION),
    uid: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    attester: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    attesterLabel: z.literal(DECISION_INPUT_ATTESTATION_LABEL),
    signedAt: DecisionInputQuoteTimestampSchema,
    validForSeconds: z.literal(DECISION_INPUT_ATTESTATION_VALID_FOR_SECONDS),
    signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
    verifyUrl: z.string().url(),
    data: AttestationDataSchema,
    eip712: z.record(z.string(), z.unknown()),
  })
  .strict();

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function typedDataArgs(data: DecisionInputAssessmentAttestationData) {
  return {
    domain: DECISION_INPUT_ATTESTATION_DOMAIN,
    types: DECISION_INPUT_ATTESTATION_TYPES,
    primaryType: DECISION_INPUT_ATTESTATION_PRIMARY_TYPE,
    message: {
      assessmentHash: data.assessmentHash,
      linkedPreTradeUid: data.linkedPreTradeUid,
      verifyUrlHash: data.verifyUrlHash,
      issuedAt: BigInt(data.issuedAt),
      validUntil: BigInt(data.validUntil),
      schemaVersion: BigInt(data.schemaVersion),
    },
  } as const;
}

export function decisionInputAssessmentHash(
  assessment: Omit<DecisionInputAssessment, 'attestation'>
): `0x${string}` {
  return keccak256(new TextEncoder().encode(canonicalJsonString(assessment)));
}

/**
 * Sign a precise assessment snapshot. Missing signer configuration or signing
 * errors return null and do not change the assessment status.
 */
export async function signDecisionInputAssessment(
  assessment: Omit<DecisionInputAssessment, 'attestation'>,
  linkedPreTradeUid?: string | null
): Promise<DecisionInputAssessmentAttestation | null> {
  try {
    const signer = await getAttesterAccount();
    if (!signer) return null;

    const assessmentResult = DecisionInputAssessmentSchema.safeParse(assessment);
    if (!assessmentResult.success) {
      throw new Error('decision-input assessment does not match its published schema');
    }

    if (
      linkedPreTradeUid !== undefined &&
      linkedPreTradeUid !== null &&
      !HASH_PATTERN.test(linkedPreTradeUid)
    ) {
      throw new Error('linked pre-trade UID must be a 32-byte hex value');
    }
    const issuedAt = nowInSeconds();
    const verificationUrl = verifyUrl();
    const data: DecisionInputAssessmentAttestationData = {
      assessmentHash: decisionInputAssessmentHash(
        assessmentResult.data as Omit<DecisionInputAssessment, 'attestation'>
      ),
      linkedPreTradeUid:
        typeof linkedPreTradeUid === 'string' && HASH_PATTERN.test(linkedPreTradeUid)
          ? (linkedPreTradeUid as `0x${string}`)
          : ZERO_UID,
      verifyUrlHash: keccak256(new TextEncoder().encode(verificationUrl)),
      issuedAt,
      validUntil: issuedAt + DECISION_INPUT_ATTESTATION_VALID_FOR_SECONDS,
      schemaVersion: DECISION_INPUT_ATTESTATION_SCHEMA_VERSION,
    };
    const args = typedDataArgs(data);
    const keyRegistry = buildKeyRegistryConfig(
      await getAttesterAddress(),
      await getSampleAttesterAddress()
    );
    if (!trustedAttesterEntry(signer.address, issuedAt, keyRegistry)) {
      logger.warn('Decision-input signer is outside the published production key registry', {
        attester: signer.address,
      });
      return null;
    }
    const signature = await signer.signTypedData(args);

    return {
      type: DECISION_INPUT_ATTESTATION_PRIMARY_TYPE,
      schemaVersion: DECISION_INPUT_ATTESTATION_SCHEMA_VERSION,
      uid: hashTypedData(args),
      attester: signer.address as `0x${string}`,
      attesterLabel: DECISION_INPUT_ATTESTATION_LABEL,
      signedAt: new Date(issuedAt * 1000).toISOString(),
      validForSeconds: DECISION_INPUT_ATTESTATION_VALID_FOR_SECONDS,
      signature: signature as `0x${string}`,
      verifyUrl: verificationUrl,
      data,
      eip712: {
        domain: DECISION_INPUT_ATTESTATION_DOMAIN,
        types: DECISION_INPUT_ATTESTATION_TYPES,
        primaryType: DECISION_INPUT_ATTESTATION_PRIMARY_TYPE,
      },
    };
  } catch (error) {
    logger.warn('Failed to sign decision-input assessment', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Verify signature, assessment digest, UID, and its five-minute validity. */
export async function verifyDecisionInputAssessment(
  value: unknown
): Promise<DecisionInputAssessmentVerificationResult> {
  const empty = {
    valid: false,
    attester: null,
    uid: null,
    assessmentHash: null,
    linkedPreTradeUid: null,
    issuedAt: null,
    expired: false,
  } as const;

  try {
    if (!isRecord(value)) return { ...empty, reason: 'malformed' };
    const attestation = value.attestation;
    if (attestation === undefined || attestation === null) {
      return { ...empty, reason: 'missing_attestation' };
    }
    const { attestation: _proof, ...unsignedAssessment } = value;
    const assessmentResult = DecisionInputAssessmentSchema.safeParse(unsignedAssessment);
    const attestationResult = AttestationEnvelopeSchema.safeParse(attestation);
    if (!assessmentResult.success || !attestationResult.success) {
      return { ...empty, reason: 'malformed' };
    }

    const parsedAttestation = attestationResult.data;
    const data = parsedAttestation.data as unknown as DecisionInputAssessmentAttestationData;
    const attester = parsedAttestation.attester;
    const signature = parsedAttestation.signature;
    const uid = parsedAttestation.uid;
    const expectedDescriptor = {
      domain: DECISION_INPUT_ATTESTATION_DOMAIN,
      types: DECISION_INPUT_ATTESTATION_TYPES,
      primaryType: DECISION_INPUT_ATTESTATION_PRIMARY_TYPE,
    };
    if (
      canonicalJsonString(parsedAttestation.eip712) !== canonicalJsonString(expectedDescriptor) ||
      keccak256(new TextEncoder().encode(parsedAttestation.verifyUrl)).toLowerCase() !==
        data.verifyUrlHash.toLowerCase() ||
      !ADDRESS_PATTERN.test(attester) ||
      !HASH_PATTERN.test(uid) ||
      !SIGNATURE_PATTERN.test(signature) ||
      data.validUntil <= data.issuedAt ||
      data.validUntil - data.issuedAt !== DECISION_INPUT_ATTESTATION_VALID_FOR_SECONDS ||
      parsedAttestation.signedAt !== new Date(data.issuedAt * 1000).toISOString() ||
      data.issuedAt > nowInSeconds() + 60
    ) {
      return { ...empty, reason: 'malformed' };
    }

    const typedData = typedDataArgs(data);
    const assessmentHash = decisionInputAssessmentHash(
      assessmentResult.data as Omit<DecisionInputAssessment, 'attestation'>
    );
    if (assessmentHash.toLowerCase() !== String(data.assessmentHash).toLowerCase()) {
      return {
        ...empty,
        attester,
        uid,
        assessmentHash,
        linkedPreTradeUid: data.linkedPreTradeUid,
        issuedAt: data.issuedAt,
        reason: 'assessment_digest_mismatch',
      };
    }

    const expectedUid = hashTypedData(typedData);
    if (expectedUid.toLowerCase() !== String(uid).toLowerCase()) {
      return {
        ...empty,
        attester,
        uid,
        assessmentHash,
        linkedPreTradeUid: data.linkedPreTradeUid,
        issuedAt: data.issuedAt,
        reason: 'uid_mismatch',
      };
    }

    const signatureValid = await verifyTypedData({
      ...typedData,
      address: attester as `0x${string}`,
      signature: signature as `0x${string}`,
    });
    if (!signatureValid) {
      return {
        ...empty,
        attester,
        uid,
        assessmentHash,
        linkedPreTradeUid: data.linkedPreTradeUid,
        issuedAt: data.issuedAt,
        reason: 'signature_invalid',
      };
    }

    if (!(await isPublishedDecisionInputAttester(attester, data.issuedAt))) {
      return {
        ...empty,
        attester,
        uid,
        assessmentHash,
        linkedPreTradeUid: data.linkedPreTradeUid,
        issuedAt: data.issuedAt,
        reason: 'untrusted_attester',
      };
    }

    const expired = data.validUntil <= nowInSeconds();
    return {
      valid: !expired,
      attester,
      uid,
      assessmentHash,
      linkedPreTradeUid: data.linkedPreTradeUid,
      issuedAt: data.issuedAt,
      expired,
      reason: expired ? 'expired' : 'verified',
    };
  } catch (error) {
    logger.warn('Decision-input assessment verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...empty, reason: 'verification_error' };
  }
}

export async function isPublishedDecisionInputAttester(
  address: string,
  issuedAt: number | null
): Promise<boolean> {
  if (!ADDRESS_PATTERN.test(address)) return false;
  const config = buildKeyRegistryConfig(
    await getAttesterAddress(),
    await getSampleAttesterAddress()
  );
  return trustedAttesterEntry(address, issuedAt, config) !== null;
}

export const DECISION_INPUT_ATTESTATION_META = {
  schemaVersion: DECISION_INPUT_ATTESTATION_SCHEMA_VERSION,
  validForSeconds: DECISION_INPUT_ATTESTATION_VALID_FOR_SECONDS,
  domain: DECISION_INPUT_ATTESTATION_DOMAIN,
  types: DECISION_INPUT_ATTESTATION_TYPES,
  primaryType: DECISION_INPUT_ATTESTATION_PRIMARY_TYPE,
} as const;
