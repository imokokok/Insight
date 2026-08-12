-- 0026_attestation_provenance.sql
-- Capture EIP-712 attestation provenance on each pre-trade audit row.
--
-- The pre_trade_checks audit log recorded the *verdict* but NOT whether the
-- verdict was actually signed into a portable, verifiable attestation. That gap
-- meant we had no first-party record of "signed + uid" — exactly the property
-- Raul's canary requires (verdict=BLOCK AND signed AND uid AND http 200). An
-- unsigned BLOCK therefore failed open silently and was only discoverable
-- downstream (via his probe), never internally observable. These columns make
-- the signing integrity of every emitted verdict queryable, so a signing-
-- regression / coverage dashboard can be built directly on the audit log.
--
-- Backfill: existing rows get signed=FALSE (we cannot retroactively recover the
-- uid without re-signing). Going forward every row carries the real provenance.

ALTER TABLE pre_trade_checks
  ADD COLUMN IF NOT EXISTS signed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS attestation_uid TEXT,
  ADD COLUMN IF NOT EXISTS attester TEXT,
  ADD COLUMN IF NOT EXISTS schema_version INTEGER,
  ADD COLUMN IF NOT EXISTS coverage_status TEXT
    CHECK (coverage_status IS NULL OR coverage_status IN ('SUFFICIENT', 'INSUFFICIENT')),
  ADD COLUMN IF NOT EXISTS unresolved_asset TEXT;

-- Fast path for the signing-integrity dashboard: "unsigned BLOCKs" = the
-- failing quadrant of Raul's canary rule. Partial index keeps it tiny.
CREATE INDEX IF NOT EXISTS idx_pre_trade_checks_unsigned
  ON pre_trade_checks (created_at DESC)
  WHERE signed = FALSE;

COMMENT ON COLUMN pre_trade_checks.signed IS
  'Whether Insight produced a signed EIP-712 attestation for this check (attestation object emitted). False when no attester key is configured or signing failed.';
COMMENT ON COLUMN pre_trade_checks.attestation_uid IS
  'Stable EIP-712 struct hash of the issued attestation; null when unsigned. Raul''s canary requires this to be present for a BLOCK to be an enforceable stop.';
COMMENT ON COLUMN pre_trade_checks.attester IS
  'Attester signer address; null when unsigned. Confirms which key signed (key-rotation watch).';
COMMENT ON COLUMN pre_trade_checks.schema_version IS
  'Attestation schema version actually issued (1 or 2); falls back to the requested version when unsigned.';
COMMENT ON COLUMN pre_trade_checks.coverage_status IS
  'v2 only: SUFFICIENT / INSUFFICIENT (quorum gate). Null for v1 (no quorum concept).';
COMMENT ON COLUMN pre_trade_checks.unresolved_asset IS
  'v2 only: the unresolved:<symbol>@<chain> marker when the asset could not be resolved to a canonical CAIP-19 id (registry gap surfaced inside the signed artifact). Null when resolved.';
