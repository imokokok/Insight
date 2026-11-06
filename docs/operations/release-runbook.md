# Release rollback runbook

Operational manual for restoring the production website/API to a previously
deployed Vercel release when a code release is causing an incident. It is a
step-by-step procedure, not a description of Vercel features.

- Scope: the Next.js application and API routes served from the `insight` Vercel
  project (`www.oracleinsight.xyz`, `oracleinsight.xyz`,
  `insight-xi-two.vercel.app`).
- Out of scope: database restore, data repair, secret rotation, cron/workflow
  rollback, and external dependency changes. Those have separate procedures in
  [production-readiness.md](production-readiness.md) and
  [cron-dispatcher.md](cron-dispatcher.md).
- The controller is [scripts/release-rollback.mjs](../../scripts/release-rollback.mjs);
  it uses Vercel's REST API and Node builtins only.

Rollback moves the production alias at the routing layer. It does not rebuild,
does not revert `main`, and does not undo a database migration. Treat it as an
availability control, not as a source-control revert.

## Quick reference

```bash
# Show what production runs now and what `previous` resolves to. Read-only.
npm run release:rollback

# Roll back to the immediately previous READY production deployment.
npm run release:rollback -- --to previous --yes

# Roll back (or restore forward) to a specific deployment id or deployment URL.
npm run release:rollback -- --to dpl_xxxxxxxxxxxxxxxxxxxxxxxx --yes
npm run release:rollback -- --to https://app-abc123.vercel.app --yes

# Force a forward restore through the promote API when the target is newer,
# or when the rollback endpoint refuses a non-adjacent target on Hobby.
npm run release:rollback -- --to dpl_xxxxxxxxxxxxxxxxxxxxxxxx --method promote --yes
```

`--method auto` (the default) uses `rollback` for a target older than the live
deployment and `promote` for a target newer than it. The command prints the
current deployment, the target deployment, the exact API path, and the affected
production aliases before doing anything. Without `--yes` it is a dry run.

