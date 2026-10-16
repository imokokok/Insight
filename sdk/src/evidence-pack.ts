/**
 * Decision evidence pack: client-side assembly and offline verification.
 *
 * The service assembles one operation's evidence chain (signed decision-input
 * assessments, pre-trade provenance, the combined input gate, and the signed
 * execution receipt) and returns it as a manifest-hashed pack. The client adds
 * the artifacts only it holds — the signed oracle pre-trade attestation
 * envelopes from the original responses and any PriorSeal authorization /
 * observation objects — then verifies the whole bundle without contacting
 * Insight:
 *
 *   1. every manifest hash is recomputed from the pack's own sections;
 *   2. each carried decision-input assessment passes its EIP-712 signature
 *      verification against the consumer's pinned trust profile (with
 *      `allowHistorical`, because a post-hoc pack is expected to contain
 *      expired five-minute windows — expiry is reported, not fatal);
 *   3. client-held oracle envelopes verify against their own schema and their
 *      UIDs match the pack anchors;
 *   4. anchor linkage holds (assessment linkedPreTradeUid ↔ row UID ↔ receipt
 *      preTradeUids).
 *
 * Trust boundary: the manifest binds bytes, not honesty. Receipt signature
 * verification stays with the dedicated surfaces (the `verify-insight-receipt`
 * package or Insight's verify endpoints); PriorSeal objects must be checked
 * against PriorSeal's own verification surface. The pack is evidence, not
 * authorization, and proves nothing about upstream data truthfulness.
 */

import { keccak256, toBytes } from 'viem';

import {
  canonicalJson,
  verifyDecisionInputAssessment,
  verifySignedPreTradeAttestation,
} from './decision-input';

import type { DecisionInputTrust } from './types';

export const EVIDENCE_PACK_SCHEMA_VERSION = 1;
export const EVIDENCE_PACK_TYPE = 'decision-execution';

const ZERO_UID = `0x${'0'.repeat(64)}`;

export type EvidencePackPreTradeRole = 'source' | 'destination' | 'single';

export interface EvidencePackPreTradeEntry {
  role: EvidencePackPreTradeRole;
  attestationUid: string;
  attester: string | null;
  signed: boolean;
  verdict: string;
  asset: string;
  chainId: number;
  action: string;
  tradeAmountUsd: number | null;
  createdAt: string;
  assessment: Record<string, unknown> | null;
}

export interface EvidencePackExecutionReceiptEntry {
  receiptUid: string | null;
  attested: boolean;
  attester: string | null;
  executionStatus: string | null;
  fillStatus: string | null;
  txHash: string | null;
  blockNumber: number | null;
  executedAt: string | null;
  source: string | null;
  environment: string | null;
  createdAt: string | null;
  payload: Record<string, unknown> | null;
}

export interface EvidencePackClientArtifacts {
  preTradeAttestations?: { source?: unknown; destination?: unknown };
  priorSeal?: Record<string, unknown>;
}

export interface EvidencePackManifest {
  schemaVersion: number;
  packType: string;
  generatedAt: string;
  anchors: {
    preTradeUids: string[];
    executionReceiptUid: string | null;
  };
  artifactHashes: {
    preTradeEntries: string[];
    inputGate: string | null;
    executionReceipt: string | null;
    clientPreTradeAttestations: { source: string | null; destination: string | null };
    clientPriorSeal: string | null;
  };
  packHash: string;
}

export interface DecisionEvidencePack {
  manifest: EvidencePackManifest;
  preTrade: EvidencePackPreTradeEntry[];
  inputGate: unknown;
  inputGateConsistent: boolean | null;
  executionReceipt: EvidencePackExecutionReceiptEntry | null;
  clientArtifacts: EvidencePackClientArtifacts;
  boundaries?: string[];
}

export interface EvidencePackVerification {
  manifestValid: boolean;
  integrityValid: boolean;
  assessments: Array<{
    role: EvidencePackPreTradeRole;
    attestationUid: string;
    signatureValid: boolean;
    reason: string;
    uid: string | null;
    linkedPreTradeUid: string | null;
    linkedPreTradeUidMatchesRow: boolean | null;
  }>;
  clientPreTradeEnvelopes: Array<{
    role: 'source' | 'destination';
    valid: boolean;
    reason: string | null;
    uid: string | null;
    uidMatchesAnchor: boolean | null;
  }> | null;
  linkage: {
    assessmentsMatchAnchors: boolean;
    receiptMatchesAnchors: boolean | null;
    gateConsistent: boolean | null;
    clientEnvelopeUidsMatchAnchors: boolean | null;
  };
  completeness: {
    preTradeEntries: number;
    signedAssessments: number;
    hasInputGate: boolean;
    hasReceipt: boolean;
    hasSignedReceiptPayload: boolean;
    hasClientEnvelopes: boolean;
    hasPriorSeal: boolean;
  };
  reason: string;
}

