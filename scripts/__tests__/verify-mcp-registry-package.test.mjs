#!/usr/bin/env node
// Offline tests for the MCP Registry packages[] guard. Run with:
//   node --test scripts/__tests__/verify-mcp-registry-package.test.mjs

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  verifyPublishedNpmPackage,
  verifyRegistryMetadata,
} from '../verify-mcp-registry-package.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));

const SERVER = {
  name: 'io.github.imokokok/insight-oracle',
  version: '0.3.1',
  remotes: [{ type: 'streamable-http', url: 'https://www.oracleinsight.xyz/api/mcp' }],
  packages: [
    {
      registryType: 'npm',
      identifier: 'oracle-insight-mcp',
      version: '0.1.2',
      transport: { type: 'stdio' },
    },
  ],
};

const LAUNCHER = {
  name: 'oracle-insight-mcp',
  version: '0.1.2',
  mcpName: 'io.github.imokokok/insight-oracle',
};

const clone = (value) => JSON.parse(JSON.stringify(value));

function expectFailure(server, launcher, fragment) {
  const { failures } = verifyRegistryMetadata(server, launcher);
  assert.ok(
    failures.some((failure) => failure.includes(fragment)),
    `expected a failure containing "${fragment}", got ${JSON.stringify(failures)}`
  );
}

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('verifyRegistryMetadata', () => {
  it('accepts the repository server.json and launcher package.json', async () => {
    const [server, launcher] = await Promise.all([
      readFile(resolve(root, 'server.json'), 'utf8').then(JSON.parse),
      readFile(resolve(root, 'mcp-launcher/package.json'), 'utf8').then(JSON.parse),
    ]);
    const result = verifyRegistryMetadata(server, launcher);
    assert.deepEqual(result.failures, []);
    assert.equal(result.packageName, 'oracle-insight-mcp');
    assert.equal(result.packageVersion, launcher.version);
  });

  it('rejects a launcher without mcpName (the actual 0.1.1 publish blocker)', () => {
    const launcher = clone(LAUNCHER);
    delete launcher.mcpName;
    expectFailure(clone(SERVER), launcher, 'mcpName must be');
  });

  it('rejects an mcpName that does not equal the server name', () => {
    const launcher = clone(LAUNCHER);
    launcher.mcpName = 'io.github.someone-else/insight-oracle';
    expectFailure(clone(SERVER), launcher, 'mcpName must be');
  });

  it('rejects a pinned version that drifted from the launcher version', () => {
    const server = clone(SERVER);
    server.packages[0].version = '0.1.1';
    expectFailure(server, clone(LAUNCHER), 'must equal mcp-launcher');
  });

  it('rejects "latest" and semver ranges', () => {
    for (const version of ['latest', '^0.1.2', '0.1.x']) {
      const server = clone(SERVER);
      server.packages[0].version = version;
      expectFailure(server, clone(LAUNCHER), 'must be exact');
    }
  });

  it('rejects a bare transport string and MCPB-only fileSha256', () => {
    const bare = clone(SERVER);
    bare.packages[0].transport = 'stdio';
    expectFailure(bare, clone(LAUNCHER), 'transport must be an object');

    const mcpb = clone(SERVER);
    mcpb.packages[0].fileSha256 = 'a'.repeat(64);
    expectFailure(mcpb, clone(LAUNCHER), 'fileSha256');
  });

  it('rejects a foreign registryBaseUrl and a missing remotes block', () => {
    const foreign = clone(SERVER);
    foreign.packages[0].registryBaseUrl = 'https://registry.example.com';
    expectFailure(foreign, clone(LAUNCHER), 'registryBaseUrl');

    const remoteOnly = clone(SERVER);
    delete remoteOnly.remotes;
    expectFailure(remoteOnly, clone(LAUNCHER), 'at least one remote');
  });

  it('rejects an identifier that does not match the published package name', () => {
    const server = clone(SERVER);
    server.packages[0].identifier = 'some-other-launcher';
    expectFailure(server, clone(LAUNCHER), 'identifier must be');
  });
});

describe('verifyPublishedNpmPackage (live npm ownership check)', () => {
  const args = {
    packageName: 'oracle-insight-mcp',
    packageVersion: '0.1.2',
    serverName: 'io.github.imokokok/insight-oracle',
  };

  it('returns the published metadata when mcpName matches', async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ version: '0.1.2', mcpName: 'io.github.imokokok/insight-oracle' }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    assert.deepEqual(await verifyPublishedNpmPackage(args), {
      version: '0.1.2',
      mcpName: 'io.github.imokokok/insight-oracle',
    });
  });

  it('gives an actionable error when the pinned version is not on npm', async () => {
    globalThis.fetch = async () => new Response('{}', { status: 404 });
    await assert.rejects(verifyPublishedNpmPackage(args), /is not on npm yet/);
  });

  it('reproduces the registry error for a published package without mcpName', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ version: '0.1.2' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    await assert.rejects(verifyPublishedNpmPackage(args), /missing "mcpName"/);
  });

  it('reproduces the registry error for a mismatched mcpName', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ version: '0.1.2', mcpName: 'io.github.other/server' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    await assert.rejects(verifyPublishedNpmPackage(args), /ownership validation would fail/);
  });
});
