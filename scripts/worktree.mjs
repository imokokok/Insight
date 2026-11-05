#!/usr/bin/env node
// Parallel-agent workflow: one task = one branch = one worktree.
//
// Usage:
//   npm run wt -- create <slug> [--type feat] [--base origin/main] [--session <id>]
//   npm run wt -- list
//   npm run wt -- remove <slug> [--force] [--delete-branch]
//   npm run wt -- cleanup [--apply] [--stale-days 14]
//   npm run wt -- dev
//   npm run wt -- e2e -- --project=chromium
//   npm run wt -- ship <slug> --message "feat: ..." [--session <id>]
//
// Worktrees live outside the repository (default ~/Documents/insight-worktrees) so
// type-checkers and bundlers in the primary checkout never scan another task's
// source, and every task gets its own index, HEAD, .next, tsbuildinfo and eslint
// cache. Dependencies are symlinked from the primary checkout, not reinstalled.

import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const TYPES = ['feat', 'fix', 'chore', 'docs', 'test', 'perf', 'ops', 'refactor'];
const DEFAULT_BASE = 'origin/main';
const PORT_RANGE_START = 3300;
const PORT_RANGE_SIZE = 600;
const ENV_FILES = ['.env.local', '.env.vercel.local', '.env.x402-testnet'];
const NESTED_INSTALLS = ['verifier/node_modules', 'sdk/node_modules'];
const BRANCH_PATTERN = /^wt\/[a-z]+-/;

const args = process.argv.slice(2);
const command = args[0];

main().catch((error) => {
  console.error(`\nworktree: ${error.message}`);
  if (process.env.INSIGHT_WT_DEBUG) console.error(error.stack);
  process.exit(1);
});

async function main() {
  switch (command) {
    case 'create':
      return createWorktree();
    case 'list':
      return printList();
    case 'remove':
      return removeWorktree();
    case 'prune':
      return pruneWorktrees();
    case 'cleanup':
      return cleanupBranches();
    case 'dev':
      return runDevServer();
    case 'e2e':
      return runE2E();
    case 'ship':
      return shipWorktree();
    case undefined:
    case '-h':
    case '--help':
    case 'help':
      return printHelp();
    default:
      throw new Error(`unknown command "${command}" (try --help)`);
  }
}

// --- commands --------------------------------------------------------------

async function createWorktree() {
  const slug = normalizeSlug(positional(1));
  const type = option('type') ?? 'feat';
  const base = option('base') ?? DEFAULT_BASE;
  const session = sessionId();
  const install = flag('install');
  const skipFetch = flag('no-fetch');

  if (!TYPES.includes(type)) throw new Error(`--type must be one of: ${TYPES.join(', ')}`);

  const primary = primaryWorktree();
  const root = worktreeRoot();
  const branch = branchName(type, slug, session === 'local' ? null : session);
  const worktreePath = join(root, `${primary.name}-${slug}`);

  if (!skipFetch) {
    try {
      git(['fetch', 'origin', '--prune']);
    } catch {
      console.warn(`worktree: could not fetch origin; using the local "${base}" ref`);
    }
  }

  const baseCommit = resolveCommit(base);
  const state = ensureWorktree({ branch, worktreePath, baseCommit });

  if (install && state.created) {
    console.log('worktree: installing dependencies with npm ci (opt-in, full install)');
    run('npm', ['ci', '--prefer-offline', '--no-audit', '--no-fund'], { cwd: worktreePath });
  } else {
    linkNodeModules(primary.path, worktreePath);
  }
  linkEnvFiles(primary.path, worktreePath);
  installHooks(worktreePath);

  const ports = await allocatePorts(slug, root, worktreePath);
  writeWorktreeEnv(worktreePath, {
    name: slug,
    branch,
    base,
    session,
    devPort: ports.dev,
    e2ePort: ports.e2e,
  });

  console.log(`
Worktree ready${state.reused ? ' (reused existing branch)' : ''}
  path:     ${worktreePath}
  branch:   ${branch} (from ${base} @ ${baseCommit.slice(0, 8)})
  session:  ${session}
  ports:    dev=${ports.dev}  e2e=${ports.e2e}

Work:
  cd ${shellQuote(worktreePath)}
  npm run wt:dev
  npm run wt:e2e -- --project=chromium

Ship (commit + push + PR + auto-merge + cleanup):
  npm run wt -- ship ${slug} --message "feat: ..."

Remove a finished task:
  npm run wt -- remove ${slug} --delete-branch
`);
  return { worktreePath, branch, baseCommit };
}

