/**
 * Fail-closed deploy gate for the production release job.
 *
 * Branch protection already requires `validate`, `smoke`, and `analyze` before a
 * pull request can reach `main`, so the post-merge suite is a canary and does not
 * need to sit in front of the deploy. This step replaces that serial wait with
 * evidence: it proves that the exact commit being released is the merge commit of
 * a pull request whose required checks are all green.
 *
 * There is no "continue anyway" branch. Missing evidence, a mismatched SHA, or a
 * non-successful required check aborts the deploy before the Vercel hook fires.
 */

const REQUIRED_CHECKS = ['validate', 'smoke', 'analyze'] as const;
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
if (!headSha) {
  fail(`Pull request #${pull.number} has no head SHA; cannot resolve its required checks`);
}

const failures: string[] = [];
for (const name of REQUIRED_CHECKS) {
  const body = await api(
    `/repos/${repository}/commits/${headSha}/check-runs?check_name=${encodeURIComponent(name)}&filter=latest&per_page=10`
  );
  const runs: any[] = body.check_runs ?? [];
  const successful = runs.some(
    (run) => run.app?.id === REQUIRED_APP_ID && run.conclusion === 'success'
  );
  if (!successful) {
    const observed = runs.map((run) => `${run.app?.slug ?? 'unknown'}:${run.conclusion ?? run.status}`);
    failures.push(`${name} (observed: ${observed.length > 0 ? observed.join(', ') : 'none'})`);
  }
}

if (failures.length > 0) {
  fail(
    `Pull request #${pull.number} does not have all required checks green on ${headSha}: ` +
      `${failures.join('; ')}. Refusing to deploy.`
  );
}

console.log(
  `Deploy gate OK: ${deployedSha} is the squash merge of PR #${pull.number}, ` +
    `whose head ${headSha} passed ${REQUIRED_CHECKS.join(', ')}.`
);
