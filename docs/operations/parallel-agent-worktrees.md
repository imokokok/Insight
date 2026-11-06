# Parallel agent worktrees

Multiple agent sessions editing this repository at the same time used to collide on
four shared resources. This document defines the workflow that removes those
collisions, plus the commands that enforce it.

## Why parallel sessions collide

| Shared resource                                                | What goes wrong                                                                                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| One working tree: `.git/index` + `HEAD`                        | Session A checks out `main` while session B has staged work; B's commit lands on A's branch, and local `main` forks from `origin/main` |
| One `refs/stash` stack                                         | `lint-staged` auto-stashes ~30 unrelated unstaged files, a second session stashes on top, and a pop restores the wrong entry           |
| Build caches: `.next/`, `*.tsbuildinfo`, `.eslintcache`        | Two `next dev` / `tsc` runs overwrite each other's outputs and read stale results                                                      |
| Fixed ports (`3000` dev, `3000` e2e)                           | Second window fails to bind, or e2e silently tests the first window's server                                                           |
| Branch names typed by hand                                     | Two sessions pick the same name; the loser inherits the winner's commits                                                               |
| One `node_modules` (even when symlinked)                       | A dependency change + `npm install` in one worktree can rewrite, detach or empty the shared tree for every worktree                    |
| One copy of `package.json`, lockfile, cron bundles, migrations | Two PRs change the same generated/ordered artifact and the second can only be resolved by hand after CI                                |
| Same source file, different regions                            | Path-level claims do not see that both agents edited `src/shared.ts`; the overlap only appears at merge time                           |

A Git worktree gives each task its own `HEAD`, index, working tree and cache
directories while sharing one object database. That is the fix; the rules below
make it the default.

## One task = one branch = one worktree

```
npm run wt -- create <slug> [--type feat|fix|chore|docs|test|perf|ops|refactor]
                            [--session <id>] [--base origin/main]
                            [--paths "a.ts,dir/**"] [--goal "..."]
                            [--no-fetch] [--install] [--override]
```

The command:

- creates branch `wt/<type>-<slug>` (plus `-<session>` when a session id is set),
  which makes the owning task traceable from `git branch` alone;
- places the worktree **outside** the repository at
  `~/Documents/insight-worktrees/<repo>-<slug>` (override with
  `INSIGHT_WORKTREE_ROOT`), so the primary checkout's `tsc`, `next build` and
  `eslint` never scan another task's sources;
- symlinks `node_modules` (root plus every nested `*/node_modules` found up to
  two levels, e.g. `verifier/`, `sdk/`, `integrations/*`, PriorSeal's
  `examples/*`) instead of reinstalling — a worktree adds one checkout of the
  source tree and its own build output, never a second copy of the dependencies
  or the git object database. The link is **read-only by contract**: a task that
  declares `package.json`/`package-lock.json` must pass `--install` (or run
  `deps --isolate` before editing the manifest), because installing through the
  shared link is not safe across npm versions;
- **copies** every local `.env*` file (0600) instead of symlinking it, so a task
  that edits `.env.local` cannot rewrite another worktree's environment; the
  files are a few KB, so there is no meaningful disk cost;
- activates the repo's hook layout: `husky` for this repo, `.githooks` +
  `core.hooksPath` for PriorSeal;
- allocates a deterministic free port pair in `3300-3899`, records it in the
  untracked `.worktree.local`, and prints the paths to use.

Re-running `create` with the same slug attaches the existing branch instead of
failing, so a lost worktree directory can be rebuilt without losing commits.

### Daily use

```sh
npm run wt -- create hooks-cache-isolation --type feat
cd ~/Documents/insight-worktrees/insight-hooks-cache-isolation
npm run wt:dev                       # next dev on the allocated port
npm run wt:e2e -- --project=chromium  # playwright on the allocated e2e port
```

`npm run wt -- list` prints every worktree with branch, owning session, dirty
count and allocated ports, so a session can see what the others are doing without
touching their trees.

### Closing a task

```sh
npm run wt -- ship <slug> --message "feat: subject"
```

