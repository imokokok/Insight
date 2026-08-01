#!/usr/bin/env python3
"""
Insight oracle-risk ML trainer (Phase 2, v2 — dual-horizon + enriched features).

Mines hourly_price_snapshots into labeled training examples, trains XGBoost
binary classifiers, and exports a self-verifying JSON model that the Next.js app
scores in pure TypeScript (no Python runtime in prod).

DUAL HORIZON: trains TWO models — a near-term 1h model (more actionable for live
trades) and a 6h model (the existing strategic horizon). The TS scorer exposes
both; the pre-trade check takes the worse (max) so either horizon flagging risk
raises the manipulationRiskScore. If the 1h split has too few positives, only
the 6h model is exported (the 1h horizon is set to null — graceful degradation).

Prediction task: given the cross-oracle state for an asset at hour T, will an
abnormal event follow in the next H hours? (abnormal = consensus price moves
>=5% OR cross-oracle deviation spikes >=8% — the SAME label definition as the
safetyOutcomeService backfill, so mined and flywheel labels are consistent.)

ENRICHED FEATURES (11, was 7): the original 7 plus
  rolling_volatility_6h       rolling std of 1h consensus returns, 6h window
  deviation_velocity_3h       max_dev(T) - max_dev(T-3h)  (longer-term trend)
  participant_count_delta_1h providers online now vs 1h ago (drops = risk)
  max_deviation_zscore_24h   how anomalous is current dev vs 24h baseline

Feature definitions are EXACTLY mirrored by src/lib/ml/inference.ts (see
FEATURE_NAMES below and featuresFromPreTrade there). The TS scorer maps by NAME,
so a v1 model (7 features) and a v2 model (11) both score correctly.

Runs offline (GitHub Actions runner every 3 days, or locally). Not in the app
hot path. Gracefully writes a null model when there is too little data.

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
from sklearn.metrics import roc_auc_score, precision_score, recall_score

# --- Config (mirrors safetyOutcomeService.OUTCOME_THRESHOLDS) ----------------
HORIZONS = [1, 6]  # hours ahead to predict (1h near-term + 6h strategic)
PRICE_MOVE_PCT = 5.0
DEVIATION_PCT = 8.0
STALE_SECONDS = 60  # mirrors THRESHOLDS.dataStaleSeconds.caution

MIN_TOTAL = 500
MIN_POSITIVES = 15  # per horizon; below this the horizon is skipped

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
]

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "oracle_risk_model.json")
VERIFICATION_SAMPLE_COUNT = 20
VERIFICATION_TOLERANCE = 0.01
PAGE_SIZE = 1000

# XGBoost params: small + CPU-friendly. base_score=0.5 => logit bias = 0.
# See ml/requirements.txt: pinned to xgboost 2.x because 3.0 changes GLM
# base_score init and breaks the pure-TS inference contract (logit bias = 0).
XGB_PARAMS = dict(
    n_estimators=120,
    max_depth=4,
    learning_rate=0.2,
    base_score=0.5,
    objective="binary:logistic",
    eval_metric="auc",
    tree_method="hist",
    n_jobs=2,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=3,
    early_stopping_rounds=20,
    random_state=42,
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
    select = "symbol,snapshot_hour,provider,price,deviation_pct,data_age_seconds,is_success"
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
        r = requests.get(url, headers=headers, params=params, timeout=60)
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
    df["snapshot_hour"] = pd.to_datetime(df["snapshot_hour"], utc=True)
    for c in ("price", "deviation_pct", "data_age_seconds"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df.dropna(subset=["price"])
    df = df[df["price"] > 0]
    return df


def build_hourly_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Turn raw rows into one row per (symbol, hour) with all 11 features.

    Quality gate: a (symbol, hour) needs >= 2 successful providers to produce a
    meaningful cross-provider spread/deviation — single-provider rows are
    dropped before labeling so they neither train nor label on degenerate inputs.
    """
    g = df.groupby(["symbol", "snapshot_hour"], sort=True)
    hourly = pd.DataFrame(
        {
            "max_deviation_pct": g["deviation_pct"].apply(lambda s: s.abs().max()),
            "mean_deviation_pct": g["deviation_pct"].apply(lambda s: s.abs().mean()),
            "min_price": g["price"].min(),
            "max_price": g["price"].max(),
            "participant_count": g["price"].size(),
            "max_age": g["data_age_seconds"].max(),
            "stale_ratio": g["data_age_seconds"].apply(
                lambda s: float((s.fillna(0) >= STALE_SECONDS).mean())
            ),
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

    # --- Temporal features, computed WITHIN each symbol (no cross-symbol leak).
    # First row of each symbol has no predecessor -> velocity 0. Gaps (missing
    # hours) yield a multi-hour delta, acceptable and matching inference semantics.
    # .transform() returns a Series aligned to the frame index, so per-group
    # rolling results assign cleanly without MultiIndex reindex errors.
    grp = hourly.groupby("symbol", sort=False)
    hourly["deviation_velocity_1h"] = grp["max_deviation_pct"].diff().fillna(0.0)
    hourly["deviation_velocity_3h"] = grp["max_deviation_pct"].diff(3).fillna(0.0)
    hourly["participant_count_delta_1h"] = grp["participant_count"].diff().fillna(0)
    # Rolling 6h volatility of 1h consensus returns (std of pct-change, %).
    # min_periods=2 so early rows still get a value rather than NaN.
    hourly["rolling_volatility_6h"] = (
        grp["consensus"]
        .transform(lambda s: s.pct_change().rolling(6, min_periods=2).std())
        .fillna(0.0)
        .clip(lower=0)
        * 100.0
    )
    # 24h z-score of max deviation: how anomalous is NOW vs the recent baseline.
    # std==0 (flat history) -> replace with NaN -> z=0 (not anomalous), no div-by-0.
    hourly["max_deviation_zscore_24h"] = grp["max_deviation_pct"].transform(
        lambda s: (s - s.rolling(24, min_periods=3).mean())
        / s.rolling(24, min_periods=3).std().replace(0.0, np.nan)
    ).fillna(0.0)
    return hourly


def label_for_horizon(hourly: pd.DataFrame, hours: int) -> pd.Series:
    """Compute the abnormal-event label for a given prediction horizon.

    Mirrors safetyOutcomeService: consensus moves >= PRICE_MOVE_PCT OR cross-
    oracle max deviation spikes >= DEVIATION_PCT within the next `hours` hours.
    """
    labels = pd.Series(0, index=hourly.index, dtype=int)
    for _, grp in hourly.groupby("symbol", sort=False):
        idx = grp.index
        consensus = grp["consensus"].astype(float).values
        max_dev = grp["max_deviation_pct"].abs().values
        n = len(grp)
        for i in range(n):
            j_end = min(i + 1 + hours, n)
            if j_end <= i + 1:
                continue
            baseline = consensus[i]
            if baseline <= 0:
                continue
            future_cons = consensus[i + 1 : j_end]
            max_move = np.abs(future_cons - baseline).max() / baseline * 100.0
            max_dev_future = float(np.max(max_dev[i + 1 : j_end])) if j_end > i + 1 else 0.0
            if max_move >= PRICE_MOVE_PCT or max_dev_future >= DEVIATION_PCT:
                labels.loc[idx[i]] = 1
    return labels


def build_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """Build the feature matrix + per-horizon labels, one row per (symbol, hour)."""
    hourly = build_hourly_frame(df)
    # Attach horizon labels.
    for h in HORIZONS:
        hourly[f"label_{h}h"] = label_for_horizon(hourly, h)
    out = hourly[FEATURE_NAMES + [f"label_{h}h" for h in HORIZONS] + ["snapshot_hour"]].copy()
    return out


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
                "featureNames": FEATURE_NAMES,
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

    # Time-based split: earliest 80% train, latest 20% test (no future leakage).
    sub = data[data[label_col].notna()].sort_values("snapshot_hour").reset_index(drop=True)
    split = int(len(sub) * 0.8)
    train, test = sub.iloc[:split], sub.iloc[split:]
    X_tr, y_tr = train[FEATURE_NAMES].values, train[label_col].values
    X_te, y_te = test[FEATURE_NAMES].values, test[label_col].values
    log(f"[{hours}h] Train: {len(train)} ({int(y_tr.sum())} pos) | Test: {len(test)} ({int(y_te.sum())} pos)")

    pos_tr = int(y_tr.sum())
    neg_tr = len(y_tr) - pos_tr
    xgb_params = dict(XGB_PARAMS)
    if pos_tr > 0:
        xgb_params["scale_pos_weight"] = neg_tr / pos_tr
    log(f"[{hours}h] scale_pos_weight = {xgb_params.get('scale_pos_weight'):.3f} (neg={neg_tr}, pos={pos_tr})")

    model = xgb.XGBClassifier(**xgb_params)
    model.fit(X_tr, y_tr, eval_set=[(X_te, y_te)], verbose=False)
    booster = model.get_booster()
    proba_te = model.predict_proba(X_te)[:, 1]

    metrics = {
        "n_train": int(len(train)),
        "n_test": int(len(test)),
        "n_positive_train": int(y_tr.sum()),
        "n_positive_test": int(y_te.sum()),
        "best_iteration": int(model.best_iteration) if model.best_iteration is not None else int(xgb_params["n_estimators"]),
    }
    try:
        metrics["auc"] = float(roc_auc_score(y_te, proba_te)) if len(set(y_te)) > 1 else None
    except Exception:
        metrics["auc"] = None
    pred50 = (proba_te >= 0.5).astype(int)
    metrics["precision_at_0.5"] = float(precision_score(y_te, pred50, zero_division=0))
    metrics["recall_at_0.5"] = float(recall_score(y_te, pred50, zero_division=0))
    log(f"[{hours}h] Metrics: {metrics}")

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
        "baseScore": 0.5,  # logit(0.5) = 0, so proba = sigmoid(sum of leaves)
        "trees": trees,
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
    data = build_dataset(df)
    n_total = len(data)
    log(f"Dataset: {n_total} examples.")
    for h in HORIZONS:
        n_pos = int(data[f"label_{h}h"].sum())
        log(f"  {h}h positives: {n_pos} ({100*n_pos/max(n_total,1):.2f}%)")

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
        "labelDefinition": f"consensus price moves >= {PRICE_MOVE_PCT}% OR cross-oracle deviation >= {DEVIATION_PCT}% within H hours",
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
