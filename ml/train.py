#!/usr/bin/env python3
"""
Insight oracle-risk ML trainer (Phase 2, v2 — dual-horizon + enriched features).

Mines hourly_price_snapshots and de-duplicated, schema-versioned live checks
into labeled training examples, trains XGBoost binary classifiers, and exports
a self-verifying JSON model that the Next.js app scores in pure TypeScript (no
Python runtime in prod).

DUAL HORIZON: trains TWO models — a near-term 1h model (more actionable for live
trades) and a 6h model (the existing strategic horizon). The TS scorer exposes
both; the pre-trade check takes the worse (max) so either horizon flagging risk
raises the manipulationRiskScore. If the 1h split has too few positives, only
the 6h model is exported (the 1h horizon is set to null — graceful degradation).

Prediction task: given the cross-oracle state for an asset at hour T, will an
abnormal event follow in the next H hours? (abnormal = consensus price moves
>=5% OR cross-oracle deviation spikes >=8% — the SAME label definition as the
safetyOutcomeService backfill, so mined and flywheel labels are consistent.)

ENRICHED FEATURES (22): the original 7 plus
  rolling_volatility_6h       rolling std of 1h consensus returns, 6h window
  deviation_velocity_3h       max_dev(T) - max_dev(T-3h)  (longer-term trend)
  participant_count_delta_1h providers online now vs 1h ago (drops = risk)
  max_deviation_zscore_24h   how anomalous is current dev vs 24h baseline
  agreement / outlier_count / stale_count / avg_reputation / min_reputation
                             v3 governance features from the 30-min Oracle
                             Watch spine (neutral-filled when unavailable)

EVALUATION: time-based train/validation/test split with PURGE + EMBARGO.
Validation is used for early stopping and calibration; the final test period is
untouched until reporting, so metrics measure true out-of-time skill.

CALIBRATION: each horizon exports a monotonic reliability table per asset class
(stable/volatile/default), fitted on the validation split. The TS scorer routes
scores through it so the Watch "high"
bucket means the same thing across asset classes.

Feature definitions are EXACTLY mirrored by src/lib/ml/inference.ts (see
FEATURE_NAMES below and featuresFromPreTrade there). The TS scorer maps by NAME,
so models with any subset of these features all score correctly (missing names
are filled from the exported neutralFill map, then 0).

Runs offline (GitHub Actions runner every 3 days, or locally). Not in the app
hot path. Gracefully writes a null model when there is too little data — or
when the 30-min spine is empty/unreachable (v3 features fall back to their
neutral values and training proceeds).

Env:
  SUPABASE_URL            e.g. https://<ref>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY   service-role key (read access to hourly_price_snapshots)
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
import requests
import xgboost as xgb
from requests.adapters import HTTPAdapter
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import average_precision_score, brier_score_loss, precision_score, recall_score, roc_auc_score
from urllib3.util.retry import Retry

# --- Config (mirrors safetyOutcomeService.OUTCOME_THRESHOLDS) ----------------
HORIZONS = [1, 6]  # hours ahead to predict (1h near-term + 6h strategic)
PRICE_MOVE_PCT = 5.0
DEVIATION_PCT = 8.0
# Track-B: oracle-vs-market divergence threshold. |consensus - CEX ref| / ref
# >= this % within the horizon counts as abnormal — the external-truth label
# component that consensus-only labels cannot see. Mirrors
# safetyOutcomeService.OUTCOME_THRESHOLDS.marketDivergencePct.
MARKET_DIVERGENCE_PCT = 2.0
# ML staleness uses the same "old AND price-divergent" definition as the live
# consensus service. Age alone is not trustworthy for several oracle adapters.
STALE_SECONDS = 3600
STALE_DIVERGENCE_PCT = 2.0

# Label specification version. Bump (and mirror in safetyOutcomeService) every
# time the label definition changes so mined and flywheel labels stay
# comparable — the version is exported with the model.
LABEL_SPEC_VERSION = 2  # v2 = Track A (price/dev) OR Track B (market divergence)
EVALUATION_SPEC_VERSION = 3  # v3 = purged split + fine-grained future-event labels
FEATURE_SCHEMA_VERSION = 5  # mirrors ML_FEATURE_SCHEMA_VERSION in inference.ts

MIN_TOTAL = 500
MIN_POSITIVES = 15  # per horizon; below this the horizon is skipped

# Assets treated as the "stable" class for per-class calibration. Everything
# else (ETH, BTC, ...) trains into the "volatile" class. Mirrors the live
# classifier in src/lib/ml/inference.ts assetClassFor() — keep both in sync.
STABLE_ASSETS = {"USDC", "USDT", "DAI", "USDS", "FDUSD", "TUSD", "PYUSD", "USD1"}

# Calibration bins: equal-width on the RAW probability, calibrated value =
# realized positive rate within the bin (reliability table). A class with too
# few test rows/positives exports no table for that class (falls back to
# default at inference).
CALIBRATION_BINS = 10
CALIBRATION_MIN_ROWS = 200
CALIBRATION_MIN_POS = 10
# A calibrated onset probability is much lower than the old current-state risk
# score. A 15% chance of an abnormal event within six hours is operationally
# high for a safety gate even though it is well below the generic 0.5 cutoff.
RISK_MEDIUM_THRESHOLD = 0.10
RISK_HIGH_THRESHOLD = 0.15

# Only train on the last LOOKBACK_WEEKS of snapshots. Enough for the 6h
# eval-window labeling + the 24h rolling z-score feature plus a healthy train/
# test split, while BOUNDING the read from Supabase so the per-run load stays
# flat as the table grows.
LOOKBACK_WEEKS = 8

FEATURE_NAMES = [
    "max_deviation_pct",
    "cross_provider_spread_pct",
    "participant_count",
    "stale",
    "mean_deviation_pct",
    "stale_ratio",
    "deviation_velocity_1h",
    # --- v2 enriched features ---
    "rolling_volatility_6h",       # rolling std of 1h consensus returns (6h)
    "deviation_velocity_3h",       # max_dev(T) - max_dev(T-3h)
    "participant_count_delta_1h",  # participant_count(T) - participant_count(T-1)
    "max_deviation_zscore_24h",    # (dev - mean24) / std24
    # --- v3 governance features (from the 30-min Oracle Watch spine) ---
    # Neutral fill matches src/lib/ml/inference.ts featuresFromPreTrade defaults:
    #   agreement=1.0 (perfect ⇒ no signal), outlier/stale=0, reputation=0.5 (unknown).
    # They stay constant (harmless) until the 30-min spine accumulates enough rows.
    "agreement",                   # cross-provider agreement (0-1, mean of hour)
    "outlier_count",               # provider count flagged outlier (sum of hour)
    "stale_count",                 # provider count stale >=60s (sum of hour)
    "avg_reputation",              # mean provider reputation (0-1 normalized)
    "min_reputation",              # worst provider reputation (0-1 normalized)
    # --- v4 external-truth feature (from the CEX market-reference layer) ---
    # |consensus - CEX ref| / ref * 100. Neutral fill 0 (no divergence signal)
    # when the reference layer has no row for that (symbol, hour) — mirrors
    # the live neutral default in src/lib/ml/inference.ts featuresFromPreTrade.
    "oracle_vs_market_deviation_pct",  # consensus vs CEX reference divergence (%, abs)
    # --- v5 independent-market quality/liquidity context ---
    "market_reference_available",       # explicit missingness (1=fresh reference)
    "market_exchange_count",            # successful independent exchanges
    "market_cross_exchange_spread_pct", # disagreement inside the truth layer
    "market_bid_ask_spread_pct",         # median public top-of-book spread
    "market_log_volume",                 # log1p median 24h base volume
]

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "oracle_risk_model.json")
VERIFICATION_SAMPLE_COUNT = 20
VERIFICATION_TOLERANCE = 0.01
PAGE_SIZE = 1000

# XGBoost params: small + CPU-friendly. base_score=0.5 => logit bias = 0.
# See ml/requirements.txt: pinned to xgboost 2.x because 3.0 changes GLM
# base_score init and breaks the pure-TS inference contract (logit bias = 0).
XGB_PARAMS = dict(
    n_estimators=320,
    base_score=0.5,
    objective="binary:logistic",
    eval_metric="aucpr",
    tree_method="hist",
    n_jobs=2,
    subsample=0.8,
    colsample_bytree=0.8,
    early_stopping_rounds=30,
    random_state=42,
)

# Small, bounded candidate set. Selection happens on validation PR-AUC because
# onset events are rare; the final test period remains untouched.
XGB_CANDIDATES = [
    {"name": "rank_auc", "n_estimators": 120, "max_depth": 4, "learning_rate": 0.2,
     "min_child_weight": 3, "reg_lambda": 1.0, "reg_alpha": 0.0, "eval_metric": "auc",
     "early_stopping_rounds": 20},
    {"name": "shallow", "max_depth": 2, "learning_rate": 0.05, "min_child_weight": 5,
     "reg_lambda": 2.0, "reg_alpha": 0.1},
    {"name": "balanced", "max_depth": 3, "learning_rate": 0.08, "min_child_weight": 4,
     "reg_lambda": 2.0, "reg_alpha": 0.0},
    {"name": "expressive", "max_depth": 4, "learning_rate": 0.08, "min_child_weight": 3,
     "reg_lambda": 1.0, "reg_alpha": 0.0},
]

HTTP = requests.Session()
HTTP.mount(
    "https://",
    HTTPAdapter(
        max_retries=Retry(
            total=5,
            connect=5,
            read=5,
            status=5,
            backoff_factor=0.5,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=("GET",),
        )
    ),
)


def log(msg: str) -> None:
    print(f"[train] {msg}", flush=True)


def fetch_rows(base_url: str, service_key: str) -> pd.DataFrame:
    """Page through hourly_price_snapshots via the PostgREST API.

    Reads only the last LOOKBACK_WEEKS of rows (see LOOKBACK_WEEKS) to keep the
    Supabase read flat over time.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(weeks=LOOKBACK_WEEKS)).isoformat()
    log(f"Fetching hourly_price_snapshots since {cutoff} (last {LOOKBACK_WEEKS} weeks)...")
    url = base_url.rstrip("/") + "/rest/v1/hourly_price_snapshots"
    select = "symbol,snapshot_hour,provider,chain_id,price,deviation_pct,data_age_seconds,is_success"
    params = {
        "select": select,
        "is_success": "eq.true",
        "snapshot_hour": f"gte.{cutoff}",
        "order": "symbol,snapshot_hour,provider",
    }
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }
    rows = []
    offset = 0
    while True:
        headers["Range"] = f"{offset}-{offset + PAGE_SIZE - 1}"
        headers["Prefer"] = "count=exact"
        r = HTTP.get(url, headers=headers, params=params, timeout=60)
        r.raise_for_status()
        chunk = r.json()
        rows.extend(chunk)
        total = None
        cr = r.headers.get("Content-Range", "")
        if "/" in cr:
            try:
                total = int(cr.rsplit("/", 1)[-1])
            except ValueError:
                total = None
        offset += PAGE_SIZE
        if len(chunk) < PAGE_SIZE:
            break
        if total is not None and offset >= total:
            break
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    df["snapshot_hour"] = pd.to_datetime(df["snapshot_hour"], utc=True, format="mixed")
    for c in ("price", "deviation_pct", "data_age_seconds"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df.dropna(subset=["price"])
    df = df[df["price"] > 0]
    return df


def fetch_fine_rows(base_url: str, service_key: str) -> pd.DataFrame:
    """Fetch the existing 15-minute spine for higher-resolution future labels.

    Fine rows are NOT multiplied into four training examples per hour. They are
    used only to observe incidents that begin and recover between two hourly
    feature snapshots, preserving the live hourly feature contract and the
    effective number of independent prediction times.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(weeks=LOOKBACK_WEEKS)).isoformat()
    url = base_url.rstrip("/") + "/rest/v1/price_snapshots"
    params = {
        "select": "symbol,snapshot_ts,provider,chain_id,price,deviation_pct,data_age_seconds,is_success",
        "is_success": "eq.true",
        "snapshot_ts": f"gte.{cutoff}",
        "order": "symbol,snapshot_ts,provider",
    }
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}
    rows = []
    offset = 0
    while True:
        headers["Range"] = f"{offset}-{offset + PAGE_SIZE - 1}"
        r = HTTP.get(url, headers=headers, params=params, timeout=60)
        r.raise_for_status()
        chunk = r.json()
        rows.extend(chunk)
        offset += PAGE_SIZE
        if len(chunk) < PAGE_SIZE:
            break
    fine = pd.DataFrame(rows)
    if fine.empty:
        return fine
    fine["snapshot_ts"] = pd.to_datetime(fine["snapshot_ts"], utc=True, format="mixed")
    for c in ("price", "deviation_pct", "data_age_seconds"):
        fine[c] = pd.to_numeric(fine[c], errors="coerce")
    fine = fine.dropna(subset=["price"])
    return fine[fine["price"] > 0]


def fetch_flywheel_rows(base_url: str, service_key: str) -> pd.DataFrame:
    """Fetch live checks whose feature and label semantics exactly match."""
    cutoff = (datetime.now(timezone.utc) - timedelta(weeks=LOOKBACK_WEEKS)).isoformat()
    url = base_url.rstrip("/") + "/rest/v1/pre_trade_checks"
    params = {
        "select": (
            "asset,created_at,ml_feature_vector,outcome_label_1h,outcome_label_6h,"
            "outcome_1h,outcome_6h"
        ),
        "created_at": f"gte.{cutoff}",
        "feature_schema_version": f"eq.{FEATURE_SCHEMA_VERSION}",
        "label_spec_version": f"eq.{LABEL_SPEC_VERSION}",
        "ml_feature_vector": "not.is.null",
        "order": "created_at",
    }
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}
    rows = []
    offset = 0
    while True:
        headers["Range"] = f"{offset}-{offset + PAGE_SIZE - 1}"
        response = HTTP.get(url, headers=headers, params=params, timeout=60)
        response.raise_for_status()
        chunk = response.json()
        rows.extend(chunk)
        offset += PAGE_SIZE
        if len(chunk) < PAGE_SIZE:
            break
    frame = pd.DataFrame(rows)
    if not frame.empty:
        frame["created_at"] = pd.to_datetime(frame["created_at"], utc=True, format="mixed")
    return frame


# Neutral value for each v3 governance feature when a row has no 30-min Oracle
# Watch spine to source from. MUST mirror src/lib/ml/inference.ts
# featuresFromPreTrade defaults so training and all live scorers agree.
V3_NEUTRAL = {
    "agreement": 1.0,
    "outlier_count": 0,
    "stale_count": 0,
    "avg_reputation": 0.5,
    "min_reputation": 0.5,
}

# Per-feature fill for UNKNOWN feature names at inference time. v1/v2 features
# default to 0 (they are all magnitudes/counts where 0 = "no signal"); v3
# governance features carry their neutral prior. Exported into the model JSON
# so the TS scorer fills missing names from this map instead of a blind 0
# (a future feature whose neutral is not 0 would otherwise be silently
# mis-filled by older scorers).
NEUTRAL_FILL = {**{name: 0.0 for name in FEATURE_NAMES if name not in V3_NEUTRAL}, **V3_NEUTRAL}


def asset_class(symbol: str) -> str:
    """'stable' or 'volatile' — MUST mirror assetClassFor() in inference.ts."""
    return "stable" if symbol.upper() in STABLE_ASSETS else "volatile"


def compute_calibration(y_true: np.ndarray, proba: np.ndarray) -> dict:
    """Fit a monotonic reliability table on a validation split.

    Counts remain equal-width diagnostics, while calibrated values come from
    isotonic regression evaluated at each bin centre. Unlike independent bin
    rates this cannot make a higher raw risk map to a lower calibrated risk.
    """
    n = len(y_true)
    n_pos = int(np.sum(y_true))
    if n < CALIBRATION_MIN_ROWS or n_pos < CALIBRATION_MIN_POS:
        return None
    edges = np.linspace(0.0, 1.0, CALIBRATION_BINS + 1)
    idx = np.clip(np.digitize(proba, edges[1:-1], right=False), 0, CALIBRATION_BINS - 1)
    counts = np.bincount(idx, minlength=CALIBRATION_BINS)
    if len(np.unique(proba)) < 2:
        return None
    iso = IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds="clip")
    iso.fit(proba, y_true)
    centres = (edges[:-1] + edges[1:]) / 2.0
    rates = np.asarray(iso.predict(centres), dtype=float)
    return {
        "bins": CALIBRATION_BINS,
        "counts": [int(c) for c in counts],
        "calibrated": [round(float(r), 6) for r in rates],
    }


def apply_calibration_table(proba: np.ndarray, table: dict) -> np.ndarray:
    """Apply the exported equal-width lookup exactly as TypeScript does."""
    calibrated = np.asarray(table["calibrated"], dtype=float)
    idx = np.minimum((np.clip(proba, 0.0, 1.0) * len(calibrated)).astype(int), len(calibrated) - 1)
    return calibrated[idx]


def fetch_health_rows(base_url: str, service_key: str) -> pd.DataFrame:
    """Page through feed_health_snapshots (30-min Oracle Watch spine).

    Returns a per-(symbol, hour) aggregate of the v3 governance features, or an
    empty DataFrame when the table is empty/unreachable so training degrades to
    neutral-fill (graceful: the 30-min recorder may still be accumulating).
    """
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(weeks=LOOKBACK_WEEKS)).isoformat()
        url = base_url.rstrip("/") + "/rest/v1/feed_health_snapshots"
        select = "symbol,chain,evaluated_at,agreement,outlier_count,stale_count,avg_reputation,min_reputation"
        params = {"select": select, "evaluated_at": f"gte.{cutoff}", "order": "symbol,evaluated_at"}
        headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}
        rows = []
        offset = 0
        while True:
            headers["Range"] = f"{offset}-{offset + PAGE_SIZE - 1}"
            r = HTTP.get(url, headers=headers, params=params, timeout=60)
            r.raise_for_status()
            chunk = r.json()
            rows.extend(chunk)
            offset += PAGE_SIZE
            if len(chunk) < PAGE_SIZE:
                break
        if not rows:
            return pd.DataFrame()
        health = pd.DataFrame(rows)
        # Train the global scorer from global Watch observations. Mixing global
        # and per-chain rows would count the same provider state several times.
        if "chain" in health.columns:
            health = health[health["chain"].isna()].copy()
        if health.empty:
            return pd.DataFrame()
        health["evaluated_at"] = pd.to_datetime(health["evaluated_at"], utc=True, format="mixed")
        health["snapshot_hour"] = health["evaluated_at"].dt.floor("h")
        for c in ("agreement", "outlier_count", "stale_count", "avg_reputation", "min_reputation"):
            health[c] = pd.to_numeric(health[c], errors="coerce")
        g = health.groupby(["symbol", "snapshot_hour"], sort=True)
        out = pd.DataFrame(
            {
                "agreement": g["agreement"].mean(),
                # Counts are instantaneous live features. Average the two
                # half-hour observations instead of doubling them with a sum.
                "outlier_count": g["outlier_count"].mean(),
                "stale_count": g["stale_count"].mean(),
                "avg_reputation": g["avg_reputation"].mean(),
                # Worst provider reputation across the whole hour (min of the
                # per-snapshot minima) — matches the live "min_reputation =
                # worst provider right now" semantics and errs conservative.
                "min_reputation": g["min_reputation"].min(),
            }
        ).reset_index()
        # Reputation values from the spine are 0-100 (reputation service scale);
        # normalize to [0,1] to match live inference.
        out["avg_reputation"] = out["avg_reputation"] / 100.0
        out["min_reputation"] = out["min_reputation"] / 100.0
        log(f"Fetched {len(out)} (symbol, hour) from feed_health_snapshots.")
        return out
    except Exception as exc:  # noqa: BLE001 - graceful degradation
        log(f"feed_health_snapshots unavailable ({exc}); using neutral v3 features.")
        return pd.DataFrame()


def build_hourly_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Turn raw rows into one row per (symbol, hour) with all model features.

    Quality gate: a (symbol, hour) needs >= 2 successful providers to produce a
    meaningful cross-provider spread/deviation — single-provider rows are
    dropped before labeling so they neither train nor label on degenerate inputs.
    """
    # The source table is chain-aware, so a provider may have several rows for
    # the same symbol/hour. Global live inference gives every provider one vote;
    # collapse duplicates to the freshest provider observation before grouping.
    provider_rows = df.copy()
    provider_rows["_age_sort"] = provider_rows["data_age_seconds"].fillna(np.inf)
    provider_rows = (
        provider_rows.sort_values(["symbol", "snapshot_hour", "provider", "_age_sort"])
        .drop_duplicates(["symbol", "snapshot_hour", "provider"], keep="first")
        .drop(columns=["_age_sort"])
    )
    provider_rows["_effective_stale"] = (
        provider_rows["data_age_seconds"].ge(STALE_SECONDS)
        & provider_rows["deviation_pct"].abs().gt(STALE_DIVERGENCE_PCT)
    )
    g = provider_rows.groupby(["symbol", "snapshot_hour"], sort=True)
    hourly = pd.DataFrame(
        {
            "max_deviation_pct": g["deviation_pct"].apply(lambda s: s.abs().max()),
            "mean_deviation_pct": g["deviation_pct"].apply(lambda s: s.abs().mean()),
            "min_price": g["price"].min(),
            "max_price": g["price"].max(),
            "participant_count": g["price"].size(),
            "max_age": g["data_age_seconds"].max(),
            "stale_ratio": g["_effective_stale"].mean(),
            "consensus": g["price"].median(),
        }
    ).reset_index()
    midrange = (hourly["min_price"] + hourly["max_price"]) / 2.0
    hourly["cross_provider_spread_pct"] = np.where(
        midrange > 0, (hourly["max_price"] - hourly["min_price"]) / midrange * 100.0, 0.0
    )
    hourly["stale"] = (hourly["stale_ratio"] > 0).astype(int)
    # Quality gate: drop degenerate single-provider hours.
    hourly = hourly[hourly["participant_count"] >= 2].reset_index(drop=True)
    hourly = hourly.sort_values(["symbol", "snapshot_hour"]).reset_index(drop=True)

    # Temporal features use real hourly offsets. Reindexing prevents a gap from
    # silently turning T-12h into "T-1h". Baselines are prior-only and use the
    # sample standard deviation (ddof=1), exactly mirrored by the TS scorer.
    temporal = {
        "deviation_velocity_1h": pd.Series(0.0, index=hourly.index),
        "deviation_velocity_3h": pd.Series(0.0, index=hourly.index),
        "participant_count_delta_1h": pd.Series(0.0, index=hourly.index),
        "rolling_volatility_6h": pd.Series(0.0, index=hourly.index),
        "max_deviation_zscore_24h": pd.Series(0.0, index=hourly.index),
    }
    for _, sym in hourly.groupby("symbol", sort=False):
        indexed = sym.set_index("snapshot_hour")
        full_index = pd.date_range(indexed.index.min(), indexed.index.max(), freq="h", tz="UTC")
        full = indexed.reindex(full_index)
        dev = full["max_deviation_pct"]
        count = full["participant_count"]
        returns = full["consensus"].pct_change(fill_method=None)
        prior_mean = dev.shift(1).rolling(24, min_periods=3).mean()
        prior_std = dev.shift(1).rolling(24, min_periods=3).std(ddof=1).replace(0.0, np.nan)
        calculated = pd.DataFrame(
            {
                "deviation_velocity_1h": (dev - dev.shift(1)).fillna(0.0),
                "deviation_velocity_3h": (dev - dev.shift(3)).fillna(0.0),
                "participant_count_delta_1h": (count - count.shift(1)).fillna(0.0),
                "rolling_volatility_6h": (
                    returns.rolling(6, min_periods=2).std(ddof=1).fillna(0.0).clip(lower=0) * 100.0
                ),
                "max_deviation_zscore_24h": ((dev - prior_mean) / prior_std)
                .fillna(0.0)
                .clip(-10.0, 10.0),
            },
            index=full_index,
        )
        for name, target in temporal.items():
            target.loc[sym.index] = calculated.loc[sym["snapshot_hour"], name].to_numpy()
    for name, values in temporal.items():
        hourly[name] = values
    return hourly


def build_fine_event_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Collapse raw 15-minute feed rows into incident observations.

    Only fields required for future Track-A labels are retained. Chain
    duplicates are collapsed to one provider vote exactly like the hourly
    feature builder, preventing a multi-chain provider from manufacturing a
    larger deviation count.
    """
    if df.empty:
        return pd.DataFrame()
    rows = df.copy()
    rows["snapshot_hour"] = rows["snapshot_ts"].dt.floor("15min")
    rows["_age_sort"] = rows["data_age_seconds"].fillna(np.inf)
    rows = (
        rows.sort_values(["symbol", "snapshot_hour", "provider", "_age_sort"])
        .drop_duplicates(["symbol", "snapshot_hour", "provider"], keep="first")
        .drop(columns=["_age_sort"])
    )
    g = rows.groupby(["symbol", "snapshot_hour"], sort=True)
    fine = pd.DataFrame(
        {
            "consensus": g["price"].median(),
            "max_deviation_pct": g["deviation_pct"].apply(lambda s: s.abs().max()),
            "participant_count": g["price"].size(),
        }
    ).reset_index()
    return fine[fine["participant_count"] >= 2].reset_index(drop=True)


def label_from_fine_events(hourly: pd.DataFrame, fine: pd.DataFrame, hours: int):
    """Find Track-A onsets between hourly feature observations.

    Returns nullable label + price/deviation flags. A fine observation may add
    a missed positive, but a missing fine window never turns an hourly negative
    into a negative or otherwise fabricates coverage.
    """
    labels = pd.Series(pd.NA, index=hourly.index, dtype="Int64")
    ev_price = pd.Series(0, index=hourly.index, dtype=int)
    ev_dev = pd.Series(0, index=hourly.index, dtype=int)
    if fine.empty:
        return labels, ev_price, ev_dev

    fine_by_symbol = {
        symbol: grp.sort_values("snapshot_hour") for symbol, grp in fine.groupby("symbol")
    }
    for symbol, base_group in hourly.groupby("symbol", sort=False):
        future = fine_by_symbol.get(symbol)
        if future is None or future.empty:
            continue
        future_times = pd.DatetimeIndex(future["snapshot_hour"])
        future_consensus = future["consensus"].astype(float).to_numpy()
        future_deviation = future["max_deviation_pct"].abs().astype(float).to_numpy()
        for idx, row in base_group.iterrows():
            # The hourly feature builder already applies the onset-state gate;
            # mirror it here for the fine label source.
            if float(row["max_deviation_pct"]) >= DEVIATION_PCT:
                continue
            start = row["snapshot_hour"]
            end = start + pd.Timedelta(hours=hours)
            positions = np.flatnonzero((future_times > start) & (future_times <= end))
            if len(positions) == 0 or float(row["consensus"]) <= 0:
                continue
            move = (
                np.abs(future_consensus[positions] - float(row["consensus"]))
                / float(row["consensus"])
                * 100.0
            )
            is_price = bool(np.max(move) >= PRICE_MOVE_PCT)
            is_dev = bool(np.max(future_deviation[positions]) >= DEVIATION_PCT)
            if is_price or is_dev:
                labels.loc[idx] = 1
                ev_price.loc[idx] = int(is_price)
                ev_dev.loc[idx] = int(is_dev)
            elif future_times[positions[-1]] >= end:
                labels.loc[idx] = 0
    return labels, ev_price, ev_dev


def label_for_horizon(hourly: pd.DataFrame, hours: int):
    """Compute the abnormal-event label for a given prediction horizon.

    Label spec v2 (LABEL_SPEC_VERSION = 2): abnormal = Track A (consensus
    moves >= PRICE_MOVE_PCT OR cross-oracle max deviation spikes >=
    DEVIATION_PCT) OR Track B (oracle-vs-market divergence >=
    MARKET_DIVERGENCE_PCT) within the next `hours` hours. Mirrors
    safetyOutcomeService OUTCOME_THRESHOLDS (incl. marketDivergencePct).

    Returns (labels, ev_price, ev_dev, ev_div): the label series plus one
    per-row event-type flag series each, so training metrics can report how
    many positives each track contributed (a row may trigger several).
    """
    # Nullable labels are essential: a row near the end of the dataset has not
    # had H hours in which to realize an outcome and must not become a false
    # negative merely because the future has not happened yet.
    labels = pd.Series(pd.NA, index=hourly.index, dtype="Int64")
    ev_price = pd.Series(0, index=hourly.index, dtype=int)
    ev_dev = pd.Series(0, index=hourly.index, dtype=int)
    ev_div = pd.Series(0, index=hourly.index, dtype=int)
    has_div = "oracle_vs_market_deviation_pct" in hourly.columns
    for _, grp in hourly.groupby("symbol", sort=False):
        grp = grp.sort_values("snapshot_hour")
        idx = grp.index
        times = pd.DatetimeIndex(grp["snapshot_hour"])
        consensus = grp["consensus"].astype(float).values
        max_dev = grp["max_deviation_pct"].abs().values
        div = (
            grp["oracle_vs_market_deviation_pct"].abs().values
            if has_div
            else np.zeros(len(grp))
        )
        n = len(grp)
        for i in range(n):
            # The rule engine already handles an abnormal state at T. Training
            # those rows would reward the model for detecting an incident that
            # has already happened and inflate "forward-looking" skill through
            # persistence. Learn onset risk from currently-normal states only.
            if max_dev[i] >= DEVIATION_PCT or div[i] >= MARKET_DIVERGENCE_PCT:
                continue
            window_end = times[i] + pd.Timedelta(hours=hours)
            future_positions = np.flatnonzero((times > times[i]) & (times <= window_end))
            if len(future_positions) == 0:
                continue
            baseline = consensus[i]
            if baseline <= 0:
                continue
            future_cons = consensus[future_positions]
            max_move = np.abs(future_cons - baseline).max() / baseline * 100.0
            max_dev_future = float(np.max(max_dev[future_positions]))
            max_div_future = float(np.max(div[future_positions]))
            is_price = max_move >= PRICE_MOVE_PCT
            is_dev = max_dev_future >= DEVIATION_PCT
            is_div = max_div_future >= MARKET_DIVERGENCE_PCT
            if is_price or is_dev or is_div:
                labels.loc[idx[i]] = 1
                ev_price.loc[idx[i]] = int(is_price)
                ev_dev.loc[idx[i]] = int(is_dev)
                ev_div.loc[idx[i]] = int(is_div)
            elif times[future_positions[-1]] >= window_end:
                # A negative is valid only when the observation reaches the end
                # of the requested wall-clock horizon. Partial windows remain NA.
                labels.loc[idx[i]] = 0
    return labels, ev_price, ev_dev, ev_div


def fetch_market_reference_rows(base_url: str, service_key: str) -> pd.DataFrame:
    """Page through the market_reference_hourly rollup view (external truth layer).

    Returns per-(symbol, hour) median CEX reference price, or an empty
    DataFrame when the table/view is empty or unreachable so training degrades
    to the neutral divergence fill (0 = no signal). Fail-closed by design:
    absent reference data never fabricates a divergence.
    """
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(weeks=LOOKBACK_WEEKS)).isoformat()
        url = base_url.rstrip("/") + "/rest/v1/market_reference_hourly"
        select = (
            "symbol,ref_hour,ref_price,exchange_count,cross_exchange_spread_pct,"
            "median_bid_ask_spread_pct,median_volume"
        )
        params = {
            "select": select,
            "ref_hour": f"gte.{cutoff}",
            "order": "symbol,ref_hour",
        }
        headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}
        rows = []
        offset = 0
        while True:
            headers["Range"] = f"{offset}-{offset + PAGE_SIZE - 1}"
            r = HTTP.get(url, headers=headers, params=params, timeout=60)
            r.raise_for_status()
            chunk = r.json()
            rows.extend(chunk)
            offset += PAGE_SIZE
            if len(chunk) < PAGE_SIZE:
                break
        if not rows:
            return pd.DataFrame()
        ref = pd.DataFrame(rows)
        ref["snapshot_hour"] = pd.to_datetime(ref["ref_hour"], utc=True, format="mixed")
        ref["ref_price"] = pd.to_numeric(ref["ref_price"], errors="coerce")
        for col in (
            "exchange_count",
            "cross_exchange_spread_pct",
            "median_bid_ask_spread_pct",
            "median_volume",
        ):
            ref[col] = pd.to_numeric(ref[col], errors="coerce")
        ref = ref.dropna(subset=["ref_price"])
        ref = ref[ref["ref_price"] > 0]
        log(f"Fetched {len(ref)} (symbol, hour) from market_reference_hourly.")
        return ref[
            [
                "symbol",
                "snapshot_hour",
                "ref_price",
                "exchange_count",
                "cross_exchange_spread_pct",
                "median_bid_ask_spread_pct",
                "median_volume",
            ]
        ]
    except Exception as exc:  # noqa: BLE001 - graceful degradation
        log(f"market_reference_hourly unavailable ({exc}); using neutral divergence feature.")
        return pd.DataFrame()


def build_dataset(
    df: pd.DataFrame,
    health_df: pd.DataFrame | None = None,
    ref_df: pd.DataFrame | None = None,
    fine_event_df: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """Build the feature matrix + per-horizon labels, one row per (symbol, hour)."""
    hourly = build_hourly_frame(df)
    # Attach the v3 governance features from the 30-min spine (per symbol,hour),
    # neutral-filling hours that pre-date or lack spine coverage. When the spine
    # is empty/unreachable (no merge above) the columns don't exist yet — create
    # them at the neutral value so training still runs (graceful degradation).
    if health_df is not None and not health_df.empty:
        hourly = hourly.merge(health_df, on=["symbol", "snapshot_hour"], how="left")
    for col, neutral in V3_NEUTRAL.items():
        if col not in hourly.columns:
            hourly[col] = neutral
        else:
            hourly[col] = hourly[col].fillna(neutral)
    # Attach the external-truth feature (v4) from the CEX market-reference
    # layer. |consensus - ref| / ref * 100, neutral 0 when no reference row
    # exists for that (symbol, hour) — fail-closed, never an estimated fill.
    if ref_df is not None and not ref_df.empty:
        hourly = hourly.merge(ref_df, on=["symbol", "snapshot_hour"], how="left")
    if "ref_price" not in hourly.columns:
        hourly["ref_price"] = np.nan
    has_ref = hourly["ref_price"].notna() & (hourly["ref_price"] > 0) & (hourly["consensus"] > 0)
    hourly["oracle_vs_market_deviation_pct"] = np.where(
        has_ref,
        (hourly["consensus"] - hourly["ref_price"]).abs() / hourly["ref_price"] * 100.0,
        0.0,
    )
    hourly["market_reference_available"] = has_ref.astype(int)
    def market_numeric(name: str) -> pd.Series:
        values = hourly[name] if name in hourly.columns else pd.Series(0.0, index=hourly.index)
        return pd.to_numeric(values, errors="coerce").fillna(0).clip(lower=0)

    hourly["market_exchange_count"] = (
        market_numeric("exchange_count")
    )
    hourly["market_cross_exchange_spread_pct"] = (
        market_numeric("cross_exchange_spread_pct")
    )
    hourly["market_bid_ask_spread_pct"] = (
        market_numeric("median_bid_ask_spread_pct")
    )
    volume = market_numeric("median_volume")
    hourly["market_log_volume"] = np.log1p(volume)
    # Attach horizon labels (label spec v2: Track A OR Track B) + per-event-type
    # flags so metrics can report how many positives each track contributed.
    for h in HORIZONS:
        labels, ev_price, ev_dev, ev_div = label_for_horizon(hourly, h)
        if fine_event_df is not None and not fine_event_df.empty:
            fine_labels, fine_price, fine_dev = label_from_fine_events(hourly, fine_event_df, h)
            # Fine data may add an incident missed between hourly samples. It
            # never overwrites a valid hourly/market negative when fine coverage
            # is missing, and never removes a Track-B positive.
            fine_positive = fine_labels.eq(1).fillna(False)
            labels.loc[fine_positive] = 1
            ev_price = np.maximum(ev_price, fine_price)
            ev_dev = np.maximum(ev_dev, fine_dev)
        hourly[f"label_{h}h"] = labels
        hourly[f"ev_price_{h}h"] = ev_price
        hourly[f"ev_dev_{h}h"] = ev_dev
        hourly[f"ev_div_{h}h"] = ev_div
    # Keep symbol for per-asset-class calibration at train time.
    out = hourly[
        ["symbol"]
        + FEATURE_NAMES
        + [f"label_{h}h" for h in HORIZONS]
        + [f"ev_{t}_{h}h" for t in ("price", "dev", "div") for h in HORIZONS]
        + ["snapshot_hour"]
    ].copy()
    return out


def build_flywheel_frame(rows: pd.DataFrame) -> pd.DataFrame:
    """Validate exact live feature vectors and shape them like mined examples."""
    output = []
    for _, row in rows.iterrows():
        vector = row.get("ml_feature_vector")
        if not isinstance(vector, dict) or any(name not in vector for name in FEATURE_NAMES):
            continue
        try:
            features = {name: float(vector[name]) for name in FEATURE_NAMES}
        except (TypeError, ValueError):
            continue
        if not all(np.isfinite(value) for value in features.values()):
            continue
        created_at = row.get("created_at")
        if pd.isna(created_at):
            continue
        shaped = {
            "symbol": str(row.get("asset", "")).upper(),
            "snapshot_hour": pd.Timestamp(created_at),
            **features,
        }
        if not shaped["symbol"]:
            continue
        for hours in HORIZONS:
            label = row.get(f"outcome_label_{hours}h")
            shaped[f"label_{hours}h"] = pd.NA if pd.isna(label) else int(bool(label))
            outcome = row.get(f"outcome_{hours}h")
            outcome = outcome if isinstance(outcome, dict) else {}
            shaped[f"ev_price_{hours}h"] = int(
                float(outcome.get("maxPriceMovePct") or 0) >= PRICE_MOVE_PCT
            )
            shaped[f"ev_dev_{hours}h"] = int(
                float(outcome.get("maxDeviationPct") or 0) >= DEVIATION_PCT
            )
            shaped[f"ev_div_{hours}h"] = int(
                float(outcome.get("maxMarketDivergencePct") or 0) >= MARKET_DIVERGENCE_PCT
            )
        if any(pd.notna(shaped[f"label_{hours}h"]) for hours in HORIZONS):
            output.append(shaped)

    columns = (
        ["symbol"]
        + FEATURE_NAMES
        + [f"label_{h}h" for h in HORIZONS]
        + [f"ev_{kind}_{h}h" for kind in ("price", "dev", "div") for h in HORIZONS]
        + ["snapshot_hour"]
    )
    if not output:
        return pd.DataFrame(columns=columns)
    frame = pd.DataFrame(output)
    # One live observation per asset-hour bounds retries/bots/popular assets.
    frame["_bucket"] = frame["snapshot_hour"].dt.floor("h")
    frame = (
        frame.sort_values("snapshot_hour")
        .drop_duplicates(["symbol", "_bucket"], keep="last")
        .drop(columns="_bucket")
    )
    return frame[columns].reset_index(drop=True)


def merge_flywheel_examples(mined: pd.DataFrame, flywheel: pd.DataFrame) -> pd.DataFrame:
    """Prefer one real live-check example over the mined row for an asset-hour."""
    if flywheel.empty:
        return mined
    mined_rows = mined.copy()
    live_rows = flywheel.copy()
    mined_rows["_bucket"] = mined_rows["snapshot_hour"].dt.floor("h")
    live_rows["_bucket"] = live_rows["snapshot_hour"].dt.floor("h")
    live_keys = set(zip(live_rows["symbol"], live_rows["_bucket"]))
    keep = [
        (symbol, bucket) not in live_keys
        for symbol, bucket in zip(mined_rows["symbol"], mined_rows["_bucket"])
    ]
    mined_rows = mined_rows.loc[keep].drop(columns="_bucket")
    live_rows = live_rows.drop(columns="_bucket")
    return pd.concat([mined_rows, live_rows], ignore_index=True).sort_values("snapshot_hour")


def _split_index(split) -> int:
    """XGBoost JSON dump emits feature names like 'f0' (or column names). Coerce to index."""
    if isinstance(split, int):
        return split
    s = str(split)
    if s.startswith("f") and s[1:].isdigit():
        return int(s[1:])
    if s in FEATURE_NAMES:
        return FEATURE_NAMES.index(s)
    return int(s)


def flatten_tree(node: dict) -> list:
    """Flatten one XGBoost JSON-dump tree into a node list keyed by nodeid."""
    nodes = []

    def walk(n):
        if "leaf" in n:
            nodes.append({"nodeid": n["nodeid"], "leaf": float(n["leaf"])})
        else:
            nodes.append(
                {
                    "nodeid": n["nodeid"],
                    "split": _split_index(n["split"]),
                    "threshold": float(n["split_condition"]),
                    "yes": int(n["yes"]),
                    "no": int(n["no"]),
                }
            )
            for c in n.get("children", []):
                walk(c)

    walk(node)
    return nodes


def write_null_model(reason: str) -> int:
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, "w") as f:
        json.dump(
            {
                "version": 2,
                "active": False,
                "trainedAt": datetime.now(timezone.utc).isoformat(),
                "inactiveReason": reason,
                "featureSchemaVersion": FEATURE_SCHEMA_VERSION,
                "labelSpecVersion": LABEL_SPEC_VERSION,
                "evaluationSpecVersion": EVALUATION_SPEC_VERSION,
                "trainingPopulation": "currently_normal_at_prediction_time",
                "featureNames": FEATURE_NAMES,
                "neutralFill": NEUTRAL_FILL,
                "horizons": {},
                "metrics": {},
            },
            f,
            indent=2,
        )
    log(f"Wrote null model (inactive: {reason}).")
    return 0


def train_horizon(data: pd.DataFrame, hours: int) -> dict | None:
    """Train one XGBoost model for a single prediction horizon.

    Returns the horizon's JSON payload (trees, metrics, verification samples),
    or None when there are too few positives to train reliably.
    """
    label_col = f"label_{hours}h"
    n_pos = int(data[label_col].sum())
    if n_pos < MIN_POSITIVES:
        log(f"[{hours}h] skipped — only {n_pos} positives (< {MIN_POSITIVES}).")
        return None

    # Three-way time split with purge gaps. Validation owns early stopping and
    # calibration; test is untouched until the final metric computation.
    sub = data[data[label_col].notna()].sort_values("snapshot_hour").reset_index(drop=True)
    val_time = sub["snapshot_hour"].quantile(0.70)
    test_time = sub["snapshot_hour"].quantile(0.85)
    train = sub[sub["snapshot_hour"] < val_time - pd.Timedelta(hours=hours)]
    validation = sub[
        (sub["snapshot_hour"] >= val_time)
        & (sub["snapshot_hour"] < test_time - pd.Timedelta(hours=hours))
    ]
    test = sub[sub["snapshot_hour"] >= test_time]
    if len(train) < 50 or len(validation) < 20 or len(test) < 20:
        log(
            f"[{hours}h] skipped — time split too small "
            f"(train={len(train)}, validation={len(validation)}, test={len(test)})."
        )
        return None
    X_tr, y_tr = train[FEATURE_NAMES].to_numpy(dtype=float), train[label_col].to_numpy(dtype=int)
    X_val, y_val = (
        validation[FEATURE_NAMES].to_numpy(dtype=float),
        validation[label_col].to_numpy(dtype=int),
    )
    X_te, y_te = test[FEATURE_NAMES].to_numpy(dtype=float), test[label_col].to_numpy(dtype=int)
    if any(len(np.unique(y)) < 2 for y in (y_tr, y_val, y_te)):
        log(f"[{hours}h] skipped — train/validation/test must each contain both classes.")
        return None
    log(
        f"[{hours}h] Train: {len(train)} ({int(y_tr.sum())} pos) | "
        f"Validation: {len(validation)} ({int(y_val.sum())} pos) | "
        f"Test: {len(test)} ({int(y_te.sum())} pos) | purged {hours}h at boundaries"
    )

    pos_tr = int(y_tr.sum())
    neg_tr = len(y_tr) - pos_tr
    common_params = dict(XGB_PARAMS)
    if pos_tr > 0:
        common_params["scale_pos_weight"] = neg_tr / pos_tr
    log(
        f"[{hours}h] scale_pos_weight = {common_params.get('scale_pos_weight'):.3f} "
        f"(neg={neg_tr}, pos={pos_tr})"
    )

    model = None
    best_candidate = None
    best_validation_ap = -1.0
    for candidate in XGB_CANDIDATES:
        params = {**common_params, **{k: v for k, v in candidate.items() if k != "name"}}
        fitted = xgb.XGBClassifier(**params)
        fitted.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
        validation_proba = fitted.predict_proba(X_val)[:, 1]
        validation_ap = float(average_precision_score(y_val, validation_proba))
        log(
            f"[{hours}h] candidate={candidate['name']} validation PR-AUC={validation_ap:.4f} "
            f"best_iteration={fitted.best_iteration}"
        )
        if validation_ap > best_validation_ap:
            model = fitted
            best_candidate = candidate["name"]
            best_validation_ap = validation_ap

    assert model is not None
    booster = model.get_booster()
    proba_te = model.predict_proba(X_te)[:, 1]

    metrics = {
        "n_train": int(len(train)),
        "n_validation": int(len(validation)),
        "n_test": int(len(test)),
        "n_positive_train": int(y_tr.sum()),
        "n_positive_validation": int(y_val.sum()),
        "n_positive_test": int(y_te.sum()),
        # Label-spec-v2 event-type breakdown (train split): how many positives
        # each track contributed. A row may trigger several — buckets overlap.
        "n_pos_price": int(train[f"ev_price_{hours}h"].sum()),
        "n_pos_deviation": int(train[f"ev_dev_{hours}h"].sum()),
        "n_pos_divergence": int(train[f"ev_div_{hours}h"].sum()),
        "selected_candidate": best_candidate,
        "validation_average_precision": best_validation_ap,
        "best_iteration": int(model.best_iteration)
        if model.best_iteration is not None
        else int(common_params["n_estimators"]),
    }
    try:
        metrics["auc"] = float(roc_auc_score(y_te, proba_te)) if len(set(y_te)) > 1 else None
        metrics["average_precision"] = float(average_precision_score(y_te, proba_te))
        metrics["brier_raw"] = float(brier_score_loss(y_te, proba_te))
    except Exception:
        metrics["auc"] = None
        metrics["average_precision"] = None
        metrics["brier_raw"] = None
    pred50_raw = (proba_te >= 0.5).astype(int)
    metrics["precision_raw_at_0.5"] = float(precision_score(y_te, pred50_raw, zero_division=0))
    metrics["recall_raw_at_0.5"] = float(recall_score(y_te, pred50_raw, zero_division=0))

    # Reliability calibration per asset class, computed on validation only.
    # Raw XGBoost probabilities with scale_pos_weight are systematically
    # inflated; the exported tables let the TS scorer map raw proba -> realized
    # positive rate so the Watch "high" bucket means the same thing across
    # stable and volatile assets. Class tables need enough data; otherwise the
    # scorer falls back to the default table, then to the raw probability.
    proba_val = model.predict_proba(X_val)[:, 1]
    y_all = np.asarray(y_val)
    p_all = np.asarray(proba_val)
    is_stable = validation["symbol"].map(asset_class).eq("stable").values
    calibration = {
        "default": compute_calibration(y_all, p_all),
        "stable": compute_calibration(y_all[is_stable], p_all[is_stable]),
        "volatile": compute_calibration(y_all[~is_stable], p_all[~is_stable]),
    }
    if calibration["default"] is None:
        log(f"[{hours}h] skipped — validation data cannot support probability calibration.")
        return None

    stable_test = test["symbol"].map(asset_class).eq("stable").values
    calibrated_te = np.empty_like(proba_te)
    for mask, name in ((stable_test, "stable"), (~stable_test, "volatile")):
        table = calibration[name] or calibration["default"]
        calibrated_te[mask] = apply_calibration_table(proba_te[mask], table)
    pred50 = (calibrated_te >= 0.5).astype(int)
    pred_high = (calibrated_te >= RISK_HIGH_THRESHOLD).astype(int)
    metrics["brier_calibrated"] = float(brier_score_loss(y_te, calibrated_te))
    metrics["precision_at_0.5"] = float(precision_score(y_te, pred50, zero_division=0))
    metrics["recall_at_0.5"] = float(recall_score(y_te, pred50, zero_division=0))
    metrics["precision_at_high_threshold"] = float(
        precision_score(y_te, pred_high, zero_division=0)
    )
    metrics["recall_at_high_threshold"] = float(recall_score(y_te, pred_high, zero_division=0))
    log(f"[{hours}h] Metrics: {metrics}")
    log(
        f"[{hours}h] Calibration tables: "
        f"default={'yes' if calibration['default'] else 'no'}, "
        f"stable={'yes' if calibration['stable'] else 'no'}, "
        f"volatile={'yes' if calibration['volatile'] else 'no'}"
    )

    # Verification samples: the TS inference must reproduce these probabilities.
    sample_idx = np.linspace(0, len(test) - 1, num=min(VERIFICATION_SAMPLE_COUNT, len(test))).astype(int)
    verification = [[X_te[i].tolist(), float(proba_te[i])] for i in sample_idx]

    # With early stopping, predict_proba uses only the first (best_iteration+1)
    # trees; export ONLY the used ones so the pure-TS scorer reproduces predict_proba.
    all_dumps = booster.get_dump(dump_format="json")
    used_dumps = all_dumps[: metrics["best_iteration"] + 1]
    trees = [flatten_tree(json.loads(d)) for d in used_dumps]
    log(f"[{hours}h] Exported {len(trees)} trees (best_iteration={metrics['best_iteration']}).")

    return {
        "evalWindowHours": hours,
        "featureNames": FEATURE_NAMES,
        "neutralFill": NEUTRAL_FILL,
        "baseScore": 0.5,  # logit(0.5) = 0, so proba = sigmoid(sum of leaves)
        "riskThresholds": {
            "medium": RISK_MEDIUM_THRESHOLD,
            "high": RISK_HIGH_THRESHOLD,
        },
        "trees": trees,
        "calibration": calibration,
        "metrics": metrics,
        "verificationSamples": verification,
        "verificationTolerance": VERIFICATION_TOLERANCE,
    }


def main() -> int:
    base_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not base_url or not service_key:
        log("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
        return 1

    df = fetch_rows(base_url, service_key)
    log(f"Fetched {len(df)} rows, {df['symbol'].nunique() if not df.empty else 0} symbols.")

    if len(df) < MIN_TOTAL:
        return write_null_model(f"insufficient raw data ({len(df)} < {MIN_TOTAL})")

    log("Building labeled dataset (mining 1h + 6h-ahead outcomes)...")
    health_df = fetch_health_rows(base_url, service_key)
    ref_df = fetch_market_reference_rows(base_url, service_key)
    try:
        fine_rows = fetch_fine_rows(base_url, service_key)
        fine_event_df = build_fine_event_frame(fine_rows)
        log(
            f"Fetched {len(fine_rows)} fine rows -> {len(fine_event_df)} "
            "15-minute future-event observations."
        )
    except Exception as exc:  # noqa: BLE001 - preserve hourly fallback
        log(f"price_snapshots unavailable ({exc}); using hourly-only labels.")
        fine_event_df = pd.DataFrame()
    data = build_dataset(df, health_df, ref_df, fine_event_df)
    try:
        flywheel_rows = fetch_flywheel_rows(base_url, service_key)
        flywheel = build_flywheel_frame(flywheel_rows)
        data = merge_flywheel_examples(data, flywheel)
        log(
            f"Fetched {len(flywheel_rows)} version-compatible live checks -> "
            f"{len(flywheel)} de-duplicated flywheel examples."
        )
    except Exception as exc:  # noqa: BLE001 - mined history remains sufficient
        log(f"pre_trade_checks flywheel unavailable ({exc}); using mined examples only.")
    n_total = len(data)
    log(f"Dataset: {n_total} examples.")
    n_ref = int(data["market_reference_available"].eq(1).sum())
    log(f"  rows with market-reference coverage: {n_ref} ({100*n_ref/max(n_total,1):.1f}%)")
    for h in HORIZONS:
        n_pos = int(data[f"label_{h}h"].sum())
        n_div = int(data[f"ev_div_{h}h"].sum())
        log(
            f"  {h}h positives: {n_pos} ({100*n_pos/max(n_total,1):.2f}%)"
            f" | of which Track-B divergence: {n_div}"
        )

    if n_total < MIN_TOTAL:
        return write_null_model(f"insufficient labeled data (total={n_total})")

    horizons = {}
    for h in HORIZONS:
        horizons[f"{h}h"] = train_horizon(data, h)

    # Must have at least the 6h model, else the whole model is inactive.
    if not horizons.get("6h"):
        return write_null_model("6h horizon failed to train (insufficient positives)")

    # Aggregate metrics for quick status display.
    metrics_summary = {name: h["metrics"] for name, h in horizons.items() if h}

    model_json = {
        "version": 2,
        "active": True,
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "featureSchemaVersion": FEATURE_SCHEMA_VERSION,
        "labelSpecVersion": LABEL_SPEC_VERSION,
        "evaluationSpecVersion": EVALUATION_SPEC_VERSION,
        "trainingPopulation": "currently_normal_hourly_plus_deduplicated_live_checks",
        "labelDefinition": (
            f"consensus price moves >= {PRICE_MOVE_PCT}% OR cross-oracle deviation >= "
            f"{DEVIATION_PCT}% OR oracle-vs-market divergence >= {MARKET_DIVERGENCE_PCT}% "
            f"within H hours (label spec v{LABEL_SPEC_VERSION})"
        ),
        "featureNames": FEATURE_NAMES,
        "horizons": horizons,
        "metrics": metrics_summary,
    }

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, "w") as f:
        json.dump(model_json, f, indent=2)
    active_horizons = [k for k, v in horizons.items() if v]
    log(f"Wrote model to {MODEL_PATH} (horizons: {active_horizons}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
