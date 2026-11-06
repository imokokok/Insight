#!/usr/bin/env node
/**
 * Emergency release dispatcher.
 *
 * The only sanctioned path to production is `deploy-production.yml`, which
 * releases from a clean `main` through the Vercel deploy hook. This wrapper is
 * the emergency entry point to that same workflow: it refuses anything but the
 * newest `main`, records why the normal path could not be used, and dispatches
 * `workflow_dispatch` with the expected SHA.
 *
 * It never calls the Vercel CLI. A production deployment built from a laptop is
 * always outside the release gate, and the scheduled provenance audit files an
 * issue for every such deployment.
 *
 * Usage:
 *   npm run release:emergency -- --reason "deploy hook returned HTTP 503 for 20 minutes"
 *   npm run release:emergency -- --reason "..." --dry-run
 *
 * Exit codes: 0 dispatched or dry run, 1 dispatch could not be confirmed,
 * 2 precondition failed.
 */
import { execFileSync } from 'node:child_process';

const WORKFLOW_FILE = 'deploy-production.yml';
const MIN_REASON_LENGTH = 10;

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

function fail(code, message) {
  console.error(`emergency-release: ${message}`);
  process.exit(code);
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function operatorName() {
  if (process.env.GITHUB_ACTOR) return process.env.GITHUB_ACTOR;
  try {
    return git('config', 'user.name') || 'unknown';
  } catch {
    return 'unknown';
  }
}

const dryRun = process.argv.includes('--dry-run');
const repo = option('--repo');
const reason = (option('--reason') ?? '').trim();

if (!reason) {
  fail(2, '--reason "<why the normal release path cannot be used>" is required');
}
if (reason.length < MIN_REASON_LENGTH) {
  fail(2, `--reason must be at least ${MIN_REASON_LENGTH} characters`);
}

if (git('status', '--porcelain') !== '') {
  fail(2, 'the worktree is dirty; commit or discard changes before an emergency release');
}

const requestedSha = option('--sha');
const sha = requestedSha
  ? git('rev-parse', '--verify', `${requestedSha}^{commit}`)
  : git('rev-parse', 'HEAD');

git('fetch', '--quiet', 'origin', 'main');
const mainSha = git('rev-parse', 'origin/main');
if (sha !== mainSha) {
  fail(2, `commit ${sha} is not origin/main (${mainSha}); emergency releases deploy exactly main`);
}

try {
  execFileSync('gh', ['auth', 'status'], { stdio: 'ignore' });
} catch {
  fail(2, 'gh is not authenticated; run `gh auth login` before dispatching');
}

const record = {
  channel: 'workflow_dispatch',
  workflow: WORKFLOW_FILE,
  sha,
  reason,
  operator: operatorName(),
  requestedAt: new Date().toISOString(),
};

console.log('Emergency release record (paste this into the incident issue):');
console.log(JSON.stringify(record, null, 2));
console.log('A direct `vercel deploy --prod` is never permitted; the provenance audit flags it.');

if (dryRun) {
  console.log(`dry run: would dispatch ${WORKFLOW_FILE} on main for ${sha}`);
  process.exit(0);
}

const ghArgs = ['workflow', 'run', WORKFLOW_FILE, '--ref', 'main', '-f', `expected_sha=${sha}`];
if (repo) ghArgs.push('--repo', repo);
execFileSync('gh', ghArgs, { stdio: 'inherit' });

const listArgs = [
  'run',
  'list',
  '--workflow',
  WORKFLOW_FILE,
  '--limit',
  '5',
  '--json',
  'databaseId,headSha,event,status,conclusion,url',
];
if (repo) listArgs.push('--repo', repo);

let run = null;
for (let attempt = 0; attempt < 10 && !run; attempt += 1) {
  if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 2000));
  const runs = JSON.parse(execFileSync('gh', listArgs, { encoding: 'utf8' }));
  run =
    runs.find((candidate) => candidate.headSha === sha && candidate.event === 'workflow_dispatch') ??
    null;
}

if (!run) {
  fail(1, `dispatched ${sha}, but no workflow_dispatch run appeared; check \`gh run list\``);
}

console.log(`dispatched ${run.url} (${run.status})`);
console.log('Verify: run conclusion, deployment id, node=22.x in the deploy log, then live smoke.');
