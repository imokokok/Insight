/**
 * Decision evidence pack: one pre-trade operation's exportable evidence chain.
 *
 * The pipeline already persists every half of the story — signed decision-input
 * assessments on `pre_trade_checks`, signed execution receipts on
 * `execution_receipts` — and `preTradeUid` is the pairing anchor between them.
 * Until this module nothing assembled one operation's artifacts into a single
 * object a counterparty (auditor, LP, insurer, dispute reviewer) can verify
 * without Insight's cooperation:
 *
 *   - the signed decision-input assessment(s) for the source (and, on the
 *     agent swap path, destination) asset, each carrying its own EIP-712
 *     attestation with the five-minute validity window;
 *   - the oracle pre-trade provenance rows (verdict, attester, signed flag);
 *   - the combined operation-input gate audit written before a handle issued;
 *   - the signed execution receipt payload and its settlement columns;
 *   - optional client-held artifacts the service never sees at rest: the
 *     signed oracle pre-trade attestation envelopes (returned in the original
 *     API response, not persisted server-side) and PriorSeal authorization /
 *     observation objects (client-side by design).
 *
 * The manifest commits to the canonical JSON of every section it carries, so a
 * pack is internally tamper-evident. Each signature-bearing artifact is still
 * verified against its own schema; the manifest never replaces signature
 * verification and proves nothing about upstream data truthfulness.
 *
 * Trust boundary (deliberate, do not weaken): client-supplied artifacts are
 * hashed into the manifest for binding, but only count as verified when their
 * own signature checks pass. The pack is evidence, not authorization.
 */

import { keccak256 } from 'viem';

import { verifyAttestationBySchema } from '@/lib/attestations/verifyAttestationBySchema';
import { verifyDecisionInputAssessment } from '@/lib/decisionInputTrust/attestation';
import type { DecisionInputExecutionGateAudit } from '@/lib/decisionInputTrust/audit';
import { verifyExecutionPair } from '@/lib/execution/verifyExecutionPair';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { canonicalJsonString } from '@/lib/utils/canonicalJson';

export const EVIDENCE_PACK_SCHEMA_VERSION = 1;
export const EVIDENCE_PACK_TYPE = 'decision-execution' as const;

const ZERO_UID = `0x${'0'.repeat(64)}`;
const HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

export type EvidencePackPreTradeRole = 'source' | 'destination' | 'single';

/** One pre_trade_checks row: provenance columns plus the signed assessment. */
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
  /** Full signed decision-input assessment, exactly as persisted. */
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
  /** The full signed receipt payload, exactly as persisted. */
  payload: Record<string, unknown> | null;
}

/** Client-held artifacts the service does not persist at rest. */
export interface EvidencePackClientArtifacts {
  /**
   * Signed oracle pre-trade attestation envelopes as returned by the original
   * pre-trade / agent_begin_trade responses, keyed by pack role.
   */
  preTradeAttestations?: { source?: unknown; destination?: unknown };
  /** PriorSeal authorization / observation / attempt objects (client-asserted). */
  priorSeal?: Record<string, unknown>;
}

export interface EvidencePackManifest {
  schemaVersion: typeof EVIDENCE_PACK_SCHEMA_VERSION;
  packType: typeof EVIDENCE_PACK_TYPE;
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
  /** Combined operation-input gate audit (copied to both rows by the gate). */
  inputGate: DecisionInputExecutionGateAudit | null;
  /** True when both rows carry a canonical-identical gate; null when n/a. */
  inputGateConsistent: boolean | null;
  executionReceipt: EvidencePackExecutionReceiptEntry | null;
  clientArtifacts: EvidencePackClientArtifacts;
  boundaries: string[];
}

export const EVIDENCE_PACK_BOUNDARIES: string[] = [
  'Manifest hashes prove internal consistency of this pack only; they do not prove the truthfulness of upstream market data or the caller-reported quote source.',
  'Decision-input attestations are valid for five minutes after issuance; an expired signature still proves what Insight signed, but the assessment was only enforceable inside its window.',
  'Client-supplied artifacts (pre-trade attestation envelopes, PriorSeal objects) are client-asserted. They are verified only when their own signatures verify; the manifest binds their bytes, not their honesty.',
  "PriorSeal objects, when present, are produced outside Insight and must be checked against PriorSeal's own verification surface.",
  'This pack is evidence for review and dispute; it is not an authorization, a transaction-safety guarantee, or a light-client proof.',
];

