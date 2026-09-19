-- Read-only, one-snapshot reconciliation. No repair or wallet mutation.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
WITH ledger AS (
  SELECT user_id, sum(delta) AS total, count(*) AS entries
  FROM public.credit_ledger GROUP BY user_id
), wallets AS (
  SELECT w.user_id, w.balance, coalesce(l.total, 0) AS ledger_total,
    coalesce(l.entries, 0) AS entries
  FROM public.credit_wallet w LEFT JOIN ledger l USING (user_id)
), history AS (
  SELECT delta, balance_after,
    lag(balance_after, 1, 0::numeric) OVER (PARTITION BY user_id ORDER BY id) AS previous
  FROM public.credit_ledger
)
SELECT
  (SELECT count(*) FROM wallets) AS wallets_checked,
  (SELECT count(*) FROM public.credit_ledger) AS ledger_rows_checked,
  (SELECT count(*) FROM wallets WHERE balance <> ledger_total) AS wallet_mismatches,
  (SELECT count(*) FROM history WHERE previous + delta <> balance_after) AS ledger_chain_mismatches,
  (SELECT count(*) FROM public.credit_wallet WHERE balance < 0 OR frozen < 0 OR frozen > balance) AS invalid_wallets,
  (SELECT count(*) FROM ledger l LEFT JOIN public.credit_wallet w USING (user_id) WHERE w.user_id IS NULL) AS missing_wallets;
COMMIT;
