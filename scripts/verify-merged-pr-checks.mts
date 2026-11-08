/**
 * Fail-closed deploy gate for the production release job.
 *
 * Branch protection already requires `validate`, `smoke`, and `analyze` before a
 * pull request can reach `main`, so the post-merge suite is a canary and does not
 * need to sit in front of the deploy. This step replaces that serial wait with
 * evidence: it proves that the exact commit being released is the merge commit of
 * a pull request whose required checks are all green.
 *
 * A check run only counts as evidence when it is attached to the pull request's
 * head commit AND was produced by this repository's own workflow file. An app id
 * and a check name are not unique enough: any workflow in this repository can
 * publish a check run with the same name, so the workflow run's path, event,
 * repository and head SHA are verified as well. The newest run wins, so a failed
 * re-run cannot be hidden behind an earlier success.
 *
 * There is no "continue anyway" branch. Missing evidence, a mismatched SHA, or a
 * non-successful required check aborts the deploy before the Vercel hook fires.
 */

const REQUIRED_CHECKS = [
  { name: 'validate', workflowPath: '.github/workflows/ci.yml' },
  { name: 'smoke', workflowPath: '.github/workflows/ci.yml' },
  { name: 'analyze', workflowPath: '.github/workflows/codeql.yml' },
] as const;
const REQUIRED_APP_ID = 15368; // GitHub Actions

const apiBase = process.env.GITHUB_API_URL ?? 'https://api.github.com';
const repository = process.env.GITHUB_REPOSITORY;
const deployedSha = process.env.GITHUB_SHA;
const token = process.env.GITHUB_TOKEN;

if (!repository || !deployedSha || !token) {
  fail('GITHUB_REPOSITORY, GITHUB_SHA, and GITHUB_TOKEN must be set');
}

function fail(message: string): never {
  console.error(`::error::${message}`);
  process.exit(1);
}

async function api(path: string): Promise<any> {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'user-agent': 'insight-deploy-gate',
      'x-github-api-version': '2022-11-28',
    },
  });
  if (!response.ok) {
    fail(`GET ${path} failed with ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

/** Resolve the Actions run behind a check run without trusting any other field. */
function actionsRunId(detailsUrl: unknown): string | null {
  if (typeof detailsUrl !== 'string') return null;
  try {
    const match = new URL(detailsUrl).pathname.match(/\/actions\/runs\/(\d+)(?:\/|$)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

const workflowRunCache = new Map<string, any>();
async function workflowRun(runId: string): Promise<any> {
  const cached = workflowRunCache.get(runId);
  if (cached) return cached;
  const run = await api(`/repos/${repository}/actions/runs/${runId}`);
  workflowRunCache.set(runId, run);
  return run;
}

function startedAt(run: any): number {
  const value = Date.parse(run.started_at ?? run.created_at ?? '');
  return Number.isFinite(value) ? value : 0;
}

const pulls: any[] = await api(`/repos/${repository}/commits/${deployedSha}/pulls?per_page=100`);
const candidates = pulls.filter(
  (pull) =>
    pull.state === 'closed' &&
    pull.merged_at != null &&
    pull.merge_commit_sha === deployedSha &&
    pull.base?.ref === 'main'
);

if (candidates.length !== 1) {
  fail(
    `${deployedSha} must be the merge commit of exactly one merged main pull request; found ${candidates.length}. ` +
      'Refusing to deploy a commit that was never validated by the pull-request gate.'
  );
}

const pull = candidates[0];
const headSha: string = pull.head?.sha;
if (typeof headSha !== 'string' || !/^[0-9a-f]{40}$/.test(headSha)) {
  fail(
    `Pull request #${pull.number} has no resolvable head SHA; cannot resolve its required checks`
  );
}

const failures: string[] = [];
for (const check of REQUIRED_CHECKS) {
  const body = await api(
    `/repos/${repository}/commits/${headSha}/check-runs` +
      `?check_name=${encodeURIComponent(check.name)}&filter=all&per_page=100`
  );
  // GitHub keeps every run for a SHA, including re-runs. Ordering by start time
  // makes the newest attempt authoritative: a failure that came after a success
  // must still block the deploy.
  const runs: any[] = (body.check_runs ?? [])
    .filter((run: any) => run.app?.id === REQUIRED_APP_ID)
    .sort(
      (left: any, right: any) =>
        startedAt(right) - startedAt(left) || (right.id ?? 0) - (left.id ?? 0)
    );

  const observed: string[] = [];
  let latestExpected: any = null;
  for (const run of runs) {
    const runId = actionsRunId(run.details_url);
    if (!runId) {
      observed.push(`${check.name}: check run ${run.id ?? 'unknown'} has no Actions run URL`);
      continue;
    }
    const workflow = await workflowRun(runId);
    const source = `${workflow.path ?? 'unknown-workflow'}@${runId}`;
    observed.push(`${source}:${run.status ?? 'unknown'}/${run.conclusion ?? 'none'}`);
    const sameRepository =
      typeof workflow.repository?.full_name === 'string' &&
      workflow.repository.full_name.toLowerCase() === repository.toLowerCase();
    if (
      workflow.path === check.workflowPath &&
      workflow.event === 'pull_request' &&
      workflow.head_sha === headSha &&
      sameRepository
    ) {
      latestExpected = { run, workflow, source };
      break;
    }
  }

  if (!latestExpected) {
    failures.push(
      `${check.name}: no check run from ${check.workflowPath} on ${headSha}` +
        ` (observed: ${observed.length > 0 ? observed.join(', ') : 'none'})`
    );
    continue;
  }

  const { run, workflow, source } = latestExpected;
  if (run.status !== 'completed' || run.conclusion !== 'success') {
    failures.push(
      `${check.name}: newest run from ${source} is ${run.status ?? 'unknown'}/${run.conclusion ?? 'none'}` +
        ` instead of completed/success`
    );
    continue;
  }
  if (workflow.status !== 'completed' || workflow.conclusion !== 'success') {
    failures.push(
      `${check.name}: workflow run ${workflow.id} is ${workflow.status ?? 'unknown'}/${workflow.conclusion ?? 'none'}`
    );
  }
}

if (failures.length > 0) {
  fail(
    `Pull request #${pull.number} does not have all required checks green on ${headSha}: ` +
      `${failures.join('; ')}. Refusing to deploy.`
  );
}

console.log(
  `Deploy gate OK: ${deployedSha} is the last rebased commit of PR #${pull.number}, ` +
    `whose head ${headSha} passed ${REQUIRED_CHECKS.map((check) => check.name).join(', ')} ` +
    `from ${REQUIRED_CHECKS.map((check) => check.workflowPath).join(', ')}.`
);
