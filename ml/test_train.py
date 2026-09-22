"""Contract tests for the trainer's statistically sensitive data semantics."""

import json
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import numpy as np
import pandas as pd

from ml.train import (
    DEVIATION_PCT,
    MARKET_DIVERGENCE_PCT,
    average_precision_skill,
    build_fine_event_frame,
    build_flywheel_frame,
    build_hourly_frame,
    compute_calibration,
    count_positive_episodes,
    label_for_horizon,
    label_from_fine_events,
    fetch_market_reference_rows,
    fetch_snapshot_pages,
    lost_market_reference_coverage,
    merge_flywheel_examples,
    score_exported_horizon,
    select_operating_thresholds,
    split_validation_windows,
    train_horizon,
    walk_forward_folds,
)


class LabelSemanticsTest(unittest.TestCase):
    def _hourly(self, offsets, deviations=None):
        start = pd.Timestamp("2026-01-01T00:00:00Z")
        deviations = deviations or [0.1] * len(offsets)
        return pd.DataFrame(
            {
                "symbol": ["ETH"] * len(offsets),
                "snapshot_hour": [start + pd.Timedelta(hours=h) for h in offsets],
                "consensus": [100.0] * len(offsets),
                "max_deviation_pct": deviations,
                "oracle_vs_market_deviation_pct": [0.0] * len(offsets),
            }
        )

    def test_horizon_uses_wall_clock_time_not_next_row(self):
        hourly = self._hourly([0, 2])
        labels, *_ = label_for_horizon(hourly, 1)
        self.assertTrue(pd.isna(labels.iloc[0]))

    def test_incomplete_tail_is_censored_not_negative(self):
        hourly = self._hourly([0, 1])
        labels, *_ = label_for_horizon(hourly, 1)
        self.assertEqual(labels.iloc[0], 0)
        self.assertTrue(pd.isna(labels.iloc[1]))

    def test_observed_event_is_positive_even_if_later_window_is_incomplete(self):
        hourly = self._hourly([0, 1], deviations=[0.1, 9.0])
        labels, *_ = label_for_horizon(hourly, 6)
        self.assertEqual(labels.iloc[0], 1)

    def test_already_abnormal_state_is_excluded_from_onset_training(self):
        hourly = self._hourly([0, 1], deviations=[9.0, 9.5])
        labels, *_ = label_for_horizon(hourly, 1)
        self.assertTrue(pd.isna(labels.iloc[0]))

    def test_fine_events_do_not_resurrect_existing_market_divergence(self):
        start = pd.Timestamp("2026-01-01T00:00:00Z")
        hourly = pd.DataFrame({
            "symbol": ["ETH"], "snapshot_hour": [start], "consensus": [100.0],
            "max_deviation_pct": [0.1], "oracle_vs_market_deviation_pct": [3.0],
        })
        fine = pd.DataFrame({
            "symbol": ["ETH"], "snapshot_hour": [start + pd.Timedelta(minutes=30)],
            "consensus": [106.0], "max_deviation_pct": [9.0],
        })
        hourly_label, *_ = label_for_horizon(hourly, 1)
        fine_label, *_ = label_from_fine_events(hourly, fine, 1)
        self.assertTrue(pd.isna(hourly_label.iloc[0]))
        self.assertTrue(pd.isna(fine_label.iloc[0]))


