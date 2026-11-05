#!/usr/bin/env node
// Parallel-agent workflow: one task = one branch = one worktree.
//
// Usage:
//   npm run wt -- create <slug> [--type feat] [--base origin/main] [--session <id>]
//                          [--paths "src/a.ts,scripts/b.mjs"] [--goal "..."] [--override]
//   npm run wt -- list
//   npm run wt -- status
//   npm run wt -- queue
//   npm run wt -- remove <slug> [--force] [--delete-branch]
//   npm run wt -- cleanup [--apply] [--stale-days 14] [--report-all]
//   npm run wt -- claim <slug> [--paths "..."] [--goal "..."]
//   npm run wt -- release <slug>
//   npm run wt -- handoff <slug> [--goal "..."] [--next "..."] [--verify "..."]
//   npm run wt -- resume <slug>
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
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const TYPES = ['feat', 'fix', 'chore', 'docs', 'test', 'perf', 'ops', 'refactor'];
const VALUE_OPTIONS = [
  'type',
  'base',
  'session',
  'message',
  'm',
  'stale-days',
  'wait-minutes',
  'paths',
  'goal',
  'next',
  'verify',
];
const DEFAULT_BASE = 'origin/main';
const PORT_RANGE_START = 3300;
const PORT_RANGE_SIZE = 600;
const ENV_FILES = ['.env.local', '.env.vercel.local', '.env.x402-testnet'];
const NESTED_INSTALLS = ['verifier/node_modules', 'sdk/node_modules'];
const BRANCH_PATTERN = /^wt\/[a-z]+-/;
const LOCK_TTL_MS = 10 * 60 * 1000;
const LOCK_WAIT_MS = 120 * 1000;
const CLAIM_STALE_MS = 6 * 60 * 60 * 1000;
const HANDOFF_STALE_MS = 60 * 60 * 1000;
const TASK_DIR = 'insight-tasks';

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
    case 'status':
      return printStatus();
    case 'queue':
      return printQueue();
    case 'remove':
      return removeWorktree();
    case 'prune':
      return pruneWorktrees();
    case 'cleanup':
      return cleanupBranches();
    case 'claim':
      return updateClaim();
    case 'release':
      return releaseClaim();
    case 'handoff':
      return writeHandoffCommand();
    case 'resume':
      return resumeTask();
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
  const override = flag('override');
  const paths = splitPaths(option('paths'));
  const goal = option('goal') ?? '';

  if (!TYPES.includes(type)) throw new Error(`--type must be one of: ${TYPES.join(', ')}`);

  const primary = primaryWorktree();
  const root = worktreeRoot();
  const branch = branchName(type, slug, session === 'local' ? null : session);
  const worktreePath = worktreePathFor(primary, slug, session);

  return withLock('create', async () => {
    if (!skipFetch) {
      try {
        git(['fetch', 'origin', '--prune']);
      } catch {
        console.warn(`worktree: could not fetch origin; using the local "${base}" ref`);
      }
    }
    const conflicts = findClaimConflicts(slug, paths);
    if (conflicts.length > 0) {
      const detail = conflicts
        .map((claim) => `  - ${claim.slug} (${claim.session}) claims ${claim.paths.join(', ')}`)
        .join('\n');
      if (!override) {
        throw new Error(
          `task "${slug}" touches paths already claimed:\n${detail}\nPick another slug/paths, coordinate, or pass --override.`
        );
      }
      console.warn(`worktree: --override set; continuing despite claimed paths:\n${detail}`);
    }

    const baseCommit = resolveCommit(base);
    const state = ensureWorktree({ branch, worktreePath, baseCommit });

    try {
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
      writeClaim({ slug, branch, session, worktree: worktreePath, paths, goal });

      console.log(`
Worktree ready${state.reused ? ' (reused existing branch)' : ''}
  path:     ${worktreePath}
  branch:   ${branch} (from ${base} @ ${baseCommit.slice(0, 8)})
  session:  ${session}
  ports:    dev=${ports.dev}  e2e=${ports.e2e}
  claim:    ${paths.length ? paths.join(', ') : '(none; add with claim --paths)'}

Work:
  cd ${shellQuote(worktreePath)}
  npm run wt:dev
  npm run wt:e2e -- --project=chromium

Handoff (write context before a long pause):
  npm run wt -- handoff ${slug} --next "..."

Ship (commit + push + PR + auto-merge + cleanup):
  npm run wt -- ship ${slug} --message "feat: ..."

Remove a finished task:
  npm run wt -- remove ${slug} --delete-branch
`);
      return { worktreePath, branch, baseCommit };
    } catch (error) {
      if (state.created) {
        // Never leave a half-built worktree behind when setup fails.
        try {
          git(['worktree', 'remove', '--force', worktreePath]);
        } catch {
          forceRemoveWorktree(worktreePath);
        }
        try {
          git(['branch', '-D', branch]);
        } catch {}
      }
      throw error;
    }
  });
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

