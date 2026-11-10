/**
 * Vercel deployment-storage cleanup controller.
 *
 * Hobby teams share a 10 GB deployment-storage quota (2026-10-14 policy:
 * past the limit, unprotected deployments are deleted immediately instead of
 * after 30 days). PR preview builds are the bulk of that usage: the merge
 * train lands many pushes per day, each one builds the full Next.js bundle,
 * and Hobby protects only the 3 most recent production deployments plus the
 * 3 most recent deployments of any type.
 *
 * This controller runs in CI (same VERCEL_TOKEN as the release workflow) so
 * no local CLI login is needed. It is deliberately read-only by default:
 *
 * Modes:
 *   report           List deployments, classify protected/unprotected, print
 *                    a summary to GITHUB_STEP_SUMMARY. No mutation. (default)
 *   cleanup          DELETE unprotected deployments older than
 *                    --retention-days (30). Vercel keeps deleted deployments
 *                    restorable for 30 days under Settings > Security.
 *   disable-preview  Set DEPLOYMENT_DISABLED=1 scoped to the preview target,
 *                    which stops Vercel's git integration from building
 *                    previews on every push (production deploys via the
 *                    release deploy hook are unaffected).
 *   enable-preview   Remove that env so previews can build again.
 *
 * Protected deployments (never deleted in cleanup mode):
 *   - the deployment currently aliased to production (aliasAssigned)
 *   - the 3 most recent production-target deployments
 *   - the 3 most recent deployments of any type
 *   - anything younger than --retention-days
 *
 * Environment:
 *   VERCEL_TOKEN       Required.
 *   VERCEL_PROJECT_ID  Required (same var the provenance audit uses).
 *   VERCEL_TEAM_ID     Optional. Required for team-owned projects.
 *   GITHUB_STEP_SUMMARY Optional. Summary markdown lands here in CI.
 *
 * Exit codes: 0 ok, 1 API failure, 2 configuration error.
 */

type Deployment = {
  uid: string;
  url?: string;
  createdAt: number;
  created?: string;
  readyState?: string;
  state?: string;
  target?: string | null;
  aliasAssigned?: boolean | string[] | number | null;
  alias?: string[];
};

type SummaryRow = { uid: string; created: string; kind: string; note: string };

const VERCEL_API = 'https://api.vercel.com';
const RETENTION_DAYS_DEFAULT = 30;
const MAX_DELETES_DEFAULT = 500;