function hashArtifact(value: unknown): string {
  return keccak256(toBytes(canonicalJson(value)));
}

function hashOrNone(value: unknown): string | null {
  return value === null || value === undefined ? null : hashArtifact(value);
}

function priorSealOrNull(priorSeal: unknown): unknown {
  if (priorSeal === null || priorSeal === undefined) return null;
  if (typeof priorSeal !== 'object' || Array.isArray(priorSeal)) return null;
  if (Object.keys(priorSeal as Record<string, unknown>).length === 0) return null;
  return priorSeal;
}

/** Recompute the manifest from a pack's own sections (packHash included). */
export function computeEvidencePackManifest(
  pack: Pick<
    DecisionEvidencePack,
    'preTrade' | 'inputGate' | 'executionReceipt' | 'clientArtifacts'
  > & { generatedAt?: string }
): EvidencePackManifest {
  const clientArtifacts = pack.clientArtifacts ?? {};
  const manifest: EvidencePackManifest = {
    schemaVersion: EVIDENCE_PACK_SCHEMA_VERSION,
    packType: EVIDENCE_PACK_TYPE,
    generatedAt: pack.generatedAt ?? new Date().toISOString(),
    anchors: {
      preTradeUids: (pack.preTrade ?? []).map((entry) => entry.attestationUid),
      executionReceiptUid: pack.executionReceipt?.receiptUid ?? null,
    },
    artifactHashes: {
      preTradeEntries: (pack.preTrade ?? []).map((entry) => hashArtifact(entry)),
      inputGate: hashOrNone(pack.inputGate ?? null),
      executionReceipt: hashOrNone(pack.executionReceipt ?? null),
      clientPreTradeAttestations: {
        source: hashOrNone(clientArtifacts.preTradeAttestations?.source ?? null),
        destination: hashOrNone(clientArtifacts.preTradeAttestations?.destination ?? null),
      },
      clientPriorSeal: hashOrNone(priorSealOrNull(clientArtifacts.priorSeal)),
    },
    packHash: '',
  };
  manifest.packHash = keccak256(
    toBytes(
      canonicalJson({
        schemaVersion: manifest.schemaVersion,
        packType: manifest.packType,
        generatedAt: manifest.generatedAt,
        anchors: manifest.anchors,
        artifactHashes: manifest.artifactHashes,
      })
    )
  );
  return manifest;
}

/**
 * Merge client-held artifacts into a server-assembled pack and recompute the
 * manifest, producing one internally consistent bundle ready for verification
 * and export (JSON dump, dispute filing, auditor hand-off).
 */
