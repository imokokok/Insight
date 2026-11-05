# Parallel agent worktrees

Multiple agent sessions editing this repository at the same time used to collide on
four shared resources. This document defines the workflow that removes those
collisions, plus the commands that enforce it.

## Why parallel sessions collide

| Shared resource                                         | What goes wrong                                                                                                                        |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| One working tree: `.git/index` + `HEAD`                 | Session A checks out `main` while session B has staged work; B's commit lands on A's branch, and local `main` forks from `origin/main` |
| One `refs/stash` stack                                  | `lint-staged` auto-stashes ~30 unrelated unstaged files, a second session stashes on top, and a pop restores the wrong entry           |
| Build caches: `.next/`, `*.tsbuildinfo`, `.eslintcache` | Two `next dev` / `tsc` runs overwrite each other's outputs and read stale results                                                      |
| Fixed ports (`3000` dev, `3000` e2e)                    | Second window fails to bind, or e2e silently tests the first window's server                                                           |
| Branch names typed by hand                              | Two sessions pick the same name; the loser inherits the winner's commits                                                               |

A Git worktree gives each task its own `HEAD`, index, working tree and cache
directories while sharing one object database. That is the fix; the rules below
make it the default.

## One task = one branch = one worktree

```
npm run wt -- create <slug> [--type feat|fix|chore|docs|test|perf|ops|refactor]
                            [--session <id>] [--base origin/main]
                            [--no-fetch] [--install]
```

The command:

- creates branch `wt/<type>-<slug>` (plus `-<session>` when a session id is set),
  which makes the owning task traceable from `git branch` alone;
- places the worktree **outside** the repository at
  `~/Documents/insight-worktrees/<repo>-<slug>` (override with
  `INSIGHT_WORKTREE_ROOT`), so the primary checkout's `tsc`, `next build` and
  `eslint` never scan another task's sources;
- symlinks `node_modules` (root, `verifier/`, `sdk/`, `integrations/*`) and the
  `.env*` files from the primary checkout instead of reinstalling — a worktree
  adds one checkout of the source tree and its own build output, never a second
  copy of the dependencies or the git object database;
- runs `husky` inside the worktree so `core.hooksPath` points at that worktree's
  `.husky/_`, which means the pre-commit hook fires in the worktree, not in the
  primary checkout;
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

## Observable status and merge order

```sh
npm run wt -- status   # task -> branch -> session -> dirty -> port -> PR -> CI -> state -> handoff -> path
npm run wt -- queue    # open PRs, oldest first, with the next action
```

`status` shows `active`, `conflict` (PR is DIRTY), `blocked` (handoff says so),
`stale` (claim old and worktree dirty), `creating` and `claim-orphaned`
(worktree gone but the claim remains). A task whose directory/handoff is older
than an hour is visibly stale, so a stuck agent is identifiable without reading
session logs.

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

## Cross-repository use (PriorSeal)

The script only depends on `git`, `gh` and a `wt/*` branch naming convention. To
use it in `PriorSeal`:

1. copy `scripts/worktree.mjs` and add `wt`/`wt:dev`/`wt:e2e`/`wt:cleanup`
   scripts to `package.json`;
2. set `INSIGHT_WORKTREE_ROOT` if the repo name/path differs (the default
   `~/Documents/insight-worktrees/<repo>-<slug>` still works);
3. adapt `NESTED_INSTALLS` / `ENV_FILES` to that repo's layout (the current list
   is Insight-specific);
4. run `node scripts/worktree.mjs status` once to confirm `gh repo view` and
   branch protection are readable; `requiresUpToDate` auto-detects `strict`;
5. if PriorSeal uses a different default branch, pass `--base origin/<branch>`
   and change the `origin/main` strings in `cleanup`/`resume` (the only
   remaining hard-coded name).

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
