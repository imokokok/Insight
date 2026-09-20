import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import { collectCoverageSlo, getCoverageSlo } from '@/lib/coverage/collector';

export const maxDuration = 300;
export async function GET(request: Request) {
  const auth = verifyCronSecret(request);
  if (auth) return auth;
  try {
    const targets = await collectCoverageSlo();
    const summary = await getCoverageSlo(24);
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
    return NextResponse.json(
      { success: true, targets, alerts },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'COVERAGE_COLLECTION_FAILED' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
