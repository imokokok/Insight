# Merge queue and merge train

## Why this repository cannot use GitHub's merge queue

GitHub documents merge queues as available in "any public repository owned by an
organization" (private repositories require GitHub Enterprise Cloud). This
repository is owned by a user account, so the merge-queue setting is absent and
the ruleset API rejects the rule:

```
POST /repos/imokokok/Insight/rulesets
{"rules":[{"type":"merge_queue", ...}]}
→ 422 Validation Failed: Invalid rule 'merge_queue'
```

The `merge_group` triggers in `ci.yml` and `codeql.yml` are kept so the
repository can switch to the native queue after a move to an organization
without touching the workflows.

## What runs today

1. `main` protection requires `validate`, `smoke`, and `analyze`, with
   `strict = true` (branches must be up to date before merging).
2. `.github/workflows/merge-train.yml` runs on every push to `main` (plus every
   10 minutes as a safety net). It updates the oldest auto-merge-enabled pull
   request that is `behind` the current `main`.
3. The update triggers the normal pull-request checks on the new head SHA.
   Auto-merge waits for those checks and only then squash-merges.

This preserves the property the native queue provides: the tree that lands on
`main` was tested against the `main` it lands on. A pull request that is already
up to date merges without extra work; only stale pull requests pay the CI re-run.

Runs are serialized by the workflow's `concurrency` group and each invocation
updates at most one pull request, so the train cannot update several branches
onto the same base and recreate the stale-merge problem.

## Limits compared with the native queue

- No batching of several pull requests into one build.
- Checks run as `pull_request` events, not `merge_group`, so queue-specific
  check reporting is unavailable.
- A stale pull request pays a full PR check run (~3 minutes at current speed).
- The updater only manages same-repository branches with auto-merge enabled and
  an owner/member/collaborator author. Fork pull requests must be updated by
  their author.

## Verification

```bash
gh api repos/imokokok/Insight/branches/main/protection \
  --jq '.required_status_checks.strict, .required_status_checks.checks'
gh run list --workflow merge-train.yml --limit 5
gh pr view <number> --json autoMergeRequest,mergeable,statusCheckRollup
```

An operational check after a merge: the new `main` run must be green, and any
pull request that was behind must show a new head SHA whose checks ran after the
merge.

## Migration to the native queue

1. Transfer the repository to an organization (public repositories qualify).
2. Create a branch ruleset for `refs/heads/main` with a `merge_queue` rule
   (`merge_method: SQUASH`, `grouping_strategy: ALLGREEN`,
   `min_entries_to_merge: 1`, `min_entries_to_merge_wait_minutes: 0`).
3. Delete `.github/workflows/merge-train.yml`; the `merge_group` triggers in
   `ci.yml` and `codeql.yml` become active automatically.