Credentials are read from `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, and optionally
`VERCEL_TEAM_ID` / `ROLLBACK_BASE_URL`. The npm script loads
`.env.vercel.local` when it exists in the current checkout; otherwise export the
variables first. A missing token or project id fails with exit code 2 and an
explicit message — it never silently skips the switch. Never commit the token.

Exit codes:

| Code | Meaning                                         |
| ---- | ----------------------------------------------- |
| 0    | Switch and live verification passed, or dry run |
| 1    | Vercel call or live verification failed         |
| 2    | Missing configuration or invalid arguments      |

## 0. Automatic rollback on a failed release

`deploy-production.yml` releases main as soon as a merge lands and then live-smokes
the payment rails. The smoke result selects the path:

| Live smoke result                                                            | Exit | Action                                                                                                                                              |
| ---------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pass                                                                         | 0    | Release stays.                                                                                                                                      |
| Application failure (the server answered, but not with the payment contract) | 1    | Automatic rollback to the previous READY deployment, then a second smoke on the restored release.                                                   |
| Infrastructure only (timeouts, connection errors, HTTP 429, 502/503/504)     | 2    | Up to three retries. Never rolls back. If retries stay infrastructure-only, production keeps the release and the run fails for manual verification. |

Infrastructure failures deliberately do not roll back: reverting a healthy release
because the probe hit an edge or a shared rate limit turns a flake into an outage.
The Chromium/apt flakiness of the browser `smoke` job is unrelated — that job runs
in `ci.yml` and never triggers this rollback.

Guards:

- The rollback runs only while production still serves the deployment this run
  released (`EXPECTED_DEPLOYMENT_ID`). If a queued newer release already owns
  production, the step logs a warning and does nothing.
- The release workflow uses `concurrency: cancel-in-progress: false`. A newer push
  queues behind the running release instead of cancelling it, so cancellation can
  never skip the rollback step.
- A failed build or deploy step does not roll back: production never switched.
- If the commit was already READY and Vercel reused its deployment, `previous`
  resolves to the release before that one. Automatic rollback then removes the
  live release, which is correct for a bad build; after a drill or a re-deploy of
  an already-live commit, restore forward explicitly (see Drill 2 in section 8).

Manual fallback:

1. `gh run list --workflow=deploy-production.yml` and read the failing run.
2. `npm run release:rollback` (dry run) to see current and previous deployments.
3. `npm run release:rollback -- --to previous --yes` if the automatic step did not
   run or failed.
4. `node scripts/smoke-live-payment-rails.mjs` to verify the restored release.
5. If the automatic step skipped because a newer release owns production, roll
   back that newer release deliberately; never bypass the guard.
6. `main` still contains the bad commit. Rollback is an availability control, not
   a source revert: land a fix or a revert PR through the normal gates.

The drill that proves this path, with timings and the exact commands, is recorded
in [section 8](#8-drill-record).

## 1. Declare the incident and freeze deployments

1. Declare the incident in the on-call channel and start a UTC stopwatch. Record
   `T+0`.
2. Freeze the release line: stop merging to `main` and do not trigger the
   production deploy hook. CI deploys every push to `main`, so a rollback is only
   durable while no new production deployment is created.
3. Write down the current `main` SHA and the production deployment id. The
   dry-run output gives both; the Vercel dashboard shows the same values.
4. Capture evidence before changing traffic: first failing request id, HTTP
   status, page/route, Sentry issue or release, readiness response, and the
   latest cron/data-job run.

## 2. Decide: roll back or fix forward

Roll back when all of these are true:

- Errors started within minutes of a production deployment, or the previous
  deployment is known good.
- The failure is in application code, routing, rendering, or the bundled API.
- The bad release did not apply an irreversible database migration and did not
  require a new environment variable or external configuration.
- The previous deployment is `READY` and its commit is the last known-good
  release.

Fix forward when any of these are true:

- A migration already dropped or renamed columns, or new code wrote rows in a
  format the old code cannot read. Rolling back the app makes it read data it
  cannot interpret.
- The release depends on a new environment variable, rotated secret, partner
  endpoint, or external allow-list that is already active.
- The release contains a security fix that must remain deployed.
- The previous deployment is also affected (no known-good target). Bisect or
  promote an older known-good deployment instead of guessing.
- The incident is data corruption, a stale snapshot, or a dependency outage
  rather than an application regression.
- The target is not `READY`, belongs to another project, or is not a production
  deployment. The controller refuses these cases.

Before rolling back, inspect the release delta:

```bash
git log --oneline <target-sha>..<current-sha>
git diff --stat <target-sha>..<current-sha> -- supabase/migrations .github/cron-dist .github/workflows
```

Any migration, cron bundle, or workflow change in that range needs a decision
before switching traffic. See “What rollback does not cover” below.

## 3. Execute the rollback

```bash
# Reads .env.vercel.local if present; use `export` instead in a clean checkout.
npm run release:rollback -- --to previous --yes
```

The command performs these steps:

1. Reads `GET /v9/projects/{projectId}` and uses `targets.production.id` as the
   authoritative live deployment. It does not infer the live version from
   `latestDeployments`, whose alias arrays retain historical entries.
2. Lists production deployments and resolves `previous` as the newest `READY`
   production deployment older than the live one, or resolves the explicit
   deployment id/URL. Non-production, non-READY, and cross-project targets are
   rejected.
3. Prints the plan and the exact endpoint:
   `POST /v1/projects/{projectId}/rollback/{deploymentId}` or
   `POST /v10/projects/{projectId}/promote/{deploymentId}`.
4. Switches production, then polls the project until `targets.production.id`
   equals the target deployment. It does not trust the POST response alone.
5. Probes the live site and prints a timing breakdown.

If the rollback endpoint answers HTTP 402 on the Hobby plan, the target is not
the immediately previous production deployment. Use `--method promote` with the
same `--to` value. Promote was verified to work on this project's Hobby plan
during the forward restore of the 2026-11-06 drill; if Vercel starts refusing
it, the remaining options are upgrading the plan or fixing forward.

## 4. Verify production

Do not close the incident from the POST response. Verify in this order.

| Check              | Command / evidence                                                                          | Pass condition                             |
| ------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Version switched   | Re-run `npm run release:rollback` (dry run); `current production` must show target          | Deployment id and commit SHA match         |
| Liveness           | `curl -sS -o /dev/null -w '%{http_code}' https://www.oracleinsight.xyz/api/v1/health`       | `200`, body `success:true`                 |
| Readiness          | `curl -sS -o /dev/null -w '%{http_code}' https://www.oracleinsight.xyz/api/v1/health/ready` | `200` (database reachable, snapshot fresh) |
| Homepage and login | `curl -sS -o /dev/null -w '%{http_code}' https://www.oracleinsight.xyz/` and `/login`       | `200`                                      |
| Payment rails      | `node scripts/smoke-live-payment-rails.mjs`                                                 | exits `0`; x402 + MPP 402 challenges       |
| Error rate         | Vercel logs / Sentry, 5xx since the switch                                                  | falling, no new release-correlated issue   |
| Data freshness     | readiness timestamp and newest `price_snapshots` row                                        | advancing, below the 45-minute SLO         |
| Money/data writes  | Wallet, credit ledger, subscriptions, x402 settlement rows                                  | balanced and readable by the restored code |

