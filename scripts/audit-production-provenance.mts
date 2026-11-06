/**
 * Audit production deployments for evidence-gate bypasses.
 *
 * The release workflow is the only sanctioned path to production. This audit
 * looks for production deployments that did not come from the deploy hook,
 * checks whether their commit is reachable from main and whether the build
 * used a dirty tree, then files one issue per deployment.
 *
 * Usage:
 *   node scripts/audit-production-provenance.mts
 *   node scripts/audit-production-provenance.mts --dry-run --since 2026-10-27T00:00:00Z --fail-on-violation
 */

type Deployment = {
  uid?: string;
  url?: string;
  createdAt?: number;
  readyState?: string;
  source?: string;
  meta?: Record<string, unknown>;
};

type Violation = {
  id: string;
  createdAt: string;
  url: string;
  commitSha: string | null;
  reasons: string[];
  highRisk: boolean;
};

const VERCEL_API = 'https://api.vercel.com';
const ISSUE_LABEL = 'deploy-provenance';

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

const dryRun = process.argv.includes('--dry-run');
const failOnViolation = process.argv.includes('--fail-on-violation');
const lookbackHours = Number(option('--lookback-hours') ?? '2');
const sinceOption = option('--since');
const untilOption = option('--until');

const since = sinceOption
  ? new Date(sinceOption)
  : new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
const until = untilOption ? new Date(untilOption) : new Date();
if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime())) {
  throw new Error('--since and --until must be ISO timestamps');
}

const token = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID;
const teamId = process.env.VERCEL_TEAM_ID;
if (!token) throw new Error('VERCEL_TOKEN is required');
if (!projectId) throw new Error('VERCEL_PROJECT_ID is required');

const githubToken = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY ?? 'imokokok/Insight';

function vercelUrl(path: string) {
  const url = new URL(VERCEL_API + path);
  if (teamId) url.searchParams.set('teamId', teamId);
  return url;
}

async function vercel(path: string) {
  const response = await fetch(vercelUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Vercel ${path} failed: HTTP ${response.status}`);
  return (await response.json()) as Record<string, unknown>;
}

async function githubApi(url: string, init?: RequestInit) {
  if (!githubToken) throw new Error('GITHUB_TOKEN is required to verify commits and file issues');
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${githubToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

async function commitReachableFromMain(commitSha: string) {
  const { status, body } = await githubApi(
    `https://api.github.com/repos/${repository}/compare/main...${commitSha}`
  );
  if (status === 404) return { onMain: false, detail: 'commit not found' };
  if (status !== 200) return { onMain: false, detail: `GitHub compare failed: HTTP ${status}` };
  const state = String(body.status ?? 'unknown');
  return {
    onMain: state === 'behind' || state === 'identical',
    detail: `compare status ${state}`,
  };
}

let labelReady = false;

async function ensureLabel() {
  const { status } = await githubApi(
    `https://api.github.com/repos/${repository}/labels/${encodeURIComponent(ISSUE_LABEL)}`
  );
  if (status === 200) return true;
  if (status !== 404) return false;
  const created = await githubApi(`https://api.github.com/repos/${repository}/labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: ISSUE_LABEL,
      color: 'b60205',
      description: 'Production deployment bypassed the release gate',
    }),
  });
  return created.status === 201;
}

async function labelAvailable() {
  if (!labelReady) labelReady = await ensureLabel();
  return labelReady;
}

async function existingIssue(deploymentId: string) {
  if (dryRun) return false;
  const query = [`repo:${repository}`, 'is:issue', 'in:title', `"${deploymentId}"`].join(' ');
  const { status, body } = await githubApi(
    `https://api.github.com/search/issues?q=${encodeURIComponent(query)}`
  );
  if (status !== 200) throw new Error(`GitHub issue search failed: HTTP ${status}`);
  return Number(body.total_count ?? 0) > 0;
}