function hashArtifact(value: unknown): string {
  return keccak256(new TextEncoder().encode(canonicalJsonString(value)));
}

function hashOrNone(value: unknown): string | null {
  return value === null || value === undefined ? null : hashArtifact(value);
}

/** Stable digest over the manifest's identity fields (excluding packHash). */
export function evidencePackHash(manifest: Omit<EvidencePackManifest, 'packHash'>): string {
  return keccak256(
    new TextEncoder().encode(
      canonicalJsonString({
        schemaVersion: manifest.schemaVersion,
        packType: manifest.packType,
        generatedAt: manifest.generatedAt,
        anchors: manifest.anchors,
        artifactHashes: manifest.artifactHashes,
      })
    )
  );
}

// ---------------------------------------------------------------------------
// Assembly (pure — DB fetch lives in fetchDecisionEvidenceRows)
// ---------------------------------------------------------------------------

export interface PreTradeCheckEvidenceRow {
  attestation_uid: string;
  attester: string | null;
  signed: boolean | null;
  verdict: string;
  asset: string;
  chain_id: number;
  action: string;
  trade_amount_usd: number | null;
  created_at: string;
  decision_input_assessment: Record<string, unknown> | null;
  decision_input_gate: DecisionInputExecutionGateAudit | null;
}

export interface ExecutionReceiptEvidenceRow {
  uid: string | null;
  attested: boolean | null;
  attester: string | null;
  execution_status: string;
  fill_status: string;
  tx_hash: string;
  block_number: number | null;
  executed_at: string | null;
  source: string | null;
  environment: string | null;
  created_at: string;
  pre_trade_uid: string | null;
  destination_pre_trade_uid: string | null;
  receipt_payload: Record<string, unknown> | null;
}

export interface AssembleEvidencePackInput {
  preTradeRows: PreTradeCheckEvidenceRow[];
  receiptRow: ExecutionReceiptEvidenceRow | null;
  clientArtifacts?: EvidencePackClientArtifacts;
  generatedAt?: string;
}

function assignRoles(
  rows: PreTradeCheckEvidenceRow[],
  receiptRow: ExecutionReceiptEvidenceRow | null
): Array<{ row: PreTradeCheckEvidenceRow; role: EvidencePackPreTradeRole }> {
  const ordered = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (ordered.length === 1) {
    return [{ row: ordered[0], role: 'single' }];
  }
  if (ordered.length === 0) return [];
  const sourceUid = receiptRow?.pre_trade_uid ?? null;
  const destinationUid = receiptRow?.destination_pre_trade_uid ?? null;
  const byUid = new Map(ordered.map((row) => [row.attestation_uid.toLowerCase(), row]));
  const source = sourceUid ? byUid.get(sourceUid.toLowerCase()) : undefined;
  const destination = destinationUid ? byUid.get(destinationUid.toLowerCase()) : undefined;
  const assigned = new Map<PreTradeCheckEvidenceRow, EvidencePackPreTradeRole>();
  if (source) assigned.set(source, 'source');
  if (destination && destination !== source) assigned.set(destination, 'destination');
  // Any row the receipt does not explain keeps chronological order as filler.
  for (const row of ordered) {
    if (!assigned.has(row)) {
      assigned.set(row, assigned.size === 0 ? 'source' : 'destination');
    }
    if (assigned.size === 2) break;
  }
  return ordered
    .filter((row) => assigned.has(row))
    .slice(0, 2)
    .map((row) => ({ row, role: assigned.get(row)! }));
}

