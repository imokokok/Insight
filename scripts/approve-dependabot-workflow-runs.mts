const requiredWorkflows = ['Quality Gate', 'CodeQL'] as const;

type JsonObject = Record<string, unknown>;

function object(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonObject;
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

async function githubApi(path: string, token: string, method = 'GET'): Promise<unknown> {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'insight-dependabot-check-approval',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${method} ${path} failed with ${response.status}`);
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') return null;
  return response.json() as Promise<unknown>;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main(): Promise<void> {
  const token = process.env.GH_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const sha = process.env.EXPECTED_SHA;
  if (!token) throw new Error('GH_TOKEN is required');
  if (!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error('GITHUB_REPOSITORY must be an owner/repository pair');
  }
  if (!sha || !/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error('EXPECTED_SHA must be a full commit SHA');
  }

  const approved = new Set<string>();
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const payload = object(
      await githubApi(
        `/repos/${repository}/actions/runs?head_sha=${sha}&event=pull_request&per_page=100`,
        token
      ),
      'workflow runs response'
    );
    if (!Array.isArray(payload.workflow_runs)) {
      throw new Error('workflow_runs must be an array');
    }

    const runs = payload.workflow_runs.map((value, index) =>
      object(value, `workflow run ${index}`)
    );
    let allFound = true;
    for (const workflowName of requiredWorkflows) {
      const run = runs.find((candidate) => candidate.name === workflowName);
      if (!run) {
        allFound = false;
        continue;
      }
      const runId = run.id;
      if (typeof runId !== 'number' || !Number.isSafeInteger(runId) || runId <= 0) {
        throw new Error(`${workflowName} run has an invalid id`);
      }
      const status = string(run.status, `${workflowName} status`);
      const conclusion = run.conclusion;
      if (
        status === 'completed' &&
        conclusion === 'action_required' &&
        !approved.has(workflowName)
      ) {
        await githubApi(`/repos/${repository}/actions/runs/${runId}/approve`, token, 'POST');
        approved.add(workflowName);
        console.log(`Approved native ${workflowName} run ${runId} for ${sha}`);
      } else if (conclusion === 'action_required' && !approved.has(workflowName)) {
        allFound = false;
      }
    }

    if (allFound) {
      console.log(`Native pull-request checks are running for ${sha}`);
      return;
    }
    await wait(2_000);
  }

  throw new Error(`Timed out waiting for native pull-request checks on ${sha}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