`ship` commits the worktree, pushes `HEAD` to `origin`, opens a PR, enables
auto-merge (squash), waits for the merge, then deletes the remote branch, the
local branch and the worktree. If the PR is not merged, it stops, keeps the
worktree, writes a blocked `.handoff.local`, and prints the only allowed
recovery: rebase **this branch** inside **this worktree**. It never stashes and
never touches another checkout.

| Outcome                                   | `ship` behaviour                                     | Elapsed (measured) |
| ----------------------------------------- | ---------------------------------------------------- | ------------------ |
| Merge conflict (`mergeStateStatus=DIRTY`) | exits 1, worktree + branch + PR kept                 | ~2–3 s             |
| Required check failed                     | exits 1 as soon as CI settles red                    | ~2 s               |
| PR closed without merging                 | exits 1, worktree kept                               | immediate          |
| BEHIND + `strict` branch protection       | exits 1 after ~60 s, asks for a rebase               | ~60 s              |
| BEHIND + `strict=false` (this repo)       | keeps waiting; GitHub merges without a rebase        | normal merge       |
| Merged                                    | removes worktree, deletes local/remote branch, claim | —                  |

Two sessions may ship the same task concurrently: `ship` re-checks the worktree
inside the repo lock and treats an already-finished task as success (exit 0), so
the loser does not fail or delete anything twice.

Manual close is equally supported:

```sh
npm run wt -- remove <slug> [--delete-branch]
```

`remove` refuses to delete a worktree with uncommitted changes unless `--force`
is passed, and `--delete-branch` only runs after the worktree is gone.

## Cleanup after squash merges

Squash merging creates a commit on `main` that is **not** an ancestor of the
task branch, so the classic checks are wrong here:

```text
git merge-base --is-ancestor <branch> origin/main   -> exit 1
git branch --merged origin/main                     -> no match
git rev-list --count origin/main..<branch>          -> > 0
```