/** Pure assembly from fetched rows. Deterministic given the same inputs. */
export function assembleDecisionEvidencePack(
  input: AssembleEvidencePackInput
): DecisionEvidencePack {
  const { preTradeRows, receiptRow } = input;
  const clientArtifacts: EvidencePackClientArtifacts = input.clientArtifacts ?? {};
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  const entries: EvidencePackPreTradeEntry[] = assignRoles(preTradeRows, receiptRow).map(
    ({ row, role }) => ({
      role,
      attestationUid: row.attestation_uid,
      attester: row.attester,
      signed: row.signed === true,
      verdict: row.verdict,
      asset: row.asset,
      chainId: row.chain_id,
      action: row.action,
      tradeAmountUsd: row.trade_amount_usd === null ? null : Number(row.trade_amount_usd),
      createdAt: row.created_at,
      assessment: row.decision_input_assessment,
    })
  );

  const gates = preTradeRows
    .map((row) => row.decision_input_gate)
    .filter((gate): gate is DecisionInputExecutionGateAudit => gate !== null && gate !== undefined);
  let inputGate: DecisionInputExecutionGateAudit | null = gates[0] ?? null;
  let inputGateConsistent: boolean | null = null;
  if (gates.length >= 2) {
    inputGateConsistent = canonicalJsonString(gates[0]) === canonicalJsonString(gates[1]);
  } else if (gates.length === 0) {
    inputGate = null;
  }

  const executionReceipt: EvidencePackExecutionReceiptEntry | null = receiptRow
    ? {
        receiptUid: receiptRow.uid,
        attested: receiptRow.attested === true,
        attester: receiptRow.attester,
        executionStatus: receiptRow.execution_status,
        fillStatus: receiptRow.fill_status,
        txHash: receiptRow.tx_hash,
        blockNumber: receiptRow.block_number,
        executedAt: receiptRow.executed_at,
        source: receiptRow.source,
        environment: receiptRow.environment,
        createdAt: receiptRow.created_at,
        payload: receiptRow.receipt_payload,
      }
    : null;

  const manifest: EvidencePackManifest = {
    schemaVersion: EVIDENCE_PACK_SCHEMA_VERSION,
    packType: EVIDENCE_PACK_TYPE,
    generatedAt,
    anchors: {
      preTradeUids: entries.map((entry) => entry.attestationUid),
      executionReceiptUid: executionReceipt?.receiptUid ?? null,
    },
    artifactHashes: {
      preTradeEntries: entries.map((entry) => hashArtifact(entry)),
      inputGate: hashOrNone(inputGate),
      executionReceipt: hashOrNone(executionReceipt),
      clientPreTradeAttestations: {
        source: hashOrNone(clientArtifacts.preTradeAttestations?.source ?? null),
        destination: hashOrNone(clientArtifacts.preTradeAttestations?.destination ?? null),
      },
      clientPriorSeal: hashOrNone(
        clientArtifacts.priorSeal && Object.keys(clientArtifacts.priorSeal).length > 0
          ? clientArtifacts.priorSeal
          : null
      ),
    },
    packHash: '',
  };
  manifest.packHash = evidencePackHash(manifest);

  return {
    manifest,
    preTrade: entries,
    inputGate,
    inputGateConsistent,
    executionReceipt,
    clientArtifacts,
    boundaries: EVIDENCE_PACK_BOUNDARIES,
  };
}

// ---------------------------------------------------------------------------
// DB fetch
// ---------------------------------------------------------------------------

const PRE_TRADE_COLUMNS =
  'attestation_uid, attester, signed, verdict, asset, chain_id, action, trade_amount_usd, created_at, decision_input_assessment, decision_input_gate' as const;

const RECEIPT_COLUMNS =
  'uid, attested, attester, execution_status, fill_status, tx_hash, block_number, executed_at, source, environment, created_at, pre_trade_uid, destination_pre_trade_uid, receipt_payload' as const;

/**
 * Resolve one operation's rows by a 32-byte hex UID. The UID may be a pre-trade
 * attestation UID or an execution receipt UID; the capability is the UID
 * itself (a 256-bit unguessable identifier that appears in the signed
 * artifacts a customer would share with a reviewer anyway).
 */
