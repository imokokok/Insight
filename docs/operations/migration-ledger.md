# Migration ledger and numbering

`supabase/migrations/` and `supabase_migrations.schema_migrations` are two
different histories of the same schema. This page defines how they are kept
aligned and what to do when they drift.

## Numbering rules

- A migration file is `NNNN_snake_case_name.sql`, where `NNNN` is a four-digit
  number from a single global sequence.
- Numbers are never reused, never renumbered after they appear on `main`, and
  never allocated out of order relative to an unreleased change.
- A migration change claims the serial `migrations` category in
  `npm run wt -- create ... --paths "supabase/migrations/*"`. Two sessions
  cannot write migration files at the same time.
- The only recorded historical gap is **0076** (never committed, not a
  template for skipping a number). Any other hole inside the committed range is
  a defect.

`scripts/tests/migration-numbers.test.mts` enforces this:

- a duplicate number fails, and the message names every conflicting file;
- a new gap fails and names every missing version between its neighbours;
- adding a legitimate gap requires updating both `KNOWN_GAPS` in the test and
  the list above, in the same change.

A gap does not prove a file was deleted — it may mean the number was consumed
by a migration that exists only in production. Use the ledger check below
before deciding.

## Ledger drift check

Read-only; it never applies or repairs anything.

```sh
# linked Supabase project (uses the CLI login already on this machine)
node --import tsx scripts/check-migration-drift.mts --linked

# explicit connection string
node --import tsx scripts/check-migration-drift.mts --db-url "$SUPABASE_DB_URL"

# saved result, for a review or when the database is unreachable
node --import tsx scripts/check-migration-drift.mts --ledger ledger.json

# directory-only check (duplicates and new gaps, no database)
node --import tsx scripts/check-migration-drift.mts --repository-only
```

The script queries exactly:

```sql
select version, name
from supabase_migrations.schema_migrations
order by version;
```

With `--ledger`, the file must be a JSON array of rows
(`[{"version":"0131","name":"hyperevm_chainlink_feeds"}]`) or an object with a
`rows` array. `--json` prints the same report as machine-readable JSON.
Exit codes: `0` in sync, `1` drift/duplicate/new gap, `2` usage or query failure.

### Reading the report

- **Ledger AHEAD** — versions recorded by the database with no file in the
  repository. This is the dangerous direction: a checkout can silently reuse or
  renumber an applied version. Do not reuse those numbers. Add the missing
  change with the next free number above the ledger's highest version, or treat
  the applied version as an opaque fact until its source is recovered.
- **Ledger BEHIND** — repository migrations the database has not recorded.
  Deploying code that depends on them ships against a missing schema. Apply the
  pending migrations (in order) before merging that code.
- **Version/name mismatch** — the same version was applied with different
  content. Treat it as a silent overwrite risk: compare the SQL, then add a new
  number rather than editing the applied version.
- **Duplicate / new gap** — fail the change; see the numbering rules above.

### When to run it

- before writing a new migration (so the next number is genuinely free);
- before a PR that applies a migration (`ship` evidence should include the
  output of the check, or the ledger file it used);
- after a production deploy that applied versions outside this checkout;
- during release readiness, after `main` has advanced past the last deployed
  migration.

If the database cannot be reached, record `--repository-only` plus the reason
and treat ledger direction as unknown; do not claim "in sync".

## Applying migrations

Only apply from a checkout whose ledger check is BEHIND (or in sync) and whose
migration files match `main`. Production applying a version that is not on
`main` is how a future checkout ends up with a duplicate number; if that
happens, reconcile it before any further migration work.
