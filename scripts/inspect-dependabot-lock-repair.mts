import { appendFileSync, readFileSync } from 'node:fs';

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

function number(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

async function githubApi(path: string, token: string): Promise<unknown> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'insight-dependabot-lock-repair',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${path} failed with ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}

function output(name: string, value: string): void {
  const destination = process.env.GITHUB_OUTPUT;
  if (!destination) throw new Error('GITHUB_OUTPUT is required');
  appendFileSync(destination, `${name}=${value}\n`);
}

async function main(): Promise<void> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const token = process.env.GH_TOKEN;
  if (!eventPath) throw new Error('GITHUB_EVENT_PATH is required');
  if (!token) throw new Error('GH_TOKEN is required');

  const event = object(JSON.parse(readFileSync(eventPath, 'utf8')) as unknown, 'event');
  const repository = object(event.repository, 'event.repository');
  const repositoryName = string(repository.full_name, 'event.repository.full_name');
  const workflowRun = object(event.workflow_run, 'event.workflow_run');
  const actor = object(workflowRun.actor, 'event.workflow_run.actor');

  if (
    workflowRun.name !== 'Quality Gate' ||
    workflowRun.event !== 'pull_request' ||
    workflowRun.conclusion !== 'failure' ||
    actor.login !== 'dependabot[bot]'
  ) {
    throw new Error('Refusing a lock repair outside a failed Dependabot Quality Gate');
  }

  const pullRequests = workflowRun.pull_requests;
  if (!Array.isArray(pullRequests) || pullRequests.length !== 1) {
    throw new Error('The failed workflow must identify exactly one pull request');
  }
  const pullNumber = number(object(pullRequests[0], 'pull request').number, 'pull request number');
  const pull = object(
    await githubApi(`/repos/${repositoryName}/pulls/${pullNumber}`, token),
    'pull request'
  );
  const user = object(pull.user, 'pull request user');
  const base = object(pull.base, 'pull request base');
  const head = object(pull.head, 'pull request head');
  const headRepository = object(head.repo, 'pull request head repository');
  const headBranch = string(head.ref, 'pull request head branch');
  const headSha = string(head.sha, 'pull request head SHA');

  if (
    pull.state !== 'open' ||
    user.login !== 'dependabot[bot]' ||
    base.ref !== 'main' ||
    headRepository.full_name !== repositoryName ||
    !headBranch.startsWith('dependabot/npm_and_yarn/') ||
    headSha !== workflowRun.head_sha ||
    !/^[0-9a-f]{40}$/.test(headSha)
  ) {
    throw new Error('Pull request identity, repository, base, branch, or SHA is not eligible');
  }

  const changedFiles = number(pull.changed_files, 'pull request changed_files');
  const filesValue = await githubApi(
    `/repos/${repositoryName}/pulls/${pullNumber}/files?per_page=100`,
    token
  );
  if (!Array.isArray(filesValue) || filesValue.length !== changedFiles) {
    throw new Error('Unable to inspect every changed pull-request file');
  }
  const allowedFiles = new Set(['package.json', 'package-lock.json']);
  const filenames = filesValue.map((entry, index) =>
    string(object(entry, `pull request file ${index}`).filename, 'filename')
  );
  if (filenames.length === 0 || filenames.some((filename) => !allowedFiles.has(filename))) {
    throw new Error(`Refusing to repair unexpected files: ${filenames.join(', ')}`);
  }

  output('branch', headBranch);
  output('pr_number', String(pullNumber));
  output('sha', headSha);
  console.log(`Dependabot PR #${pullNumber} is eligible at ${headSha}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