async function removeWorktree() {
  const slug = normalizeSlug(positional(1));
  const force = flag('force');
  const deleteBranch = flag('delete-branch');

  return withLock('remove', async () => {
    const worktreePath = resolveWorktreePath(slug);
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
      removeClaim(slug);
      return;
    }

    const dirty = countDirty(worktreePath);
    if (dirty > 0 && !force) {
      throw new Error(
        `${worktreePath} has ${dirty} uncommitted path(s); commit or discard them, or pass --force`
      );
    }

    const branch = git(['-C', worktreePath, 'branch', '--show-current']).trim();
    try {
      git(['worktree', 'remove', ...(force ? ['--force'] : []), worktreePath]);
    } catch (error) {
      // `git worktree remove` can fail on hook sandboxes; --force may delete the
      // directory directly, but never when the caller did not ask for it.
      if (!force) throw error;
      forceRemoveWorktree(worktreePath);
    }

    if (deleteBranch && branch) deleteAgentBranch(branch);
    removeClaim(slug);

    console.log(`worktree: removed ${worktreePath}`);
  });
}

// Last-resort removal: delete the checkout, prune stale registrations, and only
// then let the caller delete the branch. Never touches the primary checkout.
function forceRemoveWorktree(worktreePath) {
  if (canonicalPath(worktreePath) === canonicalPath(primaryWorktree().path)) {
    throw new Error('refusing to remove the primary checkout');
  }
  rmSync(worktreePath, { recursive: true, force: true });
  try {
    git(['worktree', 'prune']);
  } catch {
    // prune is best effort
  }
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

async function cleanupBranches() {
  const apply = flag('apply');
  const reportAll = flag('report-all');
  const staleDays = Number(option('stale-days') ?? 14);
  const minAgeMs = staleDays * 24 * 60 * 60 * 1000;

  return withLock(`cleanup${apply ? '-apply' : '-dry'}`, async () => {
    if (!skipFetchEnabled()) {
      try {
        git(['fetch', 'origin', '--prune']);
      } catch {
        console.warn(
          'worktree: could not fetch origin; merge status uses the local origin/main ref'
        );
      }
    }
    const mergedPrs = fetchMergedPrHeads();
    const inUse = new Map(listWorktrees().map((worktree) => [worktree.branch, worktree.path]));
    const head = 'origin/main';

    const all = readBranchRefs().filter((branch) => branch.ageMs >= minAgeMs);
    const agentBranches = all.filter((branch) => BRANCH_PATTERN.test(branch.name));

    console.log(`Agent branches older than ${staleDays} days (${apply ? 'apply' : 'dry run'}):`);
    if (agentBranches.length === 0) {
      console.log('  (none)');
    }
    let deleted = 0;
    for (const branch of agentBranches) {
      const worktree = inUse.get(branch.name) ?? null;
      const verdict = worktree
        ? { merged: false, reason: 'checked-out-in-worktree' }
        : classifyBranch(branch.name, head, mergedPrs);
      console.log(
        `  ${verdict.merged ? '·' : '!'} ${branch.name}  ${branch.date}  ${verdict.reason}${verdict.merged ? '' : ` (ahead ${verdict.ahead ?? '?'})`}`
      );
      if (verdict.merged && worktree) {
        console.log('    kept: branch is checked out in a worktree');
        continue;
      }
      if (worktree) continue;
      if (!verdict.merged) {
        console.log(
          '    kept: content differs from main and no merged PR was found; never deleted automatically'
        );
        continue;
      }
      if (apply) {
        git(['branch', '-D', branch.name]);
        console.log(`    deleted ${branch.name} (${verdict.reason})`);
        deleted += 1;
      }
    }

    // Hand-named branches (perf/*, feat/*, dependabot/*) are never auto-deleted.
    const handNamed = all
      .filter(
        (branch) => !BRANCH_PATTERN.test(branch.name) && !['main', 'master'].includes(branch.name)
      )
      .slice(0, reportAll ? undefined : 15);
    if (handNamed.length > 0) {
      console.log(`\nHand-named branches (report only, ${apply ? 'never deleted' : 'dry run'}):`);
      for (const branch of handNamed) {
        const verdict = classifyBranch(branch.name, head, mergedPrs);
        const hint = verdict.merged
          ? `safe: git branch -d ${branch.name}`
          : `verify: gh pr list --head ${branch.name} --state merged`;
        console.log(
          `  ${verdict.merged ? '·' : '!'} ${branch.name}  ${branch.date}  ${verdict.reason}  ${hint}`
        );
      }
      console.log('  These need a human decision; cleanup never deletes them.');
    }

    const staleClaims = readClaims().filter(
      (claim) =>
        !inUse.has(claim.branch) && claimIsStale(claim) && !existsSync(claim.worktree ?? '')
    );
    if (staleClaims.length > 0) {
      console.log('\nStale task claims (worktree gone):');
      for (const claim of staleClaims) {
        console.log(
          `  ${claim.slug}  ${claim.session}  ${claim.paths?.join(', ') ?? '(no paths)'}`
        );
        if (apply) removeClaim(claim.slug);
      }
      if (apply) console.log('  released stale claims');
    }

    if (!apply) console.log('\nRun with --apply to delete merged wt/* branches only.');
    else console.log(`\ncleanup: deleted ${deleted} agent branch(es)`);
  });
}

// A branch is safe to delete only when main provably holds its content:
//  1. its tip is an ancestor of main (merge/fast-forward), or
//  2. it has no unique commits, or
//  3. its tree is byte-identical to main (covers squash merges), or
//  4. GitHub reports a merged PR for that head ref (squash merge + later commits).
// Anything else is reported as unmerged and never deleted.
function classifyBranch(name, head, mergedPrs) {
  if (isAncestorOf(name, head)) return { merged: true, reason: 'merged-into-main' };
  const ahead = commitsAhead(name, head);
  if (ahead === 0) return { merged: true, reason: 'no-unique-commits' };
  if (treesEqual(name, head)) return { merged: true, reason: 'content-identical-to-main' };
  if (mergedPrs.has(name)) return { merged: true, reason: 'pr-merged', ahead };
  return { merged: false, reason: 'unmerged', ahead };
}

function readBranchRefs() {
  return git([
    'for-each-ref',
    'refs/heads',
    '--format=%(refname:short)|%(committerdate:iso8601)|%(committerdate:unix)',
  ])
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name, date, unix] = line.split('|');
      return { name, date, ageMs: Date.now() - Number(unix) * 1000 };
    });
}