Measured on this repository (`chore/fast-local-checks-2`, PR #414):

```text
merge-base --is-ancestor  exit=1
branch --merged           (no output)
rev-list --count          1
gh pr list --state merged headRefName=chore/fast-local-checks-2  -> merged
```

`cleanup` therefore accepts a branch only when one of these holds, in order:

1. `merged-into-main` — tip is an ancestor of `origin/main`;
2. `no-unique-commits` — `rev-list --count origin/main..<branch>` is 0;
3. `content-identical-to-main` — `git diff --quiet origin/main <branch>` is
   clean, i.e. the tree is byte-identical (covers a squash with no later
   commits);
4. `pr-merged` — `gh pr list --state merged` reports the head ref (covers a
   squash plus later commits that changed `main`).

Anything else is `unmerged` and is **never** deleted, even with `--apply`. The
tool only deletes branches matching `wt/<type>-*`; any branch checked out by a
worktree is kept.

### Hand-named branches are report-only

`cleanup` also lists old `perf/*`, `feat/*`, `fix/*`, `dependabot/*`, `backup/*`
and `test/*` branches, with a verdict and one actionable hint:

```text
· chore/fast-local-checks-2   pr-merged             safe: git branch -d chore/fast-local-checks-2
! backup/monad-ausd-wip       unmerged              verify: gh pr list --head backup/monad-ausd-wip --state merged
! feat/four-chain-capability-closeout  unmerged     verify: gh pr list --head ... --state merged
```

Those branches are never deleted automatically (they may predate the worktree
flow and belong to a human). Use `--report-all` to list beyond the first 15, and
delete one manually only after the reported hint confirms the content is on
`main`.

Measured on this repository with `cleanup --stale-days 0`:

```text
Agent branches:  ! wt/fix-cleanup-hardening ... checked-out-in-worktree
Hand-named:      chore/fast-local-checks-2 pr-merged | perf/ci-pipeline-speedup pr-merged
                 backup/monad-ausd-wip unmerged | test/wt-probe-* merged-into-main
```

## Claims: catch a file collision before work starts

```sh
npm run wt -- create <slug> --type feat --paths "src/app/api/cron/**,supabase/migrations/*"
npm run wt -- claim <slug> --paths "..."     # adjust later; same overlap check
npm run wt -- release <slug>
```

Claims live in `<git common dir>/insight-tasks/<slug>.json` (not tracked) and
record `branch`, `session`, `worktree`, `goal`, `paths` and timestamps. `create`
and `claim` refuse a task whose paths overlap an active claim:

- overlap is decided on the literal prefix before the first wildcard, so
  `src/*.ts` intersects `src/a.ts` and `src/app/api/cron/*` intersects
  `src/app/api/cron/route.ts`; unrelated files do not intersect;
- active means "its branch is still checked out, or the claim is younger than 6
  hours"; stale orphan claims are reported and released by
  `cleanup --apply`;
- `--override` is the explicit escape hatch after coordinating with the owner;
  use it deliberately, not to silence the check.

Measured with four concurrent `create` calls on the same `--paths`:

```text
ok=1 blocked=3
stderr: task "cN" touches paths already claimed: - cM (sim-M) claims src/shared.ts
```

## Unique artifacts are serial (no override)

Some paths are global singletons: two concurrent edits cannot be resolved
mechanically even when the files look different.

| Category             | Paths                                                                              | Why it must be serial                                                     |
| -------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| dependency manifests | `package.json`, `package-lock.json`, `verifier/package*.json`, `sdk/package*.json` | an install rewrites the lock and the shared dependency tree               |
| cron bundles         | `.github/cron-dist/**`                                                             | regenerated byte-for-byte; two regenerations conflict in every bundle     |
| migrations           | `supabase/migrations/*`, `migrations/*`                                            | ordering plus one applied history; two new files still race the directory |

Rules:

- `create` and `claim` compare **categories**, not file paths. A second claim in
  the same category is refused even when it names a different migration file.
- There is deliberately no `--override` for these categories.
- `ship` refuses to enable auto-merge while another active claim (`unique-claim`)
  or another open PR (`unique-pr`) still changes a unique category. The PR stays
  open and a blocked handoff records “merge that task first”.
- “Merge first, then change”: the second task merges the owner, rebases **only
  its own branch**, then edits the artifact.

Measured in the harness: two concurrent creates, one per new migration file:

```text
worktree: task "mig-x" touches an artifact that must be edited serially:
  - mig-y (harness) claims supabase/migrations/9004_y.sql
Merge that task first (or release its claim), then start this one. There is no override for unique artifacts.
exit=1   worktrees created=0   branches created=0
```

## Dependency changes: isolate, never install through the link

Measured with npm 10.8.2 on a real `npm install` inside a worktree whose
`node_modules` was a symlink to the primary checkout:

```text
$ npm install            # wt-a, package.json now asks for probe-dep 2.0.0
npm warn reify Removing non-directory /tmp/wt-dep-probe/wt-a/node_modules
added 1 package in 179ms
wt-a/node_modules: drwxr-xr-x (real directory)
wt-a sees probe-dep: 2.0.0
primary sees probe-dep: 1.0.0        # mtime unchanged
wt-b sees probe-dep: 1.0.0           # through the same symlink
```

So npm **destroys the symlink instead of writing through it**. Other worktrees
are not corrupted, but the installing worktree silently becomes an unmanaged,
partially updated install. A failed install makes that worse: after
`ENOTCACHED` the link was already gone and the worktree was left with stale
`0.1.0`-era packages while its manifest asked for another version. Older npm
versions can write through a symlink, which is why this is a hard error rather
than a warning.

Rules:

1. A task that declares a manifest must be created with `--install`, or must run
   `deps --isolate` **before** editing `package.json`/`package-lock.json`.
2. `deps <slug> --isolate` removes **every** shared link in that worktree (root,
   `verifier/`, `sdk/`, `integrations/`, `examples/*`) and runs `npm install` in
   each directory that had one. A nested manifest is checked against the
   `node_modules` of its own directory, not just the root.
3. `ship` refuses to commit when a manifest changed while that directory's
   `node_modules` is still the shared symlink (or missing). It prints the exact
   path and remedy and creates no commit.

```sh
npm run wt -- deps <slug>             # mode, changed manifests, disk source
npm run wt -- deps <slug> --isolate   # symlink -> real node_modules + npm install
```

Disk trade-off (measured in this checkout): the primary `node_modules` is
**1.9 GB**; a worktree’s own source checkout is **37 MB**. Sharing the link keeps
a worktree at ~37 MB. An isolated install costs another ~1.9 GB for that task
only, which is the price of being able to change dependencies safely. Ship or
remove the task to reclaim it; do not pre-isolate tasks that do not touch
dependencies.

## Same file, different regions

Path claims already stop two tasks that _declare_ the same file. The remaining
hole is an undeclared edit: task A declares `src/a.ts` but also edits
`src/shared.ts`, while task B claims `src/shared.ts`; the claims do not intersect,
so both proceed.

Evaluating file-level exclusivity for every file: rejected. It would serialize
most work in this repository, because large shared files (`route.ts`,
`perpGuardKernel.ts`, `page.tsx`) are edited by unrelated tasks every day, and
the owner would have to merge first even when the edits are hundreds of lines
apart. A per-file claim for _everything_ converts parallel work back into a
queue.

The compromise that is implemented:

- unique artifacts stay hard-serial (table above);
- everything else may proceed in parallel;
- `check <slug>` and `ship` diff the worktree with `git diff -U0` and compare
  **base-side line ranges** against every open PR that touches the same file;
- overlapping ranges block auto-merge (`hunk-overlap`, blocked handoff);
- disjoint ranges in the same file merge normally.

Measured in the harness with three tasks that all edit `src/shared.ts` while
declaring different files:

```text
check hunk-b   (line 11 vs PR line 2):  check: no merge hazards for "hunk-b"      exit=0
ship  hunk-c   (line 2  vs PR line 2):  refusing to enable auto-merge              exit=1
  - [hunk-overlap] PR #209 edits the same lines in src/shared.ts; merge it first
  handoff: .../repo-hunk-c-harnes/.handoff.local   (status=blocked)
```

## Observable status and merge order

```sh
npm run wt -- status   # task -> branch -> session -> dirty -> port -> PR -> CI -> state -> handoff -> path
npm run wt -- queue    # open PRs, oldest first, with the next action
```

`status` reports the **stage the task is stuck in**, how long it has been there,
and the next command — not just a status flag:

| STAGE            | Meaning                                  | NEXT shown                                     |
| ---------------- | ---------------------------------------- | ---------------------------------------------- |
| `working`        | dirty files changed within the last hour | record a handoff                               |
| `stalled`        | dirty files, no change for over 60 min   | `resume` and finish                            |
| `not-shipped`    | clean, no PR yet                         | `ship`                                         |
| `ci-pending`     | checks running                           | wait (auto-merge is enabled)                   |
| `ci-stuck`       | checks have not settled for over 20 min  | inspect the run, rerun infrastructure failures |
| `ci-red`         | a required check failed                  | fix in this worktree, commit, push             |
| `conflict`       | PR is DIRTY                              | rebase only this branch                        |
| `blocked`        | handoff says blocked                     | the blocking task named in `.handoff.local`    |
| `ready`          | green, auto-merge will take it           | wait                                           |
| `claim-orphaned` | worktree gone, claim remains             | `cleanup --apply` or re-create                 |
| `creating`       | claim exists, worktree not finished      | re-run `create`                                |

Thresholds come from real timestamps (PR `updatedAt`, check `startedAt`, newest
file mtime, handoff `updatedAt`), so an agent that died is visible from another
terminal. A leading `!` means act now.

Measured with two PRs whose checks were held pending for 31 minutes:

```text
TASK    BRANCH                 PR    CI         STAGE      STUCK     NEXT
hunk-a  wt/feat-hunk-a-harnes  #209  pending:1  !ci-stuck  31m       CI has not settled for 20+ min: inspect the run, rerun infrastructure failures
hunk-c  wt/feat-hunk-c-harnes  #211  pending:1  !blocked   just now  PR #209 edits the same lines in src/shared.ts; merge it first
```

This repository's branch protection (`strict=false`, required `validate`,
`smoke`, `analyze`, linear history) means a PR does **not** need to be up to
date before merging. GitHub's merge queue is not enabled (`mergeQueue: null`).
The practical order is therefore:

