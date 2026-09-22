#!/usr/bin/env python3
"""Deployment gate for scheduled ML retraining.

The incumbent and candidate must be compared on the candidate run's current
test window. Historical metrics describe different rolling populations and are
not valid champion/challenger evidence.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, field

AUC_DROP_TOLERANCE = 0.03
AP_DROP_TOLERANCE = 0.03
BRIER_RISE_TOLERANCE = 0.02
MIN_COMPARISON_POSITIVES = 10


@dataclass
class GateAssessment:
    invalid: list[str] = field(default_factory=list)
    rejected: list[str] = field(default_factory=list)
    info: list[str] = field(default_factory=list)


def horizons(model: dict) -> dict:
    if model.get("version") == 2 and model.get("horizons"):
        return {name: payload for name, payload in model["horizons"].items() if payload}
    return {"6h": model} if model.get("trees") else {}


def assess_candidate(candidate: dict, incumbent: dict | None) -> GateAssessment:
    """Separate an unsafe export from a valid candidate that did not improve."""
    result = GateAssessment()
    if not candidate.get("active"):
        if incumbent and incumbent.get("active"):
            result.rejected.append("New model is inactive. Keeping the last-known-good deployed model.")
        else:
            result.invalid.append("No active candidate or incumbent model is available.")
        return result

    candidate_horizons = horizons(candidate)
    if "6h" not in candidate_horizons:
        result.invalid.append("Active model has no 6h horizon.")
        return result
    for name, payload in candidate_horizons.items():
        metrics = payload.get("metrics") or {}
        thresholds = payload.get("riskThresholds") or {}
        medium, high = thresholds.get("medium"), thresholds.get("high")
        if (
            not isinstance(medium, (int, float))
            or not isinstance(high, (int, float))
            or not 0 < medium < high < 1
        ):
            result.invalid.append(f"Horizon {name} exported invalid operating thresholds: {thresholds}")
        if metrics.get("validation_recall_at_high_threshold", 0) < 0.10:
            result.rejected.append(f"Horizon {name} high tier misses the validation recall floor.")
        if (
            metrics.get("n_positive_test", 0) >= MIN_COMPARISON_POSITIVES
            and metrics.get("recall_at_high_threshold", 0) <= 0
        ):
            result.rejected.append(f"Horizon {name} high tier caught no positives on the test window.")

    if not incumbent or not incumbent.get("active"):
        result.info.append("No active incumbent model; regression comparison skipped.")
        return result

    if (
        incumbent.get("labelSpecVersion") != candidate.get("labelSpecVersion")
        or incumbent.get("evaluationSpecVersion") != candidate.get("evaluationSpecVersion")
    ):
        result.info.append("Label/evaluation specification changed; accepting a new comparison baseline.")
        return result

    incumbent_horizons = horizons(incumbent)
    checks = (
        ("AUC", "auc", -AUC_DROP_TOLERANCE, False),
        ("average precision", "average_precision", -AP_DROP_TOLERANCE, False),
        ("calibrated Brier", "brier_calibrated", BRIER_RISE_TOLERANCE, True),
    )
    for name in sorted(set(candidate_horizons) & set(incumbent_horizons)):
        payload = candidate_horizons[name]
        comparison = payload.get("regressionComparison")
        if not comparison or comparison.get("population") != "current_test_window":
            result.invalid.append(
                f"Horizon {name} has no same-window incumbent comparison; refusing an "
                "apples-to-oranges historical metric comparison."
            )
            continue
        if comparison.get("nPositiveTest", 0) < MIN_COMPARISON_POSITIVES:
            result.rejected.append(
                f"Horizon {name} current test window has too few positives "
                f"({comparison.get('nPositiveTest', 0)} < {MIN_COMPARISON_POSITIVES})."
            )
            continue

        candidate_metrics = comparison.get("candidate") or {}
        incumbent_metrics = comparison.get("incumbent") or {}
        exported_metrics = payload.get("metrics") or {}
        for label, key, tolerance, lower_is_better in checks:
            new_value = candidate_metrics.get(key)
            old_value = incumbent_metrics.get(key)
            exported_value = exported_metrics.get(key)
            if not all(isinstance(value, (int, float)) for value in (new_value, old_value)):
                result.invalid.append(f"Horizon {name} {label} same-window metric is unavailable.")
                continue
            if isinstance(exported_value, (int, float)) and abs(new_value - exported_value) > 1e-12:
                result.invalid.append(f"Horizon {name} {label} comparison is stale or inconsistent.")
                continue
            delta = new_value - old_value
            regressed = delta > tolerance if lower_is_better else delta < tolerance
            status = "REGRESSION" if regressed else "OK"
            result.info.append(
                f"{name} same-window: incumbent {label} {old_value:.4f} -> "
                f"candidate {new_value:.4f} (delta {delta:+.4f}) {status}"
            )
            if regressed:
                result.rejected.append(
                    f"Horizon {name} {label} crossed its same-window regression tolerance."
                )
    return result


def evaluate_gate(candidate: dict, incumbent: dict | None) -> tuple[list[str], list[str]]:
    """Return (errors, informational lines) for existing callers."""
    result = assess_candidate(candidate, incumbent)
    return result.invalid + result.rejected, result.info


def load_incumbent_from_git(path: str) -> dict | None:
    result = subprocess.run(
        ["git", "show", f"HEAD:{path}"],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return None
    return json.loads(result.stdout)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="ml/models/oracle_risk_model.json")
    args = parser.parse_args()

    with open(args.model) as candidate_file:
        candidate = json.load(candidate_file)
    incumbent = load_incumbent_from_git(args.model)
    result = assess_candidate(candidate, incumbent)
    for line in result.info:
        print(line)
    for error in result.invalid:
        print(f"::error::{error}")
    for reason in result.rejected:
        print(f"::notice::{reason}")
    if result.invalid:
        return 1
    return 2 if result.rejected else 0


if __name__ == "__main__":
    sys.exit(main())