function isAncestorOf(name, head) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', name, head], {
      cwd: primaryWorktree().path,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function commitsAhead(name, head) {
  try {
    return Number(git(['rev-list', '--count', `${head}..${name}`]).trim());
  } catch {
    return Number.NaN;
  }
}

function treesEqual(name, head) {
  try {
    execFileSync('git', ['diff', '--quiet', '--no-ext-diff', head, name], {
      cwd: primaryWorktree().path,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function fetchMergedPrHeads() {
  try {
    const json = execFileSync(
      'gh',
      ['pr', 'list', '--state', 'merged', '--json', 'headRefName', '--limit', '300'],
      { cwd: primaryWorktree().path, encoding: 'utf8' }
    );
    return new Set(
      JSON.parse(json)
        .map((pull) => pull.headRefName)
        .filter(Boolean)
    );
  } catch {
    console.warn(
      'worktree: gh is unavailable; squash-merged branches are detected by tree comparison only'
    );
    return new Set();
  }
}

async function updateClaim() {
  const slug = normalizeSlug(positional(1));
  return withLock('claim', async () => {
    const current = readClaims().find((claim) => claim.slug === slug);
    if (!current) throw new Error(`no claim for "${slug}"; run create first`);
    const paths = option('paths') ? splitPaths(option('paths')) : (current.paths ?? []);
    const conflicts = findClaimConflicts(slug, paths);
    if (conflicts.length > 0 && !flag('override')) {
      throw new Error(
        `paths overlap other tasks:\n${conflicts
          .map((claim) => `  - ${claim.slug} (${claim.session}) ${claim.paths.join(', ')}`)
          .join('\n')}`
      );
    }
    const claim = writeClaim({
      slug,
      branch: current.branch,
      session: current.session,
      worktree: current.worktree,
      paths,
      goal: option('goal') ?? current.goal,
    });
    console.log(`claim updated: ${claim.slug} -> ${claim.paths.join(', ') || '(no paths)'}`);
  });
}

async function releaseClaim() {
  const slug = normalizeSlug(positional(1));
  return withLock('release', async () => {
    removeClaim(slug);
    console.log(`claim released: ${slug}`);
  });
}

async function writeHandoffCommand() {
  const slug = normalizeSlug(positional(1));
  return withLock('handoff', async () => {
    const worktreePath = resolveWorktreePath(slug);
    if (!existsSync(worktreePath)) throw new Error(`no worktree for "${slug}"`);
    const env = readWorktreeEnv(worktreePath);
    const claim = readClaims().find((item) => item.slug === slug) ?? {};
    const files = git(['-C', worktreePath, 'status', '--porcelain'])
      .split('\n')
      .filter(Boolean)
      .slice(0, 20)
      .map((line) => line.slice(3))
      .join(', ');
    writeHandoff(worktreePath, {
      slug,
      branch: env.INSIGHT_WT_BRANCH ?? '',
      session: env.INSIGHT_WT_SESSION ?? sessionId(),
      goal: option('goal') ?? claim.goal ?? '',
      next: option('next') ?? '',
      verify: option('verify') ?? 'npm run typecheck:fast && npm run lint',
      status: flag('blocked') ? 'blocked' : 'in-progress',
      files,
    });
    console.log(`handoff written: ${handoffPath(worktreePath)}`);
    process.stdout.write(readFileSync(handoffPath(worktreePath), 'utf8'));
  });
}

function resumeTask() {
  const slug = normalizeSlug(positional(1));
  const worktreePath = resolveWorktreePath(slug);
  if (!existsSync(worktreePath)) throw new Error(`no worktree for "${slug}"`);
  const env = readWorktreeEnv(worktreePath);
  const claim = readClaims().find((item) => item.slug === slug) ?? {};
  const handoff = readHandoff(worktreePath) ?? {};
  const branch = env.INSIGHT_WT_BRANCH ?? claim.branch ?? '';
  const dirty = git(['-C', worktreePath, 'status', '--porcelain']).split('\n').filter(Boolean);
  const ahead = branch ? commitsAhead(branch, 'origin/main') : Number.NaN;
  const last = git(['-C', worktreePath, 'log', '--oneline', '-1']).trim();

  console.log(`
Task:      ${slug}
Path:      ${worktreePath}
Branch:    ${branch} (ahead of origin/main by ${Number.isNaN(ahead) ? '?' : ahead})
Session:   ${env.INSIGHT_WT_SESSION ?? claim.session ?? '-'}
Ports:     dev=${env.INSIGHT_WT_PORT ?? '-'}  e2e=${env.INSIGHT_E2E_PORT ?? '-'}
Goal:      ${handoff.goal || claim.goal || '(not recorded)'}
Status:    ${handoff.status ?? 'unknown'}
Next:      ${handoff.next || '(not recorded)'}
Verify:    ${handoff.verify || '(not recorded)'}
Last:      ${last}
Dirty:     ${dirty.length} path(s)${
    dirty.length
      ? `\n${dirty
          .slice(0, 10)
          .map((line) => `           ${line}`)
          .join('\n')}`
      : ''
  }

Continue:
  cd ${shellQuote(worktreePath)}
  git status
  npm run wt -- handoff ${slug} --next "..." --verify "..."
  npm run wt -- ship ${slug} --message "..."
`);
}

function printStatus() {
  const root = worktreeRoot();
  const worktrees = listWorktrees().map((worktree) => ({
    ...worktree,
    env: readWorktreeEnv(worktree.path),
    handoff: readHandoff(worktree.path),
    dirty: countDirty(worktree.path),
    managed: worktree.path.startsWith(`${root}/`),
  }));
  const claims = readClaims();
  const prs = fetchOpenPrs();
  const prByBranch = new Map(prs.map((pull) => [pull.headRefName, pull]));

  const rows = [];
  for (const worktree of worktrees.filter((item) => item.managed)) {
    const task = worktree.env.INSIGHT_WT_NAME ?? '(unnamed)';
    const pull = prByBranch.get(worktree.branch) ?? null;
    const handoff = worktree.handoff;
    const claim = claims.find((item) => item.slug === task) ?? null;
    let state = 'active';
    if (pull?.mergeStateStatus === 'DIRTY') state = 'conflict';
    else if (handoff?.status === 'blocked') state = 'blocked';
    else if (claim && claimIsStale(claim) && worktree.dirty > 0) state = 'stale';
    rows.push({
      task,
      branch: worktree.branch,
      session: worktree.env.INSIGHT_WT_SESSION ?? claim?.session ?? '-',
      dirty: worktree.dirty,
      port: worktree.env.INSIGHT_WT_PORT ?? '-',
      pr: pull ? `#${pull.number}` : '-',
      ci: pull ? ciSummary(pull.statusCheckRollup) : '-',
      state,
      handoff: handoff?.updatedAt ? ageLabel(handoff.updatedAt) : '-',
      path: worktree.path,
    });
  }
  // Claims whose worktree disappeared (killed session, manual rm).
  for (const claim of claims.filter(
    (item) => !worktrees.some((worktree) => worktree.env.INSIGHT_WT_NAME === item.slug)
  )) {
    rows.push({
      task: claim.slug,
      branch: claim.branch,
      session: claim.session,
      dirty: '-',
      port: '-',
      pr: prByBranch.get(claim.branch) ? `#${prByBranch.get(claim.branch).number}` : '-',
      ci: '-',
      state: claimIsStale(claim) ? 'claim-orphaned' : 'creating',
      handoff: ageLabel(claim.updatedAt),
      path: claim.worktree || '(not created)',
    });
  }

  if (rows.length === 0) {
    console.log('status: no managed tasks');
    return;
  }
  const header = [
    'TASK',
    'BRANCH',
    'SESSION',
    'DIRTY',
    'PORT',
    'PR',
    'CI',
    'STATE',
    'HANDOFF',
    'PATH',
  ];
  const body = rows.map((row) => [
    row.task,
    row.branch,
    row.session,
    String(row.dirty),
    row.port,
    row.pr,
    row.ci,
    row.state,
    row.handoff,
    row.path,
  ]);
  const widths = header.map((column, index) =>
    Math.max(column.length, ...body.map((row) => row[index].length))
  );
  const format = (row) => row.map((cell, index) => cell.padEnd(widths[index])).join('  ');
  console.log(format(header));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  body.forEach((row) => console.log(format(row)));
  console.log(
    '\nclaim-orphaned = claim left behind, worktree gone; run cleanup --apply to release'
  );
}

function printQueue() {
  const prs = fetchOpenPrs().sort(
    (left, right) => Date.parse(left.createdAt ?? 0) - Date.parse(right.createdAt ?? 0)
  );
  if (prs.length === 0) {
    console.log('queue: no open PRs');
    return;
  }
  console.log(
    'Merge queue (oldest first; merge one at a time, behind PRs rebase their own branch):'
  );
  prs.forEach((pull, index) => {
    const ci = ciSummary(pull.statusCheckRollup);
    const action =
      pull.mergeStateStatus === 'BEHIND'
        ? 'rebase own branch, then re-enable auto-merge'
        : pull.mergeStateStatus === 'DIRTY'
          ? 'resolve conflict inside its own worktree'
          : ci.startsWith('fail')
            ? 'fix failing checks'
            : pull.isDraft
              ? 'mark ready for review'
              : 'auto-merge takes it';
    console.log(
      `  ${index + 1}. #${pull.number} ${pull.headRefName} [${pull.mergeStateStatus ?? 'UNKNOWN'}] ci=${ci} -> ${action}`
    );
  });
}

function fetchOpenPrs() {
  try {
    const json = execFileSync(
      'gh',
      [
        'pr',
        'list',
        '--state',
        'open',
        '--json',
        'number,headRefName,title,url,mergeStateStatus,statusCheckRollup,createdAt,isDraft',
        '--limit',
        '100',
      ],
      { cwd: primaryWorktree().path, encoding: 'utf8' }
    );
    return JSON.parse(json);
  } catch {
    console.warn('worktree: gh is unavailable; PR columns show "-"');
    return [];
  }
}

function ciSummary(rollup) {
  if (!Array.isArray(rollup)) return '-';
  let failed = 0;
  let pending = 0;
  for (const check of rollup) {
    const conclusion = check.conclusion ?? '';
    if (
      ['FAILURE', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED', 'STARTUP_FAILURE'].includes(
        conclusion
      )
    ) {
      failed += 1;
    } else if (check.status && check.status !== 'COMPLETED') {
      pending += 1;
    }
  }
  if (failed > 0) return `fail:${failed}`;
  if (pending > 0) return `pending:${pending}`;
  return 'ok';
}

function ageLabel(iso) {
  const time = Date.parse(iso ?? '');
  if (Number.isNaN(time)) return '-';
  const minutes = Math.round((Date.now() - time) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
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
  const base = option('base') ?? DEFAULT_BASE;
  const message = option('message') ?? option('m');
  if (!message) throw new Error('--message "feat: ..." is required for ship');

  const worktreePath = resolveWorktreePath(slug);
  if (!existsSync(worktreePath)) throw new Error(`no worktree for "${slug}"; run create first`);
  const branch = readWorktreeEnv(worktreePath).INSIGHT_WT_BRANCH ?? branchName('feat', slug, null);
  const claim = readClaims().find((item) => item.slug === slug);

  if (!existsSync(join(worktreePath, '.husky', '_'))) installHooks(worktreePath);

  // Short critical section: fetch, commit, push, open PR, enable auto-merge.
  const pr = await withLock('ship', async () => {
    // Re-check inside the lock: a concurrent ship of the same task may have
    // merged and cleaned up while this process was waiting for the mutex.
    if (!existsSync(worktreePath)) return null;
    if (!skipFetchEnabled()) {
      try {
        git(['fetch', 'origin', '--prune']);
      } catch {
        console.warn('worktree: could not fetch origin; using the local base ref');
      }
    }
    commitWorktree(worktreePath, message);
    pushBranch(worktreePath, branch);
    const pull = ensurePullRequest(branch, message);
    enableAutoMerge(pull);
    return pull;
  });

  if (!pr) {
    console.log(
      `worktree: ${worktreePath} is already gone; the task was finished by another session`
    );
    return;
  }

  const outcome = await waitForMerge(branch);
  if (outcome.status !== 'merged') {
    const next = {
      dirty: `resolve the merge conflict, then rebase ONLY this branch: git -C ${shellQuote(worktreePath)} rebase ${base}`,
      'ci-red':
        'CI failed. Run the checks inside this worktree, fix, commit, push; the PR stays open.',
      behind: `PR stayed BEHIND main. Rebase ONLY this branch in this worktree: git -C ${shellQuote(worktreePath)} rebase ${base}`,
      closed: 'The PR was closed without merging. Reopen it or create a new PR from this branch.',
      timeout: 'The PR did not merge in time. Check CI and the merge queue, then rerun ship.',
    }[outcome.status];
    writeHandoff(worktreePath, {
      slug,
      goal: claim?.goal ?? message,
      next,
      verify: `npm run wt -- status`,
      branch,
      pr: pr?.url ?? '',
      status: 'blocked',
    });
    console.error(`
worktree: PR was not merged (${outcome.status}); leaving the worktree intact and recording a handoff.
  handoff:  ${join(worktreePath, '.handoff.local')}
  next:     ${next}
Conflict rule: rebase ONLY this branch in this worktree:
  git -C ${shellQuote(worktreePath)} rebase ${base}
Never switch another branch, never stash, never touch uncommitted files elsewhere.
`);
    process.exit(1);
  }

  // Long critical section is over; cleanup is a short one.
  await withLock('ship-cleanup', async () => {
    try {
      git(['fetch', 'origin', '--prune']);
    } catch {
      // best effort
    }
    // Remove the worktree first: git refuses to delete a branch that is checked out.
    try {
      git(['worktree', 'remove', '--force', worktreePath]);
    } catch {
      forceRemoveWorktree(worktreePath);
    }
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
    removeClaim(slug);
  });

  const merged = outcome.pr;
  const mergeCommit =
    typeof merged.mergeCommit === 'string' ? merged.mergeCommit : (merged.mergeCommit?.oid ?? '');
  console.log(`worktree: merged ${mergeCommit} and cleaned up ${worktreePath}`);
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

// Branch protection decides whether a BEHIND PR can merge without a rebase.
// Returns true when "require branches to be up to date" is on; defaults to false
// when protection cannot be read, because GitHub will still auto-merge when it can.
let upToDateCache;
function requiresUpToDate() {
  if (upToDateCache !== undefined) return upToDateCache;
  try {
    const repo = execFileSync(
      'gh',
      ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'],
      {
        encoding: 'utf8',
        cwd: primaryWorktree().path,
      }
    ).trim();
    const protection = JSON.parse(
      execFileSync('gh', ['api', `repos/${repo}/branches/main/protection`], {
        encoding: 'utf8',
        cwd: primaryWorktree().path,
      })
    );
    upToDateCache = Boolean(protection.required_status_checks?.strict);
  } catch {
    upToDateCache = false;
  }
  return upToDateCache;
}

async function waitForMerge(branch) {
  const timeoutMs = Number(option('wait-minutes') ?? 60) * 60 * 1000;
  const upToDateRequired = requiresUpToDate();
  const startedAt = Date.now();
  let behindPolls = 0;
  while (Date.now() - startedAt < timeoutMs) {
    let pr;
    try {
      pr = JSON.parse(
        execFileSync(
          'gh',
          [
            'pr',
            'view',
            branch,
            '--json',
            'number,state,mergeCommit,url,mergeStateStatus,statusCheckRollup',
          ],
          { encoding: 'utf8', cwd: primaryWorktree().path }
        )
      );
    } catch (error) {
      console.warn(`worktree: could not read PR state (${error.message}); retrying`);
      await sleep(20_000);
      continue;
    }

    if (pr.state === 'MERGED') return { status: 'merged', pr };
    if (pr.state === 'CLOSED') {
      console.warn(`worktree: PR for ${branch} was closed without merging`);
      return { status: 'closed' };
    }
    // A DIRTY PR has a real merge conflict: fail fast instead of waiting out the timeout.
    if (pr.mergeStateStatus === 'DIRTY') {
      console.warn(`worktree: PR for ${branch} has merge conflicts (mergeStateStatus=DIRTY)`);
      return { status: 'dirty' };
    }
    // A red required check will never turn green on its own; stop waiting for auto-merge.
    if (hasFailingChecks(pr.statusCheckRollup)) {
      console.warn(`worktree: PR for ${branch} has failing checks; auto-merge cannot proceed`);
      return { status: 'ci-red' };
    }
    // Behind main with required up-to-date checks can never self-heal: ask for a rebase.
    // With strict=false GitHub merges the PR as-is, so BEHIND is not fatal.
    behindPolls = upToDateRequired && pr.mergeStateStatus === 'BEHIND' ? behindPolls + 1 : 0;
    if (behindPolls >= 3) {
      console.warn(`worktree: PR for ${branch} stayed BEHIND for ~60s; it needs a rebase`);
      return { status: 'behind' };
    }
    await sleep(20_000);
  }
  console.warn(
    `worktree: PR for ${branch} was not merged within ${Math.round(timeoutMs / 60_000)} min`
  );
  return { status: 'timeout' };
}

// True only when at least one check failed and nothing is still pending.
function hasFailingChecks(rollup) {
  if (!Array.isArray(rollup) || rollup.length === 0) return false;
  const failed = new Set(['FAILURE', 'ERROR', 'CANCELLED', 'TIMED_OUT', 'STARTUP_FAILURE']);
  const pending = new Set(['PENDING', 'IN_PROGRESS', 'QUEUED', 'EXPECTED', 'WAITING', 'REQUESTED']);
  let sawFailure = false;
  for (const entry of rollup) {
    const conclusion = String(entry.conclusion ?? '').toUpperCase();
    const state = String(entry.state ?? '').toUpperCase();
    const status = String(entry.status ?? '').toUpperCase();
    if (failed.has(conclusion) || failed.has(state)) sawFailure = true;
    if (pending.has(state) || pending.has(status) || pending.has(conclusion)) return false;
  }
  return sawFailure;
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
  atomicWrite(join(worktreePath, '.worktree.local'), `${lines.join('\n')}\n`);
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

// git reports real paths, so `/tmp/...` and `/private/tmp/...` must compare equal.
function canonicalPath(path) {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
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
        path: canonicalPath(lines[0].replace(/^worktree /, '')),
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

// --- orchestration helpers ---------------------------------------------------

function commonDir() {
  return execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim();
}

function lockDir() {
  return join(commonDir(), 'insight-wt.lock');
}

// One repository-wide mutex, shared by every worktree (it lives in the common
// git dir). Held only for short critical sections, never while waiting on CI.
async function withLock(label, work) {
  const dir = lockDir();
  const startedAt = Date.now();
  for (;;) {
    try {
      mkdirSync(dir);
      writeFileSync(
        join(dir, 'meta.json'),
        JSON.stringify({
          pid: process.pid,
          command: label,
          startedAt: Date.now(),
          cwd: process.cwd(),
        })
      );
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const owner = readLockOwner(dir);
      if (owner && Date.now() - owner.startedAt > LOCK_TTL_MS) {
        console.warn(`worktree: clearing stale lock from ${owner.command} (pid ${owner.pid})`);
        rmSync(dir, { recursive: true, force: true });
        continue;
      }
      if (Date.now() - startedAt > LOCK_WAIT_MS) {
        throw new Error(
          `another worktree command is running (${owner?.command ?? 'unknown'}, pid ${owner?.pid ?? '?'}); retry shortly`
        );
      }
      await sleep(1000);
    }
  }
  try {
    return await work();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function readLockOwner(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
  } catch {
    return null;
  }
}

function taskDir() {
  return join(commonDir(), TASK_DIR);
}

function claimPath(slug) {
  return join(taskDir(), `${slug}.json`);
}

function readClaims() {
  try {
    return readdirSync(taskDir())
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        try {
          return JSON.parse(readFileSync(join(taskDir(), file), 'utf8'));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function writeClaim({ slug, branch, session, worktree, paths, goal }) {
  const existing = readClaims().find((claim) => claim.slug === slug);
  const claim = {
    slug,
    branch,
    session,
    worktree: worktree ?? existing?.worktree ?? '',
    paths: paths ?? existing?.paths ?? [],
    goal: goal || existing?.goal || '',
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mkdirSync(taskDir(), { recursive: true });
  atomicWrite(claimPath(slug), `${JSON.stringify(claim, null, 2)}\n`);
  return claim;
}

function removeClaim(slug) {
  try {
    rmSync(claimPath(slug), { force: true });
  } catch {
    // claim already gone
  }
}

function claimIsStale(claim) {
  const updatedAt = Date.parse(claim.updatedAt ?? '');
  if (Number.isNaN(updatedAt)) return true;
  return Date.now() - updatedAt > CLAIM_STALE_MS;
}

function claimIsActive(claim) {
  const live = listWorktrees().some((worktree) => worktree.branch === claim.branch);
  return live || !claimIsStale(claim);
}

function findClaimConflicts(slug, paths) {
  if (paths.length === 0) return [];
  return readClaims()
    .filter((claim) => claim.slug !== slug && claimIsActive(claim))
    .filter((claim) => pathsOverlap(claim.paths ?? [], paths));
}

function splitPaths(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((path) => path.trim())
    .filter(Boolean);
}

function pathsOverlap(left, right) {
  return left.some((a) => right.some((b) => globsIntersect(a, b)));
}

// Conservative overlap test: compare the literal prefix before the first wildcard.
// `src/*.ts` intersects `src/a.ts`; `src/a.ts` does not intersect `src/b.ts`.
function globsIntersect(a, b) {
  const prefix = (pattern) => {
    const wildcard = pattern.search(/[*?[{]/);
    return (wildcard === -1 ? pattern : pattern.slice(0, wildcard)).replace(/\/+$/, '');
  };
  const left = prefix(a);
  const right = prefix(b);
  if (!left || !right) return true;
  return left.startsWith(right) || right.startsWith(left);
}

function handoffPath(worktreePath) {
  return join(worktreePath, '.handoff.local');
}

function writeHandoff(worktreePath, details) {
  const singleLine = (value) =>
    String(value ?? '')
      .replace(/\s*\n+\s*/g, ' / ')
      .trim();
  const lines = [
    '# Generated by `npm run wt handoff`. Not tracked; survives a killed session.',
    `updatedAt=${new Date().toISOString()}`,
    `task=${details.slug ?? ''}`,
    `branch=${details.branch ?? ''}`,
    `session=${details.session ?? ''}`,
    `status=${details.status ?? 'in-progress'}`,
    `goal=${singleLine(details.goal)}`,
    `next=${singleLine(details.next)}`,
    `verify=${singleLine(details.verify)}`,
    `pr=${details.pr ?? ''}`,
    `files=${singleLine(details.files)}`,
  ];
  atomicWrite(handoffPath(worktreePath), `${lines.join('\n')}\n`);
}

function readHandoff(worktreePath) {
  const path = handoffPath(worktreePath);
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.match(/^([a-zA-Z]+)=(.*)$/))
    .filter(Boolean)
    .reduce((values, match) => {
      values[match[1]] = match[2];
      return values;
    }, {});
}

function atomicWrite(path, content) {
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, content);
  renameSync(temp, path);
}

function worktreePathFor(primary, slug, session) {
  // Create the root first so realpath() can resolve symlinked roots (e.g. /tmp on macOS).
  mkdirSync(worktreeRoot(), { recursive: true });
  const root = canonicalPath(worktreeRoot());
  const suffix = session && session !== 'local' ? `-${session.slice(0, 6)}` : '';
  return join(root, `${primary.name}-${slug}${suffix}`);
}

// Resolve by the task name recorded in `.worktree.local`, so a session-tagged
// path still works. Any session may resume/remove/finish a task (handoff is the
// transfer mechanism); only `create` computes its own path, so it cannot hijack
// another session's directory.
function resolveWorktreePath(slug) {
  const root = worktreeRoot();
  const session = sessionId();
  const managed = listWorktrees().filter((worktree) => worktree.path.startsWith(`${root}/`));
  const named = managed.filter(
    (worktree) => readWorktreeEnv(worktree.path).INSIGHT_WT_NAME === slug
  );
  if (named.length === 1) return named[0].path;
  if (named.length > 1) {
    const mine = named.find(
      (worktree) => (readWorktreeEnv(worktree.path).INSIGHT_WT_SESSION ?? 'local') === session
    );
    if (mine) return mine.path;
    throw new Error(
      `multiple worktrees claim task "${slug}" (${named.map((worktree) => worktree.path).join(', ')}); ` +
        'pass --session to disambiguate'
    );
  }
  return join(root, `${primaryWorktree().name}-${slug}`);
}

// --- misc helpers ----------------------------------------------------------

function worktreeRoot() {
  return canonicalPath(
    resolve(process.env.INSIGHT_WORKTREE_ROOT ?? join(homedir(), 'Documents', 'insight-worktrees'))
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
                [--paths "src/a.ts,scripts/b.mjs"] [--goal "..."] [--override]
  list
  status
  queue
  remove <slug> [--force] [--delete-branch]
  cleanup [--apply] [--stale-days <n>] [--report-all]
  claim <slug> [--paths "..."] [--goal "..."] [--override]
  release <slug>
  handoff <slug> [--goal "..."] [--next "..."] [--verify "..."] [--blocked]
  resume <slug>
  dev
  e2e [-- playwright args]
  ship <slug> --message "type: subject" [--session <id>]

Rules:
  - one task = one branch = one worktree; never share a branch between sessions
  - declare expected paths at create time; overlapping claims are refused before work starts
  - dependencies come from the primary checkout via symlink (use --install to opt out)
  - pre-commit never touches the shared stash stack
  - cleanup deletes merged branches only (ancestor | no unique commits | tree identical | merged PR);
    hand-named branches are reported, never deleted
  - write a handoff before a long pause so any session can resume the task

Environment:
  INSIGHT_WORKTREE_ROOT   worktree root (default ~/Documents/insight-worktrees)
  INSIGHT_AGENT_SESSION   session id used in branch names and .worktree.local
`);
}
