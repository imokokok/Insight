// Regression test for the 0.1.0 no-op bug. 0.1.0 compared process.argv[1]
// against import.meta.url; npm installs bins as symlinks in node_modules/.bin,
// so Node resolved the main module to its realpath while argv[1] kept the
// symlink path. The guard was false and `npx insight-mcp` exited 0 in silence.
// These tests execute the real bin through a symlink and through its shebang.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'insight-mcp-bin-'));
  const binDir = path.join(root, 'bin');
  const libDir = path.join(root, 'lib');
  const binLinkDir = path.join(root, 'node_modules', '.bin');
  const remoteDir = path.join(root, 'node_modules', 'mcp-remote');

  for (const dir of [binDir, libDir, binLinkDir, remoteDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.copyFileSync(
    path.join(packageRoot, 'bin', 'insight-mcp.mjs'),
    path.join(binDir, 'insight-mcp.mjs')
  );
  fs.copyFileSync(
    path.join(packageRoot, 'lib', 'remote-args.mjs'),
    path.join(libDir, 'remote-args.mjs')
  );

  // Stub mcp-remote so the test stays offline and asserts the spawned argv.
  fs.writeFileSync(
    path.join(remoteDir, 'package.json'),
    JSON.stringify({
      name: 'mcp-remote',
      version: '0.0.0-test',
      bin: { 'mcp-remote': 'proxy.js' },
    })
  );
  fs.writeFileSync(
    path.join(remoteDir, 'proxy.js'),
    "console.log('PROXY_LAUNCHED ' + JSON.stringify(process.argv.slice(2)));\n"
  );

  fs.symlinkSync(
    path.join('..', '..', 'bin', 'insight-mcp.mjs'),
    path.join(binLinkDir, 'insight-mcp')
  );
  fs.chmodSync(path.join(binDir, 'insight-mcp.mjs'), 0o755);

  return root;
}

function runLauncher(root, executable) {
  return spawnSync(executable, [], {
    encoding: 'utf8',
    timeout: 10_000,
    env: {
      ...process.env,
      INSIGHT_MCP_URL: 'https://example.test/api/mcp',
      INSIGHT_API_KEY: 'ins_test_secret',
    },
  });
}

function assertProxyArgs(result) {
  assert.equal(result.status, 0, `launcher exited ${result.status}: ${result.stderr}`);
  const marker = 'PROXY_LAUNCHED ';
  const line = result.stdout.split('\n').find((entry) => entry.startsWith(marker));
  assert.ok(line, `proxy was never spawned. stdout=${result.stdout} stderr=${result.stderr}`);

  const forwarded = JSON.parse(line.slice(marker.length));
  assert.equal(forwarded[0], 'https://example.test/api/mcp');
  assert.ok(forwarded.includes('x-insight-entry-source:mcp'));
  assert.ok(forwarded.includes('X-API-Key:${INSIGHT_API_KEY}'));
  assert.ok(
    !forwarded.some((arg) => arg.includes('ins_test_secret')),
    'API key must never reach the child argv'
  );
}

for (const [label, executableFor] of [
  ['npm .bin symlink', (root) => path.join(root, 'node_modules', '.bin', 'insight-mcp')],
  ['shebang execution', (root) => path.join(root, 'bin', 'insight-mcp.mjs')],
]) {
  test(`spawns mcp-remote through ${label}`, () => {
    const root = makeFixture();
    try {
      assertProxyArgs(runLauncher(root, executableFor(root)));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
