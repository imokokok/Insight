/**
 * Merge-train substitute for GitHub's merge queue.
 *
 * GitHub only offers merge queues to public repositories owned by an
 * organization. `imokokok/Insight` is user-owned, so the merge queue UI and the
 * `merge_queue` ruleset are unavailable (the API rejects the rule with
 * "Invalid rule 'merge_queue'").
 *
 * With `strict` branch protection enabled, GitHub refuses to merge a pull
 * request whose branch is behind `main`. This script restores the missing half:
 * once main advances, it updates the oldest auto-merge-enabled pull request onto
 * the new base. The updated branch triggers the normal required checks and
 * auto-merge only proceeds when they pass, so every rebase merge is tested
 * against the main it lands on.
 *
 * It deliberately updates at most one pull request per invocation. Runs are
 * serialized by the workflow's concurrency group, which keeps the train ordered
 * instead of flooding CI with simultaneous branch updates.
 */

const apiBase = process.env.GITHUB_API_URL ?? 'https://api.github.com';
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const dryRun = process.env.DRY_RUN === '1';
const trustedAssociations = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);

if (!repository || !token) {
  fail('GITHUB_REPOSITORY and GITHUB_TOKEN must be set');
}

function fail(message: string): never {
  console.error(`::error::${message}`);
  process.exit(1);
}

async function request(path: string, init?: RequestInit) {
  return fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'insight-merge-train',
      'x-github-api-version': '2022-11-28',
      ...(init?.headers ?? {}),
    },
  });
}

async function api(path: string, init?: RequestInit): Promise<any> {
  const response = await request(path, init);
  const body = await response.text();
  if (response.status !== 200) {
    fail(`GitHub ${init?.method ?? 'GET'} ${path} failed with ${response.status}: ${body}`);
  }
  return body.length > 0 ? JSON.parse(body) : null;
}

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * A branch update performed with GITHUB_TOKEN is attributed to
 * `github-actions[bot]`, so GitHub parks the resulting `pull_request` runs in
 * `action_required` until a maintainer approves them. Auto-merge cannot start
 * from that state. The train approves the runs it just created, and only those:
 * the SHA is the update it performed on a trusted, same-repository PR.
 */
async function approvePendingRuns(headSha: string): Promise<number> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const body = await api(`/repos/${repository}/actions/runs?head_sha=${headSha}&per_page=30`);
    const pending: any[] = (body.workflow_runs ?? []).filter(
      (run: any) => run.conclusion === 'action_required'
    );
    if (pending.length > 0) {
      let approved = 0;
      for (const run of pending) {
        const response = await request(`/repos/${repository}/actions/runs/${run.id}/approve`, {
          method: 'POST',
        });
        if (response.status !== 201 && response.status !== 202) {
          fail(
            `Approving run ${run.id} for ${headSha} failed with ${response.status}: ${await response.text()}`
          );
        }
        approved += 1;
        console.log(
          `Merge train: approved ${run.name ?? 'workflow'} run ${run.id} for ${headSha}.`
        );
      }
      return approved;
    }
    await sleep(2000);
  }
  console.log(`Merge train: no run required approval for ${headSha}.`);
  return 0;
}

async function waitForNewHead(prNumber: number, previousHead: string): Promise<string | null> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const detail = await api(`/repos/${repository}/pulls/${prNumber}`);
    if (detail.head?.sha !== previousHead) return detail.head?.sha ?? null;
    await sleep(2000);
  }
  return null;
}

const pulls: any[] = await api(
  `/repos/${repository}/pulls?state=open&base=main&sort=created&direction=asc&per_page=100`
);

const queue = pulls
  .filter((pull) => !pull.draft)
  .filter((pull) => pull.auto_merge != null)
  .filter((pull) => trustedAssociations.has(pull.author_association))
  .filter(
    (pull) =>
      typeof pull.head?.repo?.full_name === 'string' &&
      pull.head.repo.full_name.toLowerCase() === repository.toLowerCase()
  );

if (queue.length === 0) {
  console.log('Merge train: no auto-merge pull request is waiting.');
  process.exit(0);
}

for (const pull of queue) {
  const detail = await api(`/repos/${repository}/pulls/${pull.number}`);
  const state = detail.mergeable_state;
  if (state === 'unknown') {
    console.log(
      `Merge train: #${pull.number} has no computed mergeability yet; leaving it queued.`
    );
    process.exit(0);
  }
  if (state !== 'behind') continue;

  console.log(
    `Merge train: updating #${pull.number} (created ${pull.created_at}) from ${detail.head.sha} onto current main.`
  );
  if (dryRun) {
    console.log('Merge train: DRY_RUN=1, no branch update sent.');
    process.exit(0);
  }

  const response = await request(`/repos/${repository}/pulls/${pull.number}/update-branch`, {
    method: 'PUT',
    body: JSON.stringify({ expected_head_sha: detail.head.sha }),
  });
  if (response.status === 202) {
    console.log(`Merge train: #${pull.number} updated; waiting for the new head to run checks.`);
    const newHead = await waitForNewHead(pull.number, detail.head.sha);
    if (!newHead) {
      fail(`#${pull.number} was updated but the new head SHA was not observable within 30s`);
    }
    const approved = await approvePendingRuns(newHead);
    console.log(
      `Merge train: #${pull.number} is at ${newHead}; approved ${approved} pending run(s); ` +
        'required checks will gate auto-merge.'
    );
    process.exit(0);
  }
  if (response.status === 422) {
    // Expected-head mismatch means another actor updated the branch first, and
    // a conflict means the author must resolve it; neither is a train failure.
    console.log(`Merge train: #${pull.number} was not updated: ${await response.text()}`);
    process.exit(0);
  }
  fail(
    `GitHub PUT /pulls/${pull.number}/update-branch failed with ${response.status}: ${await response.text()}`
  );
}

console.log('Merge train: every queued pull request is already up to date with main.');
