-- ============================================================================
-- 0128 — refresh the zero-charge vocabulary on record_waived_credit.
--
-- 0126 documented the waiver reasons as `insufficient_data/timeout/no-data`.
-- That vocabulary is stale: a batch whose every item failed upstream is now
-- reported as `upstream_failed`, never as `insufficient_data`, and `no_data`
-- is no longer a billing reason at all.
--
-- Migrations that already reached main are never rewritten, so the drift is
-- corrected with a new COMMENT instead of editing 0126. Otherwise the old
-- wording keeps showing up in `\df+ record_waived_credit`.
--
-- Comment-only: no function body, signature, owner, grant or ledger write path
-- changes here.
-- ============================================================================
COMMENT ON FUNCTION "public"."record_waived_credit"(uuid, text, text, text, text, text, jsonb) IS
  'Append a 0-delta waiver ledger row (kind=waiver, source=free) for insufficient_data/upstream_failed/timeout outcomes. Never changes the wallet or budget.';