function option(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

const MODES = ['report', 'cleanup', 'disable-preview', 'enable-preview'] as const;
type Mode = (typeof MODES)[number];

const modeArg = option('--mode') ?? 'report';
if (!MODES.includes(modeArg as Mode)) {
  console.error(`Unknown --mode "${modeArg}". Valid: ${MODES.join(', ')}`);
  process.exit(2);
}
const mode = modeArg as Mode;

const retentionDays = Number(option('--retention-days') ?? String(RETENTION_DAYS_DEFAULT));
const maxDeletes = Number(option('--max-deletes') ?? String(MAX_DELETES_DEFAULT));
if (!Number.isFinite(retentionDays) || retentionDays < 0) {
  console.error('--retention-days must be a non-negative number');
  process.exit(2);
}
if (!Number.isFinite(maxDeletes) || maxDeletes <= 0) {
  console.error('--max-deletes must be a positive number');
  process.exit(2);
}

const token = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID;
const teamId = process.env.VERCEL_TEAM_ID;
if (!token) {
  console.error('VERCEL_TOKEN is required');
  process.exit(2);
}
if (!projectId) {
  console.error('VERCEL_PROJECT_ID is required');
  process.exit(2);
}

function vercelUrl(path: string, params: Record<string, string> = {}) {
  const url = new URL(VERCEL_API + path);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  if (teamId) url.searchParams.set('teamId', teamId);
  return url;
}

async function vercelRequest(
  path: string,
  init: RequestInit = {},
  params: Record<string, string> = {}
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(vercelUrl(path, params), {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // non-JSON error bodies are fine to surface verbatim
  }
  return { status: response.status, body };
}

async function vercelJson(path: string, params: Record<string, string> = {}) {
  const { status, body } = await vercelRequest(path, {}, params);
  if (status >= 400) {
    throw new Error(
      `Vercel GET ${path} failed: HTTP ${status}: ${JSON.stringify(body).slice(0, 300)}`
    );
  }
  return body as Record<string, unknown>;
}

async function fetchAllDeployments(): Promise<Deployment[]> {
  const all: Deployment[] = [];
  let until = Date.now();
  for (let page = 0; page < 100; page++) {
    const payload = await vercelJson('/v6/deployments', {
      projectId,
      limit: '100',
      until: String(until),
    });
    const batch = (payload.deployments ?? []) as Deployment[];
    all.push(...batch);
    if (batch.length < 100) return all;
    until = batch[batch.length - 1].createdAt - 1;
  }
  console.error(`Deployment listing hit the 100-page safety cap after ${all.length} rows`);
  return all;
}

function kindOf(d: Deployment): string {
  if (d.target === 'production' || d.target === 'PRODUCTION') return 'production';
  if (d.target === 'preview' || d.target === null || d.target === undefined) return 'preview';
  return String(d.target);
}

function isAliased(d: Deployment): boolean {
  return Boolean(d.aliasAssigned) || (Array.isArray(d.alias) && d.alias.length > 0);
}

function protectSet(deployments: Deployment[], retentionCutoff: number): Set<string> {
  const protectedUids = new Set<string>();
  // aliased deployments serve traffic: never delete
  for (const d of deployments) if (isAliased(d)) protectedUids.add(d.uid);
  // 3 most recent production deployments
  const production = deployments
    .filter((d) => kindOf(d) === 'production')
    .sort((a, b) => b.createdAt - a.createdAt);
  for (const d of production.slice(0, 3)) protectedUids.add(d.uid);
  // 3 most recent deployments of any type
  const recent = [...deployments].sort((a, b) => b.createdAt - a.createdAt);
  for (const d of recent.slice(0, 3)) protectedUids.add(d.uid);
  // anything inside the retention window
  for (const d of deployments) if (d.createdAt >= retentionCutoff) protectedUids.add(d.uid);
  return protectedUids;
}

const summaryLines: string[] = [];
function summary(line: string) {
  summaryLines.push(line);
  console.log(line);
}

async function flushSummary() {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (!target) return;
  const { appendFile } = await import('node:fs/promises');
  await appendFile(target, summaryLines.join('\n') + '\n');
}

function fmtDate(ms: number): string {
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 16) + 'Z';
}

async function runReport(cleanupMode: boolean) {
  const deployments = await fetchAllDeployments();
  const cutoff = Date.now() - retentionDays * 86_400_000;
  const protectedUids = protectSet(deployments, cutoff);

  const byKind = new Map<string, number>();
  for (const d of deployments) byKind.set(kindOf(d), (byKind.get(kindOf(d)) ?? 0) + 1);

  const deletableStates = new Set(['READY', 'ERROR', 'CANCELED']);
  const victims = deployments
    .filter((d) => !protectedUids.has(d.uid))
    .filter((d) => d.createdAt < cutoff)
    .filter((d) => !d.readyState || deletableStates.has(d.readyState))
    .sort((a, b) => a.createdAt - b.createdAt);

  summary(`## Vercel deployment storage ${mode} (${fmtDate(Date.now())})`);
  summary('');
  summary(`Total retained deployments: **${deployments.length}**`);
  for (const [kind, count] of [...byKind.entries()].sort()) {
    summary(`- ${kind}: ${count}`);
  }
  summary(`Protected by policy: ${protectedUids.size}`);
  summary(`Retention window: ${retentionDays} days (cutoff ${fmtDate(cutoff)})`);
  summary(
    cleanupMode
      ? `Deletable candidates: **${victims.length}**`
      : `Older than cutoff (unprotected): ${victims.length}`
  );
  summary('');

  const rows: SummaryRow[] = victims.slice(-60).map((d) => ({
    uid: d.uid,
    created: fmtDate(d.createdAt),
    kind: kindOf(d),
    note: isAliased(d) ? 'aliased!' : (d.readyState ?? 'unknown'),
  }));
  if (rows.length > 0) {
    summary(
      `<details><summary>${cleanupMode ? 'Delete list' : 'Old unprotected deployments'} (showing up to 60, newest last)</summary>`
    );
    summary('');
    summary('| uid | created | kind | state |');
    summary('|---|---|---|---|');
    for (const r of rows) summary(`| ${r.uid} | ${r.created} | ${r.kind} | ${r.note} |`);
    summary('');
    summary('</details>');
  }

  if (!cleanupMode) {
    await flushSummary();
    return;
  }

  const bounded = victims.slice(0, maxDeletes);
  let deleted = 0;
  let failed = 0;
  for (const v of bounded) {
    const { status, body } = await vercelRequest(`/v13/deployments/${v.uid}`, { method: 'DELETE' });
    if (status === 200 || status === 204) {
      deleted++;
    } else {
      failed++;
      console.error(
        `DELETE ${v.uid} failed: HTTP ${status}: ${JSON.stringify(body).slice(0, 200)}`
      );
    }
  }
  summary('');
  summary(
    `Cleanup result: deleted **${deleted}**, failed ${failed} (submitted ${bounded.length} of ${victims.length} candidates, cap ${maxDeletes}).`
  );
  summary(
    'Deleted deployments stay restorable for 30 days: Settings → Security → Recently Deleted.'
  );
  await flushSummary();
}

async function findEnv(key: string) {
  const payload = await vercelJson(`/v9/projects/${projectId}/env`);
  const envs = (payload.envs ?? []) as Array<Record<string, unknown>>;
  return envs.find((e) => e.key === key);
}

async function runDisablePreview(disable: boolean) {
  if (disable) {
    const existing = await findEnv('DEPLOYMENT_DISABLED');
    if (existing) {
      summary(
        `DEPLOYMENT_DISABLED already exists (id ${existing.id}, target ${JSON.stringify(existing.target)}) — nothing to do.`
      );
      await flushSummary();
      return;
    }
    const { status, body } = await vercelRequest(`/v9/projects/${projectId}/env`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'DEPLOYMENT_DISABLED',
        value: '1',
        type: 'encrypted',
        target: ['preview'],
      }),
    });
    if (status >= 400) {
      throw new Error(`POST env failed: HTTP ${status}: ${JSON.stringify(body).slice(0, 300)}`);
    }
    summary(
      'DEPLOYMENT_DISABLED=1 set for the preview target: git-integration preview builds are now off.'
    );
    summary('Production deploys via the release deploy hook are unaffected.');
  } else {
    const existing = await findEnv('DEPLOYMENT_DISABLED');
    if (!existing) {
      summary('DEPLOYMENT_DISABLED not set — previews are already enabled.');
      await flushSummary();
      return;
    }
    const { status, body } = await vercelRequest(`/v9/projects/${projectId}/env/${existing.id}`, {
      method: 'DELETE',
    });
    if (status >= 400) {
      throw new Error(`DELETE env failed: HTTP ${status}: ${JSON.stringify(body).slice(0, 300)}`);
    }
    summary('DEPLOYMENT_DISABLED removed: previews are enabled again.');
  }
  await flushSummary();
}

try {
  if (mode === 'report') await runReport(false);
  else if (mode === 'cleanup') await runReport(true);
  else if (mode === 'disable-preview') await runDisablePreview(true);
  else await runDisablePreview(false);
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  await flushSummary().catch(() => {});
  process.exit(1);
}