function printList() {
  const primary = primaryWorktree();
  const root = worktreeRoot();
  const rows = listWorktrees().map((worktree) => ({
    ...worktree,
    managed: worktree.path.startsWith(`${root}/`),
    dirty: countDirty(worktree.path),
    env: readWorktreeEnv(worktree.path),
  }));

  const header = ['NAME', 'BRANCH', 'SESSION', 'DIRTY', 'DEV', 'E2E', 'PATH'];
  const body = rows.map((row) => {
    const name = row.managed ? row.path.slice(root.length + 1) : '(external)';
    return [
      row.path === primary.path ? `${name} *` : name,
      row.branch,
      row.env.INSIGHT_WT_SESSION ?? '-',
      String(row.dirty),
      row.env.INSIGHT_WT_PORT ?? '-',
      row.env.INSIGHT_E2E_PORT ?? '-',
      row.path,
    ];
  });

  const widths = header.map((column, index) =>
    Math.max(column.length, ...body.map((row) => row[index].length))
  );
  const format = (row) => row.map((cell, index) => cell.padEnd(widths[index])).join('  ');
  console.log(format(header));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  body.forEach((row) => console.log(format(row)));
  console.log(`\n* primary checkout; managed worktrees live under ${root}`);
}

function removeWorktree() {
  const slug = normalizeSlug(positional(1));
  const force = flag('force');
  const deleteBranch = flag('delete-branch');

  const primary = primaryWorktree();
  const worktreePath = join(worktreeRoot(), `${primary.name}-${slug}`);
  const registered = listWorktrees().find((worktree) => worktree.path === worktreePath);

  if (!registered) {
    const env = readWorktreeEnv(worktreePath);
    if (existsSync(worktreePath)) {
      rmSync(worktreePath, { recursive: true, force: true });
      console.log(`worktree: removed stale directory ${worktreePath}`);
    } else {
      console.log(`worktree: ${worktreePath} is already gone`);
    }
    if (deleteBranch) {
      const branch = env.INSIGHT_WT_BRANCH ?? `wt/${option('type') ?? 'feat'}-${slug}`;
      deleteAgentBranch(branch);
    }
    return;
  }

  const dirty = countDirty(worktreePath);
  if (dirty > 0 && !force) {
    throw new Error(
      `${worktreePath} has ${dirty} uncommitted path(s); commit or discard them, or pass --force`
    );
  }

  const branch = git(['-C', worktreePath, 'branch', '--show-current']).trim();
  git(['worktree', 'remove', ...(force ? ['--force'] : []), worktreePath]);

  if (deleteBranch && branch) deleteAgentBranch(branch);

  console.log(`worktree: removed ${worktreePath}`);
}

function deleteAgentBranch(branch) {
  try {
    git(['branch', '-D', branch]);
    console.log(`worktree: deleted branch ${branch}`);
  } catch {
    console.warn(
      `worktree: branch ${branch} was not deleted (already gone or checked out elsewhere)`
    );
  }
}

function pruneWorktrees() {
  const output = git(['worktree', 'prune', '--verbose']).trim();
  console.log(output || 'worktree: nothing to prune');
}