export async function fetchDecisionEvidenceRows(uid: string): Promise<{
  preTradeRows: PreTradeCheckEvidenceRow[];
  receiptRow: ExecutionReceiptEvidenceRow | null;
} | null> {
  if (!HASH_PATTERN.test(uid)) return null;
  const client = createServiceRoleClient();

  const { data: receiptData, error: receiptError } = await client
    .from('execution_receipts')
    .select(RECEIPT_COLUMNS)
    .eq('uid', uid)
    .limit(1);
  if (receiptError) throw new Error(`evidence pack receipt lookup failed: ${receiptError.message}`);
  let receiptRow = (receiptData ?? [])[0] as ExecutionReceiptEvidenceRow | undefined;

  let preTradeRows: PreTradeCheckEvidenceRow[] = [];
  if (receiptRow) {
    const anchors = [receiptRow.pre_trade_uid, receiptRow.destination_pre_trade_uid].filter(
      (value): value is string => typeof value === 'string' && HASH_PATTERN.test(value)
    );
    if (anchors.length > 0) {
      const { data, error } = await client
        .from('pre_trade_checks')
        .select(PRE_TRADE_COLUMNS)
        .in('attestation_uid', anchors);
      if (error) {
        throw new Error(`evidence pack pre-trade lookup failed: ${error.message}`);
      }
      preTradeRows = (data ?? []) as PreTradeCheckEvidenceRow[];
    }
  } else {
    const { data, error } = await client
      .from('pre_trade_checks')
      .select(PRE_TRADE_COLUMNS)
      .eq('attestation_uid', uid)
      .limit(2);
    if (error) {
      throw new Error(`evidence pack pre-trade lookup failed: ${error.message}`);
    }
    preTradeRows = (data ?? []) as PreTradeCheckEvidenceRow[];
    if (preTradeRows.length > 0) {
      const { data: linkedReceipts, error: linkedError } = await client
        .from('execution_receipts')
        .select(RECEIPT_COLUMNS)
        .or(`pre_trade_uid.eq.${uid},destination_pre_trade_uid.eq.${uid}`)
        .order('created_at', { ascending: false })
        .limit(1);
      if (linkedError) {
        throw new Error(`evidence pack receipt lookup failed: ${linkedError.message}`);
      }
      receiptRow = (linkedReceipts ?? [])[0] as ExecutionReceiptEvidenceRow | undefined;
    }
  }

  if (preTradeRows.length === 0 && !receiptRow) return null;
  return { preTradeRows, receiptRow: receiptRow ?? null };
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export interface EvidencePackAssessmentCheck {
  role: EvidencePackPreTradeRole;
  attestationUid: string;
  signatureValid: boolean;
  expired: boolean;
  reason: string;
  uid: string | null;
  linkedPreTradeUid: string | null;
  linkedPreTradeUidMatchesRow: boolean | null;
}

export interface EvidencePackEnvelopeCheck {
  role: 'source' | 'destination';
  valid: boolean;
  expired: boolean;
  reason: string | null;
  uid: string | null;
  uidMatchesAnchor: boolean | null;
}

export interface EvidencePackVerification {
  /** Manifest hashes recompute AND packHash matches AND linkage holds. */
  integrityValid: boolean;
  manifestValid: boolean;
  linkage: {
    assessmentsMatchAnchors: boolean;
    receiptMatchesAnchors: boolean | null;
    gateConsistent: boolean | null;
    clientEnvelopeUidsMatchAnchors: boolean | null;
  };
  assessments: EvidencePackAssessmentCheck[];
  clientPreTradeEnvelopes: EvidencePackEnvelopeCheck[] | null;
  /** Present only when both signed envelopes and the signed receipt are in the pack. */
  closedLoop: {
    pairedValid: boolean;
    closedLoopStatus: string;
    reason: string;
  } | null;
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

/** Recompute every manifest hash from the pack's own sections. */
function manifestMatchesPack(pack: DecisionEvidencePack): { valid: boolean; reason: string } {
  const manifest = pack.manifest;
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, reason: 'missing_manifest' };
  }
  if (manifest.schemaVersion !== EVIDENCE_PACK_SCHEMA_VERSION) {
    return { valid: false, reason: 'unsupported_schema_version' };
  }
  if (manifest.packType !== EVIDENCE_PACK_TYPE) {
    return { valid: false, reason: 'unsupported_pack_type' };
  }

  const entryHashes = pack.preTrade.map((entry) => hashArtifact(entry));
  if (entryHashes.length !== manifest.artifactHashes.preTradeEntries.length) {
    return { valid: false, reason: 'pre_trade_entry_count_mismatch' };
  }
  for (let index = 0; index < entryHashes.length; index += 1) {
    if (
      entryHashes[index].toLowerCase() !==
      manifest.artifactHashes.preTradeEntries[index].toLowerCase()
    ) {
      return { valid: false, reason: `pre_trade_entry_hash_mismatch:${index}` };
    }
  }

  const checks: Array<[string | null, string | null, string]> = [
    [hashOrNone(pack.inputGate), manifest.artifactHashes.inputGate, 'input_gate_hash_mismatch'],
    [
      hashOrNone(pack.executionReceipt),
      manifest.artifactHashes.executionReceipt,
      'execution_receipt_hash_mismatch',
    ],
    [
      hashOrNone(pack.clientArtifacts.preTradeAttestations?.source ?? null),
      manifest.artifactHashes.clientPreTradeAttestations.source,
      'client_source_envelope_hash_mismatch',
    ],
    [
      hashOrNone(pack.clientArtifacts.preTradeAttestations?.destination ?? null),
      manifest.artifactHashes.clientPreTradeAttestations.destination,
      'client_destination_envelope_hash_mismatch',
    ],
  ];
  const priorSealPresent =
    pack.clientArtifacts.priorSeal && Object.keys(pack.clientArtifacts.priorSeal).length > 0
      ? pack.clientArtifacts.priorSeal
      : null;
  checks.push([
    hashOrNone(priorSealPresent),
    manifest.artifactHashes.clientPriorSeal,
    'client_prior_seal_hash_mismatch',
  ]);
  for (const [computed, declared, label] of checks) {
    const bothNull = computed === null && declared === null;
    const bothEqual =
      computed !== null &&
      declared !== null &&
      computed.toLowerCase() === String(declared).toLowerCase();
    if (!bothNull && !bothEqual) {
      return { valid: false, reason: label };
    }
  }

  const anchors = manifest.anchors;
  if (!anchors || !Array.isArray(anchors.preTradeUids)) {
    return { valid: false, reason: 'missing_anchors' };
  }
  const expectedUids = pack.preTrade.map((entry) => entry.attestationUid.toLowerCase());
  const declaredUids = anchors.preTradeUids.map((value) => String(value).toLowerCase());
  if (
    expectedUids.length !== declaredUids.length ||
    expectedUids.some((value, index) => value !== declaredUids[index])
  ) {
    return { valid: false, reason: 'anchor_uid_mismatch' };
  }
  const declaredReceiptUid =
    anchors.executionReceiptUid === null ? null : String(anchors.executionReceiptUid).toLowerCase();
  if ((pack.executionReceipt?.receiptUid ?? null)?.toLowerCase() !== declaredReceiptUid) {
    return { valid: false, reason: 'anchor_receipt_uid_mismatch' };
  }

  const recomputed = evidencePackHash({
    schemaVersion: manifest.schemaVersion,
    packType: manifest.packType,
    generatedAt: manifest.generatedAt,
    anchors: manifest.anchors,
    artifactHashes: manifest.artifactHashes,
  });
  if (recomputed.toLowerCase() !== String(manifest.packHash ?? '').toLowerCase()) {
    return { valid: false, reason: 'pack_hash_mismatch' };
  }

  return { valid: true, reason: 'manifest_consistent' };
}

