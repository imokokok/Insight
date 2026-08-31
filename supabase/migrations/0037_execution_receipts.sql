-- Migration 0037: Execution Receipt per-issuance audit log
--
-- Pre-trade signs "the price is trustworthy to act on now"; Oracle Watch signs
-- "the feed is still trustworthy". Neither answers what the agent DID after
-- being told the price was safe. `execution_receipts` closes that gap: one row
-- per Execution Receipt Insight issues, so a counterparty auditing an agent can
-- trace "this agent claims it filled faithfully — WHICH receipt, and what did
-- it say?"
--
-- Mirrors `oracle_watch_checks` (0036) in spirit and shape. Deliberately lean:
-- the full EIP-712 payload is recoverable from `uid` via re-verification, so we
-- keep the signed gates and the verdict — enough to reconstruct WHY. The
-- canonical, authoritative copy of every value is the signed receipt; this table
-- is the forensics trail.

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."execution_receipts" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,

    -- Receipt identity. NULL when no attester key was configured or signing
    -- failed; `attested` below is the boolean that matters for the record.
    "uid" text,
    "attested" boolean NOT NULL DEFAULT false,
    "attester" text,
    "schema_version" smallint NOT NULL DEFAULT 1,
    "valid_until" timestamp with time zone,

    -- Pairing: the pre-trade attestation this execution was authorised against.
    -- Soft reference (text), not a hard FK — pre_trade_checks.attestation_uid is
    -- the pairing anchor and we do not want a migration-coupled constraint here.
    "pre_trade_uid" text,

    -- Subject
    "source_asset_id" text NOT NULL,
    "destination_asset_id" text NOT NULL,
    "subject_chain_id" integer,
    "settlement_chain_id" integer,

    -- Action / verdict
    "action" text,
    "execution_status" text NOT NULL CHECK ("execution_status" IN ('FAITHFUL','DEVIATED','NOT_EXECUTED','UNDETERMINED')),
    "fill_status" text NOT NULL CHECK ("fill_status" IN ('FULL','PARTIAL','REVERTED','FAILED')),

    -- Price comparison (raw, human-unit values; the canonical scaled values are
    -- in the signed receipt)
    "quoted_price" double precision,
    "executed_price" double precision,
    "price_delta_bps" integer,
    "max_slippage_bps" integer,
    "slippage_satisfied" boolean,

    -- Notional (informational; not part of the slippage verdict)
    "quoted_amount_usd" double precision,
    "executed_amount_usd" double precision,
    "actual_fee_usd" double precision,

    -- Settlement evidence
    "tx_hash" text NOT NULL,
    "block_number" bigint,
    "executed_at" timestamp with time zone,

    -- Oracle basis the agent gated on, carried forward
    "oracle_data_age_at_exec_seconds" integer,
    "participant_count" integer,
    "required_participant_count" integer,
    "source_group_count" integer,
    "required_source_group_count" integer,
    "independence_satisfied" boolean,

    -- Advisory model score
    "mev_risk_bps" integer,

    -- Reason-code set hash (executed-side codes)
    "reason_codes_hash" text,

    -- Provenance
    "source" text NOT NULL DEFAULT 'rest' CHECK ("source" IN ('rest','mcp','sample','collector')),
    "api_key_id" uuid REFERENCES "public"."api_keys"("id") ON DELETE SET NULL,
    "latency_ms" integer,

    CONSTRAINT "execution_receipts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."execution_receipts" OWNER TO "postgres";

COMMENT ON TABLE "public"."execution_receipts" IS 'Execution Receipt per-issuance audit log: one row per Execution Receipt issued, so a paired pre-trade + execution can be traced after the fact. Written fire-and-forget by recordExecutionReceipt.';
COMMENT ON COLUMN "public"."execution_receipts"."attested" IS 'False when no attester key was configured or signing failed. Signing is additive — attested=false never changes the verdict.';
COMMENT ON COLUMN "public"."execution_receipts"."pre_trade_uid" IS 'Binds this execution to the pre-trade attestation UID it was authorised under. The cryptographic binding lives in the signed receipt (preTradeUid); this is the queryable copy.';
COMMENT ON COLUMN "public"."execution_receipts"."execution_status" IS 'Insight verdict: FAITHFUL | DEVIATED | NOT_EXECUTED | UNDETERMINED. Derived from the signed evidence, never asserted independently.';
COMMENT ON COLUMN "public"."execution_receipts"."source" IS 'Issuing surface: rest | mcp | sample | collector.';

CREATE UNIQUE INDEX IF NOT EXISTS "execution_receipts_uid_key"
    ON "public"."execution_receipts" USING "btree" ("uid")
    WHERE "uid" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "execution_receipts_pre_trade_uid_idx"
    ON "public"."execution_receipts" USING "btree" ("pre_trade_uid")
    WHERE "pre_trade_uid" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "execution_receipts_tx_hash_idx"
    ON "public"."execution_receipts" USING "btree" ("tx_hash");
CREATE INDEX IF NOT EXISTS "execution_receipts_ts_idx"
    ON "public"."execution_receipts" USING "btree" ("created_at" DESC);
-- Partial index for deviation forensics ("show me every fill that drifted").
CREATE INDEX IF NOT EXISTS "execution_receipts_deviated_idx"
    ON "public"."execution_receipts" USING "btree" ("created_at" DESC)
    WHERE "execution_status" = 'DEVIATED'
       OR "execution_status" = 'UNDETERMINED';
-- Signing-rate monitoring: the ops signal that attestation is silently broken.
CREATE INDEX IF NOT EXISTS "execution_receipts_attested_ts_idx"
    ON "public"."execution_receipts" USING "btree" ("attested", "created_at" DESC);

-- RLS: users may view only receipts made with their own API keys.
-- Writes are server-side via the service-role client (bypasses RLS), so no
-- INSERT policy is needed for end users.
ALTER TABLE "public"."execution_receipts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_execution_receipts" ON "public"."execution_receipts"
  FOR SELECT USING (
    "api_key_id" IS NULL
    OR "api_key_id" IN (
      SELECT id FROM public.api_keys WHERE user_id = auth.uid()
    )
  );

-- Retention: 180 days. Same horizon as oracle_watch_checks; long enough to
-- answer "what did we tell this agent three months ago", cheap at call volume.
SELECT cron.unschedule('execution-receipts-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'execution-receipts-cleanup');
SELECT cron.schedule('execution-receipts-cleanup', '35 4 * * *', $$
  DELETE FROM public.execution_receipts WHERE created_at < now() - interval '180 days';
$$);

COMMIT;