function cleanupBranches() {
  const apply = flag('apply');
  const staleDays = Number(option('stale-days') ?? 14);
  const minAgeMs = staleDays * 24 * 60 * 60 * 1000;
  if (!skipFetchEnabled()) {
    try {
      git(['fetch', 'origin', '--prune']);
    } catch {
      console.warn('worktree: could not fetch origin; merge status uses the local origin/main ref');
    }
  }
  const inUse = new Map(listWorktrees().map((worktree) => [worktree.branch, worktree.path]));

  const branches = git([
    'for-each-ref',
    'refs/heads',
    '--format=%(refname:short)|%(committerdate:iso8601)|%(committerdate:unix)',
  ])
    .split('\n')
    .filter((line) => BRANCH_PATTERN.test(line.split('|')[0]))
    .map((line) => {
      const [name, date, unix] = line.split('|');
      return { name, date, ageMs: Date.now() - Number(unix) * 1000 };
    })
    .filter((branch) => branch.ageMs >= minAgeMs)
    .map((branch) => ({
      ...branch,
      worktree: inUse.get(branch.name) ?? null,
      merged: isMerged(branch.name),
    }));

  if (branches.length === 0) {
    console.log(`cleanup: no agent branches older than ${staleDays} days`);
    return;
  }

  console.log(`Agent branches older than ${staleDays} days (${apply ? 'apply' : 'dry run'}):`);
  for (const branch of branches) {
    const status = branch.worktree
      ? `in use at ${branch.worktree}`
      : branch.merged
        ? 'merged'
        : 'unmerged';
    console.log(
      `  ${branch.merged || branch.worktree ? '·' : '!'} ${branch.name}  ${branch.date}  ${status}`
    );
    if (apply && branch.merged && !branch.worktree) {
      git(['branch', '-D', branch.name]);
      console.log(`    deleted ${branch.name}`);
    } else if (apply && branch.worktree) {
      console.log('    kept: branch is checked out in a worktree');
    } else if (apply) {
      console.log('    kept: unmerged work is reported, never deleted automatically');
    }
  }
  if (!apply) console.log('\nRun with --apply to delete merged branches only.');
}

async function runDevServer() {
  const env = readWorktreeEnv(repoRoot());
  if (!env.INSIGHT_WT_PORT) throw new Error('not a managed worktree (missing .worktree.local)');
  const next = join(repoRoot(), 'node_modules', '.bin', 'next');
  const result = spawnSync(
    next,
    ['dev', '--hostname', '127.0.0.1', '--port', env.INSIGHT_WT_PORT],
    {
      stdio: 'inherit',
      cwd: repoRoot(),
      env: { ...process.env, PORT: env.INSIGHT_WT_PORT },
    }
  );
  process.exit(result.status ?? 1);
}

function runE2E() {
  const env = readWorktreeEnv(repoRoot());
  if (!env.INSIGHT_E2E_PORT) throw new Error('not a managed worktree (missing .worktree.local)');
  const playwright = join(repoRoot(), 'node_modules', '.bin', 'playwright');
  const result = spawnSync(playwright, ['test', ...args.slice(1)], {
    stdio: 'inherit',
    cwd: repoRoot(),
    env: {
      ...process.env,
      PLAYWRIGHT_PORT: env.INSIGHT_E2E_PORT,
      INSIGHT_E2E_PORT: env.INSIGHT_E2E_PORT,
    },
  });
  process.exit(result.status ?? 1);
}

async function shipWorktree() {
  const slug = normalizeSlug(positional(1));
  const type = option('type') ?? 'feat';
  const base = option('base') ?? DEFAULT_BASE;
  const message = option('message') ?? option('m');
  if (!message) throw new Error('--message "feat: ..." is required for ship');

  if (!skipFetchEnabled()) {
    try {
      git(['fetch', 'origin', '--prune']);
    } catch {
      console.warn('worktree: could not fetch origin; using the local base ref');
    }
  }

  const worktreePath = join(worktreeRoot(), `${primaryWorktree().name}-${slug}`);
  if (!existsSync(worktreePath)) throw new Error(`no worktree for "${slug}"; run create first`);
  const branch =
    readWorktreeEnv(worktreePath).INSIGHT_WT_BRANCH ??
    branchName(type, slug, sessionId() === 'local' ? null : sessionId());

  if (!existsSync(join(worktreePath, '.husky', '_'))) installHooks(worktreePath);
  commitWorktree(worktreePath, message);
  pushBranch(worktreePath, branch);

  const pr = ensurePullRequest(branch, message);
  enableAutoMerge(pr);

  const merged = await waitForMerge(branch);
  if (!merged) {
    console.error(`
worktree: PR was not merged; leaving the worktree intact.
Conflict rule: rebase ONLY this branch in this worktree:
  git -C ${shellQuote(worktreePath)} rebase ${base}
Never switch another branch, never stash, never touch uncommitted files elsewhere.
`);
    process.exit(1);
  }

  try {
    git(['fetch', 'origin', '--prune']);
  } catch {
    // best effort
  }
  // Remove the worktree first: git refuses to delete a branch that is checked out.
  git(['worktree', 'remove', '--force', worktreePath]);
  try {
    git(['push', 'origin', '--delete', branch]);
  } catch {
    // GitHub may already have deleted the head branch
  }
  try {
    git(['branch', '-D', branch]);
  } catch {
    // already gone
  }
  const mergeCommit =
    typeof merged.mergeCommit === 'string' ? merged.mergeCommit : (merged.mergeCommit?.oid ?? '');
  console.log(`worktree: merged ${mergeCommit} and removed ${worktreePath}`);
  return merged;
}

