# Supabase cron startup timeout review — 2026-11-27

## Window and evidence

Reviewed the `Insight` Supabase project (`naevwrexybqodxinkrug`, `ap-south-1`)
at 2026-11-27 13:34 Asia/Shanghai. The incident window was approximately
2026-11-27 08:00–10:23 Asia/Shanghai (00:00–02:23 UTC).

Evidence came from read-only queries against `cron.job_run_details`,
`pg_settings`, `pg_stat_database`, and Supabase Postgres logs for
2026-11-27 00:00–03:00 UTC:

- Multiple scheduled jobs ended with `job startup timeout`; these records had
  `job_pid IS NULL`. The failed starts affected both dispatch and maintenance
  jobs.
- During the same window, Postgres logs contained statement timeouts, client
  cancellations, SSL EOF/reset messages, and broken pipes. Some failed cron
  records took several minutes to close.
- The Postgres instance had not restarted: `pg_postmaster_start_time()` was
  2026-11-26 02:24:23 UTC. No deadlocks or temporary-file activity were
  present in the current database counters.
- The current settings were `cron.use_background_workers=off`,
  `cron.max_running_jobs=32`, `max_connections=60`, and
  `statement_timeout=120000`. The cron limit is a postmaster setting; ordinary
  migration SQL cannot change it safely.
- Later scheduled runs succeeded, including capture and projection jobs.
  Receipt-gated fallback jobs remain the recovery path for missed slots.

## Diagnosis

The proximate failure was that pg_cron could not start database sessions for
some scheduled jobs while client sessions were also timing out or disconnecting.
The available project logs do **not** identify why that happened: they contain
no statement text for the timed-out sessions, no explicit connection-limit or
worker-exhaustion error, and no server restart. The `32`-job limit relative to
`60` connections is a possible saturation risk, but the evidence does not prove
that the limit was reached. The public [Supabase status history](https://status.supabase.com/history)
did not show a matching published incident when this review was made; that does
not rule out an unreported or project-specific platform event.

Accordingly, this review records a transient Postgres session/connectivity
degradation as the best-supported explanation, not a proven upstream trigger.
No postmaster setting or schedule was changed on this evidence alone. If the
pattern recurs, collect the project CPU, I/O, and connection graphs for the
same UTC interval alongside the logs before changing cron concurrency.

## Health reporting follow-up

The hourly control-plane workflow now derives current health from the rolling
60-minute count (degraded at three or more failures), instead of trusting the
RPC's legacy `healthy` flag, which also includes 24-hour volume. The report still
retains the 24-hour count, affected job names, and burst threshold for diagnosis.
A burst that has cleared the recent window no longer keeps the health check red;
this consumer-side change requires no database migration.