1. merge the oldest green PR first (`queue` sorts by creation time);
2. a PR that is green but BEHIND still auto-merges; no rebase is required;
3. a PR with red required checks must be fixed by its owner before later PRs
   merge — otherwise `main` accumulates red;
4. if `strict` is ever turned on, the later PR rebases **its own** branch in
   **its own** worktree; never rebase another session's branch.

## Failure, handoff and takeover

```sh
npm run wt -- handoff <slug> --goal "..." --next "..." --verify "..."
npm run wt -- resume <slug>
```

Every worktree can carry `.handoff.local` (untracked): status, goal, next step,
verify command, PR URL and the dirty paths. `ship` writes it automatically when
the merge does not happen. `resume` works from any session: it prints the handoff,
the branch position, ports and dirty files, so a killed session's task can be
finished without reconstructing the chat log.

Measured: worktree created, file written, handoff recorded, process killed; a
different session (`resume`) saw the handoff and the dirty file, then
`ship` merged and cleaned up. No worktree, branch, claim, lock or stash entry
remained.

## Concurrency: one repo-wide lock

`create`, `remove`, `cleanup`, `claim`, `release`, `handoff` and `ship` take
`<git common dir>/insight-wt.lock` (`mkdir` is atomic; metadata has pid/command;
TTL 10 min; the waiter times out after 2 min). `ship` holds the lock only for
`fetch/commit/push/PR/auto-merge` and again briefly for cleanup; it does **not**
hold it while waiting for CI. Duplicate `create` of the same task reuses the
worktree, and duplicate `ship` is idempotent, so parallel agents cannot write
`.worktree.local`, delete the same branch twice, or have `cleanup` delete a
worktree that `ship` is using.

