-- 0021_pre_trade_ml_score.sql
-- Adds shadow-mode ML scoring columns to pre_trade_checks.
--
-- The ML model (ml/train.py → ml/models/oracle_risk_model.json, scored in pure
-- TS by src/lib/ml/inference.ts) predicts the probability of an abnormal oracle
-- event in the next 6h. In shadow mode the score is recorded alongside every
-- rule-based check but does NOT influence the verdict — it only builds the
-- comparison dataset (ML score vs. rule verdict vs. realized outcome_label) so
-- we can measure whether the model beats the rules before ever letting it drive
-- a decision.
--
-- `ml_model_version` stores the model's trainedAt timestamp, identifying which
-- training run produced the score. NULL = no verified model was available at
-- check time (rules-only fallback).

ALTER TABLE pre_trade_checks
  ADD COLUMN IF NOT EXISTS ml_score DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS ml_model_version TEXT;

COMMENT ON COLUMN pre_trade_checks.ml_score IS
  'Shadow-mode ML probability [0,1] of an abnormal oracle event in the next 6h. NULL when no verified model is active. Does not influence the rule verdict.';
COMMENT ON COLUMN pre_trade_checks.ml_model_version IS
  'trainedAt timestamp of the model that produced ml_score (identifies the training run). NULL when no verified model was active.';
