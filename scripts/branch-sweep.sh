#!/usr/bin/env bash
# Rebase-aware branch sweeper.
#
# Rebase merges rewrite SHAs, so merged work stays "unmerged" by ancestry and
# branches pile up. This tool decides, for every branch except the base, whether
# its work is already accounted for and deletes it when safe:
#   1. an associated PR was merged (any time)             -> delete
#   2. an associated PR was closed unmerged > 7 days ago  -> delete
#   3. every unique commit is patch-id-contained in base  -> delete (cherry-picks/rebases)
#   4. the branch tree is identical to base               -> delete (empty delta)
#   5. PR open, or anything unproven                      -> keep, report only
#
# Modes:
#   --remote  sweep origin's branches (default in CI); deletes via `git push origin --delete`
#   --local   sweep local branches; deletes via `git branch -D`
#   --apply   actually delete (default is a dry-run report)
#
# Usage: scripts/branch-sweep.sh [--remote|--local] [--apply] [--base <ref>]

set -euo pipefail

MODE=remote
APPLY=0
BASE=origin/main
GRACE_DAYS=7

while [ $# -gt 0 ]; do
  case "$1" in
    --remote) MODE=remote ;;
    --local) MODE=local ;;
    --apply) APPLY=1 ;;
    --base) BASE="$2"; shift ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

REMOTE=origin
if [ "$MODE" = remote ]; then
  REMOTE_URL="$(git remote get-url origin)"
  REPO_SLUG="$(printf '%s' "$REMOTE_URL" | sed -E 's#.*github.com[:/]##; s#\.git$##')"
fi

# Cache every PR for the repo once: head<TAB>state<TAB>mergedAt<TAB>closedAt
PR_MAP_FILE="$(mktemp)"
trap 'rm -f "$PR_MAP_FILE"' EXIT
if command -v gh >/dev/null 2>&1; then
  gh pr list -R "${REPO_SLUG:-.}" --state all --limit 500 \
    --json headRefName,state,mergedAt,closedAt \
    --jq '.[] | select(.headRefName != null) | [.headRefName, .state, (.mergedAt // ""), (.closedAt // "")] | @tsv' \
    > "$PR_MAP_FILE" 2>/dev/null || true
else
  echo "gh CLI not found; PR-based rules 1/2 disabled" >&2
fi

grace_epoch=$(( $(date +%s) - GRACE_DAYS * 86400 ))
deleted=0
kept=0

# Table header for the report
printf '| branch | last commit | decision | reason |\n|---|---|---|---|\n' >> "${GITHUB_STEP_SUMMARY:-/dev/null}"

delete_branch() {
  local branch="$1" reason="$2"
  if [ "$APPLY" = 1 ]; then
    if [ "$MODE" = remote ]; then
      git push "$REMOTE" --delete "$branch" >/dev/null 2>&1
    else
      git branch -D "$branch" >/dev/null 2>&1
    fi
  fi
  printf '%s: DELETE %s (%s)%s\n' "$MODE" "$branch" "$reason" \
    "$([ "$APPLY" = 1 ] || echo ' [dry-run]')"
  printf '| `%s` | - | delete | %s |\n' "$branch" "$reason" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
  deleted=$((deleted + 1))
}

keep_branch() {
  local branch="$1" last="$2" reason="$3"
  printf '%s: KEEP   %s (%s)\n' "$MODE" "$branch" "$reason"
  printf '| `%s` | %s | keep | %s |\n' "$branch" "${last:-?}" "$reason" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
  kept=$((kept + 1))
}

if [ "$MODE" = remote ]; then
  BRANCHES="$(git ls-remote --heads "$REMOTE" | awk '{print $2}' | sed 's|refs/heads/||' | grep -vx main || true)"
else
  BRANCHES="$(git for-each-ref --format='%(refname:short)' refs/heads | grep -vx main || true)"
fi

for branch in $BRANCHES; do
  # Rule 0: never touch a branch with an open PR.
  if grep -qF "$branch" "$PR_MAP_FILE" 2>/dev/null && \
     awk -F'\t' -v b="$branch" '$1==b && $2=="OPEN"{found=1} END{exit !found}' "$PR_MAP_FILE"; then
    keep_branch "$branch" "" "open PR attached"
    continue
  fi

  # Rule 1: any merged PR means the work landed.
  if awk -F'\t' -v b="$branch" '$1==b && $2=="MERGED"{found=1} END{exit !found}' "$PR_MAP_FILE" 2>/dev/null; then
    delete_branch "$branch" "PR merged"
    continue
  fi

  # Rule 2: closed-unmerged PR older than the grace period is abandoned work.
  closed_at="$(awk -F'\t' -v b="$branch" '$1==b && $2=="CLOSED"{print $4}' "$PR_MAP_FILE" 2>/dev/null | head -1)"
  if [ -n "$closed_at" ]; then
    closed_epoch="$(python3 -c "import sys,datetime; print(int(datetime.datetime.fromisoformat(sys.argv[1].replace('Z','+00:00')).timestamp()))" "$closed_at" 2>/dev/null || echo 0)"
    if [ "$closed_epoch" -gt 0 ] && [ "$closed_epoch" -lt "$grace_epoch" ]; then
      delete_branch "$branch" "PR closed unmerged > ${GRACE_DAYS}d"
      continue
    fi
  fi

  # Fetch the branch ref locally so rules 3/4 can inspect it.
  if [ "$MODE" = remote ]; then
    git fetch --quiet "$REMOTE" "refs/heads/$branch:refs/remotes/$REMOTE/$branch" 2>/dev/null || { keep_branch "$branch" "" "fetch failed"; continue; }
    REF="refs/remotes/$REMOTE/$branch"
  else
    REF="refs/heads/$branch"
  fi

  # Rule 3: every unique commit is patch-id-contained in base.
  total="$(git cherry "$BASE" "$REF" 2>/dev/null | grep -c '^+' || true)"
  if [ "${total:-0}" -eq 0 ]; then
    delete_branch "$branch" "all commits patch-contained in base"
    continue
  fi

  # Rule 4: tree identical to base (empty delta) — nothing to lose.
  if [ -z "$(git diff --stat "$BASE...$REF" 2>/dev/null)" ]; then
    delete_branch "$branch" "tree identical to base"
    continue
  fi

  # Rule 5: report unproven branches for human judgement.
  last="$(git log -1 --format='%as' "$REF" 2>/dev/null || echo '?')"
  keep_branch "$branch" "$last" "${total} unique commits not proven merged"
done

echo
echo "Summary: ${deleted} deletable, ${kept} kept (apply=${APPLY}, mode=${MODE})"
if [ "$APPLY" != 1 ]; then
  echo "Dry run only. Re-run with --apply to delete."
fi