export function withEvidencePackClientArtifacts(
  pack: DecisionEvidencePack,
  artifacts: EvidencePackClientArtifacts
): DecisionEvidencePack {
  const clientArtifacts: EvidencePackClientArtifacts = {
    preTradeAttestations: {
      ...(pack.clientArtifacts?.preTradeAttestations ?? {}),
      ...(artifacts.preTradeAttestations ?? {}),
    },
    priorSeal: artifacts.priorSeal ?? pack.clientArtifacts?.priorSeal,
  };
  const merged: DecisionEvidencePack = {
    ...pack,
    clientArtifacts,
  };
  merged.manifest = computeEvidencePackManifest(merged);
  return merged;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function manifestMatchesPack(pack: DecisionEvidencePack): boolean {
  const manifest = pack.manifest;
  if (!isRecord(manifest as unknown)) return false;
  if (manifest.schemaVersion !== EVIDENCE_PACK_SCHEMA_VERSION) return false;
  if (manifest.packType !== EVIDENCE_PACK_TYPE) return false;

  const expected: EvidencePackManifest = computeEvidencePackManifest({
    preTrade: pack.preTrade,
    inputGate: pack.inputGate,
    executionReceipt: pack.executionReceipt,
    clientArtifacts: pack.clientArtifacts,
    generatedAt: manifest.generatedAt,
  });

  const sameHash = (a: string | null, b: string | null) =>
    a === null ? b === null : b !== null && a.toLowerCase() === b.toLowerCase();
  if (manifest.generatedAt !== expected.generatedAt) return false;
  if (
    expected.artifactHashes.preTradeEntries.length !==
      manifest.artifactHashes?.preTradeEntries?.length ||
    !expected.artifactHashes.preTradeEntries.every((hash, index) =>
      sameHash(hash, manifest.artifactHashes.preTradeEntries[index])
    )
  ) {
    return false;
  }
  if (!sameHash(expected.artifactHashes.inputGate, manifest.artifactHashes?.inputGate))
    return false;
  if (
    !sameHash(expected.artifactHashes.executionReceipt, manifest.artifactHashes?.executionReceipt)
  ) {
    return false;
  }
  if (
    !sameHash(
      expected.artifactHashes.clientPreTradeAttestations.source,
      manifest.artifactHashes?.clientPreTradeAttestations?.source
    ) ||
    !sameHash(
      expected.artifactHashes.clientPreTradeAttestations.destination,
      manifest.artifactHashes?.clientPreTradeAttestations?.destination
    )
  ) {
    return false;
  }
  if (
    !sameHash(expected.artifactHashes.clientPriorSeal, manifest.artifactHashes?.clientPriorSeal)
  ) {
    return false;
  }
  const anchorsMatch =
    JSON.stringify(
      (manifest.anchors?.preTradeUids ?? []).map((value) => String(value).toLowerCase())
    ) === JSON.stringify(expected.anchors.preTradeUids.map((value) => value.toLowerCase())) &&
    (manifest.anchors?.executionReceiptUid ?? null)?.toLowerCase() ===
      (expected.anchors.executionReceiptUid ?? null)?.toLowerCase();
  if (!anchorsMatch) return false;
  return String(manifest.packHash ?? '').toLowerCase() === expected.packHash.toLowerCase();
}

/**
 * Verify a decision evidence pack offline. Signature verification of carried
 * assessments runs against the consumer's pinned trust profile with
 * `allowHistorical`; receipt signature verification remains with the dedicated
 * offline verifier (`verify-insight-receipt`) or Insight's verify endpoints.
 */
export async function verifyEvidencePack(
  pack: unknown,
  trust: DecisionInputTrust,
  options: { now?: number } = {}
): Promise<EvidencePackVerification> {
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const emptyCompleteness = {
    preTradeEntries: 0,
    signedAssessments: 0,
    hasInputGate: false,
    hasReceipt: false,
    hasSignedReceiptPayload: false,
    hasClientEnvelopes: false,
    hasPriorSeal: false,
  };
  const invalid = (reason: string): EvidencePackVerification => ({
    manifestValid: false,
    integrityValid: false,
    assessments: [],
    clientPreTradeEnvelopes: null,
    linkage: {
      assessmentsMatchAnchors: false,
      receiptMatchesAnchors: null,
      gateConsistent: null,
      clientEnvelopeUidsMatchAnchors: null,
    },
    completeness: emptyCompleteness,
    reason,
  });

  try {
    if (!isRecord(pack) || !isRecord(pack.manifest)) return invalid('malformed_pack');
    const typed = pack as unknown as DecisionEvidencePack;

    const manifestValid = manifestMatchesPack(typed);
    const completeness = {
      preTradeEntries: typed.preTrade?.length ?? 0,
      signedAssessments:
        typed.preTrade?.filter(
          (entry) =>
            isRecord(entry.assessment ?? null) &&
            (entry.assessment as Record<string, unknown>).attestation != null
        ).length ?? 0,
      hasInputGate: typed.inputGate !== null && typed.inputGate !== undefined,
      hasReceipt: typed.executionReceipt !== null && typed.executionReceipt !== undefined,
      hasSignedReceiptPayload: typed.executionReceipt?.payload != null,
      hasClientEnvelopes:
        typed.clientArtifacts?.preTradeAttestations?.source != null ||
        typed.clientArtifacts?.preTradeAttestations?.destination != null,
      hasPriorSeal: priorSealOrNull(typed.clientArtifacts?.priorSeal) !== null,
    };
    if (!manifestValid) {
      return {
        manifestValid: false,
        integrityValid: false,
        assessments: [],
        clientPreTradeEnvelopes: null,
        linkage: {
          assessmentsMatchAnchors: false,
          receiptMatchesAnchors: null,
          gateConsistent: typed.inputGateConsistent ?? null,
          clientEnvelopeUidsMatchAnchors: null,
        },
        completeness,
        reason: 'manifest_mismatch',
      };
    }

    const { checks: assessments, allMatch: assessmentsMatchAnchors } = await checkPackAssessments(
      typed.preTrade ?? [],
      trust,
      now
    );

    const { checks: clientPreTradeEnvelopes, uidsMatch: clientEnvelopeUidsMatchAnchors } =
      await checkClientEnvelopes(typed, trust, now);

    const receiptMatchesAnchors = checkReceiptAnchorLinkage(typed);

    const linkage = {
      assessmentsMatchAnchors,
      receiptMatchesAnchors,
      gateConsistent: typed.inputGateConsistent ?? null,
      clientEnvelopeUidsMatchAnchors,
    };

    const integrityValid =
      manifestValid &&
      assessmentsMatchAnchors &&
      assessments.every((check) => check.signatureValid) &&
      receiptMatchesAnchors !== false &&
      clientEnvelopeUidsMatchAnchors !== false &&
      typed.inputGateConsistent !== false;

    return {
      manifestValid,
      integrityValid,
      assessments,
      clientPreTradeEnvelopes,
      linkage,
      completeness,
      reason: integrityValid ? 'verified' : 'integrity_failure',
    };
  } catch (error) {
    return invalid(`verification_error:${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Verify each carried decision-input assessment and its row linkage. */
async function checkPackAssessments(
  entries: EvidencePackPreTradeEntry[],
  trust: DecisionInputTrust,
  now: number
): Promise<{ checks: EvidencePackVerification['assessments']; allMatch: boolean }> {
  const checks: EvidencePackVerification['assessments'] = [];
  let allMatch = true;
  for (const entry of entries) {
    const verification = await verifyDecisionInputAssessment(entry.assessment, trust, {
      now,
      allowHistorical: true,
    });
    const signatureValid =
      verification.valid || (verification.reason === 'expired' && verification.validUntil !== null);
    let linkedMatches: boolean | null = null;
    if (verification.reason !== 'missing_attestation' && verification.reason !== 'malformed') {
      const linked = verification.linkedPreTradeUid;
      if (linked && linked !== ZERO_UID) {
        linkedMatches = linked.toLowerCase() === entry.attestationUid.toLowerCase();
        if (!linkedMatches) allMatch = false;
      }
    } else {
      allMatch = false;
    }
    checks.push({
      role: entry.role,
      attestationUid: entry.attestationUid,
      signatureValid,
      reason: verification.reason,
      uid: verification.uid,
      linkedPreTradeUid: verification.linkedPreTradeUid,
      linkedPreTradeUidMatchesRow: linkedMatches,
    });
  }
  return { checks, allMatch };
}

/** Verify client-held oracle envelopes against their own schema and the anchors. */
async function checkClientEnvelopes(
  pack: DecisionEvidencePack,
  trust: DecisionInputTrust,
  now: number
): Promise<{
  checks: EvidencePackVerification['clientPreTradeEnvelopes'];
  uidsMatch: boolean | null;
}> {
  const checks: NonNullable<EvidencePackVerification['clientPreTradeEnvelopes']> = [];
  let uidsMatch: boolean | null = null;
  for (const role of ['source', 'destination'] as const) {
    const envelope = pack.clientArtifacts?.preTradeAttestations?.[role];
    if (envelope === null || envelope === undefined) continue;
    const envelopeValid = await verifySignedPreTradeAttestation(envelope, trust, now);
    const uid = isRecord(envelope) && typeof envelope.uid === 'string' ? envelope.uid : null;
    const uidMatches = uid
      ? (pack.preTrade ?? []).some(
          (entry) =>
            entry.attestationUid.toLowerCase() === uid.toLowerCase() &&
            (entry.role === 'destination' ? 'destination' : 'source') === role
        )
      : false;
    if (uidsMatch !== false) {
      uidsMatch = uidMatches;
    }
    checks.push({
      role,
      valid: envelopeValid,
      reason: envelopeValid ? null : 'verification_failed',
      uid,
      uidMatchesAnchor: uidMatches,
    });
  }
  return { checks: checks.length > 0 ? checks : null, uidsMatch };
}

/** Check the receipt payload against the pack anchors. */
function checkReceiptAnchorLinkage(pack: DecisionEvidencePack): boolean | null {
  const payload = pack.executionReceipt?.payload;
  if (isRecord(payload) && isRecord(payload.data)) {
    const data = payload.data;
    const receiptSource =
      typeof data.preTradeUid === 'string' ? data.preTradeUid.toLowerCase() : '';
    const receiptDestination =
      typeof data.destinationPreTradeUid === 'string'
        ? data.destinationPreTradeUid.toLowerCase()
        : '';
    const anchorUids = (pack.manifest.anchors.preTradeUids ?? []).map((value) =>
      String(value).toLowerCase()
    );
    const sourceOk =
      receiptSource === '' ? anchorUids.length === 1 : anchorUids.includes(receiptSource);
    const destinationOk =
      receiptDestination === '' ||
      receiptDestination === ZERO_UID ||
      anchorUids.includes(receiptDestination);
    return sourceOk && destinationOk;
  }
  return null;
}
