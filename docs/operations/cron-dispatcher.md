# Reliable free-tier cron dispatcher

## Outcome

Supabase owns the schedule and GitHub Actions performs the expensive work:

```text
Supabase pg_cron → pg_net → GitHub workflow_dispatch → GitHub runner → Supabase
```

Vercel is not in this path. The public API routes remain available as manual
recovery paths; their response contracts are unchanged.

The dispatcher covers the six product-critical jobs:

| Workflow                        | Primary cadence  | Native GitHub fallback                    |
| ------------------------------- | ---------------- | ----------------------------------------- |
| `snapshot-collect.yml`          | every 15 minutes | same cadence, skips while ledger is fresh |
| `oracle-watch-collect.yml`      | every 30 minutes | same cadence, skips while ledger is fresh |
| `reputation-cron.yml`           | hourly           | same cadence, skips while ledger is fresh |
| `safety-outcome-cron.yml`       | every 2 hours    | same cadence, skips while ledger is fresh |
| `feed-cadence-cron.yml`         | daily            | one hour later, only when ledger is stale |
| `daily-report-publish-cron.yml` | daily            | 05:30 UTC `--if-missing` backfill         |

## One-time activation

1. Deploy the workflow/code commit first.
2. In GitHub, create a fine-grained personal access token owned by `imokokok`:
   repository access `Only select repositories → Insight`; repository
   permission `Actions: Read and write`; no organization/account permissions.
3. Apply migration `0045_reliable_github_dispatcher.sql` in Supabase.
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

The reduced-frequency native GitHub schedules remain active as stale-data
fallbacks. To rotate the PAT, update the existing Vault secret in the Supabase
Vault UI; there is no reason to modify a migration or repository secret.

## Free-tier bounds

- Dispatch requests are tiny and do not invoke an Edge Function.
- The run ledger is retained for 30 days.
- Fine-grained price, hourly price, and market-reference retention remains 120
  days. This preserves the current 90-day public product window and 8-week ML
  lookback; shortening fine-grained history to 30 days would be a capability
  regression.
- Checked-in cron bundles remove `npm ci` from these six recurring execution
  paths. Rebuild them after changing a bundled runner or its dependencies with
  `npm run build:cron`.
