import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pushBranch } from '../worktreePush.mjs';

function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function commit(cwd, message) {
  git(cwd, 'add', '-A');
  git(cwd, 'commit', '-m', message);
}

function setupRebasedBranch(root) {
  const remote = join(root, 'remote.git');
  const local = join(root, 'local');
  const branch = 'wt/feature';
  git(root, 'init', '--bare', '--initial-branch=main', remote);
  git(root, 'clone', remote, local);
  git(local, 'config', 'user.name', 'Test Author');
  git(local, 'config', 'user.email', 'test@example.invalid');
  writeFileSync(join(local, 'base.txt'), 'base\n');
  commit(local, 'base');
  git(local, 'push', '-u', 'origin', 'main');

  git(local, 'checkout', '-b', branch);
  writeFileSync(join(local, 'feature.txt'), 'feature\n');
  commit(local, 'feature');
  git(local, 'push', '-u', 'origin', branch);

  git(local, 'checkout', 'main');
  writeFileSync(join(local, 'base.txt'), 'base\nupdated\n');
  commit(local, 'advance main');
  git(local, 'push', 'origin', 'main');
  git(local, 'fetch', 'origin', '--prune');
  git(local, 'checkout', branch);
  git(local, 'rebase', 'origin/main');
  return { branch, local, remote };
}

test('rebased feature pushes require opt-in and lease the fetched remote SHA', () => {
  const root = mkdtempSync(join(tmpdir(), 'insight-worktree-push-'));
  try {
    const { branch, local, remote } = setupRebasedBranch(root);
    const oldRemoteSha = git(local, 'rev-parse', `refs/remotes/origin/${branch}`);
    const rebasedSha = git(local, 'rev-parse', 'HEAD');

    assert.throws(() => pushBranch(local, branch), /explicitly pass --allow-rewrite/);
    assert.equal(git(root, '--git-dir', remote, 'rev-parse', `refs/heads/${branch}`), oldRemoteSha);

    pushBranch(local, branch, { allowRewrite: true });
    assert.equal(git(root, '--git-dir', remote, 'rev-parse', `refs/heads/${branch}`), rebasedSha);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('lease rejects a feature branch changed remotely after fetch', () => {
  const root = mkdtempSync(join(tmpdir(), 'insight-worktree-lease-'));
  try {
    const { branch, local, remote } = setupRebasedBranch(root);
    const racer = join(root, 'racer');
    git(root, 'clone', remote, racer);
    git(racer, 'config', 'user.name', 'Racing Author');
    git(racer, 'config', 'user.email', 'racer@example.invalid');
    git(racer, 'checkout', branch);
    writeFileSync(join(racer, 'racing.txt'), 'remote update\n');
    commit(racer, 'advance feature remotely');
    git(racer, 'push', 'origin', branch);
    const racedSha = git(root, '--git-dir', remote, 'rev-parse', `refs/heads/${branch}`);

    assert.throws(() => pushBranch(local, branch, { allowRewrite: true }), /push failed/);
    assert.equal(git(root, '--git-dir', remote, 'rev-parse', `refs/heads/${branch}`), racedSha);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
