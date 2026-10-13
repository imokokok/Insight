import { createServiceRoleClient } from '@/lib/supabase/server';

export interface DecisionInputExecutionGateAudit {
  schemaVersion: 1;
  status: 'SUFFICIENT' | 'BLOCK' | 'INSUFFICIENT_EVIDENCE';
  evaluatedAt: string;
  sourceAssessmentStatus: 'SUFFICIENT' | 'BLOCK' | 'INSUFFICIENT_EVIDENCE' | null;
  destinationAssessmentStatus: 'SUFFICIENT' | 'BLOCK' | 'INSUFFICIENT_EVIDENCE' | null;
  routeQuote: {
    price: number;
    observedAt: string;
    ageSeconds: number | null;
    oracleCrossRate: number;
    deviationBps: number | null;
    maxDeviationBps: number;
  };
}

const ATTESTATION_UID_PATTERN = /^0x[0-9a-fA-F]{64}$/;

/**
 * Attach the combined operation-input gate result to both pre-trade audit rows.
 * The receipt later links to these rows using the same signed attestation UIDs.
 * The gate payload is audit context and is deliberately not described as signed.
 */
export async function recordDecisionInputExecutionGate(
  sourceAttestationUid: string,
  destinationAttestationUid: string,
  gate: DecisionInputExecutionGateAudit
): Promise<void> {
  if (
    !ATTESTATION_UID_PATTERN.test(sourceAttestationUid) ||
    !ATTESTATION_UID_PATTERN.test(destinationAttestationUid) ||
    sourceAttestationUid === destinationAttestationUid
  ) {
    throw new Error('decision-input gate audit requires two distinct signed pre-trade UIDs');
  }

  const client = createServiceRoleClient();
  const { data, error } = await client
    .from('pre_trade_checks')
    .update({ decision_input_gate: gate })
    .in('attestation_uid', [sourceAttestationUid, destinationAttestationUid])
    .select('attestation_uid');

  if (error) {
    throw new Error(`decision-input gate audit persistence failed: ${error.message}`);
  }

  const storedUids = new Set((data ?? []).map((row) => row.attestation_uid));
  if (!storedUids.has(sourceAttestationUid) || !storedUids.has(destinationAttestationUid)) {
    throw new Error('decision-input gate audit could not find both pre-trade audit rows');
  }
}