Measured in the harness: 4 concurrent creates → 1 accepted / 3 refused;
`cleanup` concurrent with `create` → both exit 0 and no lock left; two concurrent
`ship` of one task → both exit 0, one merge, no residue.

A killed holder does not leave a permanent lock: the metadata records the pid,
and a waiter clears the directory immediately when that pid is gone.

```text
$ mkdir .git/insight-wt.lock; echo '{"pid":999999,...}' > .git/insight-wt.lock/meta.json
$ npm run wt -- create killtask ...
worktree: clearing abandoned lock from sim-dead-session (pid 999999)
Worktree ready ...
```

## Cross-repository use (PriorSeal)

The script only depends on `git`, `gh` and a `wt/*` branch naming convention.
No copy or package.json change is required: run it from the target repository's
root with the absolute script path (or add `"wt": "node <path>/scripts/worktree.mjs"`
if the repository adopts it permanently).

Verified end to end in `PriorSeal` on 2026-11-06: `create` → edit `AGENTS.md` →
`status` → `ship` produced [PR #170](https://github.com/imokokok/PriorSeal/pull/170),
waited for the required `release-check`, auto-merged and removed the worktree
(merge commit `42e6b1951ac8f927a73eea7c5d1d4197115bdec1`). Fixes made for that
repository:

- `installHooks` activates `.githooks` (PriorSeal keeps hooks there) and does
  not require husky.
- `nestedNodeModules` discovers `examples/*/node_modules`; `migrations/*` and
  any nested manifest are already covered by the category rules.
- PriorSeal's `.gitignore` uses `node_modules/`, which does not match a symlink,
  so worktrees looked permanently dirty and `git add -A` would have staged the
  links. `create` now appends local-only entries to `info/exclude`
  (`node_modules`, `.worktree.local`, `.handoff.local`, `.next/`, build caches).
  This touches no tracked file.
- All printed `NEXT`/`Work` commands switch to `node <script>` when the
  repository has no `npm run wt` script, so an agent is never handed a command
  that does not exist.
- `requiresUpToDate` reads branch protection from `gh`; PriorSeal's `strict`
  requirement makes `ship` wait for the branch to be current instead of
  assuming a stale PR can auto-merge.

Remaining hard-coded assumption: the default branch is `main`. For a different
default branch pass `--base origin/<branch>`; `cleanup`/`resume` still name
`origin/main`.

## Failure rules

- **Conflict on merge/rebase:** rebase only the current worktree's branch onto
  `origin/main`. Never switch the primary checkout's branch, never `git stash`,
  never reset another session's files.
- **Branch name already taken:** pick another slug. The tool refuses to reuse a
  branch that another worktree has checked out.
- **Do not delete what you did not create.** `npm run wt -- cleanup` is a dry run
  by default. With `--apply` it deletes only `wt/<type>-*` branches that are
  provably on `main` (ancestor, no unique commits, identical tree, or a merged
  PR) and are not checked out anywhere. Unmerged branches and every hand-named
  branch are reported, never removed. See “Cleanup after squash merges”.
- **Before a long pause or handoff:** write `npm run wt -- handoff <slug>
--next "..." --verify "..."`. Never leave a half-done task without
  `.handoff.local`; any session may then run `npm run wt -- resume <slug>`.
- **Before starting work that touches shared files:** pass `--paths` to
  `create`. A refused create means another active task already owns that path;
  coordinate or choose different work instead of overriding.

```sh
npm run wt -- cleanup                 # report
npm run wt -- cleanup --apply         # delete merged agent branches only
npm run wt -- cleanup --stale-days 7  # change the age threshold
```

## Cache and port isolation

| Artifact                                                                                      | Isolation                                                                                                                                 |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `.next/`, `.next/dev`, `*.tsbuildinfo`, `.eslintcache`, `playwright-report/`, `test-results/` | Separate per worktree because they live in the working tree; they stay untracked and are deleted with the worktree                        |
| `node_modules`                                                                                | Symlinked from the primary checkout (read-only in practice: no session runs `npm install` inside a worktree unless it passes `--install`) |
| Dev server                                                                                    | `npm run wt:dev` uses `INSIGHT_WT_PORT` from `.worktree.local`                                                                            |
| E2E                                                                                           | `npm run wt:e2e` exports `PLAYWRIGHT_PORT`/`INSIGHT_E2E_PORT`; `playwright.config.ts` reads both                                          |
| Git stash                                                                                     | `lint-staged --no-stash` in `.husky/pre-commit`, so no session writes to the shared stash stack                                           |

Because `node_modules` is a symlink, esbuild records the real path of every
dependency inside the bundle, which makes the byte-for-byte `build:cron:check`
fail only on worktrees. `scripts/build-cron-bundles.mjs` sets
`preserveSymlinks: true` so module keys stay `node_modules/...` and the check
passes in both the primary checkout and a worktree.

`lint-staged --no-stash` still hides partially staged hunks: it writes a patch
file inside the worktree instead of creating a stash entry, and it does not revert
on failure. The consequence is that a failing lint leaves the worktree exactly as
it was, which is what a parallel session wants.

## Measured effect (3-agent simulation)

A controlled harness ran three unrelated agent tasks (own branch, own file,
`git add -A`, commit, push, serial merge gate) against a local bare remote, three
runs per mode. Results were stable across runs:

| Mode                               | Agent failures | Contaminated commits | Merged branches | Wall time | Closed loop | Leftovers |
| ---------------------------------- | -------------- | -------------------- | --------------- | --------- | ----------- | --------- |
| One checkout, concurrent           | 2/3            | 1                    | 1/3             | ~0.6 s    | ~1.5 s      | 1 branch  |
| One checkout, sequential           | 0/3            | 0                    | 3/3             | ~1.6 s    | ~3.4 s      | 1 branch  |
| One worktree per agent, concurrent | 0/3            | 0                    | 3/3             | ~0.7 s\*  | ~2.8 s\*    | none      |

\* includes ~0.45 s of `git worktree add` setup. The shared concurrent run looks
fast only because two agents' work was lost: `index.lock` / `HEAD` races aborted
them, and the single surviving commit carried all three agents' files.

## Measured effect (orchestration harness, 2026-11-06)

A local bare remote plus a deterministic `gh` stub ran 22 assertions covering
claims, concurrency, squash cleanup, failure paths and takeover. All 22 passed
in ~60 s (two consecutive runs, same results):

| Scenario                                       | Result                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| Squash + later `main` commits → cleanup        | deleted, reason `pr-merged`                                       |
| Squash with identical tree → cleanup           | deleted, reason `content-identical-to-main`                       |
| Branch with unique content → cleanup `--apply` | kept, reason `unmerged`                                           |
| 4 concurrent `create` on the same path         | 1 accepted, 3 refused before creating anything                    |
| Same slug in 2 sessions                        | 2 isolated worktrees, 2 branches                                  |
| `ship` with DIRTY PR                           | exit 1 in 2–3 s, worktree + blocked handoff kept                  |
| `ship` with red required checks                | exit 1 in ~2 s, handoff says “CI failed”                          |
| Two concurrent `ship` of one task              | both exit 0, one merge, worktree gone                             |
| Re-create an existing task                     | reuses the worktree, no duplicate branch                          |
| Kill → `resume` in another session → `ship`    | merged, cleaned up                                                |
| Hand-named merged branch + `cleanup --apply`   | survives, listed as report-only                                   |
| Final residue                                  | 0 worktrees, 0 `wt/*` branches, 0 claims, 0 lock, 0 stash entries |

## Measured effect (hardening harness, 2026-11-06)

A second local harness (bare remote + deterministic `gh` stub, nested `examples/demo`
workspace, `left-pad` installed from the npm cache) ran 52 assertions. All 52
passed; each scenario below is an assertion, not an estimate:

| Scenario                                                  | Result                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Second migration claim (different file)                   | refused in `create`, 0 worktrees and 0 branches created                 |
| Second `.github/cron-dist` claim (different file)         | refused by category, same as migrations                                 |
| `--paths package.json` without `--install`                | refused, message names `deps --isolate`                                 |
| `ship` with a changed manifest + shared link              | exit 1 before commit, remedy printed                                    |
| `deps --isolate` then `ship`                              | commit + merge; sibling worktree still links the untouched primary tree |
| Nested `examples/demo/package.json` change                | blocked on `examples/demo -> shared`; nested isolate then merges        |
| Same file, disjoint hunks (lines 2 vs 20)                 | `check` clean, both PRs merge                                           |
| Same file, overlapping hunk (line 2 twice)                | `check`/`ship` exit 1 with `hunk-overlap` and `.handoff.local` blocked  |
| Killed agent with a pending PR                            | `status` shows `!ci-stuck` at `31m` and the next action                 |
| Blocked PR with a handoff                                 | `status` shows `!blocked` and the PR number                             |
| 6 agents create concurrently                              | 6/6 succeed, 6 distinct dev/e2e ports                                   |
| 6 agents ship concurrently (incl. migration + dependency) | 6/6 merged; 0 worktrees, 0 `wt/*` branches, 0 claims, 0 lock left       |
| Primary dependency tree after the 6-agent run             | still a real directory, never replaced by a link or mutated             |
| Dev port already bound in another worktree                | `services` reports it, `wt dev` refuses instead of sharing the port     |

The earlier 22-assertion suite still passes; the 52-assertion suite is the
regression gate for the unique-artifact, dependency, hunk and observability rules.

## Rules every session must follow

1. Never do feature work in the primary checkout (`/Users/imokokok/Documents/insight`).
   It is a read-only control plane for `fetch`, `worktree add/remove`, `branch -D`
   and PR commands.
2. Never `git stash`, `git checkout <branch>`, `git reset --hard` or `git clean` in
   the primary checkout. Those are shared-state operations.
3. Never run `git gc` or `git repack -a`; worktrees share the object database and
   concurrent repacks slow every session down.
4. One branch per task, named `wt/<type>-<slug>`. Do not reuse a branch across
   sessions, and do not push to another session's branch.
5. Declare expected paths at `create --paths`; a refused claim is a stop sign,
   not a hint to use `--override`.
6. Check `npm run wt -- status` and `npm run wt -- queue` before picking work,
   so a stuck or conflicting task is visible before it spreads.
7. Write `.handoff.local` before any long pause, and use `resume` (not memory of
   the previous chat) to take over another session's task.
8. Delete the worktree and branch as part of finishing the task, after the merge
   is confirmed. Cleanup never deletes a branch whose content is not on `main`.
