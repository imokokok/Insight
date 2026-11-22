# Insight hosting architecture

Status: current production hosting is Cloudflare Workers. This is the operating
architecture and release guide, not a pending migration plan.

## Runtime and release ownership

| Layer                       | Service                     | Responsibility                                                                         |
| --------------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| Web app and API             | Cloudflare Workers + vinext | Next.js app runtime, static assets, edge delivery, consent-gated web analytics         |
| HTTP response cache         | Workers Cache               | CDN caching configured through the vinext Cloudflare adapter                           |
| Primary relational data     | Supabase                    | Existing PostgreSQL, Auth, and server-only data access                                 |
| Price and projection data   | Turso                       | Existing libSQL workloads and projections                                              |
| CI/CD and scheduled compute | GitHub Actions              | PR checks, serialized production release, scheduled data/ML jobs, and provenance audit |

The hosting change did not add KV or Cloudflare Images. Supabase and Turso remain
the data services. Long-running collectors and ML training stay in GitHub Actions
runners; the Worker only serves the application/API workload.

The Workers deployment uses `cloudflare.config.ts` and `vite.config.ts`. Its
compatibility date is pinned in code, Node compatibility is enabled, Workers
Cache is the CDN cache adapter, and Cloudflare logs/traces are enabled with query
string redaction and 10% sampling. `INSIGHT_RUNTIME=cloudflare` enables trusted
Cloudflare client-IP handling. `INSIGHT_RELEASE_SHA` is stamped from
`GITHUB_SHA` and exposed only through the no-store `/api/health/release` route.

## GitHub Actions is the release controller

`.github/workflows/deploy-production.yml` is the only production release path.
It preserves the existing merged-PR evidence gate, serial release queue, live
payment-rail smoke, domain SHA assertion, and guarded automatic rollback. Each
Worker version carries the full source SHA as its tag and a link to its GitHub
Actions run as its message. `.github/workflows/production-provenance-audit.yml`
checks recent version tags and files review issues for missing or off-main SHAs.

Required GitHub `Production` environment configuration:

- `CLOUDFLARE_API_TOKEN` secret: Workers Scripts Write on the target account and
  Workers Routes Write scoped only to the `oracleinsight.xyz` zone. This lets the
  release workflow deploy `insight-web` and maintain its production route; it
  does not grant DNS-record edit access.
- `CLOUDFLARE_ACCOUNT_ID` variable.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` variables. They
  are public client configuration and must be present during the Vite build.
- Optional `CLOUDFLARE_WORKER_NAME` variable; default is `insight-web`.

The release job passes the GitHub `Production` secrets through an explicit
allowlist in `scripts/write-cloudflare-worker-secrets.mts`. It writes a mode
`0600` temporary JSON file in the runner directory, then `cf deploy` uploads
those values as Worker Secrets with the first Worker version. The file is not
checked into the repository or printed in logs. The allowlist excludes CI
credentials such as `CLOUDFLARE_API_TOKEN` and unrelated repository secrets.
Runtime configuration values are passed from GitHub
`Production` variables into `cloudflare.config.ts` as Worker Vars.

The workflow stops before deployment when required Supabase, Turso, signing,
cron, or CSRF/JWT secrets are absent. If `MPP_ENABLED=true`, it also requires
the MPP key and the x402 production configuration. Restore missing values from
their original secret source into GitHub `Production` before releasing; secret
values are intentionally not read back from the Worker or printed by CI.

Keep the Cloudflare token in GitHub's secret store. Do not use the local
Wrangler OAuth credential as a GitHub Actions secret. Configure application
runtime secrets in Cloudflare Workers' secret store separately from CI
credentials; never put Supabase service-role, Turso auth, payment, Sentry, or
other runtime secrets into public `NEXT_PUBLIC_*` variables.

For a configuration change, compare the current GitHub `Production` variable
and secret names against the values the app still reads. Put public build-time
values in the protected GitHub environment and private runtime values in Worker
secrets. Remove obsolete platform-only settings from the active deployment
configuration. Verify the Supabase, Turso, provider API, signing, cron, payment,
and Sentry configuration without printing secret values. A local Cloudflare
build does not prove production secrets exist.

## Custom domain cutover

The production Worker serves `https://www.oracleinsight.xyz`; production release
verification checks the public domain's reported SHA, health/readiness routes,
and payment smoke. The apex `oracleinsight.xyz` is managed separately from the
`www` Worker route. A `workers.dev` preview URL is not evidence of production
domain behavior. Vercel is retired for Insight production and is not a fallback
release target.

## Validation and platform limits

Use the repository's pinned Node.js 22.23.2. Local code checks are `npm run
build:vinext` and `npm run deploy:vinext -- --dry-run`; neither publishes a
production release. `npx vinext check` reports Next.js API compatibility and
must be rerun when using vinext or Next.js features not already covered here.

Vinext is still beta and the app's compatibility scan is not 100%; payment,
authentication, middleware, caching, and route behavior need production-like
smoke coverage before cutover. Workers CPU limits vary by Cloudflare plan. Keep
heavy jobs in GitHub Actions and verify the selected plan's CPU limit against
the slowest application API routes before moving production traffic. No paid
Cloudflare plan change is included in this migration.

See [production readiness](production-readiness.md) and the
[release/rollback runbook](release-runbook.md) for operational gates.
