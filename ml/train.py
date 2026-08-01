#!/usr/bin/env python3
"""
Insight oracle-risk ML trainer (Phase 2, v1).

Mines hourly_price_snapshots into labeled training examples, trains an XGBoost
binary classifier, and exports a self-verifying JSON model that the Next.js app
scores in pure TypeScript (no Python runtime in prod).

Prediction task: given the cross-oracle state for an asset at hour T, will an
abnormal event follow in the next 6h? (abnormal = consensus price moves >=5%
OR cross-oracle deviation spikes >=8% — the SAME label definition as the
safetyOutcomeService backfill, so mined and flywheel labels are consistent.)

Feature definitions are EXACTLY mirrored by src/lib/ml/inference.ts:
  max_deviation_pct         max |deviation_pct| over providers   (pre-trade: maxDeviationPct)
  cross_provider_spread_pct (max-min)/midrange*100               (pre-trade: spreadPct)
  participant_count         number of successful providers       (pre-trade: participantCount)
  stale                     1 if any provider data_age_seconds>=60 else 0  (pre-trade: staleDataRisk)
  mean_deviation_pct        mean |deviation_pct| over providers  (pre-trade: meanDeviationPct)
  stale_ratio               fraction of providers with data_age_seconds>=60 (pre-trade: staleRatio)
  deviation_velocity_1h     max_deviation_pct(T) - max_deviation_pct(T-1)   (pre-trade: deviationVelocity1h)

Runs offline (GitHub Actions runner every 3 days, or locally). Not in the app
hot path. Gracefully writes a null model when there is too little data.

Env:
  SUPABASE_URL            e.g. https://<ref>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY   service-role key (read access to hourly_price_snapshots)
"""

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
EVAL_WINDOW_HOURS = 6
PRICE_MOVE_PCT = 5.0
DEVIATION_PCT = 8.0
STALE_SECONDS = 60  # mirrors THRESHOLDS.dataStaleSeconds.caution

MIN_TOTAL = 500
MIN_POSITIVES = 15

# Only train on the last LOOKBACK_WEEKS of snapshots. Enough for the 6h
# eval-window labeling plus a healthy train/test split, while BOUNDING the read
# from Supabase so the per-run load stays flat as the table grows (instead of
# reading the entire history every 3 days).
LOOKBACK_WEEKS = 8

FEATURE_NAMES = [
    "max_deviation_pct",
    "cross_provider_spread_pct",
    "participant_count",
    "stale",
    "mean_deviation_pct",
    "stale_ratio",
    "deviation_velocity_1h",
]

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "oracle_risk_model.json")
VERIFICATION_SAMPLE_COUNT = 20
VERIFICATION_TOLERANCE = 0.01
PAGE_SIZE = 1000

# XGBoost params: small + CPU-friendly. base_score=0.5 => logit bias = 0.
# early_stopping_rounds stops training when AUC on the held-out eval_set stops
# improving, preventing overfitting on the small positive class. scale_pos_weight
# is set dynamically in main() from the train-split class balance to counter the
# heavy class imbalance (positives are ~1% of rows) — without it the model
# defaults to near-zero recall.
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


