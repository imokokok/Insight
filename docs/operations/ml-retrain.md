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

## Diagnosing the 1h instability

The committed 2026-09-10 model had 388 positives among 7,051 training rows
(5.50%), 17 among 1,490 validation rows (1.14%), and just 3 among 1,531
test rows (0.20%) for 1h. A three-event test set cannot establish a stable
promotion baseline. The 2026-09-19 retrain had 381/9,692 (3.93%) in training,
62/2,067 (3.00%) in validation, and 38/2,092 (1.82%) in test. It fetched
15,942 market-reference hours, with 35.4% of examples covered, plus 381,852
fine-price rows. A complete source outage does not explain that run. Its 1h
candidate was selected at validation AP 0.419 but reached test AP 0.106,
below the incumbent's 0.158 on the same test rows. That is a measured
generalization failure. The changing prevalence and validation/test gap do
not by themselves distinguish market regime changes, correlated event
episodes, or differences in data coverage by asset and period.

Training now logs prevalence, market-reference coverage, event types, and
stable/volatile breakdowns for every time split. It also counts positive
episodes so overlapping labels from one incident are visible. Compare those counts with
the 15-minute event spine, live-check outcomes, and market-reference collection
before tuning the model. A reference fetch failure stops training, and a total
loss of reference coverage relative to a deployed Track-B model retains the
incumbent. A candidate that omits an existing horizon is also retained rather
than silently removing the 1h signal. Promotion remains all-or-nothing; updating
6h independently requires a separately versioned per-horizon release policy.

## Candidate selection and calibration

Evaluation spec v4 selects model family and tree count using supported,
purged forward folds inside the training period. Each fold has separate fit,
early-stop, and candidate-scoring windows. Candidate scores are the
mean improvement in average precision above each fold's positive-prevalence
baseline. At least two folds must have enough positive and negative examples,
and the selected candidate must beat the baseline in at least two folds.

The later validation period is split again, with a horizon-length purge gap.
The earlier segment fits probability calibration; the later segment learns
medium/high alert thresholds. Each needs at least 10 positives and 10
negatives. The final test period is used only for reporting and the same-window
comparison with the deployed model. An evaluation-spec version change does not
bypass that comparison when the label definition is unchanged.

Promotion requires at least 20 positive test rows and 10 positive episodes per
exported horizon. These are conservative evidence floors, not a guarantee of
statistical precision: overlapping rows can come from the same incident.

Snapshot reads use timestamp and primary-key pagination within a fixed eight-
week time window. This avoids asking PostgREST for an exact table count on
every page and avoids deep offset scans on the larger 15-minute source.
If the 15-minute source is unavailable or empty, retraining fails before
export because hourly-only labels would change the target definition.
