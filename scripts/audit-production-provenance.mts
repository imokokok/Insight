/**
 * Audit recent Cloudflare Worker versions for missing or off-main release tags.
 *
 * GitHub Actions stamps every production version with the full commit SHA and
 * the workflow run URL. This audit checks those annotations and files one
 * deduplicated issue for each version that cannot be tied to a main commit.
 * The Worker Versions API does not attest which client uploaded a version, so
 * this is a provenance signal and review queue, not a cryptographic deploy lock.
 *
 * Usage:
 *   node --import tsx scripts/audit-production-provenance.mts
 *   node --import tsx scripts/audit-production-provenance.mts --dry-run --since 2026-10-27T00:00:00Z
 */

type WorkerVersion = {
  id?: string;
  created_on?: string;
  annotations?: Record<string, unknown>;
  urls?: unknown;
};

type Violation = {
  id: string;
  createdAt: string;
  url: string;
  commitSha: string | null;
  reasons: string[];
  highRisk: boolean;
};

const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';
const ISSUE_LABEL = 'deploy-provenance';

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const dryRun = process.argv.includes('--dry-run');
const lookbackHours = Number(option('--lookback-hours') ?? '2');
const sinceOption = option('--since');
const untilOption = option('--until');
if (!Number.isFinite(lookbackHours) || lookbackHours <= 0) {
  throw new Error('--lookback-hours must be a positive number');
}

const since = sinceOption
  ? new Date(sinceOption)
  : new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
const until = untilOption ? new Date(untilOption) : new Date();
if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime())) {
  throw new Error('--since and --until must be ISO timestamps');
}

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const workerName = process.env.CLOUDFLARE_WORKER_NAME ?? 'insight-web';
if (!token) throw new Error('CLOUDFLARE_API_TOKEN is required');
if (!accountId || !/^[0-9a-f]{32}$/i.test(accountId)) {
  throw new Error('CLOUDFLARE_ACCOUNT_ID must be a 32-character hex identifier');
}
if (!/^[a-z0-9-]{1,63}$/i.test(workerName)) throw new Error('Invalid CLOUDFLARE_WORKER_NAME');

const githubToken = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY ?? 'imokokok/Insight';

async function cloudflareVersions(page: number) {
  const url = new URL(
    `${CLOUDFLARE_API}/accounts/${accountId}/workers/workers/${encodeURIComponent(workerName)}/versions`
  );
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', '100');
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  const payload = object(await response.json().catch(() => null));
  if (!response.ok || payload?.success !== true || !Array.isArray(payload.result)) {
    throw new Error(`Cloudflare Worker Versions API failed: HTTP ${response.status}`);
  }
  return payload.result.filter((entry): entry is WorkerVersion => object(entry) !== null);
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
  return { status: response.status, body: object(await response.json().catch(() => null)) ?? {} };
}

async function commitReachableFromMain(commitSha: string) {
  const { status, body } = await githubApi(
    `https://api.github.com/repos/${repository}/compare/main...${commitSha}`
  );
  if (status === 404) return { onMain: false, detail: 'commit not found' };
  if (status !== 200) return { onMain: false, detail: `GitHub compare failed: HTTP ${status}` };
  const state = String(body.status ?? 'unknown');
  return { onMain: state === 'behind' || state === 'identical', detail: `compare status ${state}` };
}

async function existingIssue(versionId: string) {
  if (dryRun) return false;
  const query = [`repo:${repository}`, 'is:issue', 'in:title', `"${versionId}"`].join(' ');
  const { status, body } = await githubApi(
    `https://api.github.com/search/issues?q=${encodeURIComponent(query)}`
  );
  if (status !== 200) throw new Error(`GitHub issue search failed: HTTP ${status}`);
  return Number(body.total_count ?? 0) > 0;
}

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
      description: 'Production Worker version needs release provenance review',
    }),
  });
  return created.status === 201;
}

async function fileIssue(violation: Violation) {
  if (await existingIssue(violation.id)) return false;
  const title = `[${ISSUE_LABEL}] Worker version ${violation.id} needs review`;
  const body = [
    `Cloudflare Worker version \`${violation.id}\` could not be tied to a reviewed mainline release.`,
    '',
    `- Created: ${violation.createdAt}`,
    `- URL: ${violation.url}`,
    `- Commit tag: ${violation.commitSha ?? 'missing or invalid'}`,
    `- Reasons: ${violation.reasons.join('; ')}`,
    `- Risk: ${violation.highRisk ? 'high' : 'review'}`,
    '',
    'Required follow-up: verify the GitHub Actions run and deployed Worker version, record the incident reason, and confirm the next gated release supersedes it. The Cloudflare version tag is an audit signal, not a cryptographic attestation of the uploader.',
    '',
    '_Filed automatically by production-provenance-audit._',
  ].join('\n');
  const { status } = await githubApi(`https://api.github.com/repos/${repository}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      body,
      labels: (await ensureLabel()) ? [ISSUE_LABEL] : [],
    }),
  });
  if (status !== 201) throw new Error(`GitHub issue creation failed: HTTP ${status}`);
  return true;
}

const versions: WorkerVersion[] = [];
for (let page = 1; page <= 20; page += 1) {
  const batch = await cloudflareVersions(page);
  if (batch.length === 0) break;
  versions.push(...batch);
  const oldest = Math.min(...batch.map((version) => Date.parse(version.created_on ?? '')));
  if (Number.isFinite(oldest) && oldest <= since.getTime()) break;
}

const violations: Violation[] = [];
let scanned = 0;
for (const version of versions) {
  const createdAtMs = Date.parse(version.created_on ?? '');
  if (
    !Number.isFinite(createdAtMs) ||
    createdAtMs < since.getTime() ||
    createdAtMs > until.getTime()
  ) {
    continue;
  }
  scanned += 1;
  const annotations = object(version.annotations) ?? {};
  const tag = typeof annotations['workers/tag'] === 'string' ? annotations['workers/tag'] : '';
  const commitSha = /^[0-9a-f]{40}$/i.test(tag) ? tag : null;
  const versionId = typeof version.id === 'string' && version.id ? version.id : 'unknown';
  const reasons: string[] = [];
  if (!commitSha) reasons.push('missing full commit SHA tag');

  let onMain = false;
  if (commitSha) {
    const reachable = await commitReachableFromMain(commitSha);
    onMain = reachable.onMain;
    if (!onMain) reasons.push(`commit not on main (${reachable.detail})`);
  }
  if (reasons.length === 0) continue;

  const urls = Array.isArray(version.urls) ? version.urls : [];
  const url =
    urls.find((value): value is string => typeof value === 'string') ?? '(no routable URL)';
  violations.push({
    id: versionId,
    createdAt: new Date(createdAtMs).toISOString(),
    url,
    commitSha,
    reasons,
    highRisk: !commitSha || !onMain,
  });
}

let filed = 0;
for (const violation of violations) {
  if (dryRun) console.log(JSON.stringify(violation));
  else {
    const created = await fileIssue(violation);
    filed += created ? 1 : 0;
    console.log(
      `${created ? 'filed' : 'already filed'} ${violation.id} (${violation.reasons.join('; ')})`
    );
  }
}

console.log(
  `scanned=${scanned} violations=${violations.length} issues_filed=${filed} dry_run=${dryRun}`
);
