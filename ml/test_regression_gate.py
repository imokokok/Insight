"""Tests for same-window model promotion semantics."""

import contextlib
import io
import json
import tempfile
import unittest
from unittest.mock import patch

from ml.regression_gate import assess_candidate, evaluate_gate, main


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

    def test_quality_regression_retains_incumbent_without_invalidating_run(self):
        payload = horizon()
        payload["metrics"]["auc"] = 0.60
        payload["regressionComparison"]["candidate"]["auc"] = 0.60
        assessment = assess_candidate(model(payload), model(horizon()))
        self.assertEqual(assessment.invalid, [])
        self.assertTrue(any("AUC crossed" in reason for reason in assessment.rejected))

    def test_missing_same_window_comparison_is_invalid(self):
        assessment = assess_candidate(model(horizon(comparison=False)), model(horizon()))
        self.assertTrue(any("no same-window" in reason for reason in assessment.invalid))
        self.assertEqual(assessment.rejected, [])

    def test_invalid_export_remains_failure_even_when_quality_regresses(self):
        payload = horizon(high=1.0)
        payload["metrics"]["auc"] = 0.60
        payload["regressionComparison"]["candidate"]["auc"] = 0.60
        assessment = assess_candidate(model(payload), model(horizon()))
        self.assertTrue(any("invalid operating thresholds" in reason for reason in assessment.invalid))
        self.assertTrue(any("AUC crossed" in reason for reason in assessment.rejected))

    def test_active_model_without_required_horizon_is_invalid(self):
        candidate = model(horizon())
        candidate["horizons"] = {"1h": horizon()}
        assessment = assess_candidate(candidate, model(horizon()))
        self.assertEqual(assessment.invalid, ["Active model has no 6h horizon."])

    def test_inactive_candidate_requires_an_active_incumbent(self):
        candidate = model(horizon())
        candidate["active"] = False
        self.assertEqual(assess_candidate(candidate, model(horizon())).invalid, [])
        self.assertTrue(assess_candidate(candidate, model(horizon())).rejected)
        self.assertTrue(assess_candidate(candidate, None).invalid)

    def test_cli_exit_codes_distinguish_promotion_rejection_and_invalid_export(self):
        incumbent = model(horizon())
        cases = [
            (horizon(), 0),
            (horizon(positives=3), 2),
            (horizon(comparison=False), 1),
        ]
        for payload, expected in cases:
            with self.subTest(expected=expected), tempfile.NamedTemporaryFile(mode="w+", suffix=".json") as candidate_file:
                json.dump(model(payload), candidate_file)
                candidate_file.flush()
                with patch("sys.argv", ["regression_gate", "--model", candidate_file.name]), patch(
                    "ml.regression_gate.load_incumbent_from_git", return_value=incumbent
                ), contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(main(), expected)


if __name__ == "__main__":
    unittest.main()
