# Measurement provenance and cleanup evidence

Two related rules: numbers must say where they came from, and cleanup steps
must prove what they actually changed.

## 1. Measurement provenance

Every capacity, row-count or byte-size number in a comment, doc, PR description
or report must carry **source + timestamp**:

| Source                        | Example                                           | What it proves                         |
| ----------------------------- | ------------------------------------------------- | -------------------------------------- |
| `count(*)`                    | `select count(*) from oracle_archive`             | exact rows at that moment              |
| `pg_database_size()`          | `select pg_database_size(current_database())`     | total database bytes                   |
| `pg_total_relation_size()`    | `select pg_total_relation_size('oracle_archive')` | table + indexes + TOAST                |
| `pgstattuple` / `pgstatindex` | dead tuples, index bloat                          | physical bloat, needs the extension    |
| `EXPLAIN (ANALYZE, BUFFERS)`  | actual rows, buffers, time                        | one plan and one data set              |
| `pg_stat_user_tables`         | `n_tup_ins`, `n_tup_del`, `n_live_tup`            | cumulative activity, resets on restart |

An **estimate** is allowed only when labelled as such, with its inputs:

```text
Estimate (推算): 20–25 MB per archived day.
Inputs: 2.1 GB total over 90 archived days (pg_database_size on 2026-09-27),
minus 1.1 GB baseline (pg_database_size on 2026-06-29).
Assumption: linear growth, same retention and write rate. Not a measurement.
```

Never present any of these as measured facts:

- “archive grows 20–25 MB per archived day” from a single total-size snapshot;
- “the database will fall back to X MB” without a measured after-state;
- “hourly steady state is 300 MB” from one sample at an arbitrary hour;
- a per-day rate inferred from two endpoints of different workloads without
  saying it is derived.

A value with no source is **unknown**, not zero and not a baseline. If a
previously published figure turns out to be an estimate, record the correction
in a dated change note; do not silently rewrite history.

## 2. Cleanup and retention evidence

A cleanup change is verified by the **real affected rows**, not by “the job ran
without error”.

### Minimum evidence

1. Predicate count before the run:
   ```sql
   select count(*) from <table> where <predicate>;
   ```
2. Measured deleted rows from the step itself — `DELETE ... RETURNING`,
   `GET DIAGNOSTICS row_count`, or a per-step audit row:

   ```sql
   -- inside a function
   delete from <table> where <predicate>;
   get diagnostics v_rows = row_count;
   raise log 'cleanup <step>: deleted % rows', v_rows;

   -- or as a one-off query
   with deleted as (
     delete from <table> where <predicate> returning 1
   )
   select count(*) as deleted_rows from deleted;
   ```

3. Cross-check with the cumulative counter (before/after, same session):
   ```sql
   select n_tup_del from pg_stat_user_tables where relname = '<table>';
   -- run the step
   select n_tup_del - <before> as deleted_delta
   from pg_stat_user_tables where relname = '<table>';
   ```
   `n_tup_del` is cumulative and resets on a server restart, so treat a
   suspicious delta as a prompt to query `DELETE ... RETURNING` directly.
4. Scheduler outcome:

   ```sql
   select jobid, schedule, command, active
   from cron.job
   where command ilike '%<cleanup function>%';

   select jobid, runid, status, return_message, start_time, end_time
   from cron.job_run_details
   where jobid = <jobid>
   order by start_time desc
   limit 10;
   ```

### Zero rows: no data or failure?

A step that deletes zero rows is ambiguous. Resolve it with the due-row count,
not with the step's own success label:

| Due rows before | Deleted rows  | Job status           | Verdict                                                                                                  |
| --------------- | ------------- | -------------------- | -------------------------------------------------------------------------------------------------------- |
| 0               | 0             | succeeded            | **No data** — verify the predicate and upstream freshness; not a failure                                 |
| > 0             | 0             | failed / missing run | **Failure** — inspect `return_message`, permissions, lock timeout                                        |
| > 0             | 0             | succeeded            | **Failure or wrong predicate** — never report success; compare the count query with the delete predicate |
| > 0             | > 0 but < due | succeeded            | **Partial** — batching, row locks or a second writer; report the remainder                               |
| 0               | 0             | failed / missing run | **Failure** — the job did not run; do not call it “nothing to do”                                        |

Also check that the job exists and is active (`cron.job.active`), that the last
run is recent, and that the upstream collector is still writing. “No rows” is a
valid result only when the due-row query also returns zero.

### Step result contract

A cleanup branch that can skip (archive, empty partition, already-clean range)
must return a structured result, not a generic success label:

```text
{ step: "archive", scanned: N, archived: M, skipped_reason: "no_due_rows" | null }
```

`skipped_reason: null` with `archived: 0` and `scanned > 0` is a failure signal,
not success. A line that only prints `skipped`/`ok` is not evidence.

### Retention-window changes

Changing a retention window (for example 90 → 120 days) is a behaviour change,
not a constant tweak. In the same change:

1. update the rule and any user-facing description;
2. update the verification query so it reflects the new predicate;
3. record the measured due-row count before and after the change;
4. state the expected effect on capacity as a labelled estimate unless both
   before and after sizes were measured.

A silent 90 → 120 change is a defect even when every test is green: nothing
proves that the new window deletes what it claims.

### PR evidence

Include the actual numbers with their source and time, for example:

```text
count(*) due at 2026-11-08 04:10 UTC: 41,208
deleted_rows (GET DIAGNOSTICS):        41,208
cron.job_run_details:                  succeeded, 04:11:02 UTC
pg_total_relation_size before/after:   812 MB / 779 MB (measured)
```

If the numbers are estimates, label them `estimate`/`推算` and give the
assumptions. If a step deleted zero rows, state which row of the triage table
above applies.
