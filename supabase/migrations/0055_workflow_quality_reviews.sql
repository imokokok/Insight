-- Additive workflow reporting. Apply before deploying the new audit writer.
-- Historical rows remain unknown; no synthetic baseline or human label backfill.
BEGIN;
ALTER TABLE public.pre_trade_checks
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS workflow_tag text,
  ADD COLUMN IF NOT EXISTS baseline_verdict text CHECK (baseline_verdict IN ('allow','alert','block','unknown')),
  ADD COLUMN IF NOT EXISTS baseline_version text,
  ADD COLUMN IF NOT EXISTS assessment_scope jsonb,
  ADD COLUMN IF NOT EXISTS sizing_basis jsonb;
-- Unattributed checks are operational records, not public customer data.
-- Preserve own-key SELECT access while closing the historical NULL-key bypass.
DROP POLICY IF EXISTS "users_view_own_pre_trade_checks" ON public.pre_trade_checks;
CREATE POLICY "users_view_own_pre_trade_checks" ON public.pre_trade_checks
  FOR SELECT TO authenticated USING (
    api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid())
  );
CREATE INDEX IF NOT EXISTS idx_pre_trade_workflow_time
  ON public.pre_trade_checks(api_key_id, workflow_tag, created_at DESC);
CREATE TABLE IF NOT EXISTS public.pre_trade_workflow_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id uuid NOT NULL REFERENCES public.pre_trade_checks(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('useful','false_positive','missed_event','inconclusive')),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pre_trade_workflow_reviews_check
  ON public.pre_trade_workflow_reviews(check_id, created_at DESC);
ALTER TABLE public.pre_trade_workflow_reviews ENABLE ROW LEVEL SECURITY;
-- Supabase may grant ALL to service_role through creator default privileges.
-- Reset those grants too before establishing the append-only application role.
REVOKE ALL ON public.pre_trade_workflow_reviews FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.pre_trade_workflow_reviews TO service_role;
COMMENT ON TABLE public.pre_trade_workflow_reviews IS 'Append-only Ops-owner human review history. Proxy outcome labels remain separate.';
COMMIT;
