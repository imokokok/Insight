-- Migration 0036: Oracle Watch per-issuance audit log
--
-- `feed_health_snapshots` (0034) is the periodic TIME-SERIES spine: a collector
-- writes one row per (symbol, chain) every 30 minutes for a fixed universe.
-- It says "what the feed looked like at 14:00".
--
-- It cannot answer the question a counterparty actually asks: "this agent
-- claims it gated on a receipt — WHICH receipt, and what did it say?" Live API
-- polling wrote nothing, so the answer was "we don't know". This table is the
-- missing half: one row per judgment actually issued, receipt or not.
--
-- Deliberately lean. The full EIP-712 payload is recoverable from `uid` +
-- `evaluated_at` via re-verification, and storing complete signed blobs per
-- call would turn a hot path into a storage problem. We keep the gate inputs
-- and the verdict — enough to reconstruct WHY, not enough to bloat writes.
--
-- Pre-trade's `pre_trade_checks` is the same shape and is the reason that
-- surface has usage evidence; Oracle Watch had no equivalent.

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."oracle_watch_checks" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,

    -- Receipt identity. NULL when no attester key was configured or signing
    -- failed; `attested` below is the boolean that matters for the record.
    "uid" text,
    "attested" boolean NOT NULL DEFAULT false,
    "attester" text,
    "schema_version" smallint NOT NULL DEFAULT 2,
    "valid_until" timestamp with time zone,

    -- Subject
    "symbol" text NOT NULL,
    "chain" text,
    "subject_chain_id" integer,

    -- Verdict
    "verdict" text NOT NULL CHECK ("verdict" IN ('normal','caution','danger')),
    "recommendation" text NOT NULL CHECK ("recommendation" IN ('proceed','proceed_with_caution','halt')),
    "reason" text NOT NULL,
    "reason_codes" text[] NOT NULL DEFAULT '{}',

    -- Gates (signed values, stored so a DANGER can be re-derived later)
    "participant_count" integer NOT NULL,
    "required_participant_count" integer NOT NULL,
    "quorum_satisfied" boolean NOT NULL,
    "source_group_count" integer NOT NULL,
    "required_source_group_count" integer NOT NULL,
    "independence_satisfied" boolean NOT NULL,

    -- Evidence
    "max_deviation_pct" double precision,
    "agreement" double precision NOT NULL,
    "outlier_count" integer NOT NULL DEFAULT 0,
    "stale_count" integer NOT NULL DEFAULT 0,
    "consensus_price" double precision,
    "trust_score" integer NOT NULL,
    "trust_level" text NOT NULL,
    "ml_risk_score" double precision,
    "ml_risk_level" text,

    -- Provenance: which surface issued this, and under whose key.
    "source" text NOT NULL DEFAULT 'rest' CHECK ("source" IN ('rest','mcp','sample','collector')),
    "api_key_id" uuid REFERENCES "public"."api_keys"("id") ON DELETE SET NULL,
    "latency_ms" integer,

    CONSTRAINT "oracle_watch_checks_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."oracle_watch_checks" OWNER TO "postgres";

COMMENT ON TABLE "public"."oracle_watch_checks" IS 'Oracle Watch per-issuance audit log: one row per judgment actually returned to a caller, so a receipt can be traced after the fact. Written fire-and-forget by recordOracleWatchCheck.';
COMMENT ON COLUMN "public"."oracle_watch_checks"."attested" IS 'False when no attester key was configured or signing failed. Watch signing is additive — attested=false never changes the verdict.';
COMMENT ON COLUMN "public"."oracle_watch_checks"."reason_codes" IS 'Composable reason-code set (NO_COVERAGE / INSUFFICIENT_QUORUM / INSUFFICIENT_INDEPENDENCE / MAX_DEVIATION / LOW_AGREEMENT / OUTLIER_PRESENT / STALE_DATA / ML_FORWARD_RISK_HIGH). Empty = healthy feed.';
COMMENT ON COLUMN "public"."oracle_watch_checks"."source_group_count" IS 'Distinct NON-DERIVED operator groups observed. Independence gate: >= required_source_group_count.';
COMMENT ON COLUMN "public"."oracle_watch_checks"."source" IS 'Issuing surface: rest | mcp | sample | collector.';

CREATE UNIQUE INDEX IF NOT EXISTS "oracle_watch_checks_uid_key"
    ON "public"."oracle_watch_checks" USING "btree" ("uid")
    WHERE "uid" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "oracle_watch_checks_symbol_chain_ts_idx"
    ON "public"."oracle_watch_checks" USING "btree" ("symbol", "chain", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "oracle_watch_checks_ts_idx"
    ON "public"."oracle_watch_checks" USING "btree" ("created_at" DESC);
-- Partial index for the halt-forensics query ("show me every halt we issued").
CREATE INDEX IF NOT EXISTS "oracle_watch_checks_halt_idx"
    ON "public"."oracle_watch_checks" USING "btree" ("created_at" DESC)
    WHERE "recommendation" = 'halt';
-- Signing-rate monitoring: the ops signal that attestation is silently broken.
CREATE INDEX IF NOT EXISTS "oracle_watch_checks_attested_ts_idx"
    ON "public"."oracle_watch_checks" USING "btree" ("attested", "created_at" DESC);

-- RLS: users may view only checks made with their own API keys.
-- Writes are server-side via the service-role client (bypasses RLS), so no
-- INSERT policy is needed for end users.
ALTER TABLE "public"."oracle_watch_checks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_oracle_watch_checks" ON "public"."oracle_watch_checks"
  FOR SELECT USING (
    "api_key_id" IS NULL
    OR "api_key_id" IN (
      SELECT id FROM public.api_keys WHERE user_id = auth.uid()
    )
  );

-- Retention: 180 days. Long enough to answer "what did we tell this agent three
-- months ago", short enough that the table stays cheap at API-call volume.
SELECT cron.unschedule('oracle-watch-checks-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'oracle-watch-checks-cleanup');
SELECT cron.schedule('oracle-watch-checks-cleanup', '25 4 * * *', $$
  DELETE FROM public.oracle_watch_checks WHERE created_at < now() - interval '180 days';
$$);

COMMIT;
