"""Contract tests for the trainer's statistically sensitive data semantics."""

import unittest

import numpy as np
import pandas as pd

from ml.train import build_hourly_frame, compute_calibration, label_for_horizon


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


class FeatureSemanticsTest(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
