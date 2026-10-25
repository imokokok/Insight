import { NextResponse } from 'next/server';

import { verifyCronSecret } from '@/lib/api/cronAuth';
import {
  collectCoverageSlo,
  getCoverageAlertChanges,
  getCoverageSlo,
} from '@/lib/coverage/collector';
import { createRequestDeadline, RequestDeadlineExceededError } from '@/lib/utils/requestDeadline';

// Leave room to serialize a clear retryable response before Vercel's function
// ceiling. The workflow client is aligned to this bound as well.
export const maxDuration = 240;
const COVERAGE_ROUTE_DEADLINE_MS = 225_000;
export async function GET(request: Request) {
  const auth = verifyCronSecret(request);
  if (auth) return auth;
  const deadline = createRequestDeadline(
    request.signal,
    COVERAGE_ROUTE_DEADLINE_MS,
    'Coverage collection deadline exceeded'
  );
  try {
    const targets = await collectCoverageSlo({ signal: deadline.signal });
    const summary = await getCoverageSlo(24, { signal: deadline.signal });
    const { newFailures, recoveries } = await getCoverageAlertChanges(targets, summary, {
      signal: deadline.signal,
    });
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
  } catch (error) {
    const code =
      deadline.didExpire() || error instanceof RequestDeadlineExceededError
        ? 'COVERAGE_COLLECTION_DEADLINE_EXCEEDED'
        : error instanceof Error && /^COVERAGE_[A-Z_]+$/.test(error.message)
          ? error.message
          : 'COVERAGE_COLLECTION_FAILED';
    return NextResponse.json(
      { success: false, error: code },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  } finally {
    deadline.dispose();
  }
}
