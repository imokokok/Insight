-- Migration 0115: Oracle Watch monitored windows — the first non-per-call product.
--
-- A monitored window pre-pays continuous Oracle Watch coverage for ONE
-- (symbol, chain) subject for a fixed duration (24 h). The buyer polls the
-- current halt/proceed signal within the window at no per-call charge; only
-- the initial purchase is metered (x402 USDC or credits, see
-- src/lib/billing/oracleWatchWindow.ts).
--
-- One row per purchased window. The raw window token is returned exactly once
-- at purchase; only its SHA-256 hash is stored, so a leaked database dump
-- cannot be replayed against the poll route.
--
-- Every signal issued inside a window is also written to oracle_watch_checks
-- with window_id set (column added below), which is what the close summary and
-- "which receipts did this window cover" forensics are answered from.

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."oracle_watch_windows" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,

    -- Subject: one monitored (symbol, chain) pair, fixed at purchase.
    "symbol" text NOT NULL,
    "chain" text,
    "subject_chain_id" integer,

    -- Lifecycle. 'closed' is an explicit early close; an expired window stays
    -- 'active' in storage (expiry is derived from expires_at) so the close
    -- summary remains fetchable either way.
    "status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active','closed')),
    "expires_at" timestamp with time zone NOT NULL,
    "closed_at" timestamp with time zone,

    -- Auth: SHA-256 hex of the one-time bearer token. Raw token never stored.
    "token_hash" text NOT NULL,

    -- Usage accounting enforced server-side (poll cap + min poll interval).
    "poll_count" integer NOT NULL DEFAULT 0,
    "last_poll_at" timestamp with time zone,

    -- Provenance: which payment rail bought the window, and under whose key.
    "payment_method" text NOT NULL CHECK ("payment_method" IN ('x402','credits')),
    "api_key_id" uuid REFERENCES "public"."api_keys"("id") ON DELETE SET NULL,

    CONSTRAINT "oracle_watch_windows_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."oracle_watch_windows" OWNER TO "postgres";

COMMENT ON TABLE "public"."oracle_watch_windows" IS 'Oracle Watch monitored windows: one pre-paid 24h continuous-signal coverage per (symbol, chain). Polls inside a window are free; the purchase itself is x402- or credit-metered.';
COMMENT ON COLUMN "public"."oracle_watch_windows"."token_hash" IS 'SHA-256 hex of the one-time window bearer token. The raw token is shown once at purchase and never stored.';
COMMENT ON COLUMN "public"."oracle_watch_windows"."status" IS 'active until explicitly closed. Expiry is derived from expires_at, not from this column, so a summary stays retrievable after expiry.';
COMMENT ON COLUMN "public"."oracle_watch_windows"."payment_method" IS 'Purchase rail: x402 (keyless per-settlement) or credits (API-key wallet debit).';

CREATE INDEX IF NOT EXISTS "oracle_watch_windows_active_expiry_idx"
    ON "public"."oracle_watch_windows" USING "btree" ("status", "expires_at");

-- Link issued judgments to the window that paid for them, so the close summary
-- and halt forensics can be scoped to one monitored position.
ALTER TABLE "public"."oracle_watch_checks"
    ADD COLUMN IF NOT EXISTS "window_id" uuid REFERENCES "public"."oracle_watch_windows"("id") ON DELETE SET NULL;

COMMENT ON COLUMN "public"."oracle_watch_checks"."window_id" IS 'Set when the judgment was issued inside a paid monitored window; null for per-call checks.';

CREATE INDEX IF NOT EXISTS "oracle_watch_checks_window_idx"
    ON "public"."oracle_watch_checks" USING "btree" ("window_id", "created_at")
    WHERE "window_id" IS NOT NULL;

-- RLS: users may view only windows bought with their own API keys. Writes are
-- server-side via the service-role client (bypasses RLS), so no INSERT/UPDATE
-- policy is needed for end users; x402 purchases carry no api_key_id and are
-- only ever read server-side by the token-authed poll route.
ALTER TABLE "public"."oracle_watch_windows" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_oracle_watch_windows" ON "public"."oracle_watch_windows"
  FOR SELECT USING (
    "api_key_id" IS NOT NULL
    AND "api_key_id" IN (
      SELECT id FROM public.api_keys WHERE user_id = auth.uid()
    )
  );

-- Retention: 180 days past close/expiry, mirroring oracle_watch_checks. Window
-- rows are tiny; the cron exists so the table cannot grow without bound.
SELECT cron.unschedule('oracle-watch-windows-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'oracle-watch-windows-cleanup');
SELECT cron.schedule('oracle-watch-windows-cleanup', '40 4 * * *', $$
  DELETE FROM public.oracle_watch_windows
  WHERE (status = 'closed' AND closed_at < now() - interval '180 days')
     OR expires_at < now() - interval '180 days';
$$);

COMMIT;
