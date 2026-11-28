import { execFileSync, spawnSync } from 'node:child_process';

export function pushBranch(worktreePath, branch, { allowRewrite = false } = {}) {
  const remoteTrackingRef = `refs/remotes/origin/${branch}`;
  let expectedRemoteSha = null;
  try {
    expectedRemoteSha = execFileSync('git', ['rev-parse', '--verify', remoteTrackingRef], {
      encoding: 'utf8',
      cwd: worktreePath,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    // No remote branch exists yet; use the normal new-branch push below.
  }

  let isFastForward = true;
  if (expectedRemoteSha) {
    const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', expectedRemoteSha, 'HEAD'], {
      cwd: worktreePath,
      stdio: 'ignore',
    });
    if (ancestry.status === 1) isFastForward = false;
    else if (ancestry.status !== 0)
      throw new Error('could not compare the local and remote branch histories');
  }

  if (expectedRemoteSha && !isFastForward && !allowRewrite) {
    throw new Error(
      `remote branch ${branch} is not an ancestor of HEAD; rebase the task branch and explicitly pass --allow-rewrite to update it with --force-with-lease`
    );
  }

  const args = ['push', '-u'];
  if (expectedRemoteSha && !isFastForward) {
    args.push(`--force-with-lease=refs/heads/${branch}:${expectedRemoteSha}`);
  }
  args.push('origin', `HEAD:${branch}`);
  const result = spawnSync('git', args, {
    cwd: worktreePath,
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error(`push failed for ${branch}`);
}
