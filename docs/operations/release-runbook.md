# Cloudflare production release and rollback

Cloudflare Workers serves the Insight application and API. GitHub Actions builds
and deploys the Worker after the merged-PR gate, asserts the public domain serves
the released commit SHA, then runs the payment-rail smoke. Supabase and Turso
remain the data services; scheduled data and ML jobs continue to run in GitHub
Actions.

## Production release gate

The only normal production release path is
`.github/workflows/deploy-production.yml`. It serializes deployments, never
cancels an in-flight release, verifies the merged PR checks, and uploads a
Cloudflare Worker version tagged with the full Git SHA and linked GitHub Actions
run. It then verifies `/api/health/release` through
`https://www.oracleinsight.xyz` before the live smoke.

Configure these values in the GitHub `Production` environment before enabling
the workflow:

- Secret `CLOUDFLARE_API_TOKEN`, scoped to the Insight account and Workers Scripts
  Write. The scheduled provenance audit also needs Workers Scripts Read.
- Variable `CLOUDFLARE_ACCOUNT_ID`.
- Variable `CLOUDFLARE_WORKER_NAME` only if the name differs from `insight-web`.

The Cloudflare account must also own or be delegated the `oracleinsight.xyz` zone,
and `www.oracleinsight.xyz` must be attached to the `insight-web` Worker. Until
DNS and the Worker custom domain are active, the production domain SHA assertion
will fail closed. A successful build or version upload is not a production cutover.

## Release result handling

| Live smoke result                            | Action                                                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Payment contracts pass                       | Keep the release.                                                                                     |
| Application contract fails                   | Roll back only while the public domain still reports this run's SHA, then smoke the restored version. |
| Infrastructure failure                       | Retry up to three times. Do not roll back solely for timeouts, 429, 502, 503, or 504.                 |
| Build, upload, or domain SHA assertion fails | Stop. No automatic rollback because the release has not been proven live.                             |

The workflow uses `concurrency: cancel-in-progress: false`, so newer releases
queue behind the active one. The rollback guard avoids reverting a newer version
if traffic has already moved on.

## Manual rollback

First inspect the failed run and the currently served release SHA. If an
application failure correlates with the release, run the repository's pinned
Wrangler version from the Insight checkout:

```bash
npm run release:rollback
```

Wrangler asks for confirmation before restoring the previous Worker version.
Alternatively, use `wrangler rollback --name insight-web <version-id>` to name a
specific retained version. Cloudflare keeps versions for 30 days, subject to its
version retention limits. A rollback changes Worker code/configuration only; it
does not reverse Supabase or Turso data changes or database migrations.

After rollback, verify:

1. `GET https://www.oracleinsight.xyz/api/health/release` returns the expected
   restored commit SHA.
2. `/api/v1/health` and `/api/v1/health/ready` return healthy responses.
3. Homepage, login, and payment-rail smoke pass.
4. Supabase/Turso writes and the newest price snapshot remain valid.

Freeze queued releases while investigating. Rollback is an availability control,
not a source revert: land a fix or revert through the normal PR gates.

## Emergency release

If an ordinary release is blocked while a reviewed fix already exists on the
current `main`, use the workflow-dispatch wrapper. It refuses dirty worktrees or
any SHA other than `origin/main`, requires an incident reason, and dispatches the
same gated GitHub Actions workflow:

```bash
npm run release:emergency -- --reason "describe why the normal release needs recovery"
```

The Cloudflare production provenance audit runs every ten minutes. It checks
recent Worker version tags for a full SHA reachable from `main` and files one
deduplicated review issue for untagged or off-main versions. Cloudflare version
tags are audit signals; they do not cryptographically prove which client uploaded
the version.
