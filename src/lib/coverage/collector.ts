import { createServiceRoleClient } from '@/lib/supabase/server';

import { assessCoverage, COVERAGE_POLICY_ID } from './service';
import { summarizeCoverageSlo, type CoverageSloCounts } from './slo';

// Bounded production baseline; adding a new scope enrolls it from the current time.
export const COVERAGE_TARGETS = [
  { asset: 'ETH', chainId: 1 },
  { asset: 'USDC', chainId: 1 },
  { asset: 'ETH', chainId: 8453 },
  { asset: 'USDC', chainId: 8453 },
] as const;

export async function collectCoverageSlo() {
  const db = createServiceRoleClient();
  const results: { asset: string; chainId: number; status: string }[] = [];
  for (const target of COVERAGE_TARGETS) {
    const id = `${target.asset}:${target.chainId}:${COVERAGE_POLICY_ID}`;
    const enrollment = await db.from('coverage_slo_targets').upsert(
      {
        id,
        asset: target.asset,
        chain_id: target.chainId,
        policy_id: COVERAGE_POLICY_ID,
        objective_bps: 9900,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
    if (enrollment.error) throw new Error('COVERAGE_SLO_ENROLLMENT_FAILED');
    const slot = Math.floor(Date.now() / 900000) * 900;
    const existing = await db
      .from('coverage_slo_samples')
      .select('slot')
      .eq('target_id', id)
      .eq('slot', slot)
      .maybeSingle();
    if (existing.error) throw new Error('COVERAGE_SLO_READ_FAILED');
    if (existing.data) {
      results.push({ ...target, status: 'ALREADY_RECORDED' });
      continue;
    }
    let proof = null;
    let status = 'UNAVAILABLE';
    let reasons = ['PROBE_UNAVAILABLE'];
    try {
      proof = await assessCoverage({ ...target, policyId: COVERAGE_POLICY_ID });
      status = proof.report.evaluation.status;
      reasons = [...proof.report.evaluation.reasons];
      if (!proof.signature) reasons.push('SIGNER_UNAVAILABLE');
    } catch {
      /* Persist failure, including registry/provider/signer outages. */
    }
    // Never label a slow previous-slot observation as a new current-slot success.
    if (Math.floor(Date.now() / 900000) * 900 !== slot)
      throw new Error('COVERAGE_SAMPLE_SLOT_ELAPSED');
    const signedReady =
      status === 'PASS' &&
      Boolean(proof?.signature) &&
      proof!.report.validUntil > Math.floor(Date.now() / 1000);
    const saved = await db
      .from('coverage_slo_samples')
      .upsert(
        { target_id: id, slot, status, signed_ready: signedReady, reasons, proof },
        { onConflict: 'target_id,slot', ignoreDuplicates: true }
      );
    if (saved.error) throw new Error('COVERAGE_SLO_PERSISTENCE_FAILED');
    results.push({ ...target, status });
  }
  return results;
}

interface SummaryRow extends CoverageSloCounts {
  id: string;
  asset: string;
  chain_id: number;
  policy_id: string;
  latest: { slot: number; status: string; signedReady: boolean; reasons: string[] } | null;
}
export async function getCoverageSlo(hours: 24 | 168 | 672 = 24) {
  const db = createServiceRoleClient();
  const { data, error } = await db.rpc('coverage_slo_summary', { window_hours: hours });
  if (error || !Array.isArray(data)) throw new Error('COVERAGE_SLO_STORAGE_UNAVAILABLE');
  return {
    windowHours: hours,
    cadenceSeconds: 900,
    measuredAt: new Date().toISOString(),
    limitation: 'Fixed-slot sampled readiness, not continuous uptime, trade safety or an SLA.',
    targets: (data as SummaryRow[]).map((row) => ({ ...row, ...summarizeCoverageSlo(row) })),
  };
}
