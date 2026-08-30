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

ENRICHED FEATURES (16): the original 7 plus
  rolling_volatility_6h       rolling std of 1h consensus returns, 6h window
  deviation_velocity_3h       max_dev(T) - max_dev(T-3h)  (longer-term trend)
  participant_count_delta_1h providers online now vs 1h ago (drops = risk)
  max_deviation_zscore_24h   how anomalous is current dev vs 24h baseline
  agreement / outlier_count / stale_count / avg_reputation / min_reputation
                             v3 governance features from the 30-min Oracle
                             Watch spine (neutral-filled when unavailable)

EVALUATION: time-based 80/20 split with PURGE + EMBARGO — training rows whose
label window reaches into the test period are dropped, so test metrics measure
true out-of-time skill (overlapping label windows otherwise leak future info
across the boundary and inflate AUC).

CALIBRATION: each horizon exports a reliability table (raw-probability bin ->
realized positive rate) per asset class (stable/volatile/default), computed on
the test split. The TS scorer routes scores through it so the Watch "high"
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
from sklearn.metrics import roc_auc_score, precision_score, recall_score

# --- Config (mirrors safetyOutcomeService.OUTCOME_THRESHOLDS) ----------------
HORIZONS = [1, 6]  # hours ahead to predict (1h near-term + 6h strategic)
PRICE_MOVE_PCT = 5.0
DEVIATION_PCT = 8.0
STALE_SECONDS = 60  # mirrors THRESHOLDS.dataStaleSeconds.caution

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
    """Reliability table on the RAW probability: per-bin realized positive rate.

    Bins are equal-width over [0, 1] on the raw (uncalibrated) probability; the
    calibrated value is the fraction of positives observed in that bin on the
    test split. Empty bins inherit the nearest non-empty bin's value so the
    exported table is always dense. Returns None (as a null table) when there
    is too little data to calibrate reliably.
    """
    n = len(y_true)
    n_pos = int(np.sum(y_true))
    if n < CALIBRATION_MIN_ROWS or n_pos < CALIBRATION_MIN_POS:
        return None
    edges = np.linspace(0.0, 1.0, CALIBRATION_BINS + 1)
    idx = np.clip(np.digitize(proba, edges[1:-1], right=False), 0, CALIBRATION_BINS - 1)
    counts = np.bincount(idx, minlength=CALIBRATION_BINS)
    sums = np.bincount(idx, weights=y_true, minlength=CALIBRATION_BINS)
    with np.errstate(invalid="ignore"):
        rates = np.where(counts > 0, sums / np.maximum(counts, 1), np.nan)
    # Fill empty bins from the nearest non-empty neighbor.
    for i in range(CALIBRATION_BINS):
        if np.isnan(rates[i]):
            for step in range(1, CALIBRATION_BINS):
                for j in (i - step, i + step):
                    if 0 <= j < CALIBRATION_BINS and not np.isnan(rates[j]):
                        rates[i] = rates[j]
                        break
                if not np.isnan(rates[i]):
                    break
    rates = np.clip(np.nan_to_num(rates, nan=0.0), 0.0, 1.0)
    return {
        "bins": CALIBRATION_BINS,
        "counts": [int(c) for c in counts],
        "calibrated": [round(float(r), 6) for r in rates],
    }


