# Repository collaboration rules

## Parallel agent work (mandatory)

Multiple agent sessions share this repository. Feature work happens in a per-task
Git worktree, never in the primary checkout:

```sh
npm run wt -- create <slug> --type <feat|fix|chore|docs|test|perf|ops|refactor> \
                        --paths "src/**,supabase/migrations/*" --goal "..."
npm run wt -- status                                  # task -> branch -> worktree -> PR -> CI
npm run wt -- queue                                   # open PRs in merge order
npm run wt -- ship <slug> --message "feat: subject"   # commit + PR + auto-merge + cleanup
npm run wt -- deps <slug> --isolate                    # real node_modules before a dependency change
npm run wt -- handoff <slug> --next "..."             # context for any session
npm run wt -- resume <slug>                           # take over a killed/paused task
npm run wt -- cleanup                                 # merged agent branches only
```

- One task = one branch (`wt/<type>-<slug>[-<session>]`) = one worktree under
  `~/Documents/insight-worktrees/`. Never reuse a branch between sessions.
- Declare the paths you expect to touch at `create --paths`. A create/claim
  refused for overlap means another active task owns those paths; coordinate
  instead of passing `--override`. Claim metadata lives in
  `<git common dir>/insight-tasks/` and is released when the task ends.
- Do not run `git checkout`, `git stash`, `git reset --hard`, `git clean` or
  `git add` in the primary checkout. Those are shared-state operations; another
  session may own the index and HEAD at that moment.
- Never run `git gc` or `git repack -a`; worktrees share the object database and
  a concurrent repack slows every session.
- Worktree dependencies are symlinked from the primary checkout. Do not run
  `npm install` in the primary checkout for worktree work. A task that changes
  any `package.json`/`package-lock.json` (including nested workspaces) must run
  `npm run wt -- deps <slug> --isolate` first; `ship` refuses to commit while
  that directory's `node_modules` is still the shared link.
- Dependency manifests, `.github/cron-dist/*` and `supabase/migrations/*` /
  `migrations/*` are serial by category: a second claim is refused, and `ship`
  will not enable auto-merge while another active claim or open PR touches one.
  There is no override for these.
- Same file in different regions may proceed in parallel; `check` and `ship`
  compare `git diff -U0` hunks against open PRs and block only overlapping
  ranges (`hunk-overlap`). Do not add file-level exclusivity for ordinary files.
- Use `npm run wt:dev` and `npm run wt:e2e` so each worktree binds its own
  allocated port; never rely on the default `3000`.
- Build caches (`.next`, `*.tsbuildinfo`, `.eslintcache`) are isolated because
  each worktree is its own directory. The pre-commit hook runs
  `lint-staged --no-stash` so commits never touch the shared stash stack.
- This repository squash-merges, so `git branch --merged` and ancestor checks
  are not reliable. `cleanup` also accepts an identical tree or a merged PR head,
  and never deletes a branch whose content differs from `main`. Hand-named
  branches (`perf/*`, `feat/*`, `dependabot/*`, …) are report-only.
- Merge order: oldest green PR first. `strict=false`, so a BEHIND PR still
  auto-merges. A PR with red required checks is fixed by its owner before later
  PRs merge; if `strict` is enabled, rebase only your own branch.
- Before a long pause or when handing off: `npm run wt -- handoff <slug>
--next "..." --verify "..."`. Any session may take over with
  `npm run wt -- resume <slug>`.
- Finish a task only after the PR is merged: then remove the worktree and branch.
  `ship` does this automatically; manually use
  `npm run wt -- remove <slug> --delete-branch`.
- On conflicts, rebase only your own worktree branch; never move another
  session's branch or discard its uncommitted files.

Full rules and troubleshooting: `docs/operations/parallel-agent-worktrees.md`.

## Local builds

- `npm run build` uses Next.js Turbopack by default (what CI and Vercel run). Sandboxed local environments that cannot create Turbopack CSS worker processes must use `npm run build:webpack` (or run builds with `env -u NODE_OPTIONS` outside the sandbox).
- `npm run ci:local` runs the full suite including `next build`; in sandboxed environments substitute the webpack build for the turbopack step before running it.

## Local Vercel access

- The user authorized reuse of the saved Vercel credential in future tasks. Load `VERCEL_TOKEN` from the Git-ignored `.env.vercel.local` in this repository; do not ask the user to supply it again while it remains valid.
- This private file also holds the verified `VERCEL_TEAM_ID` and `VERCEL_PROJECT_ID` when available. On the user's workstation its path is `/Users/imokokok/Documents/insight/.env.vercel.local`.
- For Node commands, use `--env-file=.env.vercel.local`; API tools should load the credential privately and use the Authorization header. Keep the file mode at `0600`.
- Never print the credential, put it in tracked files, expose it to browser code, or add it to application runtime variables.
- The deployment workflow uses the repository's GitHub Actions secret named `VERCEL_TOKEN`. Keep that secret in sync when the user requests credential replacement; changing it alone must not trigger a deployment.
- Reusing a credential does not authorize unrelated deployments or account changes. If authentication fails, report the failure and request a replacement only when needed.

## GitHub CLI device authorization

- If GitHub CLI authentication has expired and the standard `gh auth login --hostname github.com --web --git-protocol https` flow is needed, start the flow only when authorized. As soon as GitHub returns a one-time device code, tell the user the code and `https://github.com/login/device` before asking them to authorize, opening the browser, or waiting for completion.
- Never store a one-time device code in workspace memory, repository files, or logs. Never ask the user to paste a GitHub token into chat.

## Partner joint-run instructions

- For partner integration preparation, rehearsal, fresh bundles, live execution, post-run verification, or replies, first read `/Users/imokokok/Documents/partnerships/AGENTS.md`, then `/Users/imokokok/Documents/partnerships/COLLABORATION-DOCS-STANDARD.md`, then `/Users/imokokok/Documents/partnerships/JOINT-RUN-PLAYBOOK.md`. Continue with the partnerships root README, the partner README, and the current stage fact sources. These rules supplement this repository's rules.
- Apply this read order at a new joint-run task/window or context resumption. Within an unchanged continuous task, reuse already-read rules and recheck changed rules and the latest partner status. Dated retrospectives explain historical lessons; current partner facts determine scope, permissions and protocol conditions.
- Follow the user's order for rehearsals and live runs: perform the authorized work and preserve raw evidence immediately; deliver complete English and Chinese replies in the conversation, explicitly stating required attachments and final files or no attachment; update formal collaboration documents last. Preserve existing authorization and required per-bundle GO or single-send gates; do not mark a draft as sent.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