def build_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """Turn raw rows into one labeled example per (symbol, hour) with future data.

    Quality gate: a (symbol, hour) needs >= 2 successful providers to produce a
    meaningful cross-provider spread/deviation — single-provider rows are dropped
    before labeling so they neither train nor label on degenerate inputs.
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
    # Temporal feature: 1h change in max deviation, per symbol. The first row of
    # each symbol has no predecessor -> velocity 0. Gaps (missing hours) yield a
    # multi-hour delta, which is acceptable and matches inference semantics
    # (live now vs most-recent snapshot hour).
    hourly["deviation_velocity_1h"] = (
        hourly.groupby("symbol")["max_deviation_pct"].diff().fillna(0.0)
    )

    features, labels, hours = [], [], []
    for _, grp in hourly.groupby("symbol", sort=False):
        grp = grp.reset_index(drop=True)
        n = len(grp)
        for i in range(n):
            future = grp.iloc[i + 1 : i + 1 + EVAL_WINDOW_HOURS]
            if future.empty:
                continue
            baseline = float(grp.iloc[i]["consensus"])
            if baseline <= 0:
                continue
            future_consensus = future["consensus"].astype(float)
            max_move = (future_consensus - baseline).abs().max() / baseline * 100.0
            max_dev_future = float(future["max_deviation_pct"].abs().max())
            label = 1 if (max_move >= PRICE_MOVE_PCT or max_dev_future >= DEVIATION_PCT) else 0
            row = grp.iloc[i]
            features.append(
                [
                    float(row["max_deviation_pct"]),
                    float(row["cross_provider_spread_pct"]),
                    int(row["participant_count"]),
                    int(row["stale"]),
                    float(row["mean_deviation_pct"]),
                    float(row["stale_ratio"]),
                    float(row["deviation_velocity_1h"]),
                ]
            )
            labels.append(label)
            hours.append(row["snapshot_hour"])

    out = pd.DataFrame(features, columns=FEATURE_NAMES)
    out["label"] = labels
    out["snapshot_hour"] = hours
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
                "version": 1,
                "active": False,
                "trainedAt": datetime.now(timezone.utc).isoformat(),
                "inactiveReason": reason,
                "featureNames": FEATURE_NAMES,
                "trees": [],
                "metrics": {},
            },
            f,
            indent=2,
        )
    log(f"Wrote null model (inactive: {reason}).")
    return 0


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

    log("Building labeled dataset (mining 6h-ahead outcomes)...")
    data = build_dataset(df)
    n_total = len(data)
    n_pos = int(data["label"].sum())
    log(f"Dataset: {n_total} examples, {n_pos} positives ({100*n_pos/max(n_total,1):.2f}%).")

    if n_total < MIN_TOTAL or n_pos < MIN_POSITIVES:
        return write_null_model(f"insufficient labeled data (total={n_total}, positives={n_pos})")

    # Time-based split: earliest 80% train, latest 20% test (no future leakage).
    data = data.sort_values("snapshot_hour").reset_index(drop=True)
    split = int(len(data) * 0.8)
    train, test = data.iloc[:split], data.iloc[split:]
    X_tr, y_tr = train[FEATURE_NAMES].values, train["label"].values
    X_te, y_te = test[FEATURE_NAMES].values, test["label"].values
    log(f"Train: {len(train)} ({int(y_tr.sum())} pos) | Test: {len(test)} ({int(y_te.sum())} pos)")

    # Counter the ~1% positive rate with scale_pos_weight = neg/pos so the model
    # doesn't collapse to predict-negative (which gave recall@0.5 = 0.09 without it).
    pos_tr = int(y_tr.sum())
    neg_tr = len(y_tr) - pos_tr
    xgb_params = dict(XGB_PARAMS)
    if pos_tr > 0:
        xgb_params["scale_pos_weight"] = neg_tr / pos_tr
    log(f"scale_pos_weight = {xgb_params.get('scale_pos_weight')} (neg={neg_tr}, pos={pos_tr})")

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
    log(f"Metrics: {metrics}")

    # Verification samples: the TS inference must reproduce these probabilities.
    sample_idx = np.linspace(0, len(test) - 1, num=min(VERIFICATION_SAMPLE_COUNT, len(test))).astype(int)
    verification = [[X_te[i].tolist(), float(proba_te[i])] for i in sample_idx]

    # With early stopping, predict_proba uses only the first (best_iteration+1)
    # trees; the booster still holds all grown trees. Export ONLY the used ones so
    # the pure-TS scorer (which sums every exported tree) reproduces predict_proba.
    all_dumps = booster.get_dump(dump_format="json")
    used_dumps = all_dumps[: metrics["best_iteration"] + 1]
    trees = [flatten_tree(json.loads(d)) for d in used_dumps]
    log(f"Exported {len(trees)} trees (best_iteration={metrics['best_iteration']}).")

    model_json = {
        "version": 1,
        "active": True,
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "labelDefinition": f"consensus price moves >= {PRICE_MOVE_PCT}% OR cross-oracle deviation >= {DEVIATION_PCT}% within {EVAL_WINDOW_HOURS}h",
        "featureNames": FEATURE_NAMES,
        "baseScore": 0.5,  # logit(0.5) = 0, so proba = sigmoid(sum of leaves)
        "trees": trees,
        "metrics": metrics,
        "verificationSamples": verification,
        "verificationTolerance": VERIFICATION_TOLERANCE,
    }

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, "w") as f:
        json.dump(model_json, f, indent=2)
    log(f"Wrote model to {MODEL_PATH} ({len(model_json['trees'])} trees).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
