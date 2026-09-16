"""Tests for same-window model promotion semantics."""

import unittest

from ml.regression_gate import evaluate_gate


def horizon(*, comparison=True, positives=20, high=0.7):
    metrics = {
        "auc": 0.78,
        "average_precision": 0.24,
        "brier_calibrated": 0.04,
        "n_positive_test": positives,
        "validation_recall_at_high_threshold": 0.5,
        "recall_at_high_threshold": 0.4,
    }
    payload = {
        "trees": [[{"nodeid": 0, "leaf": 0.0}]],
        "riskThresholds": {"medium": 0.3, "high": high},
        "metrics": metrics,
    }
    if comparison:
        payload["regressionComparison"] = {
            "population": "current_test_window",
            "nPositiveTest": positives,
            "candidate": {
                "auc": 0.78,
                "average_precision": 0.24,
                "brier_calibrated": 0.04,
            },
            "incumbent": {
                "auc": 0.77,
                "average_precision": 0.23,
                "brier_calibrated": 0.045,
            },
        }
    return payload


def model(payload):
    return {
        "version": 2,
        "active": True,
        "labelSpecVersion": 2,
        "evaluationSpecVersion": 3,
        "horizons": {"6h": payload},
    }


class RegressionGateTest(unittest.TestCase):
    def test_uses_same_window_comparison_not_incumbent_historical_metrics(self):
        candidate = model(horizon())
        incumbent_payload = horizon()
        incumbent_payload["metrics"].update(
            {"auc": 0.99, "average_precision": 0.99, "brier_calibrated": 0.001}
        )
        errors, info = evaluate_gate(candidate, model(incumbent_payload))
        self.assertEqual(errors, [])
        self.assertTrue(any("same-window" in line for line in info))

    def test_refuses_historical_only_comparison(self):
        errors, _ = evaluate_gate(model(horizon(comparison=False)), model(horizon()))
        self.assertTrue(any("no same-window incumbent comparison" in error for error in errors))

    def test_refuses_tiny_positive_test_population(self):
        errors, _ = evaluate_gate(model(horizon(positives=3)), model(horizon()))
        self.assertTrue(any("too few positives" in error for error in errors))

    def test_rejects_exactly_one_high_threshold(self):
        errors, _ = evaluate_gate(model(horizon(high=1.0)), model(horizon()))
        self.assertTrue(any("invalid operating thresholds" in error for error in errors))

    def test_detects_real_same_window_regression(self):
        payload = horizon()
        payload["metrics"]["auc"] = 0.60
        payload["regressionComparison"]["candidate"]["auc"] = 0.60
        payload["regressionComparison"]["incumbent"]["auc"] = 0.80
        errors, _ = evaluate_gate(model(payload), model(horizon()))
        self.assertTrue(any("AUC crossed" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