Keep watching for 30 minutes before closing. A rollback is not complete while
the bad commit remains on `main`: land a revert or a fix-forward PR, let CI
deploy it through the normal gate, and verify that deployment.

## 5. Data-layer handling

Application rollback is safe for read-only data paths: snapshots, oracle feeds,
market reference, and rendered pages keep their existing contracts. It is not
safe when the bad release changed how data is written or interpreted.

Check these before declaring closure:

1. **Migrations.** The database does not roll back with the app. Confirm which
   migrations the bad release applied:
   `git diff --stat <target-sha>..<current-sha> -- supabase/migrations`.
   Additive, backwards-compatible migrations are safe to leave in place.
2. **Destructive migrations.** Dropped/renamed columns, rewritten enums,
   destructive backfills, and RLS tightening can make the old code fail even
   after the alias moves. In that case, do not roll back casually: fix forward,
   or restore the most recent encrypted logical export into an isolated project
   first (target RTO four hours). Never run a down migration in production
   without reviewing its data-loss impact.
3. **New writes.** If the bad release wrote rows (credits, subscriptions,
   dispatch ledgers, x402 settlements, ops actions), verify the restored code
   can read them. If it cannot, freeze the writer, repair the rows with a
   reviewed script, and reconcile balances before reopening.
4. **Operator controls.** `/ops/issuance` state lives in the database and is not
   affected by the alias move. Recheck the banner: a halt left engaged keeps
   returning signed `BLOCK`s while the site looks healthy.
5. **Cron and workflows.** GitHub Actions cron bundles run from `main`, not from
   the Vercel deployment. Rolling back Vercel does not revert a bad cron bundle
   or workflow. Revert those on `main` separately, then verify the newest
   snapshot timestamp.

## 6. What rollback does not cover

| Not covered                                  | Why                                                       | Alternative                                                          |
| -------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| Database migrations already applied          | DDL and data changes are independent of the Vercel alias  | Fix forward with a compatible migration, or restore a logical export |
| Data written or corrupted by the bad release | Moving the alias does not rewrite rows                    | Freeze writers, repair with a reviewed script, reconcile             |
| Vercel environment variables                 | Env vars are project-scoped, not versioned per deployment | Revert the variable and redeploy, or fix forward                     |
| GitHub Actions workflows and cron bundles    | They are read from `main`                                 | Revert on `main`; see [cron-dispatcher.md](cron-dispatcher.md)       |
| External keys, allow-lists, partner configs  | They live outside the deployment                          | Rotate/revert them explicitly                                        |
| Email, webhooks, and payments already sent   | Side effects already happened                             | Reconcile and replay only after review                               |
| The bad commit on `main`                     | Rollback only changes traffic                             | Land a revert/fix PR and deploy through CI                           |
| DNS, domains, certificates                   | Managed separately from deployments                       | Revert the domain change in Vercel                                   |
| Browser-cached client bundles                | Old clients may keep running until reload                 | Tell users to reload; verify server contracts tolerate old clients   |

## 7. Post-incident record

Write a blameless record within one working day. Keep it short and factual.

```markdown
### Incident <date> — <one-line impact>

- Detected: <UTC>, by <signal>
- Production before: <deployment id> / <commit sha>
- Rollback target: <deployment id> / <commit sha>
- Method: rollback | promote
- Decision to rollback: <UTC>; live verified: <UTC>; measured: <seconds>
- Impact window: <start>–<end>
- Customer-visible impact: <routes, status codes, duration>
- Data impact: <none | rows/tables | reconciliation result>
- Migrations/workflows involved: <none | details>
- Root cause: <known | investigating>
- Fix-forward PR / revert: <link>
- Follow-ups: <owner + date>
```

