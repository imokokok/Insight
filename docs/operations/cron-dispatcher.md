# Reliable cron dispatcher

## Outcome

Supabase `pg_cron` dispatches product jobs and is also the authoritative
high-frequency Turso clock. GitHub Actions executes the bounded jobs only
through controlled dispatch. After each primary window, Supabase performs a
primary-key receipt probe and dispatches recovery only if the completed slot
is missing:

```text
Supabase primary dispatch → GitHub runner → Turso raw slot → Supabase idempotent projection
Supabase receipt check (only missing slot) → GitHub workflow_dispatch → same idempotent runner
Supabase pg_cron → pg_net → GitHub workflow_dispatch → GitHub runner
```

Vercel is not in this path. The public API routes remain available as manual
recovery paths; their response contracts are unchanged.

The dispatcher covers the low-frequency product-critical jobs:

| Workflow                        | Primary cadence                                      | Recovery guard                                   |
| ------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| `snapshot-collect.yml`          | Supabase dispatch `:00,:15,:30,:45`                  | receipt-gated check at `:07,:22,:37,:52`         |
| `turso-price-project.yml`       | Supabase dispatch `:03,:18,:33,:48`                  | receipt-gated check at `:10,:25,:40,:55`         |
| `oracle-watch-collect.yml`      | hourly (dispatch :08, reduced from every 30 minutes) | hourly at :00, skips while ledger is fresh       |
| `reputation-cron.yml`           | every 2 hours (dispatch :27, reduced from hourly)    | same cadence at :07, skips while ledger is fresh |
| `safety-outcome-cron.yml`       | every 2 hours                                        | same cadence, skips while ledger is fresh        |
| `feed-cadence-cron.yml`         | daily                                                | one hour later, only when ledger is stale        |
| `daily-report-publish-cron.yml` | daily                                                | 05:30 UTC `--if-missing` backfill                |
| `coverage-slo.yml`              | every 15 minutes at `:09,:24,:39,:54`                | five minutes later, skips while ledger is fresh  |
| `monad-dex-market.yml`          | every 10 minutes at `:02,:12,:22,:32,:42,:52`        | five minutes later, skips while ledger is fresh  |

## One-time activation

1. Deploy the workflow/code commit first.
2. In GitHub, create a fine-grained personal access token owned by `imokokok`:
   repository access `Only select repositories → Insight`; repository
   permission `Actions: Read and write`; no organization/account permissions.
3. Apply migration `0045_reliable_github_dispatcher.sql` in Supabase. For the
   current Turso control plane, also apply
   `0121_supabase_primary_turso_scheduler.sql`; it restores a Supabase-owned
   high-frequency clock and retains a conditional self-healing path for a
   missing receipt.
4. In Supabase SQL Editor, substitute the token locally and run:

   ```sql
   SELECT vault.create_secret(
     'github_pat_REPLACE_LOCALLY',
     'github_workflow_dispatch_token',
     'Fine-grained PAT: imokokok/Insight, Actions write only'
   );

   SELECT public.enable_github_workflow_dispatcher();
   ```

   Never commit the real token or paste it into an issue/chat.

5. Smoke-test one dispatch:

   ```sql
   SELECT public.dispatch_github_workflow('oracle-watch-collect.yml');
   ```

6. Verify the end-to-end callback:

   ```sql
   SELECT
     workflow_file,
     scheduled_for,
     source,
     status,
     github_run_url,
     started_at,
     completed_at
   FROM public.cron_dispatch_runs
   ORDER BY created_at DESC
   LIMIT 20;
   ```

## Rollback

Dispatcher rollback is immediate and does not remove data or workflows:

```sql
SELECT public.disable_github_workflow_dispatcher();
```

The high-frequency Turso collector and projector are paused together with the
Supabase dispatcher. GitHub has no native high-frequency schedules to create
duplicates. Receipt-gated recovery jobs are also disabled; re-enable them with
`SELECT public.enable_github_workflow_dispatcher();` after the incident.
To rotate the PAT, update the existing Vault secret in the Supabase Vault UI;
there is no reason to modify a migration or repository secret.

## Free-tier bounds

- Dispatch requests are tiny and do not invoke an Edge Function.
- The run ledger is retained for 30 days.
- Coverage SLO and Monad DEX dispatches are coalesced when their own preceding
  primary run is still open. The normal GitHub concurrency controls remain a
  second layer; the database gate avoids extra `pg_net` queue rows and runner
  starts during a stalled run.
- Healthy feed heartbeats are persisted at most once every 90 minutes. This is
  deliberately inside the two-hour stale-feed threshold; failures and recovery
  successes still write immediately.
- Fine-grained price, hourly price, and market-reference retention remains 120
  days. This preserves the current 90-day public product window and 8-week ML
  lookback; shortening fine-grained history to 30 days would be a capability
  regression.
- Checked-in cron bundles remove `npm ci` from recurring execution paths.
  Rebuild them after changing a bundled runner or its dependencies with
  `npm run build:cron`. The pre-commit hook, `npm run validate`, and the first
  CI validation step all compare the committed bundles with a fresh build and
  fail if they differ. CI performs this check before linting, type checks, or
  test suites so a stale bundle fails quickly instead of consuming the full
  validation budget.
