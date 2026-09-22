import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import {
  collectCoverageSlo,
  getCoverageAlertChanges,
  getCoverageSlo,
} from '@/lib/coverage/collector';

export const maxDuration = 300;
export async function GET(request: Request) {
  const auth = verifyCronSecret(request);
  if (auth) return auth;
  try {
    const targets = await collectCoverageSlo();
    const summary = await getCoverageSlo(24);
    const { newFailures, recoveries } = await getCoverageAlertChanges(targets, summary);
    const alerts = summary.targets
      .filter(
        (t) =>
          ['MEASUREMENT_GAP', 'BELOW_OBJECTIVE'].includes(t.status) ||
          t.signedStatus === 'BELOW_OBJECTIVE'
      )
      .map((t) => ({
        asset: t.asset,
        chainId: t.chain_id,
        status: t.status,
        signedStatus: t.signedStatus,
      }));
    const latestAlerts = summary.targets
      .filter((t) => !t.latest || t.latest.status !== 'PASS' || !t.latest.signedReady)
      .map((t) => ({
        asset: t.asset,
        chainId: t.chain_id,
        status: t.latest?.status ?? 'MISSING',
        signedReady: t.latest?.signedReady ?? false,
        reasons: t.latest?.reasons ?? ['LATEST_SAMPLE_MISSING'],
      }));
    return NextResponse.json(
      { success: true, targets, alerts, latestAlerts, newFailures, recoveries },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'COVERAGE_COLLECTION_FAILED' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