// --- workflow helpers ------------------------------------------------------

function ensureWorktree({ branch, worktreePath, baseCommit }) {
  const registered = listWorktrees().find((worktree) => worktree.path === worktreePath);
  if (registered) {
    if (registered.branch !== branch) {
      throw new Error(`${worktreePath} is checked out on ${registered.branch}, expected ${branch}`);
    }
    return { reused: true, created: false };
  }

  if (existsSync(worktreePath)) {
    throw new Error(`${worktreePath} exists but is not a registered worktree; remove it first`);
  }

  const branchWorktree = listWorktrees().find((worktree) => worktree.branch === branch);
  if (branchWorktree) {
    throw new Error(`branch ${branch} is already checked out at ${branchWorktree.path}`);
  }

  mkdirSync(worktreeRoot(), { recursive: true });
  if (branchExists(branch)) {
    console.warn(`worktree: reusing existing branch ${branch} (no worktree was attached)`);
    git(['worktree', 'add', worktreePath, branch]);
  } else {
    git(['worktree', 'add', '--no-track', '-b', branch, worktreePath, baseCommit]);
  }
  try {
    git(['branch', '--unset-upstream', branch]);
  } catch {
    // no upstream configured
  }
  return { reused: false, created: true };
}

function commitWorktree(worktreePath, message) {
  const dirty = countDirty(worktreePath);
  if (dirty === 0) {
    console.log('worktree: nothing to commit');
    return;
  }
  run('git', ['add', '-A'], { cwd: worktreePath });
  run('git', ['commit', '-m', message], { cwd: worktreePath });
}

