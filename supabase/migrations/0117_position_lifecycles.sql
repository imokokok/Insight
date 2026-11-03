-- Migration 0116: Position Lifecycle Bundles — the second non-per-call product.
--
-- One purchase pre-pays 24h of lifecycle coverage for ONE (symbol, chain)
-- position subject: an embedded Oracle Watch monitored window (reused verbatim
-- from 0115 — the window row stores the SAME token hash, so the lifecycle
-- token authenticates against the existing window poll/close routes), 4
-- bundled guard assessments across any of the six position-guard families, and
-- one bundled attested execution receipt.
--
-- The raw lifecycle token is returned exactly once at purchase; only its
-- SHA-256 hash is stored here and in the embedded window row, so a leaked
-- database dump cannot be replayed against either surface.

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."position_lifecycles" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,

    -- Subject: one monitored (symbol, chain) pair, fixed at purchase and
    -- mirrored from the embedded watch window.
    "symbol" text NOT NULL,
    "chain" text,
    "subject_chain_id" integer,

    -- Lifecycle. 'closed' is an explicit early close; an expired lifecycle
    -- stays 'active' in storage (expiry is derived from expires_at) so the
    -- close summary remains fetchable either way.
    "status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active','closed')),
    "expires_at" timestamp with time zone NOT NULL,
    "closed_at" timestamp with time zone,

    -- Auth: SHA-256 hex of the one-time lifecycle token, identical to the
    -- embedded window's token_hash. Raw token never stored.
    "token_hash" text NOT NULL,

    -- Bundled guard assessments. The family is chosen per call, not at
    -- purchase; the budget decrements via a conditional update that fails
    -- closed under concurrency.
    "guard_budget" integer NOT NULL DEFAULT 4 CHECK ("guard_budget" >= 0),
    "guard_used" integer NOT NULL DEFAULT 0 CHECK ("guard_used" >= 0),

    -- Bundled receipt credit: 'available' until one issuance consumes it.
    "receipt_state" text NOT NULL DEFAULT 'available' CHECK ("receipt_state" IN ('available','consumed')),
    "receipt_uid" text,

    -- The embedded monitored window. Watch polls go through the existing
    -- oracle-watch-window routes with the lifecycle token.
    "window_id" uuid NOT NULL REFERENCES "public"."oracle_watch_windows"("id") ON DELETE CASCADE,

    -- Provenance: which payment rail bought the lifecycle, and under whose key.
    "payment_method" text NOT NULL CHECK ("payment_method" IN ('x402','credits')),
    "api_key_id" uuid REFERENCES "public"."api_keys"("id") ON DELETE SET NULL,

    CONSTRAINT "position_lifecycles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."position_lifecycles" OWNER TO "postgres";

COMMENT ON TABLE "public"."position_lifecycles" IS 'Position Lifecycle Bundles: one pre-paid 24h bundle per (symbol, chain) position — monitored window + 4 guard assessments + 1 execution receipt. Only the purchase is metered.';
COMMENT ON COLUMN "public"."position_lifecycles"."token_hash" IS 'SHA-256 hex of the one-time lifecycle token, shared with the embedded window row. The raw token is shown once at purchase and never stored.';
COMMENT ON COLUMN "public"."position_lifecycles"."status" IS 'active until explicitly closed. Expiry is derived from expires_at, not from this column, so a summary stays retrievable after expiry.';
COMMENT ON COLUMN "public"."position_lifecycles"."guard_budget" IS 'Bundled guard assessment allowance across any position-guard family, chosen per call.';
COMMENT ON COLUMN "public"."position_lifecycles"."receipt_state" IS 'One bundled execution-receipt issuance: available until consumed, then permanently consumed with receipt_uid recorded.';

CREATE INDEX IF NOT EXISTS "position_lifecycles_active_expiry_idx"
    ON "public"."position_lifecycles" USING "btree" ("status", "expires_at");

-- RLS: users may view only lifecycles bought with their own API keys. Writes
-- are server-side via the service-role client (bypasses RLS); x402 purchases
-- carry no api_key_id and are only ever read server-side by the token-authed
-- bundle routes.
ALTER TABLE "public"."position_lifecycles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_position_lifecycles" ON "public"."position_lifecycles"
  FOR SELECT USING (
    "api_key_id" IS NOT NULL
    AND "api_key_id" IN (
      SELECT id FROM public.api_keys WHERE user_id = auth.uid()
    )
  );

-- Retention: 180 days past close/expiry, mirroring oracle_watch_windows.
SELECT cron.unschedule('position-lifecycles-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'position-lifecycles-cleanup');
SELECT cron.schedule('position-lifecycles-cleanup', '50 4 * * *', $$
  DELETE FROM public.position_lifecycles
  WHERE (status = 'closed' AND closed_at < now() - interval '180 days')
     OR expires_at < now() - interval '180 days';
$$);

COMMIT;
