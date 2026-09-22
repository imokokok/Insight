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
  const results: { asset: string; chainId: number; slot: number; status: string }[] = [];
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
      results.push({ ...target, slot, status: 'ALREADY_RECORDED' });
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
    results.push({ ...target, slot, status });
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
    // Old policy targets and immutable samples remain available for audit, but
    // they must not accrue perpetual missing slots after a policy rotation.
    targets: (data as SummaryRow[])
      .filter((row) => row.policy_id === COVERAGE_POLICY_ID)
      .map((row) => ({ ...row, ...summarizeCoverageSlo(row) })),
  };
}

type CoverageSummary = Awaited<ReturnType<typeof getCoverageSlo>>;
type CoverageSamples = Awaited<ReturnType<typeof collectCoverageSlo>>;

/** Notify on a sustained state change; immutable slots are the incident ledger. */
export async function getCoverageAlertChanges(samples: CoverageSamples, summary: CoverageSummary) {
  const fresh = samples.filter((sample) => sample.status !== 'ALREADY_RECORDED');
  if (fresh.length === 0) return { newFailures: [], recoveries: [] };
  const slots = new Set(fresh.map((sample) => sample.slot));
  if (slots.size !== 1) throw new Error('COVERAGE_SAMPLE_SLOT_MISMATCH');
  const slot = fresh[0].slot;
  const ids = fresh.map((sample) => `${sample.asset}:${sample.chainId}:${COVERAGE_POLICY_ID}`);
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from('coverage_slo_samples')
    .select('target_id,slot,status,signed_ready')
    .in('target_id', ids)
    .gte('slot', slot - 2700)
    .lt('slot', slot);
  if (error || !Array.isArray(data)) throw new Error('COVERAGE_ALERT_HISTORY_UNAVAILABLE');
  const previous = new Map(data.map((row) => [`${row.target_id}:${row.slot}`, row]));
  const current = new Map(summary.targets.map((target) => [target.id, target]));
  const newFailures: { asset: string; chainId: number; status: string; reasons: string[] }[] = [];
  const recoveries: { asset: string; chainId: number }[] = [];

  for (const sample of fresh) {
    const id = `${sample.asset}:${sample.chainId}:${COVERAGE_POLICY_ID}`;
    const latest = current.get(id)?.latest;
    if (!latest || latest.slot !== slot || latest.status !== sample.status)
      throw new Error('COVERAGE_ALERT_CURRENT_SAMPLE_UNAVAILABLE');
    const wasBad = (pastSlot: number) => {
      const record = previous.get(`${id}:${pastSlot}`);
      return record ? record.status !== 'PASS' || !record.signed_ready : false;
    };
    const isBad = latest.status !== 'PASS' || !latest.signedReady;
    // A single bad sample remains visible in the SLO and logs. Two consecutive
    // bad samples open one incident. A one-slot good blip cannot close it.
    if (isBad && wasBad(slot - 900) && !wasBad(slot - 1800) && !wasBad(slot - 2700))
      newFailures.push({
        asset: sample.asset,
        chainId: sample.chainId,
        status: latest.status,
        reasons: latest.reasons,
      });
    if (!isBad && !wasBad(slot - 900) && wasBad(slot - 1800))
      recoveries.push({ asset: sample.asset, chainId: sample.chainId });
  }
  return { newFailures, recoveries };
}
