/* eslint-disable no-console */
/**
 * Dependency-free control plane used by scheduled GitHub workflows.
 *
 * Commands:
 *   guard  - skip a low-frequency GitHub fallback when a recent Supabase-
 *            dispatched run already succeeded.
 *   start  - records local run metadata; primary dispatches defer their sole
 *            ledger update until completion.
 *   finish - records the final GitHub job conclusion and run metadata.
 *
 * Telemetry is deliberately fail-open: a temporary ledger/API failure must
 * never prevent the actual data pipeline from running.
 */
import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const workflow = process.env.CRON_WORKFLOW;

// Ledger telemetry must not consume the time reserved for the scheduled job.
export function requestLedger(url, options = {}, fetcher = fetch, timeoutMs = 5_000) {
  return fetcher(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
}

function headers(extra = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function writeGithubFile(name, value, file = process.env.GITHUB_OUTPUT) {
  if (!file) return;
  await appendFile(file, `${name}=${value}\n`, 'utf8');
}

function ready() {
  if (baseUrl && serviceKey && workflow) return true;
  console.warn('[cron-control] missing Supabase credentials or CRON_WORKFLOW; telemetry skipped');
  return false;
}

async function guard() {
  // Every workflow_dispatch invocation is intentional. Only native GitHub
  // `schedule` events are stale-data fallbacks that may be skipped.
  if (process.env.GITHUB_EVENT_NAME !== 'schedule') {
    await writeGithubFile('should_run', 'true');
    return;
  }

  if (!ready()) {
    await writeGithubFile('should_run', 'true');
    return;
  }

  const maxAgeMinutes = Math.max(1, Number(process.env.FALLBACK_MAX_AGE_MINUTES) || 60);
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60_000).toISOString();
  const query = new URL(`${baseUrl}/rest/v1/cron_dispatch_runs`);
  query.searchParams.set('select', 'completed_at');
  query.searchParams.set('workflow_file', `eq.${workflow}`);
  query.searchParams.set('source', 'eq.supabase_cron');
  query.searchParams.set('status', 'eq.succeeded');
  query.searchParams.set('completed_at', `gte.${cutoff}`);
  query.searchParams.set('order', 'completed_at.desc');
  query.searchParams.set('limit', '1');

  try {
    const response = await requestLedger(query, { headers: headers() });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    const shouldRun = rows.length === 0;
    await writeGithubFile('should_run', String(shouldRun));
    console.log(
      shouldRun
        ? `[cron-control] no successful ${workflow} run in ${maxAgeMinutes}m; fallback will run`
        : `[cron-control] dispatcher is healthy for ${workflow}; fallback skipped`
    );
  } catch (error) {
    console.warn(`[cron-control] guard failed (${error.message}); fallback will run`);
    await writeGithubFile('should_run', 'true');
  }
}

async function start() {
  if (!ready()) return;

  let dispatchId = process.env.CRON_DISPATCH_ID?.trim();
  const runId = Number(process.env.GITHUB_RUN_ID);
  const runUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${runId}`;
  const now = new Date().toISOString();

  try {
    await writeGithubFile('CRON_STARTED_AT', now, process.env.GITHUB_ENV);
    if (dispatchId) {
      // Supabase-created rows are already durable and `dispatching` is a
      // sufficient in-flight state for the timeout guard. Deferring metadata
      // to finish collapses insert → start update → finish update into an
      // insert plus one terminal update, avoiding needless MVCC tuples.
    } else {
      const response = await requestLedger(`${baseUrl}/rest/v1/cron_dispatch_runs`, {
        method: 'POST',
        headers: headers({ Prefer: 'return=representation' }),
        body: JSON.stringify({
          workflow_file: workflow,
          scheduled_for: now,
          source: process.env.GITHUB_EVENT_NAME === 'schedule' ? 'github_fallback' : 'manual',
          status: 'running',
          github_run_id: runId,
          github_run_url: runUrl,
          started_at: now,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = await response.json();
      dispatchId = rows[0]?.id;
      if (dispatchId) {
        await writeGithubFile('CRON_DISPATCH_ID', dispatchId, process.env.GITHUB_ENV);
      }
    }
    console.log(`[cron-control] ledger started for ${workflow} (${dispatchId ?? 'untracked'})`);
  } catch (error) {
    console.warn(`[cron-control] start telemetry failed: ${error.message}`);
  }
}

async function finish() {
  if (!ready()) return;
  const dispatchId = process.env.CRON_DISPATCH_ID?.trim();
  if (!dispatchId) {
    console.warn('[cron-control] no dispatch id; finish telemetry skipped');
    return;
  }

  const conclusion = process.env.CRON_CONCLUSION || 'failure';
  const status =
    conclusion === 'success' ? 'succeeded' : conclusion === 'cancelled' ? 'cancelled' : 'failed';
  const completedAt = new Date().toISOString();
  const startedAt = process.env.CRON_STARTED_AT?.trim() || completedAt;
  const runId = Number(process.env.GITHUB_RUN_ID);
  const runUrl =
    Number.isSafeInteger(runId) && process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${runId}`
      : undefined;
  const body = {
    status,
    conclusion,
    completed_at: completedAt,
    ...(Number.isSafeInteger(runId)
      ? {
          github_run_id: runId,
          github_run_url: runUrl,
          started_at: startedAt,
        }
      : {}),
  };
  const query = new URL(`${baseUrl}/rest/v1/cron_dispatch_runs`);
  query.searchParams.set('id', `eq.${dispatchId}`);
  // A duplicated callback after a terminal write is a no-op rather than a
  // fresh row version. The same predicate protects a slot already timed out.
  query.searchParams.set('status', 'in.(dispatching,running)');
  try {
    const response = await requestLedger(query, {
      method: 'PATCH',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log(`[cron-control] ledger finished for ${workflow}: ${status}`);
  } catch (error) {
    console.warn(`[cron-control] finish telemetry failed: ${error.message}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2];
  if (command === 'guard') await guard();
  else if (command === 'start') await start();
  else if (command === 'finish') await finish();
  else {
    console.error('Usage: node scripts/cron-control.mjs <guard|start|finish>');
    process.exitCode = 2;
  }
}