## 8. Drill record

### Drill 2 — automated rollback inside the release workflow (2026-11-06T12:31Z)

This drill exercised the automatic path, not the manual controller. Dispatching
`deploy-production.yml` with `rollback_drill=ROLLBACK-DRILL` makes the live
smoke step report an application-class failure, so the classification guard and
the rollback steps run exactly as they would after a genuinely bad release.

- Run: `42218308728` (`workflow_dispatch`, ref `main`, head
  `48b5beb157940a1885f3430e6c44e17da2cc9ff9`).
- Command: `gh workflow run deploy-production.yml --ref main -f rollback_drill=ROLLBACK-DRILL`.
- Pre-drill production: `dpl_7LXBiSPy64FnWTC1P3jo15gi54St` (commit `48b5beb`).
- The deploy step found this commit already READY and reused its deployment
  (`dpl_7LXBiSPy… reused; queue=0.02m build=1.28m total=1.30m`), so the drill
  added no build to the release line.

| Step                                 | Measured                  |
| ------------------------------------ | ------------------------- |
| Drill dispatched (UTC)               | 2026-11-06T12:31:22Z      |
| Deploy job started                   | 12:31:40Z                 |
| Injected application failure         | 12:31:51.335Z             |
| Guard passed, rollback requested     | 12:31:51.339Z             |
| Production alias on previous release | 12:31:56.076Z (**4.7s**)  |
| Restored release verified (smoke)    | 12:32:08.499Z (**17.2s**) |

The run ends as `failure` by design: the injected smoke failure is what fails,
while `Roll back after an application failure` and `Verify the release that was
restored` both pass. Production moved from `dpl_7LXBiSPy…` to
`dpl_C9w1G6rxaDRGp8mT6rem7d8J2qxJ` (commit `4b230b1`) and the restored release
passed the full payment smoke.

**Boundary this drill exposed.** Because the dispatched commit was already
READY, Vercel reused its deployment and `previous` resolved to the release
_before_ that one (`4b230b1`). Automatic rollback therefore restored the release
before the drilled commit rather than the drilled commit itself. That is the
correct behaviour for the case it guards — the failing build is what must leave
production — but a drill, or any re-deploy of a commit that is already live,
needs an explicit forward restore afterwards:

```bash
npm run release:rollback -- --to dpl_7LXBiSPy64FnWTC1P3jo15gi54St --yes
# action: promote; API accepted 0.8s, production switched 2.3s, verified 6.2s
```

Post-drill state: production `dpl_7LXBiSPy64FnWTC1P3jo15gi54St` (`48b5beb`),
live verification passed.

### Drill 1 — manual controller (2026-11-06T10:27Z)

First live drill of this controller. It used the two most recent existing
production deployments; no temporary deployment was created, so the drill did
not add a build to the release line.

- Date: 2026-11-06 (UTC), production project `insight` on Vercel Hobby.
- Pre-drill production: `dpl_6rGAfsBcteeBY6i6sTWqWX48tPh4`, commit
  `0e7329f53f467851ccf0704efff0b6e5aceea301`.
- Drill target (previous): `dpl_BsTXuKbVpcieajQm3auXL7tHnSzs`, commit
  `2663f0182a9988bbc0a688ebf9e19061c40aadab`.
- Command: `npm run release:rollback -- --to previous --yes`.
- Result: production moved to the target and live smoke passed.

| Step                         | Measured                |
| ---------------------------- | ----------------------- |
| Command issued (UTC)         | 2026-11-06T10:27:48Z    |
| Vercel accepted the switch   | 0.5s after the API call |
| Production alias on target   | 1.1s after the API call |
| Live verification passed     | 7.2s after the API call |
| Command wall time (with npm) | 10s                     |

Decision-to-restored-availability for the automated path was **7.2s**; the full
operator command, including npm startup and plan rendering, took 10s. While on
the rollback deployment, `node scripts/smoke-live-payment-rails.mjs` passed: the
REST x402 + MPP 402 challenge and the MCP challenge both matched their scopes.

Restore after the drill:

