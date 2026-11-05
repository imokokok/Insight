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
local branch and the worktree. If the PR is not merged (conflict, red CI, review),
it stops, keeps the worktree, and prints the only allowed recovery: rebase **this
branch** inside **this worktree**.

Manual close is equally supported:

```sh
npm run wt -- remove <slug> [--delete-branch]
```

`remove` refuses to delete a worktree with uncommitted changes unless `--force`
is passed, and `--delete-branch` only runs after the worktree is gone.

## Failure rules

- **Conflict on merge/rebase:** rebase only the current worktree's branch onto
  `origin/main`. Never switch the primary checkout's branch, never `git stash`,
  never reset another session's files.
- **Branch name already taken:** pick another slug. The tool refuses to reuse a
  branch that another worktree has checked out.
- **Do not delete what you did not create.** `npm run wt -- cleanup` is a dry run
  by default and only deletes branches matching `wt/<type>-*` that are already
  merged into `origin/main` and not checked out anywhere. Unmerged branches are
  reported, never removed.

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
5. Delete the worktree and branch as part of finishing the task, after the merge
   is confirmed.
