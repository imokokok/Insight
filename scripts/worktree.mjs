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
//   npm run wt -- cleanup [--apply] [--stale-days 14] [--report-all] [--base <ref>]
//   npm run wt -- claim <slug> [--paths "..."] [--goal "..."]
//   npm run wt -- release <slug>
//   npm run wt -- handoff <slug> [--goal "..."] [--next "..."] [--verify "..."]
//   npm run wt -- resume <slug> [--base <ref>]
//   npm run wt -- dev
//   npm run wt -- e2e -- --project=chromium
//   npm run wt -- ship <slug> --message "feat: ..." [--session <id>]
//
// Worktrees live outside the repository (default ~/Documents/insight-worktrees) so
// type-checkers and bundlers in the primary checkout never scan another task's
// source, and every task gets its own index, HEAD, .next, tsbuildinfo and eslint
// cache. Dependencies are symlinked from the primary checkout, not reinstalled.

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const DEFAULT_BASE = process.env.INSIGHT_WT_BASE ?? 'origin/main';
const SKIP_DEPENDENCY_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'coverage',
  'test-results',
  'playwright-report',
  'output',
]);
const PORT_RANGE_START = 3300;
const PORT_RANGE_SIZE = 600;
const ENV_FILES = ['.env.local', '.env.vercel.local', '.env.x402-testnet'];
const NESTED_INSTALLS = (
  process.env.INSIGHT_WT_NESTED_INSTALLS ?? 'verifier/node_modules,sdk/node_modules'
)
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);
const BRANCH_PATTERN = /^wt\/[a-z]+-/;
const LOCK_TTL_MS = 10 * 60 * 1000;
const LOCK_WAIT_MS = 120 * 1000;
const CLAIM_STALE_MS = 6 * 60 * 60 * 1000;
const HANDOFF_STALE_MS = 60 * 60 * 1000;
const CI_STUCK_MS = 20 * 60 * 1000;
const NO_PROGRESS_MS = 60 * 60 * 1000;
const TASK_DIR = 'insight-tasks';
const DEPS_STATE_FILE = '.worktree-deps.json';
const PRIMARY_DEPS_BASELINE = 'primary-deps.json';
const WORKTREE_EXCLUDES = [
  'node_modules',
  '.worktree.local',
  '.worktree-deps.json',
  '.handoff.local',
  '.next/',
  '*.tsbuildinfo',
  '.eslintcache',
];

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
    case 'cost':
      return printCost();
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
    case 'deps':
      return manageDependencies();
    case 'services':
      return printServices();
    case 'check':
      return checkTask();
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
    const unique = findUniqueClaimConflicts(slug, paths);
    if (unique.length > 0) {
      throw new Error(
        `task "${slug}" touches an artifact that must be edited serially:\n${unique
          .map((claim) => `  - ${claim.slug} (${claim.session}) claims ${claim.paths.join(', ')}`)
          .join(
            '\n'
          )}\nMerge that task first (or release its claim), then start this one. There is no override for unique artifacts.`
      );
    }
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
    if (dependencyPathsIn(paths).length > 0 && !install) {
      throw new Error(
        `task "${slug}" declares a dependency manifest (${dependencyPathsIn(paths).join(', ')}).\n` +
          'Shared (symlinked) node_modules must never be mutated: re-run create with --install, ' +
          'or create first and run `npm run wt -- deps ' +
          slug +
          ' --isolate` before editing the manifest.'
      );
    }

    const baseCommit = resolveCommit(base);
    const state = ensureWorktree({ branch, worktreePath, baseCommit });

    try {
      recordPrimaryDepsBaseline(primary.path, slug);
      if (state.created) {
        if (install) {
          console.log('worktree: installing dependencies with npm ci (opt-in, full install)');
          run('npm', ['ci', '--prefer-offline', '--no-audit', '--no-fund'], { cwd: worktreePath });
          linkNestedNodeModules(primary.path, worktreePath);
        } else {
          const compatibility = dependencyCompatibility(primary.path, worktreePath);
          if (compatibility.ok) {
            linkNodeModules(primary.path, worktreePath);
          } else {
            // Reusing the primary tree here would run every check against the
            // wrong dependency set and surface as a false "cron bundles stale"
            // failure. Install a truthful tree instead of handing the agent a
            // misleading error.
            console.log(
              `worktree: shared dependencies are not valid for ${base}: ${compatibility.reason}`
            );
            console.log(
              'worktree: installing an isolated node_modules for this task (about 1.9 GB); ' +
                '`npm run wt -- cost` reports usage'
            );
            run('npm', ['ci', '--prefer-offline', '--no-audit', '--no-fund'], {
              cwd: worktreePath,
            });
            linkNestedNodeModules(primary.path, worktreePath);
          }
        }
      } else if (!existsSync(join(worktreePath, 'node_modules'))) {
        const compatibility = dependencyCompatibility(primary.path, worktreePath);
        if (compatibility.ok) {
          linkNodeModules(primary.path, worktreePath);
        } else {
          console.log(
            `worktree: shared dependencies are not valid for ${base}: ${compatibility.reason}`
          );
          run('npm', ['ci', '--prefer-offline', '--no-audit', '--no-fund'], {
            cwd: worktreePath,
          });
          linkNestedNodeModules(primary.path, worktreePath);
        }
      }
      writeDepsState(worktreePath, slug);
      linkEnvFiles(primary.path, worktreePath);
      excludeWorktreeArtifacts(worktreePath);
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

      const prefix = commandPrefix();
      const devCommand = repoHasScript('wt:dev') ? 'npm run wt:dev' : `${prefix} dev`;
      const e2eCommand = repoHasScript('wt:e2e')
        ? 'npm run wt:e2e -- --project=chromium'
        : `${prefix} e2e -- --project=chromium`;
      console.log(`
Worktree ready${state.reused ? ' (reused existing branch)' : ''}
  path:     ${worktreePath}
  branch:   ${branch} (from ${base} @ ${baseCommit.slice(0, 8)})
  session:  ${session}
  deps:     ${dependencyState(worktreePath).label} (${formatSize(directorySizeKb(worktreePath))})
  ports:    dev=${ports.dev}  e2e=${ports.e2e}
  claim:    ${paths.length ? paths.join(', ') : '(none; add with claim --paths)'}

Work:
  cd ${shellQuote(worktreePath)}
  ${devCommand}
  ${e2eCommand}

Handoff (write context before a long pause):
  ${prefix} handoff ${slug} --next "..."

Ship (commit + push + PR + auto-merge + cleanup):
  ${prefix} ship ${slug} --message "feat: ..."

Remove a finished task:
  ${prefix} remove ${slug} --delete-branch
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

// `git worktree remove` can report success while a nested mount, a running
// process or a sandbox denial leaves the directory behind. Removing the
// registration and then printing "removed" hides a multi-GB orphan, so verify
// the directory is actually gone before deleting the branch or releasing rim.
function assertWorktreeDirectoryGone(worktreePath) {
  if (!existsSync(worktreePath)) return;
  const size = formatSize(directorySizeKb(worktreePath));
  throw new Error(
    `worktree directory still exists after removal: ${worktreePath} (${size}).\n` +
      'It is an orphan (git no longer tracks it), so the branch and claim were kept.\n' +
      `Inspect and delete it manually, then rerun: ${commandPrefix()} remove ${basename(worktreePath)}`
  );
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
        assertWorktreeDirectoryGone(worktreePath);
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

    // Never report success while a multi-GB directory is still on disk. Keep
    // the branch and claim so the task can be recovered.
    assertWorktreeDirectoryGone(worktreePath);
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
    const head = option('base') ?? DEFAULT_BASE;

    const all = readBranchRefs().filter((branch) => branch.ageMs >= minAgeMs);
    const agentBranches = all.filter((branch) => BRANCH_PATTERN.test(branch.name));

    console.log(
      `Agent branches older than ${staleDays} days (${apply ? 'apply' : 'dry run'}, base ${head}):`
    );
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

    // A directory under the managed root that git does not list as a worktree is
    // an orphan left by a failed remove. It is invisible to every other report
    // and can hold a multi-GB node_modules.
    const root = worktreeRoot();
    const registered = new Set(listWorktrees().map((worktree) => realpathSync(worktree.path)));
    const prefix = `${basename(primaryWorktree().path)}-`;
    const orphans = [];
    if (existsSync(root)) {
      for (const entry of readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith(prefix)) continue;
        const candidate = join(root, entry.name);
        if (registered.has(realpathSync(candidate))) continue;
        orphans.push(candidate);
      }
    }
    if (orphans.length > 0) {
      console.log('\nOrphan directories (not registered as worktrees):');
      for (const orphan of orphans) {
        console.log(`  ! ${orphan}  ${formatSize(directorySizeKb(orphan))}`);
        if (apply) {
          rmSync(orphan, { recursive: true, force: true });
          if (existsSync(orphan)) {
            console.warn(
              `  ! could not fully remove ${orphan}; it still exists - inspect it manually`
            );
          } else {
            console.log('    removed');
          }
        }
      }
      if (!apply) console.log('  Run with --apply to delete them.');
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
    const unique = findUniqueClaimConflicts(slug, paths);
    if (unique.length > 0) {
      throw new Error(
        `paths include a serial artifact owned by another task:\n${unique
          .map((claim) => `  - ${claim.slug} (${claim.session}) ${claim.paths.join(', ')}`)
          .join('\n')}\nMerge that task first; unique artifacts cannot be overridden.`
      );
    }
    if (conflicts.length > 0 && !flag('override')) {
      throw new Error(
        `paths overlap other tasks:\n${conflicts
          .map((claim) => `  - ${claim.slug} (${claim.session}) ${claim.paths.join(', ')}`)
          .join('\n')}`
      );
    }
    if (dependencyPathsIn(paths).length > 0 && current.worktree) {
      assertDependencyIsolation(current.worktree, `claim ${slug}`, {
        allowSymlink: flag('shared-deps'),
      });
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
  const base = option('base') ?? env.INSIGHT_WT_BASE ?? DEFAULT_BASE;
  const dirty = git(['-C', worktreePath, 'status', '--porcelain']).split('\n').filter(Boolean);
  const ahead = branch ? commitsAhead(branch, base) : Number.NaN;
  const last = git(['-C', worktreePath, 'log', '--oneline', '-1']).trim();
  const deps = dependencyState(worktreePath);

  console.log(`
Task:      ${slug}
Path:      ${worktreePath}
Branch:    ${branch} (ahead of ${base} by ${Number.isNaN(ahead) ? '?' : ahead})
Session:   ${env.INSIGHT_WT_SESSION ?? claim.session ?? '-'}
Ports:     dev=${env.INSIGHT_WT_PORT ?? '-'}  e2e=${env.INSIGHT_E2E_PORT ?? '-'}
Deps:      ${deps.label}${deps.compatible ? '' : ` - ${deps.reason}`}
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
${
  deps.compatible
    ? ''
    : `\nWARNING: ${deps.label} - ${deps.reason}.\nRun \`${commandPrefix()} deps ${slug} --isolate\` before typecheck, lint or ship.\n`
}

Continue:
  cd ${shellQuote(worktreePath)}
  git status
  ${commandPrefix()} handoff ${slug} --next "..." --verify "..."
  ${commandPrefix()} ship ${slug} --message "..."
`);
}

function printStatus() {
  const root = worktreeRoot();
  const worktrees = listWorktrees().map((worktree) => ({
    ...worktree,
    env: readWorktreeEnv(worktree.path),
    handoff: readHandoff(worktree.path),
    dirty: countDirty(worktree.path),
    deps: dependencyState(worktree.path),
    disk: directorySizeKb(worktree.path),
    base: worktreeBase(worktree.path),
    managed: worktree.path.startsWith(`${root}/`),
  }));
  const claims = readClaims();
  const prs = fetchOpenPrs();
  const prByBranch = new Map(prs.map((pull) => [pull.headRefName, pull]));

  const rows = [];
  for (const worktree of worktrees.filter((item) => item.managed)) {
    const task =
      worktree.env.INSIGHT_WT_NAME ?? worktree.path.slice(root.length + 1) ?? '(unnamed)';
    const pull = prByBranch.get(worktree.branch) ?? null;
    const claim = claims.find((item) => item.slug === task) ?? null;
    const stage = taskStage({
      worktree,
      pull,
      handoff: worktree.handoff,
      dirty: worktree.dirty,
      task,
    });
    rows.push({
      task,
      branch: worktree.branch,
      session: worktree.env.INSIGHT_WT_SESSION ?? claim?.session ?? '-',
      dirty: worktree.dirty,
      port: worktree.env.INSIGHT_WT_PORT ?? '-',
      deps: worktree.deps.label,
      disk: formatSize(worktree.disk),
      pr: pull ? `#${pull.number}` : '-',
      ci: pull ? ciSummary(pull.statusCheckRollup) : '-',
      stage: `${stage.alert ? '!' : ''}${stage.stage}`,
      stuck: stage.startedAt ? ageLabel(new Date(stage.startedAt).toISOString()) : '-',
      next: stage.next,
      path: worktree.path,
    });
  }
  // Claims whose worktree disappeared (killed session, manual rm).
  for (const claim of claims.filter(
    (item) => !worktrees.some((worktree) => worktree.env.INSIGHT_WT_NAME === item.slug)
  )) {
    const stale = claimIsStale(claim);
    rows.push({
      task: claim.slug,
      branch: claim.branch,
      session: claim.session,
      dirty: '-',
      port: '-',
      deps: '-',
      disk: '-',
      pr: prByBranch.get(claim.branch) ? `#${prByBranch.get(claim.branch).number}` : '-',
      ci: '-',
      stage: stale ? '!claim-orphaned' : 'creating',
      stuck: ageLabel(claim.updatedAt),
      next: stale
        ? `npm run wt -- cleanup --apply   # or create ${claim.slug} to rebuild`
        : `npm run wt -- create ${claim.slug}   # finish setup`,
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
    'DEPS',
    'DISK',
    'PR',
    'CI',
    'STAGE',
    'STUCK',
    'NEXT',
    'PATH',
  ];
  const body = rows.map((row) => [
    row.task,
    row.branch,
    row.session,
    String(row.dirty),
    row.port,
    row.deps,
    row.disk,
    row.pr,
    row.ci,
    row.stage,
    row.stuck,
    row.next,
    row.path,
  ]);
  const widths = header.map((column, index) =>
    Math.max(column.length, ...body.map((row) => row[index].length))
  );
  const format = (row) => row.map((cell, index) => cell.padEnd(widths[index])).join('  ');
  console.log(format(header));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  body.forEach((row) => console.log(format(row)));
  console.log(`
STUCK = time spent in the current stage. A leading "!" means act now:
  working      dirty files, progress within the last hour
  stalled      dirty files, no file change for over an hour -> run NEXT
  not-shipped  clean, no PR yet -> ship it
  ci-pending   checks still running
  ci-stuck     checks have not settled for over 20 min -> inspect the run / rerun an infra flake
  ci-red       at least one check failed -> fix, commit, push
  conflict     PR is DIRTY -> rebase this branch in this worktree
  blocked      handoff says blocked -> read .handoff.local
  claim-orphaned / creating: no worktree is attached to the claim

DEPS = where node_modules comes from:
  shared            valid symlink to the primary checkout (same lockfile + Node ABI)
  shared-mismatch!  primary tree does not match this branch -> deps <task> --isolate
  isolated          real install in this worktree (owned by this task)
  isolated-broken!  real install does not match the lockfile -> npm ci here
  missing!          no node_modules -> deps <task> --isolate
DISK = checkout size; a shared symlink is not counted twice (see wt cost).
`);
}

// Disk and dependency attribution: answer "how much space does parallel work
// use, and is anyone running an isolated install?" without walking the whole
// filesystem by hand. Shared symlinks are counted once (under the primary
// checkout), never once per consumer.
function printCost() {
  const root = worktreeRoot();
  const primaryPath = primaryWorktree().path;
  const rows = [];
  for (const worktree of listWorktrees()) {
    if (!worktree.path.startsWith(`${root}/`)) continue;
    const env = readWorktreeEnv(worktree.path);
    rows.push({
      task: env.INSIGHT_WT_NAME ?? worktree.path.slice(root.length + 1),
      path: worktree.path,
      deps: dependencyState(worktree.path),
      size: directorySizeKb(worktree.path),
    });
  }

  const primaryModules = join(primaryPath, 'node_modules');
  const primarySize = directorySizeKb(primaryModules);
  const consumers = rows.filter((row) => row.deps.mode === 'shared');
  const isolated = rows.filter((row) => row.deps.mode === 'isolated');
  const isolatedBytes = isolated.reduce((total, row) => total + row.size, 0);
  const worktreeBytes = rows.reduce((total, row) => total + row.size, 0);
  const primaryState = primaryDepsStatus(primaryPath);

  const header = ['TASK', 'DEPS', 'DISK', 'SOURCE'];
  const body = rows.map((row) => [
    row.task,
    row.deps.label,
    formatSize(row.size),
    row.deps.mode === 'shared'
      ? `shared ${row.deps.source ?? '(unknown)'}`
      : row.deps.mode === 'isolated'
        ? 'this worktree'
        : '(none)',
  ]);
  const widths = header.map((column, index) =>
    Math.max(column.length, ...body.map((row) => row[index].length))
  );
  const format = (row) => row.map((cell, index) => cell.padEnd(widths[index])).join('  ');
  console.log(format(header));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  body.forEach((row) => console.log(format(row)));

  console.log(`
Summary
  Primary deps:      ${formatSize(primarySize)} at ${primaryModules}
  Primary status:    ${primaryState.changed ? `CHANGED - ${primaryState.detail}` : primaryState.detail}
  Task checkouts:    ${formatSize(worktreeBytes)} across ${rows.length} worktree(s)
  Isolated installs: ${formatSize(isolatedBytes)} in ${isolated.length} task(s)${
    isolated.length ? ` (${isolated.map((row) => row.task).join(', ')})` : ''
  }
  Shared consumers:  ${consumers.length} task(s) reuse ${formatSize(primarySize)} without a second copy
  Total on disk:     ${formatSize(primarySize + worktreeBytes)} (primary deps + all task checkouts)
`);
  if (primaryState.changed) {
    console.log(
      `  action: ${primaryState.detail}; inspect \`git -C ${primaryPath} status\` before trusting builds.\n`
    );
  }
}

// Classify a task by the step it is stuck on and how long it has been there.
// Timestamps come from the PR/check/handoff, so "stuck" is observable without
// reading the agent's chat log.
function taskStage({ worktree, pull, handoff, dirty, task }) {
  if (handoff?.status === 'blocked') {
    return {
      stage: 'blocked',
      startedAt: parseTime(handoff.updatedAt),
      next: handoff.next || 'read .handoff.local',
      alert: true,
    };
  }
  if (pull) {
    if (pull.state === 'MERGED') {
      return {
        stage: 'merged',
        startedAt: parseTime(pull.updatedAt),
        next: 'cleanup',
        alert: false,
      };
    }
    if (pull.mergeStateStatus === 'DIRTY') {
      return {
        stage: 'conflict',
        startedAt: parseTime(pull.updatedAt),
        next: `rebase this branch: git -C ${worktree.path} rebase ${worktree.base}`,
        alert: true,
      };
    }
    const ci = ciDetail(pull.statusCheckRollup);
    if (ci.failed) {
      return {
        stage: 'ci-red',
        startedAt: ci.at ?? parseTime(pull.updatedAt),
        next: 'fix failing checks in this worktree, commit, push',
        alert: true,
      };
    }
    if (ci.pending) {
      const startedAt = ci.at ?? parseTime(pull.createdAt);
      const stuck = startedAt && Date.now() - startedAt > CI_STUCK_MS;
      return {
        stage: stuck ? 'ci-stuck' : 'ci-pending',
        startedAt,
        next: stuck
          ? 'CI has not settled for 20+ min: inspect the run, rerun infrastructure failures'
          : 'wait for CI (auto-merge is enabled)',
        alert: Boolean(stuck),
      };
    }
    return {
      stage: 'ready',
      startedAt: parseTime(pull.updatedAt),
      next: 'auto-merge takes it',
      alert: false,
    };
  }
  if (dirty > 0) {
    const startedAt = newestActivity(worktree.path);
    const stalled = startedAt && Date.now() - startedAt > NO_PROGRESS_MS;
    return {
      stage: stalled ? 'stalled' : 'working',
      startedAt,
      next: stalled
        ? `resume and finish: ${commandPrefix()} resume ${task}`
        : `record a handoff: ${commandPrefix()} handoff ${task} --next "..."`,
      alert: Boolean(stalled),
    };
  }
  return {
    stage: 'not-shipped',
    startedAt: lastCommitTime(worktree.path),
    next: `${commandPrefix()} ship ${task} --message "..."`,
    alert: false,
  };
}

function parseTime(value) {
  const time = Date.parse(value ?? '');
  return Number.isNaN(time) ? null : time;
}

function newestActivity(worktreePath) {
  const times = [];
  const commit = lastCommitTime(worktreePath);
  if (commit) times.push(commit);
  try {
    const status = execFileSync('git', ['-C', worktreePath, 'status', '--porcelain'], {
      encoding: 'utf8',
    });
    for (const line of status.split('\n').filter(Boolean).slice(0, 30)) {
      const file = line
        .slice(3)
        .trim()
        .replace(/^.* -> /, '');
      try {
        times.push(statSync(join(worktreePath, file)).mtimeMs);
      } catch {
        // deleted files have no mtime
      }
    }
  } catch {
    // not a git worktree
  }
  return times.length ? Math.max(...times) : null;
}

function lastCommitTime(worktreePath) {
  try {
    const iso = execFileSync('git', ['-C', worktreePath, 'log', '-1', '--format=%cI'], {
      encoding: 'utf8',
    }).trim();
    return parseTime(iso);
  } catch {
    return null;
  }
}

function ciDetail(rollup) {
  if (!Array.isArray(rollup)) return { failed: false, pending: false, at: null };
  const failed = new Set(['FAILURE', 'ERROR', 'CANCELLED', 'TIMED_OUT', 'STARTUP_FAILURE']);
  const outstanding = new Set([
    'PENDING',
    'IN_PROGRESS',
    'QUEUED',
    'EXPECTED',
    'WAITING',
    'REQUESTED',
  ]);
  let sawFailure = false;
  let sawPending = false;
  let earliestFailure = null;
  let earliestPending = null;
  for (const check of rollup) {
    const conclusion = String(check.conclusion ?? '').toUpperCase();
    const state = String(check.state ?? '').toUpperCase();
    const status = String(check.status ?? '').toUpperCase();
    if (failed.has(conclusion) || failed.has(state)) {
      sawFailure = true;
      earliestFailure = earliest(earliestFailure, parseTime(check.completedAt ?? check.startedAt));
    } else if (outstanding.has(state) || outstanding.has(status)) {
      sawPending = true;
      earliestPending = earliest(earliestPending, parseTime(check.startedAt ?? check.createdAt));
    }
  }
  if (sawFailure) return { failed: true, pending: false, at: earliestFailure };
  return { failed: false, pending: sawPending, at: earliestPending };
}

function earliest(current, candidate) {
  if (candidate === null) return current;
  if (current === null) return candidate;
  return Math.min(current, candidate);
}

// Pre-flight collision report: same check ship runs, without committing,
// pushing, or touching GitHub beyond reading PR metadata.
function checkTask() {
  const slug = normalizeSlug(positional(1));
  const worktreePath = resolveWorktreePath(slug);
  if (!existsSync(worktreePath)) throw new Error(`no worktree for "${slug}"`);
  const branch = readWorktreeEnv(worktreePath).INSIGHT_WT_BRANCH ?? branchName('feat', slug, null);
  assertDependencyCompatibility(worktreePath, slug, `check ${slug}`);
  const hazards = detectMergeHazards(worktreePath, branch, slug);
  if (hazards.length === 0) {
    console.log(`check: no merge hazards for "${slug}"`);
    return;
  }
  console.log(`check: ${hazards.length} merge hazard(s) for "${slug}"`);
  for (const hazard of hazards) console.log(`  - [${hazard.kind}] ${hazard.message}`);
  process.exitCode = 1;
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
        'number,headRefName,title,url,mergeStateStatus,statusCheckRollup,createdAt,updatedAt,isDraft,files,state',
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
  if (!(await isPortFree(Number(env.INSIGHT_WT_PORT)))) {
    throw new Error(
      `dev port ${env.INSIGHT_WT_PORT} is already listening; refusing to attach to another worktree's server.\n` +
        'Inspect owners with: npm run wt -- services'
    );
  }
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
  if (!portIsFree(Number(env.INSIGHT_E2E_PORT))) {
    throw new Error(
      `e2e port ${env.INSIGHT_E2E_PORT} is already listening; refusing to reuse another worktree's server.\n` +
        'Inspect owners with: npm run wt -- services'
    );
  }
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

  let hazards = [];
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
    assertDependencyIsolation(worktreePath, `ship ${slug}`);
    assertDependencyCompatibility(worktreePath, slug, `ship ${slug}`);
    commitWorktree(worktreePath, message);
    pushBranch(worktreePath, branch);
    const pull = ensurePullRequest(branch, message);
    hazards = detectMergeHazards(worktreePath, branch, slug);
    if (hazards.length === 0) enableAutoMerge(pull);
    return pull;
  });

  if (!pr) {
    console.log(
      `worktree: ${worktreePath} is already gone; the task was finished by another session`
    );
    return;
  }

  if (hazards.length > 0) {
    const next = hazards.map((hazard) => hazard.message).join(' / ');
    writeHandoff(worktreePath, {
      slug,
      goal: claim?.goal ?? message,
      next,
      verify: `npm run wt -- status`,
      branch,
      pr: pr.url ?? '',
      status: 'blocked',
    });
    console.error(`
worktree: refusing to enable auto-merge; this task collides with another open task.
${hazards.map((hazard) => `  - [${hazard.kind}] ${hazard.message}`).join('\n')}
  PR:       ${pr.url ?? '(unknown)'}
  handoff:  ${join(worktreePath, '.handoff.local')}
Merge the blocking task first, then rebase ONLY this branch:
  git -C ${shellQuote(worktreePath)} rebase ${base}
Unique artifacts (lockfiles, cron bundles, migrations) are never allowed to race.
`);
    process.exit(1);
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
    assertWorktreeDirectoryGone(worktreePath);
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

// Ship-time semantic collision check. Claim-time checks only see declared
// paths; this sees what the branch actually changed and what other PRs already
// contain. Unique artifacts block; overlapping hunks in a shared file block;
// same-file-but-different-regions only warn (merge order is enough).
function detectMergeHazards(worktreePath, branch, slug) {
  const hazards = [];
  const changed = changedFiles(worktreePath);
  const uniqueChanged = changed.filter((file) => isUniquePath(file));

  for (const claim of readClaims().filter((item) => item.slug !== slug && claimIsActive(item))) {
    const shared = sharedUniqueCategories(uniqueChanged, claim.paths ?? []);
    if (shared.length > 0) {
      hazards.push({
        kind: 'unique-claim',
        message: `${claim.slug} (${claim.session}) still owns ${shared.join(', ')}; merge it first`,
      });
    }
  }

  let openPrs = [];
  try {
    openPrs = fetchOpenPrs();
  } catch {
    console.warn('worktree: could not list open PRs; skipping cross-PR collision checks');
  }
  openPrs = openPrs.filter((other) => other.headRefName !== branch);
  const prFiles = new Map(
    openPrs.map((other) => [other.number, new Set((other.files ?? []).map((file) => file.path))])
  );

  for (const other of openPrs) {
    const shared = sharedUniqueCategories(uniqueChanged, [...prFiles.get(other.number)]);
    if (shared.length > 0) {
      hazards.push({
        kind: 'unique-pr',
        message: `PR #${other.number} (${other.headRefName}) already changes ${shared.join(', ')}; merge it first`,
      });
    }
  }

  if (openPrs.length === 0) return hazards;
  let ownHunks;
  try {
    ownHunks = diffHunks(ownDiffPatch(worktreePath));
  } catch {
    return hazards;
  }
  for (const other of openPrs) {
    const files = prFiles.get(other.number) ?? new Set();
    const common = changed.filter((file) => files.has(file) && !isUniquePath(file));
    if (common.length === 0) continue;
    let patch;
    try {
      patch = execFileSync('gh', ['pr', 'diff', String(other.number)], {
        cwd: primaryWorktree().path,
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024,
      });
    } catch {
      console.warn(`worktree: could not read the diff of PR #${other.number}; skipping hunk check`);
      continue;
    }
    const overlapping = overlappingHunks(ownHunks, diffHunks(patch), common);
    if (overlapping.length > 0) {
      hazards.push({
        kind: 'hunk-overlap',
        message: `PR #${other.number} edits the same lines in ${overlapping.join(', ')}; merge it first`,
      });
    }
  }
  return hazards;
}

function ownDiffPatch(worktreePath) {
  const base = worktreeBase(worktreePath);
  const mergeBase = execFileSync('git', ['-C', worktreePath, 'merge-base', base, 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  return execFileSync('git', ['-C', worktreePath, 'diff', '-U0', mergeBase], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
}

// Parse `@@ -start,count +start,count @@` into base-file line ranges. Both
// branches are compared against origin/main, so the `-` side is the shared
// coordinate system; only approximations are needed to spot collisions.
function diffHunks(patch) {
  const hunks = [];
  let file = null;
  for (const line of patch.split('\n')) {
    if (line.startsWith('diff --git ')) {
      const match = line.match(/ b\/(.+)$/);
      file = match ? match[1] : null;
      continue;
    }
    const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (!match || !file) continue;
    const start = Number(match[1]);
    const count = match[2] === undefined ? 1 : Number(match[2]);
    hunks.push({ file, start, end: start + Math.max(count - 1, 0), empty: count === 0 });
  }
  return hunks;
}

function overlappingHunks(left, right, files) {
  const result = [];
  for (const file of files) {
    const mine = left.filter((hunk) => hunk.file === file);
    const theirs = right.filter((hunk) => hunk.file === file);
    const hit = mine.some((a) => theirs.some((b) => rangesOverlap(a, b)));
    if (hit) result.push(file);
  }
  return result;
}

function rangesOverlap(left, right) {
  if (left.empty && right.empty) return left.start === right.start;
  if (left.empty) return right.start <= left.start && left.start <= right.end;
  if (right.empty) return left.start <= right.start && right.start <= left.end;
  return Math.max(left.start, right.start) <= Math.min(left.end, right.end);
}

let autoMergeEnabled = true;

function enableAutoMerge(pr) {
  if (pr.state === 'MERGED' || pr.state === 'CLOSED') return;
  try {
    execFileSync('gh', ['pr', 'merge', String(pr.number), '--squash', '--auto'], {
      stdio: 'inherit',
      cwd: primaryWorktree().path,
    });
  } catch {
    autoMergeEnabled = false;
    console.warn(
      'worktree: auto-merge is unavailable on this repo; will merge directly once checks pass'
    );
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
    // Repos without native auto-merge (or with it disabled) still get a
    // one-shot squash merge once checks are clean.
    if (!autoMergeEnabled && !hasPendingChecks(pr.statusCheckRollup)) {
      try {
        execFileSync('gh', ['pr', 'merge', String(pr.number), '--squash'], {
          stdio: 'inherit',
          cwd: primaryWorktree().path,
        });
      } catch (error) {
        console.warn(`worktree: direct merge did not go through yet (${error.message})`);
      }
    }
    await sleep(20_000);
  }
  console.warn(
    `worktree: PR for ${branch} was not merged within ${Math.round(timeoutMs / 60_000)} min`
  );
  return { status: 'timeout' };
}

function hasPendingChecks(rollup) {
  return ciDetail(rollup).pending;
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
  for (const relative of ['node_modules', ...nestedNodeModules(primaryPath)]) {
    linkIfPresent(join(primaryPath, relative), join(worktreePath, relative));
  }
}

// After an isolated `npm ci`, the root tree belongs to this worktree; every
// nested workspace still reuses the primary checkout's install.
function linkNestedNodeModules(primaryPath, worktreePath) {
  for (const relative of nestedNodeModules(primaryPath)) {
    linkIfPresent(join(primaryPath, relative), join(worktreePath, relative));
  }
}

// Repos differ: Insight has verifier/sdk, PriorSeal has examples/*. Detect
// node_modules directories up to two levels deep instead of hardcoding them.
function nestedNodeModules(primaryPath) {
  const found = new Set(NESTED_INSTALLS);
  const skip = new Set(['node_modules', '.git', '.next', 'coverage', 'test-results', 'output']);
  for (const top of readdirSync(primaryPath, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory()
  )) {
    if (skip.has(top.name)) continue;
    const dir = join(primaryPath, top.name);
    if (existsSync(join(dir, 'package.json')) && existsSync(join(dir, 'node_modules'))) {
      found.add(join(top.name, 'node_modules'));
    }
    for (const child of readdirSync(dir, { withFileTypes: true }).filter((entry) =>
      entry.isDirectory()
    )) {
      const sub = join(dir, child.name);
      if (existsSync(join(sub, 'package.json')) && existsSync(join(sub, 'node_modules'))) {
        found.add(join(top.name, child.name, 'node_modules'));
      }
    }
  }
  return [...found];
}

function linkIfPresent(source, target) {
  if (!existsSync(source) || existsSync(target)) return;
  mkdirSync(join(target, '..'), { recursive: true });
  symlinkSync(source, target);
}

function linkEnvFiles(primaryPath, worktreePath) {
  // Copy, not symlink: a task that edits .env.local must not rewrite every
  // other worktree's environment. The files are a few KB, so the copy is cheap.
  for (const file of localEnvFiles(primaryPath)) {
    const source = join(primaryPath, file);
    const target = join(worktreePath, file);
    if (!existsSync(source) || existsSync(target)) continue;
    copyFileSync(source, target);
    try {
      chmodSync(target, 0o600);
    } catch {
      // best effort; the file is untracked and local-only
    }
  }
}

function localEnvFiles(primaryPath) {
  try {
    return readdirSync(primaryPath).filter(
      (file) => file.startsWith('.env') && !file.endsWith('.example')
    );
  } catch {
    return ENV_FILES;
  }
}

// `node_modules/` in a .gitignore only matches real directories, so the symlink
// a worktree gets shows up as untracked. That makes `git add -A` stage the link
// and makes status look permanently dirty. Add local-only excludes instead of
// touching the repository's tracked .gitignore.
function excludeWorktreeArtifacts(worktreePath) {
  try {
    const excludePath = execFileSync(
      'git',
      ['-C', worktreePath, 'rev-parse', '--git-path', 'info/exclude'],
      { encoding: 'utf8' }
    ).trim();
    if (!excludePath) return;
    const current = existsSync(excludePath) ? readFileSync(excludePath, 'utf8') : '';
    const lines = new Set(current.split('\n').map((line) => line.trim()));
    const missing = WORKTREE_EXCLUDES.filter((pattern) => !lines.has(pattern));
    if (missing.length === 0) return;
    writeFileSync(
      excludePath,
      `${current}${current && !current.endsWith('\n') ? '\n' : ''}` +
        `# worktree artifacts (managed by scripts/worktree.mjs)\n${missing.join('\n')}\n`
    );
  } catch (error) {
    console.warn(`worktree: could not update info/exclude (${error.message})`);
  }
}

function installHooks(worktreePath) {
  // Repos that keep hooks in .githooks (PriorSeal) share core.hooksPath, so a
  // new worktree inherits the hooks; just make sure the config points at it.
  if (existsSync(join(worktreePath, '.githooks'))) {
    try {
      execFileSync('git', ['-C', worktreePath, 'config', 'core.hooksPath', '.githooks']);
      chmodSync(join(worktreePath, '.githooks', 'pre-commit'), 0o755);
    } catch {
      console.warn('worktree: could not activate .githooks');
    }
    return;
  }
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

// --- dependency isolation --------------------------------------------------

// --- dependency compatibility ----------------------------------------------
//
// A symlinked `node_modules` is only safe when it was installed from the same
// lockfiles this worktree checks out for the same Node ABI. Reusing the primary
// checkout's tree while it sits on an older branch makes esbuild/tsc/eslint run
// against a different dependency set, which surfaces as a false "committed cron
// bundles are stale" pre-commit error (or a missing platform optional package).
// The functions below make that state explicit and block work on it.

// Every package-lock.json this worktree checks out, up to two levels (root,
// verifier/, sdk/, integrations/*, examples/*).
function lockfilesUnder(root) {
  const found = [];
  const walk = (dir, depth) => {
    let entries;
    try {
      entries = readdirSync(join(root, dir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (depth > 0 && !SKIP_DEPENDENCY_DIRS.has(entry.name)) {
          walk(join(dir, entry.name), depth - 1);
        }
        continue;
      }
      if (entry.name === 'package-lock.json') found.push(join(root, dir, entry.name));
    }
  };
  walk('', 2);
  return found.sort();
}

// Identity of the dependency set a checkout is entitled to: lockfile bytes
// (with their relative path) plus the native ABI that installed binaries were
// built for. Two trees with the same fingerprint are byte-compatible inputs.
function dependencyFingerprint(root) {
  const hash = createHash('sha256');
  for (const file of lockfilesUnder(root)) {
    hash.update(relative(root, file));
    hash.update('\0');
    hash.update(readFileSync(file));
    hash.update('\0');
  }
  hash.update(`${process.platform}-${process.arch}-modules-${process.versions.modules}`);
  return hash.digest('hex').slice(0, 16);
}

function packageMatchesPlatform(entry) {
  const test = (list, actual) => {
    if (!Array.isArray(list) || list.length === 0) return true;
    const denied = list.filter((value) => value.startsWith('!')).map((value) => value.slice(1));
    if (denied.includes(actual)) return false;
    const allowed = list.filter((value) => !value.startsWith('!'));
    return allowed.length === 0 ? true : allowed.includes(actual);
  };
  return test(entry.os, process.platform) && test(entry.cpu, process.arch);
}

// npm records every package it installed in node_modules/.package-lock.json.
// Compare that record with the lockfile this checkout expects, including the
// platform optional binary (esbuild's native package is the common casualty of
// an install run with --omit=optional or copied from another machine).
function installedDependenciesIssue(root) {
  const modules = join(root, 'node_modules');
  let stat;
  try {
    stat = lstatSync(modules);
  } catch {
    return 'node_modules is missing';
  }
  if (stat.isSymbolicLink()) return null;
  const installedPath = join(modules, '.package-lock.json');
  if (!existsSync(installedPath)) {
    return 'node_modules has no .package-lock.json, so npm never finished an install here';
  }
  let wanted;
  let installed;
  try {
    wanted = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
    installed = JSON.parse(readFileSync(installedPath, 'utf8'));
  } catch {
    return null;
  }
  const wantedPackages = wanted.packages ?? {};
  const installedPackages = installed.packages ?? {};
  const missing = [];
  const mismatched = [];
  const ancestorsMissing = (path) => {
    // node_modules/a/node_modules/b -> ["node_modules/a"]
    const out = [];
    let index = path.indexOf('/node_modules/');
    while (index !== -1) {
      out.push(path.slice(0, index));
      index = path.indexOf('/node_modules/', index + 1);
    }
    return out;
  };
  for (const [path, entry] of Object.entries(wantedPackages)) {
    if (!path || entry.link) continue;
    const skip = ancestorsMissing(path).some((ancestor) => !installedPackages[ancestor]);
    // A missing parent (usually a platform-specific optional package) is
    // reported once; its transitive children are not separate problems.
    if (skip) continue;
    if (entry.optional && !packageMatchesPlatform(entry)) continue;
    const actual = installedPackages[path];
    if (!actual) {
      // Top-level optional packages for another platform are expected to be
      // absent; only report optional packages that match this platform.
      if (entry.optional && !packageMatchesPlatform(entry)) continue;
      missing.push(path);
    } else if (entry.version && actual.version && entry.version !== actual.version) {
      mismatched.push(`${path} (want ${entry.version}, have ${actual.version})`);
    }
  }
  if (missing.length === 0 && mismatched.length === 0) return null;
  const sample = [...missing.slice(0, 4), ...mismatched.slice(0, 4)].join(', ');
  return `${missing.length + mismatched.length} package(s) do not match the lockfile: ${sample}${
    missing.length + mismatched.length > 8 ? ', ...' : ''
  }`;
}

// Describe how this worktree's node_modules was obtained and whether it is a
// valid input for its own lockfile. `compatible` is what `typecheck`, `lint`
// and `build:cron:check` need; `reason` is printed instead of a mysterious
// downstream failure.
function dependencyState(worktreePath) {
  const target = join(worktreePath, 'node_modules');
  const desired = dependencyFingerprint(worktreePath);
  let stat;
  try {
    stat = lstatSync(target);
  } catch {
    return {
      mode: 'missing',
      label: 'missing!',
      compatible: false,
      source: null,
      fingerprint: desired,
      reason: 'node_modules is missing',
    };
  }
  if (stat.isSymbolicLink()) {
    let source;
    try {
      source = realpathSync(target);
    } catch {
      source = target;
    }
    const owner = dirname(source);
    let sourceFingerprint = null;
    let issue = null;
    try {
      sourceFingerprint = dependencyFingerprint(owner);
      issue = installedDependenciesIssue(owner);
    } catch {
      // unreadable source: treat as incompatible below
    }
    const compatible = sourceFingerprint === desired && !issue;
    const reason = !sourceFingerprint
      ? `cannot read the lockfiles behind ${source}`
      : sourceFingerprint !== desired
        ? `the symlink target belongs to ${owner}, whose lockfile/ABI differs from this worktree`
        : issue;
    return {
      mode: 'shared',
      label: compatible ? 'shared' : 'shared-mismatch!',
      compatible,
      source,
      fingerprint: desired,
      sourceFingerprint,
      reason,
    };
  }
  const issue = installedDependenciesIssue(worktreePath);
  return {
    mode: 'isolated',
    label: issue ? 'isolated-broken!' : 'isolated',
    compatible: !issue,
    source: target,
    fingerprint: desired,
    reason: issue,
  };
}

function readDepsState(worktreePath) {
  const path = join(worktreePath, DEPS_STATE_FILE);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function writeDepsState(worktreePath, task, state = dependencyState(worktreePath)) {
  atomicWrite(
    join(worktreePath, DEPS_STATE_FILE),
    `${JSON.stringify(
      {
        task,
        mode: state.mode,
        source: state.source,
        fingerprint: state.fingerprint,
        sourceFingerprint: state.sourceFingerprint ?? null,
        compatible: state.compatible,
        node: process.versions.modules,
        recordedAt: new Date().toISOString(),
      },
      null,
      2
    )}\n`
  );
}

// Can the primary checkout's installed tree truthfully serve this worktree?
function dependencyCompatibility(primaryPath, worktreePath) {
  const desired = dependencyFingerprint(worktreePath);
  const source = dependencyFingerprint(primaryPath);
  if (desired !== source) {
    return {
      ok: false,
      fingerprint: desired,
      reason:
        `the primary checkout (${primaryPath}) has a different dependency set ` +
        `(${source} vs ${desired}); it is probably checked out on another branch`,
    };
  }
  const issue = installedDependenciesIssue(primaryPath);
  if (issue) {
    return {
      ok: false,
      fingerprint: desired,
      reason: `the primary node_modules is incomplete: ${issue}`,
    };
  }
  return { ok: true, fingerprint: desired, reason: null };
}

// Hard gate for commands that build, typecheck or commit. A new agent must see
// one actionable sentence, not a stale-bundle or missing-module error.
function assertDependencyCompatibility(worktreePath, slug, label) {
  const state = dependencyState(worktreePath);
  if (state.compatible) return;
  const remedy = `${commandPrefix()} deps ${slug} --isolate`;
  throw new Error(
    `${label}: node_modules in ${worktreePath} is not valid for this branch.\n` +
      `  state:  ${state.mode}${state.reason ? ` - ${state.reason}` : ''}\n` +
      '  effect: typecheck, lint and build:cron:check would fail or report false stale output.\n' +
      `  fix:    ${remedy}\n` +
      (state.mode === 'missing'
        ? `  note:   an isolated install of this repository is about 1.9 GB; \`${commandPrefix()} cost\` shows usage.`
        : '  note:   the shared tree is read-only; do not run npm install through it.')
  );
}

function recordPrimaryDepsBaseline(primaryPath, slug) {
  const path = join(taskDir(), PRIMARY_DEPS_BASELINE);
  if (existsSync(path)) return;
  mkdirSync(taskDir(), { recursive: true });
  atomicWrite(
    path,
    `${JSON.stringify(
      {
        fingerprint: dependencyFingerprint(primaryPath),
        node: process.versions.modules,
        recordedAt: new Date().toISOString(),
        byTask: slug,
      },
      null,
      2
    )}\n`
  );
}

function primaryDepsStatus(primaryPath) {
  const baselinePath = join(taskDir(), PRIMARY_DEPS_BASELINE);
  let baseline = null;
  try {
    baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  } catch {
    // no baseline yet
  }
  const modules = join(primaryPath, 'node_modules');
  try {
    if (lstatSync(modules).isSymbolicLink()) {
      return {
        changed: true,
        detail: `primary node_modules is a symlink to ${realpathSync(modules)}; a task replaced the primary tree`,
      };
    }
  } catch {
    return { changed: true, detail: 'primary node_modules is missing' };
  }
  const current = dependencyFingerprint(primaryPath);
  if (!baseline?.fingerprint) {
    return { changed: false, detail: 'no baseline recorded yet (the next create records one)' };
  }
  if (baseline.fingerprint !== current) {
    return {
      changed: true,
      detail: `primary dependency set changed since ${baseline.byTask ?? 'create'} recorded it at ${baseline.recordedAt}`,
    };
  }
  return { changed: false, detail: 'matches the recorded baseline' };
}

function worktreeBase(worktreePath) {
  return readWorktreeEnv(worktreePath).INSIGHT_WT_BASE ?? DEFAULT_BASE;
}

// Every tracked or untracked path this worktree differs from its base in. The
// union matters: a brand-new migration or manifest is untracked until staged.
function changedFiles(worktreePath) {
  const base = worktreeBase(worktreePath);
  const files = new Set();
  try {
    const mergeBase = execFileSync('git', ['-C', worktreePath, 'merge-base', base, 'HEAD'], {
      encoding: 'utf8',
    }).trim();
    execFileSync('git', ['-C', worktreePath, 'diff', '--name-only', mergeBase], {
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean)
      .forEach((file) => files.add(file));
  } catch {
    execFileSync('git', ['-C', worktreePath, 'diff', '--name-only', 'HEAD'], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .forEach((file) => files.add(file));
  }
  execFileSync('git', ['-C', worktreePath, 'ls-files', '--others', '--exclude-standard'], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .forEach((file) => files.add(file));
  return [...files];
}

function assertDependencyIsolation(worktreePath, label, options = {}) {
  const manifests = changedFiles(worktreePath).filter(isDependencyManifest);
  if (manifests.length === 0) return;
  const shared = manifests
    .map((manifest) => ({ manifest, mode: nodeModulesModeFor(worktreePath, manifest) }))
    .filter((entry) => entry.mode !== 'isolated');
  if (shared.length === 0) return;
  if (options.allowSymlink) {
    console.warn(
      `worktree: ${label} has dependency changes (${manifests.join(', ')}) with shared node_modules; ` +
        'this pollutes every worktree and is only allowed because --shared-deps was passed'
    );
    return;
  }
  throw new Error(
    `${label}: dependency manifests changed (${shared
      .map((entry) => `${entry.manifest} -> ${entry.mode}`)
      .join(', ')}) while node_modules is shared or missing.\n` +
      'Installing through the symlink rewrites every worktree. Do this instead:\n' +
      '  npm run wt -- deps <slug> --isolate   # real node_modules, then npm install\n' +
      'Never run npm install in shared mode.'
  );
}

function manageDependencies() {
  const slug = normalizeSlug(positional(1));
  const worktreePath = resolveWorktreePath(slug);
  if (!existsSync(worktreePath)) throw new Error(`no worktree for "${slug}"`);

  const manifests = changedFiles(worktreePath).filter(isDependencyManifest);
  const sharedDirs = sharedNodeModulesDirs(worktreePath);
  const state = dependencyState(worktreePath);
  const disk = directorySizeKb(worktreePath);
  console.log(`
Task:      ${slug}
Path:      ${worktreePath}
Mode:      ${state.label}${state.mode === 'shared' ? ' (unsafe for dependency changes)' : ''}
Valid:     ${state.compatible ? 'yes - matches this branch lockfile and Node ABI' : `no - ${state.reason}`}
Shared:    ${sharedDirs.length ? sharedDirs.join(', ') : '(none)'}
Manifests: ${manifests.length ? manifests.join(', ') : '(unchanged)'}
Source:    ${state.mode === 'isolated' ? `${formatSize(disk)} local node_modules` : (state.source ?? 'primary checkout')}
`);

  if (!flag('isolate')) return;
  if (sharedDirs.length === 0 && state.compatible && manifests.length === 0) {
    console.log('worktree: already isolated; nothing to do');
    return;
  }
  // Install the removed shared dirs plus every directory whose manifest
  // changed. An isolated tree can still be stale when an agent edited the
  // lockfile without installing (`deps --isolate` is the single remedy).
  const installDirs = new Set(sharedDirs);
  for (const manifest of manifests) installDirs.add(manifestDir(manifest));
  if (installDirs.size === 0) installDirs.add('');
  for (const dir of [...installDirs].sort((a, b) => a.split('/').length - b.split('/').length)) {
    if (sharedDirs.includes(dir)) {
      rmSync(join(worktreePath, dir, 'node_modules'), { recursive: true, force: true });
      console.log(`worktree: removed shared node_modules at ${dir || '.'}`);
    }
    console.log(`worktree: installing dependencies in ${dir || '.'}`);
    run('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund'], {
      cwd: join(worktreePath, dir),
    });
  }
  installHooks(worktreePath);
  const after = dependencyState(worktreePath);
  writeDepsState(worktreePath, slug, after);
  console.log(
    `worktree: dependencies installed (${formatSize(directorySizeKb(worktreePath))}, ${after.label}). ` +
      'npm install now only mutates this worktree.'
  );
  if (!after.compatible) {
    console.warn(
      `worktree: the isolated tree is still not valid for this branch (${after.reason}); ` +
        'run npm ci in this directory before building or committing.'
    );
  }
}

// Any package.json/package-lock.json at any depth (root, verifier/, sdk/,
// examples/*) shares the primary checkout's dependency tree, so a change in
// any of them needs an isolated install in that same directory.
function isDependencyManifest(path) {
  return /(^|\/)(package-lock\.json|package\.json)$/.test(path);
}

function manifestDir(manifest) {
  return manifest.includes('/') ? manifest.slice(0, manifest.lastIndexOf('/')) : '';
}

function nodeModulesModeFor(worktreePath, manifest) {
  const target = join(worktreePath, manifestDir(manifest), 'node_modules');
  try {
    return lstatSync(target).isSymbolicLink() ? 'shared' : 'isolated';
  } catch {
    return 'missing';
  }
}

// Every directory in this worktree whose node_modules is still the primary
// checkout's symlink. Mirrors linkNodeModules, so --isolate leaves no shared
// tree behind anywhere in the repo (root, verifier/, sdk/, integrations/, examples/).
function sharedNodeModulesDirs(worktreePath) {
  const dirs = [];
  const walk = (dir, depth) => {
    const target = join(worktreePath, dir, 'node_modules');
    try {
      if (lstatSync(target).isSymbolicLink()) dirs.push(dir);
    } catch {
      // no node_modules here
    }
    if (depth === 0) return;
    let entries = [];
    try {
      entries = readdirSync(join(worktreePath, dir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (
        !entry.isDirectory() ||
        ['node_modules', '.git', '.next', 'coverage'].includes(entry.name)
      ) {
        continue;
      }
      walk(join(dir, entry.name), depth - 1);
    }
  };
  walk('', 2);
  return dirs;
}

function directorySizeKb(targetPath) {
  let bytes = 0;
  const walk = (current) => {
    let stat;
    try {
      stat = lstatSync(current);
    } catch {
      return;
    }
    // Do not follow the shared node_modules symlink: an isolated tree must
    // report its own size, not the primary checkout's.
    if (stat.isSymbolicLink()) return;
    if (stat.isDirectory()) {
      let entries = [];
      try {
        entries = readdirSync(current);
      } catch {
        return;
      }
      for (const entry of entries) walk(join(current, entry));
      return;
    }
    bytes += stat.size;
  };
  walk(targetPath);
  return Math.round(bytes / 1024);
}

// directorySizeKb returns KB; format it so the printed unit matches.
function formatSize(kb) {
  if (!Number.isFinite(kb)) return '?';
  if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(1)} GB`;
  return `${Math.max(Math.round(kb / 1024), 1)} MB`;
}

// --- local service observability ------------------------------------------

async function printServices() {
  const root = worktreeRoot();
  const managed = listWorktrees().filter(
    (worktree) =>
      worktree.path.startsWith(`${root}/`) && existsSync(join(worktree.path, '.worktree.local'))
  );
  const header = ['TASK', 'DEV', 'E2E', 'DEV LISTENING', 'E2E LISTENING', 'SUPABASE'];
  const body = [];
  let localSupabase = 0;
  for (const worktree of managed) {
    const env = readWorktreeEnv(worktree.path);
    const dev = Number(env.INSIGHT_WT_PORT);
    const e2e = Number(env.INSIGHT_E2E_PORT);
    const devFree = Number.isFinite(dev) ? await isPortFree(dev) : true;
    const e2eFree = Number.isFinite(e2e) ? await isPortFree(e2e) : true;
    const supabase = supabaseHost(worktree.path);
    if (supabase.local) localSupabase += 1;
    body.push([
      env.INSIGHT_WT_NAME ?? worktree.path.slice(root.length + 1),
      String(dev || '-'),
      String(e2e || '-'),
      Number.isFinite(dev) ? (devFree ? 'no' : 'yes') : '-',
      Number.isFinite(e2e) ? (e2eFree ? 'no' : 'yes') : '-',
      supabase.label,
    ]);
  }

  if (body.length === 0) {
    console.log('services: no managed worktrees');
    return;
  }
  const widths = header.map((column, index) =>
    Math.max(column.length, ...body.map((row) => row[index].length))
  );
  const format = (row) => row.map((cell, index) => cell.padEnd(widths[index])).join('  ');
  console.log(format(header));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  body.forEach((row) => console.log(format(row)));

  const supabasePorts = [54321, 54322, 54323, 54324].filter((port) => !portIsFree(port));
  const containers = supabaseContainers();
  console.log('');
  if (supabasePorts.length > 0 || containers.length > 0) {
    console.log(
      `Shared local Supabase: ports ${supabasePorts.join(', ') || '(none)'}; containers ${containers.join(', ') || '(none)'}`
    );
  }
  if (localSupabase > 1 || (containers.length > 0 && managed.length > 1)) {
    console.log(
      '! Local Supabase is a single shared instance (project_id and ports are fixed in supabase/config.toml).\n' +
        '  Two worktrees must not run `supabase start`/`supabase db reset` at the same time.\n' +
        '  Serialize database work, or point worktrees at the hosted project (this repo uses the hosted URL).'
    );
  } else {
    console.log('No shared local database conflict detected.');
  }
  console.log(
    'Ports come from .worktree.local; `wt e2e` refuses to start when its port is already taken.\n' +
      'If a port is stuck, find the owner with: lsof -nP -iTCP:<port> -sTCP:LISTEN'
  );
}

function supabaseHost(worktreePath) {
  const envPath = join(worktreePath, '.env.local');
  if (!existsSync(envPath)) return { label: '-', local: false };
  try {
    const line = readFileSync(envPath, 'utf8')
      .split('\n')
      .find((entry) => /^NEXT_PUBLIC_SUPABASE_URL=/.test(entry));
    if (!line) return { label: '(unset)', local: false };
    const url = line.slice(line.indexOf('=') + 1).trim();
    const host = url
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .split(':')[0];
    const local = /^(localhost|127\.0\.0\.1)$/.test(host) || /:54321$/.test(url);
    return { label: local ? `local (${host})` : `hosted (${host})`, local };
  } catch {
    return { label: '-', local: false };
  }
}

function supabaseContainers() {
  try {
    return execFileSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf8' })
      .split('\n')
      .filter((name) => name.includes('supabase'));
  } catch {
    return [];
  }
}

// Synchronous best-effort port check for reporting (the async one cannot be
// awaited from cleanup/status paths).
function portIsFree(port) {
  try {
    const result = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
    });
    return result.status !== 0 || !result.stdout.trim();
  } catch {
    return true;
  }
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

function repoHasScript(name) {
  try {
    const pkg = JSON.parse(readFileSync(join(primaryWorktree().path, 'package.json'), 'utf8'));
    return Boolean(pkg.scripts?.[name]);
  } catch {
    return false;
  }
}

// In Insight the script is exposed as `npm run wt`. In a repository that has not
// added that script (PriorSeal), print the exact `node <script>` invocation instead
// of handing the agent a command that does not exist.
function commandPrefix() {
  if (repoHasScript('wt')) return 'npm run wt --';
  return `node ${shellQuote(fileURLToPath(import.meta.url))}`;
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
      const ownerDead = owner?.pid && !pidAlive(owner.pid);
      if (ownerDead || (owner && Date.now() - owner.startedAt > LOCK_TTL_MS)) {
        console.warn(
          `worktree: clearing ${ownerDead ? 'abandoned' : 'stale'} lock from ${
            owner.command
          } (pid ${owner.pid})`
        );
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

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
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

// Unique artifacts collide by category even when the exact files differ (two
// migrations, two cron bundles), so this check ignores path intersection.
function findUniqueClaimConflicts(slug, paths) {
  if (uniqueCategories(paths).length === 0) return [];
  return readClaims()
    .filter((claim) => claim.slug !== slug && claimIsActive(claim))
    .filter((claim) => sharedUniqueCategories(paths, claim.paths ?? []).length > 0);
}

function splitPaths(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((path) => path.trim())
    .filter(Boolean);
}

function dependencyPathsIn(paths) {
  return paths.filter((path) => isDependencyManifest(path));
}

function isUniquePath(path) {
  return uniqueCategory(path) !== null;
}

// Two different migrations still collide with each other, so serialization is
// per category, not per exact file.
function uniqueCategory(path) {
  if (isDependencyManifest(path)) return 'dependency-manifests';
  if (globsIntersect(path, '.github/cron-dist/*')) return 'cron-bundles';
  if (globsIntersect(path, 'supabase/migrations/*') || globsIntersect(path, 'migrations/*')) {
    return 'migrations';
  }
  return null;
}

function uniqueCategories(paths) {
  return [...new Set(paths.map(uniqueCategory).filter(Boolean))];
}

function sharedUniqueCategories(left, right) {
  const mine = new Set(uniqueCategories(left));
  return uniqueCategories(right).filter((category) => mine.has(category));
}

function overlappingPaths(left, right) {
  return left.filter((a) => right.some((b) => globsIntersect(a, b)));
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
  cost
  queue
  remove <slug> [--force] [--delete-branch]
  cleanup [--apply] [--stale-days <n>] [--report-all] [--base <ref>]
  claim <slug> [--paths "..."] [--goal "..."] [--override]
  release <slug>
  deps <slug> [--isolate]
  services
  check <slug>
  handoff <slug> [--goal "..."] [--next "..."] [--verify "..."] [--blocked]
  resume <slug> [--base <ref>]
  dev
  e2e [-- playwright args]
  ship <slug> --message "type: subject" [--session <id>]

Rules:
  - one task = one branch = one worktree; never share a branch between sessions
  - declare expected paths at create time; overlapping claims are refused before work starts
  - unique artifacts (package.json, lockfiles, .github/cron-dist/*, migrations) are
    serial: the second claim is refused and ship blocks while another PR owns one
  - dependency changes need isolated node_modules: create --install or deps --isolate
  - shared symlinked node_modules must never receive npm install output
  - ship refuses auto-merge when another open PR edits the same hunks; unique artifacts always block
  - pre-commit never touches the shared stash stack
  - cleanup deletes merged branches only (ancestor | no unique commits | tree identical | merged PR);
    hand-named branches are reported, never deleted
  - write a handoff before a long pause so any session can resume the task
  - status shows the stage, how long the task has been there, and the next command
  - cost shows per-task disk, shared vs isolated dependencies, and primary-deps drift

Environment:
  INSIGHT_WORKTREE_ROOT   worktree root (default ~/Documents/insight-worktrees)
  INSIGHT_AGENT_SESSION   session id used in branch names and .worktree.local
  INSIGHT_WT_BASE         base ref (default origin/main)
  INSIGHT_WT_NESTED_INSTALLS  comma-separated nested node_modules paths to symlink
`);
}