function pushBranch(worktreePath, branch) {
  const result = spawnSync('git', ['push', '-u', 'origin', `HEAD:${branch}`], {
    cwd: worktreePath,
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error(`push failed for ${branch}`);
}

function ensurePullRequest(branch, message) {
  try {
    return JSON.parse(
      execFileSync('gh', ['pr', 'view', branch, '--json', 'number,url,state'], {
        encoding: 'utf8',
        cwd: primaryWorktree().path,
      })
    );
  } catch {
    // no PR yet
  }
  const body = `Created by the per-task worktree flow.\n\n- Branch: ${branch}\n- Task: ${message}`;
  const created = execFileSync(
    'gh',
    ['pr', 'create', '--base', 'main', '--head', branch, '--title', message, '--body', body],
    { encoding: 'utf8', cwd: primaryWorktree().path }
  ).trim();
  console.log(`worktree: opened ${created}`);
  return JSON.parse(
    execFileSync('gh', ['pr', 'view', branch, '--json', 'number,url,state'], {
      encoding: 'utf8',
      cwd: primaryWorktree().path,
    })
  );
}

function enableAutoMerge(pr) {
  if (pr.state === 'MERGED' || pr.state === 'CLOSED') return;
  try {
    execFileSync('gh', ['pr', 'merge', String(pr.number), '--squash', '--auto'], {
      stdio: 'inherit',
      cwd: primaryWorktree().path,
    });
  } catch {
    console.warn('worktree: auto-merge could not be enabled; merge the PR manually');
  }
}

async function waitForMerge(branch) {
  const timeoutMs = Number(option('wait-minutes') ?? 60) * 60 * 1000;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const pr = JSON.parse(
      execFileSync('gh', ['pr', 'view', branch, '--json', 'number,state,mergeCommit,url'], {
        encoding: 'utf8',
        cwd: primaryWorktree().path,
      })
    );
    if (pr.state === 'MERGED') return pr;
    if (pr.state === 'CLOSED') return null;
    await sleep(20_000);
  }
  return null;
}

// --- setup helpers ---------------------------------------------------------

function linkNodeModules(primaryPath, worktreePath) {
  for (const relative of ['node_modules', ...NESTED_INSTALLS]) {
    linkIfPresent(join(primaryPath, relative), join(worktreePath, relative));
  }

  const integrations = join(primaryPath, 'integrations');
  if (!existsSync(integrations)) return;
  for (const entry of readdirSync(integrations)) {
    linkIfPresent(
      join(integrations, entry, 'node_modules'),
      join(worktreePath, 'integrations', entry, 'node_modules')
    );
  }
}

function linkIfPresent(source, target) {
  if (!existsSync(source) || existsSync(target)) return;
  mkdirSync(join(target, '..'), { recursive: true });
  symlinkSync(source, target);
}

function linkEnvFiles(primaryPath, worktreePath) {
  for (const file of ENV_FILES) {
    linkIfPresent(join(primaryPath, file), join(worktreePath, file));
  }
}

function installHooks(worktreePath) {
  const husky = join(worktreePath, 'node_modules', '.bin', 'husky');
  if (!existsSync(husky)) {
    console.warn('worktree: husky is unavailable; install dependencies before committing');
    return;
  }
  const result = spawnSync(husky, [], { cwd: worktreePath, stdio: 'inherit' });
  if (result.status !== 0) {
    console.warn('worktree: husky could not install hooks; commits would bypass pre-commit checks');
  }
}

async function allocatePorts(slug, root, worktreePath) {
  const allocated = allocatedPorts(root, worktreePath);
  const start = PORT_RANGE_START + (hash32(slug) % PORT_RANGE_SIZE);
  const dev = await findFreePort(start, allocated);
  const e2e = dev === null ? null : await findFreePort(dev + 1, allocated);
  if (dev === null || e2e === null) throw new Error('could not allocate a free port pair');
  return { dev, e2e };
}

async function findFreePort(start, allocated) {
  for (let attempt = 0; attempt < PORT_RANGE_SIZE; attempt += 1) {
    const port = PORT_RANGE_START + ((start - PORT_RANGE_START + attempt) % PORT_RANGE_SIZE);
    if (!allocated.has(port) && (await isPortFree(port))) return port;
  }
  return null;
}

function allocatedPorts(root, exceptPath) {
  const ports = new Set();
  if (!existsSync(root)) return ports;
  for (const entry of readdirSync(root)) {
    const envPath = join(root, entry, '.worktree.local');
    if (envPath === join(exceptPath, '.worktree.local') || !existsSync(envPath)) continue;
    for (const port of readWorktreePorts(envPath)) ports.add(port);
  }
  return ports;
}

function isPortFree(port) {
  return new Promise((resolvePromise) => {
    const server = createServer();
    server.unref();
    server.once('error', () => resolvePromise(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolvePromise(true)));
  });
}

function writeWorktreeEnv(worktreePath, details) {
  const lines = [
    '# Generated by `npm run wt`; not tracked.',
    `export INSIGHT_WT_NAME=${shellQuote(details.name)}`,
    `export INSIGHT_WT_BRANCH=${shellQuote(details.branch)}`,
    `export INSIGHT_WT_BASE=${shellQuote(details.base)}`,
    `export INSIGHT_WT_SESSION=${shellQuote(details.session)}`,
    `export INSIGHT_WT_PORT=${details.devPort}`,
    `export INSIGHT_E2E_PORT=${details.e2ePort}`,
  ];
  writeFileSync(join(worktreePath, '.worktree.local'), `${lines.join('\n')}\n`);
}

function readWorktreeEnv(worktreePath) {
  const envPath = join(worktreePath, '.worktree.local');
  if (!existsSync(envPath)) return {};
  return readFileSync(envPath, 'utf8')
    .split('\n')
    .map((line) => line.match(/^export ([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .reduce((values, match) => {
      values[match[1]] = match[2].replace(/^'|'$/g, '');
      return values;
    }, {});
}

function readWorktreePorts(envPath) {
  return readFileSync(envPath, 'utf8')
    .split('\n')
    .map((line) => line.match(/^export (?:INSIGHT_WT_PORT|INSIGHT_E2E_PORT)=(\d+)$/))
    .filter(Boolean)
    .map((match) => Number(match[1]));
}

// --- git helpers -----------------------------------------------------------

function git(gitArgs, options = {}) {
  return execFileSync('git', gitArgs, {
    cwd: primaryWorktree().path,
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe',
  });
}

function run(file, runArgs, options) {
  const result = spawnSync(file, runArgs, { stdio: 'inherit', ...options });
  if (result.status !== 0) throw new Error(`${file} ${runArgs.join(' ')} failed`);
}

function repoRoot() {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim();
}

function listWorktrees() {
  const output = execFileSync('git', ['worktree', 'list', '--porcelain'], {
    cwd: repoRoot(),
    encoding: 'utf8',
  });
  return output
    .split('\n\n')
    .filter((block) => block.trim())
    .map((block) => {
      const lines = block.split('\n');
      const branchLine = lines.find((line) => line.startsWith('branch '));
      return {
        path: lines[0].replace(/^worktree /, ''),
        branch: branchLine ? branchLine.replace(/^branch refs\/heads\//, '') : '(detached)',
      };
    });
}

function primaryWorktree() {
  const commonDir = execFileSync(
    'git',
    ['rev-parse', '--path-format=absolute', '--git-common-dir'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    }
  ).trim();
  const path = basename(commonDir) === '.git' ? dirname(commonDir) : commonDir;
  return { path, name: basename(path) };
}

function branchExists(branch) {
  try {
    execFileSync('git', ['rev-parse', '--verify', `refs/heads/${branch}`], {
      cwd: primaryWorktree().path,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function isMerged(branch) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', branch, 'origin/main'], {
      cwd: primaryWorktree().path,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function resolveCommit(ref) {
  try {
    return git(['rev-parse', '--verify', `${ref}^{commit}`]).trim();
  } catch {
    throw new Error(`base ref "${ref}" does not exist locally`);
  }
}

function countDirty(worktreePath) {
  try {
    return execFileSync('git', ['-C', worktreePath, 'status', '--porcelain'], {
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean).length;
  } catch {
    return 0;
  }
}

// --- misc helpers ----------------------------------------------------------

function worktreeRoot() {
  return resolve(
    process.env.INSIGHT_WORKTREE_ROOT ?? join(homedir(), 'Documents', 'insight-worktrees')
  );
}

function normalizeSlug(value) {
  const slug = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  if (!slug)
    throw new Error('a slug is required (example: npm run wt -- create hooks-cache-isolation)');
  return slug;
}

function branchName(type, slug, session) {
  return session ? `wt/${type}-${slug}-${session.slice(0, 6)}` : `wt/${type}-${slug}`;
}

function sessionId() {
  return option('session') ?? process.env.INSIGHT_AGENT_SESSION ?? 'local';
}

const VALUE_OPTIONS = ['type', 'base', 'session', 'message', 'm', 'stale-days', 'wait-minutes'];

function positional(index) {
  const values = [];
  for (let cursor = 1; cursor < args.length; cursor += 1) {
    const arg = args[cursor];
    if (!arg.startsWith('--')) {
      values.push(arg);
      continue;
    }
    if (!arg.includes('=') && VALUE_OPTIONS.includes(arg.slice(2))) cursor += 1;
  }
  return values[index - 1];
}

function option(name) {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  return index === -1 ? null : (args[index + 1] ?? null);
}

function flag(name) {
  return args.includes(`--${name}`);
}

function skipFetchEnabled() {
  return flag('no-fetch');
}

function hash32(text) {
  let hash = 2166136261;
  for (const char of text) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function basename(path) {
  return path.split('/').filter(Boolean).pop() ?? 'insight';
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function printHelp() {
  console.log(`Usage: npm run wt -- <command>

Commands:
  create <slug> [--type <type>] [--base <ref>] [--session <id>] [--no-fetch] [--install]
  list
  remove <slug> [--force] [--delete-branch]
  cleanup [--apply] [--stale-days <n>]
  dev
  e2e [-- playwright args]
  ship <slug> --message "type: subject" [--type <type>] [--session <id>]

Rules:
  - one task = one branch = one worktree; never share a branch between sessions
  - dependencies come from the primary checkout via symlink (use --install to opt out)
  - pre-commit never touches the shared stash stack
  - cleanup deletes merged branches only; unmerged work is reported, never deleted

Environment:
  INSIGHT_WORKTREE_ROOT   worktree root (default ~/Documents/insight-worktrees)
  INSIGHT_AGENT_SESSION   session id used in branch names and .worktree.local
`);
}
