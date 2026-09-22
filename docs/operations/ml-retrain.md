# Scheduled ML retraining

The scheduled job trains a candidate, compares it with the deployed model on
the candidate's current test window, and publishes only a candidate that passes
the regression gate. A trained candidate is not automatically a better model.

## Run outcomes

- **Promoted:** the candidate passes all quality and export checks; the workflow
  validates the model and cron bundles before committing and deploying them.
- **Model retained:** the candidate is valid but fails a quality floor, has too
  few positive test examples, or regresses against the incumbent. The job
  succeeds with a notice and summary. The deployed model stays in place.
- **Workflow failed:** the model export or same-window comparison is invalid,
  or a training/dependency/validation step fails. Investigate before rerunning.

The gate does not relax AUC, average precision, calibrated Brier, recall, or
threshold requirements when a candidate is rejected. To investigate repeated
retentions, compare train/validation/test positive counts and label prevalence,
event types, market-reference coverage, and per-asset-class calibration. Use
rolling time windows for tuning and keep the final test window untouched until
promotion evaluation. Fix missing or inconsistent input data before trying
more model configurations. Never force a rejected candidate into production to
make the scheduled run green.

The 2026-09-19 run is an example: the 1h candidate scored 0.419 average
precision on validation but 0.106 on the test window. The incumbent scored
0.158 on that same test window; candidate AUC was 0.722 versus 0.776 for the
incumbent. The 6h candidate passed. The 1h regression correctly blocked the
combined model update. See [the run](https://github.com/imokokok/Insight/actions/runs/35441220811).
