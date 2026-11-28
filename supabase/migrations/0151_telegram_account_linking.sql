-- Telegram account linking uses short-lived one-time challenges. Telegram IDs
-- are service-only identifiers and are never exposed to browser queries.
CREATE TABLE IF NOT EXISTS public.telegram_link_challenges (
  challenge_hash text PRIMARY KEY CHECK (challenge_hash ~ '^[0-9a-f]{64}$'),
  telegram_user_id text NOT NULL CHECK (telegram_user_id ~ '^[0-9]{1,24}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  claimed_at timestamptz
);

CREATE INDEX IF NOT EXISTS telegram_link_challenges_expiry_idx
  ON public.telegram_link_challenges (expires_at);

CREATE TABLE IF NOT EXISTS public.telegram_account_links (
  telegram_user_id text PRIMARY KEY CHECK (telegram_user_id ~ '^[0-9]{1,24}$'),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_link_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_account_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.telegram_link_challenges FROM anon, authenticated;
REVOKE ALL ON public.telegram_account_links FROM anon, authenticated;
GRANT ALL ON public.telegram_link_challenges TO service_role;
GRANT ALL ON public.telegram_account_links TO service_role;

CREATE OR REPLACE FUNCTION public.claim_telegram_account_link(
  p_challenge_hash text,
  p_user_id uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_telegram_user_id text;
BEGIN
  SELECT c.telegram_user_id
    INTO v_telegram_user_id
    FROM public.telegram_link_challenges AS c
   WHERE c.challenge_hash = p_challenge_hash
     AND c.claimed_at IS NULL
     AND c.expires_at > now()
   FOR UPDATE;

  IF v_telegram_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.telegram_account_links AS l
     WHERE l.telegram_user_id = v_telegram_user_id OR l.user_id = p_user_id
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.telegram_account_links (telegram_user_id, user_id)
  VALUES (v_telegram_user_id, p_user_id);

  UPDATE public.telegram_link_challenges
     SET claimed_at = now()
   WHERE challenge_hash = p_challenge_hash;

  RETURN v_telegram_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_telegram_account_link(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_telegram_account_link(text, uuid) TO service_role;

COMMENT ON TABLE public.telegram_account_links IS
  'Private mapping between a Telegram account and an authenticated Insight account; service access only.';