/**
 * Verify a decision evidence pack end to end:
 *   1. manifest hashes recompute from the pack's own sections;
 *   2. every carried decision-input assessment passes its EIP-712 signature
 *      verification (expiry is reported separately — a post-hoc pack is
 *      expected to contain expired windows);
 *   3. client-held oracle pre-trade envelopes, when present, verify against
 *      their own schema and their UIDs match the pack anchors;
 *   4. when both signed envelopes and the signed receipt are present, the
 *      existing closed-loop pair verifier runs (UID, request hash, chain,
 *      asset, action, window and trusted-signer bindings);
 *   5. anchor linkage (assessment linkedPreTradeUid ↔ row UID ↔ receipt
 *      preTradeUids) holds.
 */
export async function verifyDecisionEvidencePack(
  value: unknown
): Promise<EvidencePackVerification> {
  const pack = value as DecisionEvidencePack;
  const emptyCompleteness = {
    preTradeEntries: 0,
    signedAssessments: 0,
    hasInputGate: false,
    hasReceipt: false,
    hasSignedReceiptPayload: false,
    hasClientEnvelopes: false,
    hasPriorSeal: false,
  };
  const invalid = (
    reason: string,
    extra: Partial<EvidencePackVerification> = {}
  ): EvidencePackVerification => ({
    integrityValid: false,
    manifestValid: false,
    linkage: {
      assessmentsMatchAnchors: false,
      receiptMatchesAnchors: null,
      gateConsistent: null,
      clientEnvelopeUidsMatchAnchors: null,
    },
    assessments: [],
    clientPreTradeEnvelopes: null,
    closedLoop: null,
    completeness: emptyCompleteness,
    reason,
    ...extra,
  });

  try {
    if (
      pack === null ||
      typeof pack !== 'object' ||
      typeof (pack as { manifest?: unknown }).manifest !== 'object'
    ) {
      return invalid('malformed_pack');
    }

    const manifestCheck = manifestMatchesPack(pack);
    const completeness = {
      preTradeEntries: pack.preTrade?.length ?? 0,
      signedAssessments:
        pack.preTrade?.filter((entry) => entry.assessment?.attestation).length ?? 0,
      hasInputGate: pack.inputGate !== null && pack.inputGate !== undefined,
      hasReceipt: pack.executionReceipt !== null && pack.executionReceipt !== undefined,
      hasSignedReceiptPayload: pack.executionReceipt?.payload != null,
      hasClientEnvelopes:
        pack.clientArtifacts?.preTradeAttestations?.source != null ||
        pack.clientArtifacts?.preTradeAttestations?.destination != null,
      hasPriorSeal:
        pack.clientArtifacts?.priorSeal != null &&
        Object.keys(pack.clientArtifacts.priorSeal).length > 0,
    };

    if (!manifestCheck.valid) {
      return invalid(manifestCheck.reason, { completeness });
    }

    // --- 2. decision-input assessments ---
    const { checks: assessments, allMatch: assessmentsMatchAnchors } = await checkPackAssessments(
      pack.preTrade ?? []
    );

    // --- 3. client-held oracle pre-trade envelopes ---
    const envelopeResult = await checkClientEnvelopes(pack);
    const { checks: clientPreTradeEnvelopes, uidsMatch: clientEnvelopeUidsMatchAnchors } =
      envelopeResult;

    // --- 4. closed loop when the pack carries the full triangle ---
    const closedLoop = await checkClosedLoop(pack, envelopeResult.verifiedInputs);

    // --- 5. receipt ↔ anchor linkage ---
    const receiptMatchesAnchors = checkReceiptAnchorLinkage(pack);

    const linkage = {
      assessmentsMatchAnchors,
      receiptMatchesAnchors,
      gateConsistent: pack.inputGateConsistent,
      clientEnvelopeUidsMatchAnchors,
    };

    const integrityValid =
      manifestCheck.valid &&
      assessmentsMatchAnchors &&
      assessments.every((check) => check.signatureValid) &&
      receiptMatchesAnchors !== false &&
      clientEnvelopeUidsMatchAnchors !== false &&
      pack.inputGateConsistent !== false;

    return {
      integrityValid,
      manifestValid: true,
      linkage,
      assessments,
      clientPreTradeEnvelopes,
      closedLoop,
      completeness,
      reason: integrityValid ? 'verified' : 'integrity_failure',
    };
  } catch (error) {
    return invalid(`verification_error:${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Verify each carried decision-input assessment and its row linkage. */
async function checkPackAssessments(entries: EvidencePackPreTradeEntry[]): Promise<{
  checks: EvidencePackAssessmentCheck[];
  allMatch: boolean;
}> {
  const checks: EvidencePackAssessmentCheck[] = [];
  let allMatch = true;
  for (const entry of entries) {
    const verification = await verifyDecisionInputAssessment(entry.assessment);
    const signatureValid =
      verification.valid || (verification.expired && verification.reason === 'expired');
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
      expired: verification.expired,
      reason: verification.reason,
      uid: verification.uid,
      linkedPreTradeUid: verification.linkedPreTradeUid,
      linkedPreTradeUidMatchesRow: linkedMatches,
    });
  }
  return { checks, allMatch };
}

/** Verify client-held oracle envelopes and collect the ones that bind. */
async function checkClientEnvelopes(pack: DecisionEvidencePack): Promise<{
  checks: EvidencePackEnvelopeCheck[] | null;
  uidsMatch: boolean | null;
  verifiedInputs: Partial<Record<'source' | 'destination', unknown>>;
}> {
  const checks: EvidencePackEnvelopeCheck[] = [];
  let uidsMatch: boolean | null = null;
  const verifiedInputs: Partial<Record<'source' | 'destination', unknown>> = {};
  const roleForUid = (uid: string): 'source' | 'destination' | null => {
    const entry = (pack.preTrade ?? []).find(
      (candidate) => candidate.attestationUid.toLowerCase() === uid.toLowerCase()
    );
    if (!entry) return null;
    return entry.role === 'destination' ? 'destination' : 'source';
  };
  for (const role of ['source', 'destination'] as const) {
    const envelope = pack.clientArtifacts?.preTradeAttestations?.[role];
    if (envelope == null) continue;
    const verification = await verifyAttestationBySchema(envelope as never);
    const signatureOk =
      verification.valid || (verification.expired && verification.reason === 'expired');
    const uid = verification.uid;
    const uidMatches = uid ? roleForUid(uid) === role : false;
    if (uidsMatch !== false) {
      uidsMatch = uidMatches;
    }
    checks.push({
      role,
      valid: signatureOk,
      expired: verification.expired,
      reason: verification.reason ?? null,
      uid,
      uidMatchesAnchor: uidMatches,
    });
    if (signatureOk && uidMatches) {
      verifiedInputs[role] = envelope;
    }
  }
  return { checks: checks.length > 0 ? checks : null, uidsMatch, verifiedInputs };
}

/** Run the closed-loop pair verifier when the pack carries the full triangle. */
async function checkClosedLoop(
  pack: DecisionEvidencePack,
  verifiedInputs: Partial<Record<'source' | 'destination', unknown>>
): Promise<EvidencePackVerification['closedLoop']> {
  const receiptPayload = pack.executionReceipt?.payload;
  if (
    !verifiedInputs.source ||
    !receiptPayload ||
    (!verifiedInputs.destination && pack.clientArtifacts?.preTradeAttestations?.destination != null)
  ) {
    return null;
  }
  const pair = await verifyExecutionPair(
    verifiedInputs.source as never,
    receiptPayload as never,
    (verifiedInputs.destination ?? null) as never
  );
  return {
    pairedValid: pair.pairedValid,
    closedLoopStatus: pair.closedLoopStatus,
    reason: pair.reason,
  };
}

/** Check the receipt payload (or provenance row) against the pack anchors. */
function checkReceiptAnchorLinkage(pack: DecisionEvidencePack): boolean | null {
  const receiptPayload = pack.executionReceipt?.payload;
  const receiptData = receiptPayload as { data?: Record<string, unknown> } | null;
  if (receiptData?.data) {
    const receiptSource = String(receiptData.data.preTradeUid ?? '').toLowerCase();
    const receiptDestination = String(receiptData.data.destinationPreTradeUid ?? '').toLowerCase();
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
  if (pack.executionReceipt) {
    const rowSource = pack.executionReceipt.receiptUid
      ? pack.manifest.anchors.executionReceiptUid
      : null;
    return rowSource === null ? null : rowSource === pack.manifest.anchors.executionReceiptUid;
  }
  return null;
}
