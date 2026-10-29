/* eslint-disable no-console */
/**
 * Direct Coverage SLO runner for GitHub Actions.
 *
 * Keeps the same response contract as /api/cron/coverage-slo while executing
 * on the scheduled runner instead of holding a Vercel Function open for four
 * sequential coverage probes. Requires SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY from the workflow environment.
 */
import { createRequestDeadline, RequestDeadlineExceededError } from '@/lib/utils/requestDeadline';
import { format } from 'node:util';

const COVERAGE_RUNNER_DEADLINE_MS = 225_000;

/**
 * The workflow parses stdout as one JSON document. Application modules emit
 * useful startup diagnostics through console methods while they are imported,
 * so isolate those diagnostics on stderr before loading them.
 */
function sendDiagnosticsToStderr(): void {
  const writeDiagnostic = (...args: unknown[]) => {
    process.stderr.write(`${format(...args)}\n`);
  };

  console.log = writeDiagnostic;
  console.info = writeDiagnostic;
  console.warn = writeDiagnostic;
  console.debug = writeDiagnostic;
}

async function main(): Promise<void> {
  sendDiagnosticsToStderr();
  const deadline = createRequestDeadline(
    undefined,
    COVERAGE_RUNNER_DEADLINE_MS,
    'Coverage collection deadline exceeded'
  );

  try {
    const { collectCoverageSlo, getCoverageAlertChanges, getCoverageSlo } =
      await import('@/lib/coverage/collector');
    const targets = await collectCoverageSlo({ signal: deadline.signal });
    const summary = await getCoverageSlo(24, { signal: deadline.signal });
    const { newFailures, recoveries } = await getCoverageAlertChanges(targets, summary, {
      signal: deadline.signal,
    });
    const alerts = summary.targets
      .filter(
        (target) =>
          ['MEASUREMENT_GAP', 'BELOW_OBJECTIVE'].includes(target.status) ||
          target.signedStatus === 'BELOW_OBJECTIVE'
      )
      .map((target) => ({
        asset: target.asset,
        chainId: target.chain_id,
        status: target.status,
        signedStatus: target.signedStatus,
      }));
    const latestAlerts = summary.targets
      .filter(
        (target) => !target.latest || target.latest.status !== 'PASS' || !target.latest.signedReady
      )
      .map((target) => ({
        asset: target.asset,
        chainId: target.chain_id,
        status: target.latest?.status ?? 'MISSING',
        signedReady: target.latest?.signedReady ?? false,
        reasons: target.latest?.reasons ?? ['LATEST_SAMPLE_MISSING'],
      }));

    process.stdout.write(
      `${JSON.stringify({ success: true, targets, alerts, latestAlerts, newFailures, recoveries })}\n`
    );
  } catch (error) {
    const code =
      deadline.didExpire() || error instanceof RequestDeadlineExceededError
        ? 'COVERAGE_COLLECTION_DEADLINE_EXCEEDED'
        : error instanceof Error && /^COVERAGE_[A-Z_]+$/.test(error.message)
          ? error.message
          : 'COVERAGE_COLLECTION_FAILED';
    process.stdout.write(`${JSON.stringify({ success: false, error: code })}\n`);
    process.exitCode = 1;
  } finally {
    deadline.dispose();
  }
}

void main();