class FeatureSemanticsTest(unittest.TestCase):
    def test_missing_fine_source_stops_retrain_before_export(self):
        from ml import train

        hourly = pd.DataFrame({"symbol": ["ETH"] * 500})
        with patch.dict("os.environ", {
            "SUPABASE_URL": "https://example.invalid",
            "SUPABASE_SERVICE_ROLE_KEY": "key",
        }), patch.object(train, "MODEL_PATH", "/tmp/nonexistent-insight-model.json"), patch(
            "ml.train.fetch_rows", return_value=hourly
        ), patch("ml.train.fetch_health_rows", return_value=pd.DataFrame()), patch(
            "ml.train.fetch_market_reference_rows", return_value=pd.DataFrame()
        ), patch("ml.train.fetch_fine_rows", side_effect=RuntimeError("source unavailable")), patch(
            "ml.train.write_null_model"
        ) as write_null, patch("ml.train.log"):
            with self.assertRaisesRegex(RuntimeError, "source unavailable"):
                train.main()
        write_null.assert_not_called()

    def test_snapshot_cursor_pages_through_equal_timestamps_without_exact_count(self):
        first_time = "2026-09-20T00:00:00+00:00"
        next_time = "2026-09-20T01:00:00+00:00"
        pages = [
            [{"id": 1, "snapshot_hour": first_time}, {"id": 2, "snapshot_hour": first_time}],
            [{"id": 3, "snapshot_hour": first_time}, {"id": 4, "snapshot_hour": next_time}],
            [{"id": 5, "snapshot_hour": next_time}],
        ]
        responses = []
        for page in pages:
            response = Mock()
            response.json.return_value = page
            responses.append(response)
        with patch("ml.train.PAGE_SIZE", 2), patch("ml.train.HTTP.get", side_effect=responses) as get:
            rows = fetch_snapshot_pages(
                "https://example.invalid", "key", "hourly_price_snapshots",
                "snapshot_hour", "snapshot_hour",
            )
        self.assertEqual([row["id"] for row in rows], [1, 2, 3, 4, 5])
        self.assertEqual([call.kwargs["headers"]["Range"] for call in get.call_args_list], ["0-1"] * 3)
        self.assertTrue(all("Prefer" not in call.kwargs["headers"] for call in get.call_args_list))
        self.assertNotIn("or", get.call_args_list[0].kwargs["params"])
        self.assertIn("id.gt.2", get.call_args_list[1].kwargs["params"]["or"])
        self.assertIn("id.gt.4", get.call_args_list[2].kwargs["params"]["or"])
        self.assertEqual(
            [call.kwargs["params"]["and"] for call in get.call_args_list],
            [get.call_args_list[0].kwargs["params"]["and"]] * 3,
        )

    def test_positive_episode_count_collapses_overlapping_horizon_labels(self):
        start = pd.Timestamp("2026-01-01T00:00:00Z")
        frame = pd.DataFrame({
            "symbol": ["ETH"] * 5 + ["BTC"],
            "snapshot_hour": [start + pd.Timedelta(hours=h) for h in (0, 1, 2, 10, 11, 1)],
            "label_1h": [1] * 6,
        })
        self.assertEqual(count_positive_episodes(frame, "label_1h", 1), 3)

    def test_final_test_labels_do_not_change_selected_model_or_thresholds(self):
        from ml.train import FEATURE_NAMES

        rng = np.random.default_rng(42)
        count = 3000
        frame = pd.DataFrame({name: rng.normal(size=count) for name in FEATURE_NAMES})
        signal = rng.normal(size=count)
        frame["max_deviation_pct"] = signal
        frame["symbol"] = np.where(np.arange(count) % 3 == 0, "USDC", "ETH")
        frame["snapshot_hour"] = pd.date_range("2025-01-01", periods=count, freq="h", tz="UTC")
        frame["label_1h"] = ((signal > 0.8) | (rng.random(count) < 0.1)).astype(int)
        frame["market_reference_available"] = 1
        for kind in ("price", "dev", "div"):
            frame[f"ev_{kind}_1h"] = 0

        changed = frame.copy()
        test_start = frame["snapshot_hour"].quantile(0.85)
        mask = changed["snapshot_hour"] >= test_start
        changed.loc[mask, "label_1h"] = 1 - changed.loc[mask, "label_1h"]
        with patch("ml.train.log"):
            original_model = train_horizon(frame, 1)
            changed_model = train_horizon(changed, 1)
        self.assertIsNotNone(original_model)
        self.assertIsNotNone(changed_model)
        self.assertEqual(original_model["trees"], changed_model["trees"])
        self.assertEqual(original_model["calibration"], changed_model["calibration"])
        self.assertEqual(original_model["riskThresholds"], changed_model["riskThresholds"])
        self.assertNotEqual(
            original_model["metrics"]["n_positive_test"],
            changed_model["metrics"]["n_positive_test"],
        )

    def test_forward_folds_and_operating_window_respect_label_horizon(self):
        start = pd.Timestamp("2026-01-01T00:00:00Z")
        frame = pd.DataFrame({
            "snapshot_hour": [start + pd.Timedelta(hours=hour) for hour in range(800)],
            "label_6h": [int(hour % 5 == 0) for hour in range(800)],
        })
        folds = walk_forward_folds(frame, "label_6h", 6)
        self.assertEqual(len(folds), 3)
        for fold_train, fold_stop, fold_validation in folds:
            self.assertLess(
                fold_train["snapshot_hour"].max() + pd.Timedelta(hours=6),
                fold_stop["snapshot_hour"].min(),
            )
            self.assertLess(
                fold_stop["snapshot_hour"].max() + pd.Timedelta(hours=6),
                fold_validation["snapshot_hour"].min(),
            )
        calibration, operating = split_validation_windows(frame, 6)
        self.assertLess(
            calibration["snapshot_hour"].max() + pd.Timedelta(hours=6),
            operating["snapshot_hour"].min(),
        )

    def test_forward_skill_uses_each_windows_positive_baseline(self):
        labels = np.array([0] * 90 + [1] * 10)
        constant = np.full(100, 0.1)
        ranked = np.array([0.1] * 90 + [0.9] * 10)
        self.assertAlmostEqual(average_precision_skill(labels, constant), 0.0)
        self.assertAlmostEqual(average_precision_skill(labels, ranked), 1.0)

    def test_total_market_reference_loss_retains_track_b_incumbent(self):
        data = pd.DataFrame({"market_reference_available": [0, 0]})
        incumbent = {"6h": {"metrics": {"n_pos_divergence": 2}}}
        self.assertTrue(lost_market_reference_coverage(data, incumbent))
        self.assertFalse(lost_market_reference_coverage(data, {}))
        data.loc[1, "market_reference_available"] = 1
        self.assertFalse(lost_market_reference_coverage(data, incumbent))

    def test_market_reference_failure_is_not_treated_as_zero_divergence(self):
        with patch("ml.train.HTTP.get", side_effect=ConnectionError("unavailable")):
            with self.assertRaisesRegex(RuntimeError, "cannot train comparable labels"):
                fetch_market_reference_rows("https://example.invalid", "key")

    def test_flywheel_requires_complete_finite_feature_vector(self):
        from ml.train import FEATURE_NAMES

        complete = {name: 0.0 for name in FEATURE_NAMES}
        rows = pd.DataFrame(
            [
                {
                    "asset": "ETH",
                    "created_at": pd.Timestamp("2026-01-01T00:10:00Z"),
                    "ml_feature_vector": complete,
                    "outcome_label_1h": False,
                    "outcome_label_6h": True,
                    "outcome_1h": {"methodVersion": 2},
                    "outcome_6h": {"methodVersion": 2, "maxDeviationPct": 9.0},
                },
                {
                    "asset": "BTC",
                    "created_at": pd.Timestamp("2026-01-01T00:20:00Z"),
                    "ml_feature_vector": {"max_deviation_pct": 1.0},
                    "outcome_label_1h": False,
                    "outcome_label_6h": False,
                },
            ]
        )
        frame = build_flywheel_frame(rows)
        self.assertEqual(len(frame), 1)
        self.assertEqual(frame.iloc[0]["symbol"], "ETH")
        self.assertEqual(frame.iloc[0]["ev_dev_6h"], 1)

    def test_flywheel_excludes_incident_already_active_at_check_time(self):
        from ml.train import FEATURE_NAMES

        neutral = {name: 0.0 for name in FEATURE_NAMES}
        rows = pd.DataFrame([
            {
                "asset": "ETH", "created_at": pd.Timestamp("2026-01-01T00:10:00Z"),
                "ml_feature_vector": {**neutral, "max_deviation_pct": DEVIATION_PCT},
                "outcome_label_1h": True, "outcome_label_6h": True,
                "outcome_1h": {"methodVersion": 2}, "outcome_6h": {"methodVersion": 2},
            },
            {
                "asset": "BTC", "created_at": pd.Timestamp("2026-01-01T00:20:00Z"),
                "ml_feature_vector": {
                    **neutral, "oracle_vs_market_deviation_pct": MARKET_DIVERGENCE_PCT
                },
                "outcome_label_1h": True, "outcome_label_6h": True,
                "outcome_1h": {"methodVersion": 2}, "outcome_6h": {"methodVersion": 2},
            },
            {
                "asset": "SOL", "created_at": pd.Timestamp("2026-01-01T00:30:00Z"),
                "ml_feature_vector": neutral,
                "outcome_label_1h": False, "outcome_label_6h": False,
                "outcome_1h": {"methodVersion": 2}, "outcome_6h": {"methodVersion": 2},
            },
        ])

        frame = build_flywheel_frame(rows)
        self.assertEqual(frame["symbol"].tolist(), ["SOL"])

    def test_flywheel_rejects_legacy_outcome_method(self):
        from ml.train import FEATURE_NAMES

        neutral = {name: 0.0 for name in FEATURE_NAMES}
        rows = pd.DataFrame([{
            "asset": "ETH", "created_at": pd.Timestamp("2026-01-01T00:10:00Z"),
            "ml_feature_vector": neutral,
            "outcome_label_1h": False, "outcome_label_6h": False,
            "outcome_1h": {}, "outcome_6h": {},
        }])

        self.assertTrue(build_flywheel_frame(rows).empty)

    def test_live_example_replaces_same_asset_hour_instead_of_adding_weight(self):
        from ml.train import FEATURE_NAMES

        start = pd.Timestamp("2026-01-01T00:00:00Z")
        base = {name: 0.0 for name in FEATURE_NAMES}
        labels = {
            **{f"label_{h}h": 0 for h in (1, 6)},
            **{f"ev_{kind}_{h}h": 0 for kind in ("price", "dev", "div") for h in (1, 6)},
        }
        mined = pd.DataFrame([{"symbol": "ETH", "snapshot_hour": start, **base, **labels}])
        live = pd.DataFrame(
            [
                {
                    "symbol": "ETH",
                    "snapshot_hour": start + pd.Timedelta(minutes=20),
                    **{**base, "max_deviation_pct": 2.0},
                    **labels,
                }
            ]
        )
        merged = merge_flywheel_examples(mined, live)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged.iloc[0]["max_deviation_pct"], 2.0)

    def test_fine_spine_adds_between_hour_incident_without_extra_feature_rows(self):
        start = pd.Timestamp("2026-01-01T00:00:00Z")
        hourly = pd.DataFrame(
            {
                "symbol": ["ETH"],
                "snapshot_hour": [start],
                "consensus": [100.0],
                "max_deviation_pct": [0.1],
            }
        )
        raw = pd.DataFrame(
            [
                {
                    "symbol": "ETH",
                    "snapshot_ts": start + pd.Timedelta(minutes=30),
                    "provider": provider,
                    "price": price,
                    "deviation_pct": deviation,
                    "data_age_seconds": 10,
                }
                for provider, price, deviation in [("a", 100.0, 9.0), ("b", 100.2, 0.1)]
            ]
        )
        fine = build_fine_event_frame(raw)
        labels, _, ev_dev = label_from_fine_events(hourly, fine, 1)
        self.assertEqual(len(hourly), 1)
        self.assertEqual(labels.iloc[0], 1)
        self.assertEqual(ev_dev.iloc[0], 1)

    def test_gap_does_not_become_one_hour_velocity(self):
        start = pd.Timestamp("2026-01-01T00:00:00Z")
        rows = []
        for hour, deviation in [(0, 1.0), (2, 3.0), (3, 4.0)]:
            for provider, price in [("a", 100.0), ("b", 100.2)]:
                rows.append(
                    {
                        "symbol": "ETH",
                        "snapshot_hour": start + pd.Timedelta(hours=hour),
                        "provider": provider,
                        "price": price,
                        "deviation_pct": deviation,
                        "data_age_seconds": 10,
                    }
                )
        hourly = build_hourly_frame(pd.DataFrame(rows))
        self.assertEqual(hourly.loc[1, "deviation_velocity_1h"], 0.0)
        self.assertEqual(hourly.loc[2, "deviation_velocity_1h"], 1.0)

    def test_calibration_is_monotonic(self):
        probabilities = np.linspace(0.0, 1.0, 400)
        labels = np.array([i % 7 == 0 or i > 300 for i in range(400)], dtype=int)
        table = compute_calibration(labels, probabilities)
        self.assertIsNotNone(table)
        calibrated = table["calibrated"]
        self.assertTrue(all(a <= b for a, b in zip(calibrated, calibrated[1:])))

    def test_operating_thresholds_are_learned_from_validation_scores(self):
        labels = np.array([0] * 80 + [1] * 20)
        scores = np.array([0.03] * 50 + [0.08] * 30 + [0.08] * 5 + [0.14] * 15)
        thresholds = select_operating_thresholds(labels, scores)
        self.assertLess(thresholds["medium"], thresholds["high"])
        self.assertEqual(thresholds["high"], 0.14)
        self.assertEqual(thresholds["medium"], 0.08)

    def test_operating_threshold_never_exports_exactly_one(self):
        labels = np.array([0] * 90 + [1] * 10)
        scores = np.array([0.01] * 90 + [1.0] * 10)
        thresholds = select_operating_thresholds(labels, scores)
        self.assertEqual(thresholds["high"], 0.999999)
        self.assertLess(thresholds["medium"], thresholds["high"])

    def test_python_incumbent_scorer_matches_exported_verification_samples(self):
        model_path = Path(__file__).parent / "models" / "oracle_risk_model.json"
        model = json.loads(model_path.read_text())
        for horizon in (model.get("horizons") or {}).values():
            if not horizon:
                continue
            samples = horizon.get("verificationSamples") or []
            frame = pd.DataFrame(
                [sample for sample, _ in samples],
                columns=horizon["featureNames"],
            )
            actual = score_exported_horizon(horizon, frame)
            expected = np.array([expected for _, expected in samples])
            tolerance = horizon.get("verificationTolerance", 0.01)
            self.assertTrue(np.all(np.abs(actual - expected) <= tolerance))


if __name__ == "__main__":
    unittest.main()