async function fileIssue(violation: Violation) {
  if (await existingIssue(violation.id)) return false;
  const title = `[${ISSUE_LABEL}] ${violation.id} bypassed the release gate`;
  const body = [
    `Production deployment \`${violation.id}\` did not come from the deploy hook.`,
    '',
    `- Created: ${violation.createdAt}`,
    `- URL: ${violation.url}`,
    `- Commit: ${violation.commitSha ?? 'missing'}`,
    `- Reasons: ${violation.reasons.join('; ')}`,
    `- Risk: ${violation.highRisk ? 'high' : 'review'}`,
    '',
    'Required follow-up: record the emergency reason, verify the commit is on main and the tree was clean, then confirm the next release supersedes this deployment. Do not repeat a CLI production deploy without an incident record.',
    '',
    '_Filed automatically by production-provenance-audit._',
  ].join('\n');
  const { status } = await githubApi(`https://api.github.com/repos/${repository}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      body,
      labels: (await labelAvailable()) ? [ISSUE_LABEL] : [],
    }),
  });
  if (status !== 201) throw new Error(`GitHub issue creation failed: HTTP ${status}`);
  return true;
}

const deployments: Deployment[] = [];
let cursor: number | null = null;
for (let page = 0; page < 20; page += 1) {
  const query = [
    `/v6/deployments?projectId=${encodeURIComponent(projectId)}`,
    '&target=production',
    '&limit=100',
    cursor ? `&until=${cursor}` : '',
  ].join('');
  const body = await vercel(query);
  const batch = Array.isArray(body.deployments) ? (body.deployments as Deployment[]) : [];
  if (batch.length === 0) break;
  deployments.push(...batch);
  const oldest = Math.min(...batch.map((deployment) => Number(deployment.createdAt ?? 0)));
  if (oldest <= since.getTime() || oldest === cursor) break;
  cursor = oldest;
}

const unique = new Map<string, Deployment>();
for (const deployment of deployments) unique.set(String(deployment.uid ?? ''), deployment);

const violations: Violation[] = [];
let scanned = 0;

for (const deployment of unique.values()) {
  const createdAt = Number(deployment.createdAt ?? 0);
  if (createdAt < since.getTime() || createdAt > until.getTime()) continue;
  scanned += 1;
  const meta = deployment.meta ?? {};
  if (typeof meta.deployHookId === 'string' && meta.deployHookId.length > 0) continue;

  const id = String(deployment.uid ?? 'unknown');
  const commitSha =
    typeof meta.gitCommitSha === 'string' && meta.gitCommitSha.length > 0
      ? meta.gitCommitSha
      : null;
  const reasons = ['no deploy hook'];
  if (!commitSha) reasons.push('missing commit SHA');
  if (meta.gitDirty === '1' || meta.gitDirty === true) reasons.push('built from a dirty tree');

  let onMain = false;
  if (commitSha) {
    const reachable = await commitReachableFromMain(commitSha);
    onMain = reachable.onMain;
    if (!onMain) reasons.push(`commit not on main (${reachable.detail})`);
  }

  violations.push({
    id,
    createdAt: new Date(createdAt).toISOString(),
    url: deployment.url ? `https://${deployment.url}` : '(no url)',
    commitSha,
    reasons,
    highRisk: !commitSha || !onMain || meta.gitDirty === '1' || meta.gitDirty === true,
  });
}

let filed = 0;
for (const violation of violations) {
  const line = JSON.stringify(violation);
  if (dryRun) {
    console.log(line);
  } else {
    const created = await fileIssue(violation);
    filed += created ? 1 : 0;
    console.log(
      `${created ? 'filed' : 'already filed'} ${violation.id} (${violation.reasons.join('; ')})`
    );
  }
}

console.log(
  `audited ${scanned} production deployments between ${since.toISOString()} and ${until.toISOString()}; violations=${violations.length} highRisk=${violations.filter((v) => v.highRisk).length} filed=${filed}`
);

if (failOnViolation && violations.length > 0) {
  process.exitCode = 1;
}