- Command: `npm run release:rollback -- --to dpl_6rGAfsBcteeBY6i6sTWqWX48tPh4 --method promote --yes`
- Result: production returned to `0e7329f53f467851ccf0704efff0b6e5aceea301`
  (the pre-drill deployment) without a rebuild.
- Measured: Vercel accepted in 0.4s, alias on target in 0.9s, live verification
  in 3.9s, 6s wall time including npm.
- Final state verified by a read-only dry run (current production
  `dpl_6rGAfsBcteeBY6i6sTWqWX48tPh4`), `200` from liveness and readiness, and a
  `402` x402 quote from the direct base-lending probe. The MCP half of the
  payment smoke also passed after the restore. The full multi-probe payment
  smoke then exhausted the x402 quote limiter (six quotes per hour per
  identity) and returned `429` on three probes; that is a probe-rate limit, not
  an application failure. The full smoke had passed while production served the
  rollback deployment. The drill did not leave production on the intermediate
  deployment.

Follow-ups from the drill:

- Repeated back-to-back payment smoke probes can hit the public rate limit
  (`429`). Wait for the window or rely on the controller's built-in liveness /
  readiness checks when re-running the full payment smoke under pressure.
- Hobby permits rollback only to the immediately previous deployment. The
  `--method promote` path is the tested restore route; re-run this drill after
  any Vercel plan or API change.

## 9. Emergency release（紧急发布）

Use this only when a change must reach production and the normal path cannot
deliver it: the deploy hook or `deploy-production.yml` itself is failing, while
`main` already contains the reviewed fix. Every other case goes through a
normal merge.

The only legal emergency channel is `workflow_dispatch` of
`deploy-production.yml` through the wrapper:

```bash
npm run release:emergency -- --reason "deploy hook returned HTTP 503 for 20 minutes"
# validates, prints the record, dispatches with expected_sha, then prints the run URL
```

The wrapper refuses to continue unless all of these hold:

- The worktree is clean (`git status --porcelain` is empty).
- The SHA is exactly `origin/main` after a fresh fetch. Feature branches,
  unmerged commits, and a dirty tree are rejected.
- `--reason` is present and at least 10 characters.
- `gh` is authenticated.

Record the printed JSON in the incident issue before the run finishes. The
dispatched run goes through the same PR-check verification, the same deploy hook,
and the same Node assertion (`node=22.x`) as a normal release. After it
completes:

1. Check the run conclusion and the deploy log line (`node=22.x`).
2. Run `node scripts/smoke-live-payment-rails.mjs`.
3. Confirm that the next normal release from `main` supersedes this deployment;
   do not leave production on an emergency release indefinitely.

Any production deployment that did not come from that workflow is flagged by
`production-provenance-audit.yml` within 10 minutes: one issue per deployment id,
labelled `deploy-provenance`. The audit is the enforcement layer, not a
suggestion. Vercel Hobby has no "hook-only" switch, so a bypass cannot be hidden
forever — only performed without a record.

## 10. Prohibited operations（禁止事项）

These are never acceptable, not even during an incident:

- `vercel deploy --prod` (or any Vercel CLI/API production deployment) from a
  laptop, a dirty checkout, a feature branch, or an ad-hoc CI job. This is the
  exact class of deployment the provenance audit files issues for.
- Releasing an unpushed commit or a worktree with uncommitted changes. Neither
  the commit metadata nor the build output can prove what actually ran.
- Bypassing branch protection or the quality gate: admin merge, `--no-verify`,
  disabling required checks, or editing workflows to skip `smoke` or
  `verify-merged-pr-checks`.
- Force-pushing `main` or rewriting history to hide a release. Vercel keeps its
  own deployment record; history edits do not remove it.
- Changing the Vercel project Node.js version away from `22.x`, or loosening
  `engines.node` to an open range, to make a build pass. Fix the build instead.
- Deleting, relabelling, or silently closing provenance-audit issues without a
  recorded reason and verification.
- Printing, committing, or exporting `VERCEL_TOKEN`, or using it in a workflow
  other than the deploy and provenance-audit workflows.
- Promoting a deployment from another project, or a non-READY deployment, by
  hand. The rollback controller refuses these; doing it manually is worse.

If a prohibited action already happened, open an incident, record the deployment
id, and let the next normal release supersede it.

