# Production readiness and operations

This runbook is the release gate for the website and API. It complements the
[cron dispatcher runbook](cron-dispatcher.md); it does not replace the existing
data pipeline or change any public response contract.

## Service objectives

Measure these objectives over a rolling 30-day window. Alert on the shorter
windows so the team can react before the monthly objective is consumed.

| Signal                                    | Objective                            | Alert threshold                          |
| ----------------------------------------- | ------------------------------------ | ---------------------------------------- |
| Website and `/api/v1/health` availability | 99.95%                               | below 99.9% for 30 minutes               |
| Authenticated v1 API availability         | 99.9%                                | 5xx above 1% for 10 minutes              |
| Cached/read API latency                   | p95 below 400 ms                     | p95 above 750 ms for 15 minutes          |
| Heavy safety/analytics latency            | p95 below 2 seconds                  | p95 above 3 seconds for 15 minutes       |
| Price snapshot freshness                  | latest snapshot below 45 minutes old | `/api/v1/health/ready` returns 503 twice |
| Client stability                          | uncaught error sessions below 0.5%   | above 1% for 15 minutes                  |

Use `X-Request-Id` to correlate client reports, server logs, Sentry events, and
API-key usage records. `Server-Timing` exposes application processing time for
browser and synthetic monitoring without changing response bodies.

## Monitoring setup

1. Configure an external uptime check for `/api/v1/health` every minute.
2. Configure a dependency/readiness check for `/api/v1/health/ready` every five
   minutes. Page only after two consecutive failures; a single stale snapshot
   can recover on the next scheduled collection.
3. Enable Sentry release tracking and alerts for new regressions, 5xx rate, and
   frontend crash-free sessions. Keep `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, and
   `SENTRY_PROJECT` in the deployment secret store, never in repository files.
4. Use Vercel Analytics and Speed Insights for Core Web Vitals. Compare p75 LCP,
   INP, and CLS by route after every material frontend release.
5. Route GitHub Actions failures for the quality gate and six product-critical
   data jobs to the on-call channel.
6. Review CSP violation logs weekly. The policy is report-only so existing
   wallet, payment, documentation, and monitoring integrations keep working.
   After 14 clean days, remove only proven false positives and promote the same
   policy to `Content-Security-Policy` in a dedicated release.

## Backup and restore

The database is the system of record. This project intentionally operates on
Supabase Free: automatic backups and PITR are not release requirements. Use
encrypted logical exports stored outside the repository as the recovery path,
and never commit a database dump or connection credential to Git.

The 2026-09-06 production audit reported no provider-managed recovery points,
which is expected on Free. Keep a recent logical export before every schema or
billing change and perform a restore drill against an isolated local or
non-production database.

- Target RPO: 24 hours when daily logical exports are maintained.
- Target RTO: four hours for database restore and application validation.
- Retain at least seven encrypted daily exports and one monthly export outside
  Supabase and GitHub.
- Export a schema-only snapshot after every migration release.
- Run a restore drill into an isolated, non-production project every month.

Restore drill:

1. Record the backup timestamp, current migration number, and expected row
   counts for `price_snapshots`, `credit_wallet`, `credit_ledger`, and
   `subscriptions`.
2. Restore into a new non-production Supabase project. Never overwrite the live
   project during a drill.
3. Apply only migrations newer than the restored backup.
4. Run `npm run validate`, then verify liveness, readiness, login, public price
   data, one read-only API-key request, and credit balance reconciliation.
5. Compare row counts and the newest snapshot timestamp. Document duration and
   any manual step; delete the isolated project only after evidence is saved.

## Database security gate

Run the Supabase security advisor after every database migration. A release is
blocked by exposed `SECURITY DEFINER` functions, owner-privileged views, or RLS
being disabled on a table reachable through the Data API.

1. Apply migrations to staging and run
   `supabase db advisors --linked --type security --level warn`.
2. Confirm internal RPCs and datasets remain service-role-only. Exercise the
   server API that wraps each changed object; never validate by putting a
   service-role key in a browser.
3. Verify anonymous requests cannot read `price_snapshots`,
   `market_reference_hourly`, or `active_alerts_with_prices`, while snapshot
   collection, readiness, market-reference reads, billing, and rate limiting
   continue to work through the server.
4. Treat the advisor's leaked-password-protection warning as an accepted Free
   plan limitation. Keep the application's existing 8–128 character,
   uppercase/lowercase/number/symbol validation on registration and password
   changes, and re-test those flows after auth changes.
5. Do not make Pro-only Auth or backup features a launch requirement unless the
   project owner explicitly changes the cost boundary.
6. Export the post-migration schema and attach the advisor result, including
   accepted Free-plan warnings, to the release evidence.

## Release checklist

1. Use Node.js 22 or newer and run `npm ci`.
2. Run `npm run validate:ci`; it checks linting, formatting, types, unit and
   contract coverage, unused code, SDK compatibility, production build, and the
   homepage JavaScript budget.
3. Run `npm run test:e2e -- --project=chromium` locally when auth, routing, or
   API middleware changes. CI repeats the smoke suite on every pull request.
4. Apply pending Supabase migrations before code that relies on them. Confirm
   RLS policies and service-role-only tables in a staging project.
5. Keep Vercel compute in the same geography as the Supabase project. Verify
   latency from the deployed region rather than assuming the configured region.
6. Deploy to preview, check `/`, `/login`, `/settings`, `/docs/api`, liveness,
   readiness, and a real authenticated API request. Confirm that data timestamps
   advance and that wallet/payment integrations are still reachable.
7. Promote the already-tested artifact. Watch 5xx rate, p95 latency, Sentry, CSP
   reports, and snapshot freshness for at least 30 minutes.

## Load and failure testing

Do not run load tests against production billing endpoints. In staging, replay a
representative mix of cached reads, authenticated v1 reads, safety calculations,
invalid payloads, and unauthorized requests. Increase concurrency gradually and
record p50/p95/p99, error rate, Supabase connections, and rate-limit results.

The pre-authentication burst shield protects each application instance from
cheap floods before database-backed authentication. The distributed rate limit
remains authoritative across instances. Validate both behaviours during the
staging test, including `429`, `Retry-After`, and recovery after the window.

## Incident and rollback

1. Declare the incident, freeze deployments, and capture the first failing
   request ID, release identifier, readiness response, and latest data-job run.
2. Separate application failure from dependency failure: liveness proves the
   process is serving; readiness checks database reachability and snapshot age.
3. Roll back the application release when errors correlate with the release.
   Do not roll back a database migration until its down migration and data-loss
   impact have been reviewed.
4. For stale data, use the manual recovery route or workflow described in the
   cron dispatcher runbook, then verify the newest snapshot timestamp.
5. For credential exposure, rotate the affected secret, invalidate API keys or
   sessions where applicable, redeploy, and review access logs.
6. Close only after availability, error rate, latency, and freshness have stayed
   healthy for 30 minutes. Write a blameless follow-up with an owner and date for
   every action item.