def fetch_health_rows(base_url: str, service_key: str) -> pd.DataFrame:
    """Page through feed_health_snapshots (30-min Oracle Watch spine).

    Returns a per-(symbol, hour) aggregate of the v3 governance features, or an
    empty DataFrame when the table is empty/unreachable so training degrades to
    neutral-fill (graceful: the 30-min recorder may still be accumulating).
    """
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(weeks=LOOKBACK_WEEKS)).isoformat()
        url = base_url.rstrip("/") + "/rest/v1/feed_health_snapshots"
        select = "symbol,evaluated_at,agreement,outlier_count,stale_count,avg_reputation,min_reputation"
        params = {"select": select, "evaluated_at": f"gte.{cutoff}", "order": "symbol,evaluated_at"}
        headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}
        rows = []
        offset = 0
        while True:
            headers["Range"] = f"{offset}-{offset + PAGE_SIZE - 1}"
            r = requests.get(url, headers=headers, params=params, timeout=60)
            r.raise_for_status()
            chunk = r.json()
            rows.extend(chunk)
            offset += PAGE_SIZE
            if len(chunk) < PAGE_SIZE:
                break
        if not rows:
            return pd.DataFrame()
        health = pd.DataFrame(rows)
        health["evaluated_at"] = pd.to_datetime(health["evaluated_at"], utc=True)
        health["snapshot_hour"] = health["evaluated_at"].dt.floor("h")
        for c in ("agreement", "outlier_count", "stale_count", "avg_reputation", "min_reputation"):
            health[c] = pd.to_numeric(health[c], errors="coerce")
        g = health.groupby(["symbol", "snapshot_hour"], sort=True)
        out = pd.DataFrame(
            {
                "agreement": g["agreement"].mean(),
                "outlier_count": g["outlier_count"].sum(),
                "stale_count": g["stale_count"].sum(),
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


def build_dataset(df: pd.DataFrame, health_df: pd.DataFrame | None = None) -> pd.DataFrame:
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
    # Attach horizon labels.
    for h in HORIZONS:
        hourly[f"label_{h}h"] = label_for_horizon(hourly, h)
    # Keep symbol for per-asset-class calibration at train time.
    out = hourly[
        ["symbol"] + FEATURE_NAMES + [f"label_{h}h" for h in HORIZONS] + ["snapshot_hour"]
    ].copy()
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

    # Time-based split with PURGE + EMBARGO: labels look `hours` ahead, so a
    # train row near the boundary shares its outcome window with test rows and
    # leaks future information into training. Split at the 80% quantile of
    # snapshot_hour, then (a) embargo — test starts at the split time, and
    # (b) purge — training rows whose label window reaches into the test period
    # are dropped. Test metrics therefore measure true out-of-time skill.
    sub = data[data[label_col].notna()].sort_values("snapshot_hour").reset_index(drop=True)
    split_time = sub["snapshot_hour"].quantile(0.8)
    train = sub[sub["snapshot_hour"] < split_time - pd.Timedelta(hours=hours)]
    test = sub[sub["snapshot_hour"] >= split_time]
    used_purge = True
    if len(train) < 50 or len(test) < 20:
        # Degenerate split (heavily gapped data) — fall back to a plain time
        # split rather than refusing to train; the purge gap is best-effort.
        split = int(len(sub) * 0.8)
        train, test = sub.iloc[:split], sub.iloc[split:]
        used_purge = False
    X_tr, y_tr = train[FEATURE_NAMES].values, train[label_col].values
    X_te, y_te = test[FEATURE_NAMES].values, test[label_col].values
    log(
        f"[{hours}h] Train: {len(train)} ({int(y_tr.sum())} pos) | "
        f"Test: {len(test)} ({int(y_te.sum())} pos) | "
        f"split: {'purge ' + str(hours) + 'h before ' + str(split_time) if used_purge else 'plain 80/20 (degenerate gap)'}"
    )

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

    # Reliability calibration per asset class, computed on the test split.
    # Raw XGBoost probabilities with scale_pos_weight are systematically
    # inflated; the exported tables let the TS scorer map raw proba -> realized
    # positive rate so the Watch "high" bucket means the same thing across
    # stable and volatile assets. Class tables need enough data; otherwise the
    # scorer falls back to the default table, then to the raw probability.
    y_all = np.asarray(y_te)
    p_all = np.asarray(proba_te)
    is_stable = test["symbol"].map(asset_class).eq("stable").values
    calibration = {
        "default": compute_calibration(y_all, p_all),
        "stable": compute_calibration(y_all[is_stable], p_all[is_stable]),
        "volatile": compute_calibration(y_all[~is_stable], p_all[~is_stable]),
    }
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
    data = build_dataset(df, health_df)
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
