-- Migration 0081: operator issuance control (kill switch) + privileged action audit.
--
-- Why this exists:
-- Until now the only documented way to stop issuing pre-trade verdicts was to
-- roll back a deployment (docs/operations/production-readiness.md, "Incident and
-- rollback"). There was no operator-visible way to halt issuance, and no audit
-- trail at all for privileged /ops console actions. This migration adds both:
--
--   * ops_issuance_control — a singleton row holding the current halt state. The
--     pre-trade service reads it BEFORE touching any upstream data, so an
--     incident that implicates the oracle sources cannot influence the outcome:
--     while halted, every check short-circuits to a signed BLOCK.
--   * ops_admin_actions   — an append-only record of privileged console writes,
--     starting with halt engages/releases. Every entry carries the actor, the
--     reason and the before/after state so the action stays justifiable after
--     the fact.
--
-- Both tables are internal: RLS is enabled with no policies and the default
-- browser-role grants are revoked, so only the service-role key can read or
-- write them. No public API surface is introduced.

BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.ops_issuance_control (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  halted boolean NOT NULL DEFAULT false,
  reason text,
  changed_by text,
  changed_by_email text,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 0
);
ALTER TABLE public.ops_issuance_control OWNER TO postgres;

-- Seed the singleton. The reader treats a missing row as "could not verify"
-- rather than "not halted", so the default state must exist from migration time.
INSERT INTO public.ops_issuance_control (id, halted)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.ops_issuance_control IS
  'Singleton operator kill switch for pre-trade issuance. Read on the pre-trade hot path before any upstream fetch; halted=true short-circuits every check to a signed BLOCK.';
COMMENT ON COLUMN public.ops_issuance_control.halted IS
  'True while an operator has halted issuance. False is normal operation.';
COMMENT ON COLUMN public.ops_issuance_control.reason IS
  'Operator-supplied reason for the current state; carried into the audit log and surfaced on every halted check.';
COMMENT ON COLUMN public.ops_issuance_control.changed_by IS
  'OPS_OWNER user id that last changed the state.';
COMMENT ON COLUMN public.ops_issuance_control.revision IS
  'Monotonic revision, incremented on every change, so a console can detect a change it has not seen.';

CREATE TABLE IF NOT EXISTS public.ops_admin_actions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  actor_id text,
  actor_email text,
  action text NOT NULL,
  target text,
  reason text,
  before_state jsonb,
  after_state jsonb
);
ALTER TABLE public.ops_admin_actions OWNER TO postgres;

CREATE INDEX IF NOT EXISTS ops_admin_actions_created_idx
  ON public.ops_admin_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS ops_admin_actions_action_created_idx
  ON public.ops_admin_actions (action, created_at DESC);

COMMENT ON TABLE public.ops_admin_actions IS
  'Append-only audit log of privileged /ops console writes. One row per action, with actor, reason and before/after state, so any action can be justified after the fact.';
COMMENT ON COLUMN public.ops_admin_actions.action IS
  'Stable action identifier, e.g. issuance.halt.engage | issuance.halt.release.';
COMMENT ON COLUMN public.ops_admin_actions.target IS
  'The object the action applied to, e.g. issuance_control.';

-- Atomic apply: flip the singleton and append the audit row in one transaction,
-- so a state change can never be observed without its audit trail (nor the
-- reverse). SECURITY INVOKER on purpose: the caller is the service-role client,
-- which already holds the required privileges, so no elevated function is
-- introduced and nothing becomes reachable from the Data API.
CREATE OR REPLACE FUNCTION public.ops_apply_issuance_change(
  p_halted boolean,
  p_reason text,
  p_actor text,
  p_actor_email text
)
RETURNS TABLE (
  halted boolean,
  reason text,
  changed_by text,
  changed_by_email text,
  changed_at timestamp with time zone,
  revision bigint
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_before public.ops_issuance_control%ROWTYPE;
  v_after public.ops_issuance_control%ROWTYPE;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
BEGIN
  IF p_halted IS NULL THEN
    RAISE EXCEPTION 'ops_apply_issuance_change: target state is required';
  END IF;
  IF v_reason IS NULL OR length(v_reason) < 3 THEN
    RAISE EXCEPTION 'ops_apply_issuance_change: a reason of at least 3 characters is required';
  END IF;

  SELECT * INTO v_before FROM public.ops_issuance_control WHERE id = 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ops_apply_issuance_change: issuance control row is missing';
  END IF;

  UPDATE public.ops_issuance_control SET
    halted = p_halted,
    reason = v_reason,
    changed_by = nullif(btrim(coalesce(p_actor, '')), ''),
    changed_by_email = nullif(btrim(coalesce(p_actor_email, '')), ''),
    changed_at = now(),
    revision = v_before.revision + 1
  WHERE id = 1
  RETURNING * INTO v_after;

  INSERT INTO public.ops_admin_actions (
    actor_id, actor_email, action, target, reason, before_state, after_state
  ) VALUES (
    v_after.changed_by,
    v_after.changed_by_email,
    CASE WHEN p_halted THEN 'issuance.halt.engage' ELSE 'issuance.halt.release' END,
    'issuance_control',
    v_reason,
    jsonb_build_object('halted', v_before.halted, 'reason', v_before.reason, 'revision', v_before.revision),
    jsonb_build_object('halted', v_after.halted, 'reason', v_after.reason, 'revision', v_after.revision)
  );

  RETURN QUERY
    SELECT v_after.halted, v_after.reason, v_after.changed_by,
           v_after.changed_by_email, v_after.changed_at, v_after.revision;
END;
$$;

REVOKE ALL ON FUNCTION public.ops_apply_issuance_change(boolean, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ops_apply_issuance_change(boolean, text, text, text)
  TO service_role;

-- Service-role only: enable RLS with no policies and drop the default grants
-- that Supabase gives the browser roles on new public tables.
ALTER TABLE public.ops_issuance_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_admin_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ops_issuance_control, public.ops_admin_actions
  FROM PUBLIC, anon, authenticated;

-- Evidence-chain pairing: execution_receipts.pre_trade_uid joins to
-- pre_trade_checks.attestation_uid, which had no index. Partial, because only
-- signed pre-trade rows carry a uid.
CREATE INDEX IF NOT EXISTS idx_pre_trade_checks_attestation_uid
  ON public.pre_trade_checks (attestation_uid)
  WHERE attestation_uid IS NOT NULL;

COMMIT;
