#!/usr/bin/env node
// Guard the official MCP Registry `packages[]` declaration before publishing.
//
// `mcp-publisher validate server.json` only checks the JSON schema. The registry
// itself also runs a package-ownership check per
// modelcontextprotocol/registry/internal/validators/registries/npm.go:
//
//   GET https://registry.npmjs.org/<identifier>/<version>
//   require metadata.mcpName === server.json.name
//
// A schema-valid server.json therefore still fails to publish when the pinned
// npm version does not exist, or when that version's package.json has no
// matching `mcpName`. This check reproduces both conditions locally, with
// `--check-npm` adding the live registry lookup used before a release.

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NPM_REGISTRY_URL = 'https://registry.npmjs.org';
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SERVER_NAME = /^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/;

/**
 * Pure, offline parity check between server.json and the launcher package.json.
 * Returns every mismatch rather than throwing on the first one, so a release
 * log shows all the fields that drifted.
 */
export function verifyRegistryMetadata(server, launcher) {
  const failures = [];
  const expect = (condition, message) => {
    if (!condition) failures.push(message);
  };

  expect(server !== null && typeof server === 'object', 'server.json must be an object');
  expect(
    launcher !== null && typeof launcher === 'object',
    'mcp-launcher/package.json must be an object'
  );
  if (failures.length > 0) return { failures };

  const serverName = server.name;
  const serverVersion = server.version;
  expect(
    typeof serverName === 'string' && SERVER_NAME.test(serverName),
    'server.json name must be a reverse-DNS server name (e.g. io.github.imokokok/insight-oracle)'
  );
  expect(
    typeof serverVersion === 'string' && EXACT_VERSION.test(serverVersion),
    `server.json version must be an exact version, got ${String(serverVersion)}`
  );
  expect(
    Array.isArray(server.remotes) && server.remotes.length > 0,
    'keep at least one remote so remote-only MCP clients still resolve this server'
  );

  const packages = server.packages;
  expect(Array.isArray(packages), 'server.json must declare a packages array');
  if (!Array.isArray(packages)) return { failures, serverName, serverVersion };

  const npmPackages = packages.filter((pkg) => pkg && pkg.registryType === 'npm');
  expect(
    npmPackages.length === 1 && packages.length === 1,
    `expected exactly one npm package declaration, got ${packages.length} total / ${npmPackages.length} npm`
  );
  if (npmPackages.length !== 1) return { failures, serverName, serverVersion };

  const pkg = npmPackages[0];
  const packageName = pkg.identifier;
  const packageVersion = pkg.version;

  expect(
    typeof packageName === 'string' && packageName === launcher.name,
    `packages[].identifier must be "${String(launcher.name)}", got ${String(packageName)}`
  );
  expect(
    typeof packageVersion === 'string' && EXACT_VERSION.test(packageVersion),
    `packages[].version must be exact (never "latest" or a range), got ${String(packageVersion)}`
  );
  expect(
    packageVersion === launcher.version,
    `packages[].version (${String(packageVersion)}) must equal mcp-launcher/package.json version (${String(launcher.version)})`
  );
  expect(
    launcher.mcpName === serverName,
    `mcp-launcher/package.json mcpName must be "${String(serverName)}", got ${String(launcher.mcpName)}`
  );
  expect(
    pkg.transport !== null && typeof pkg.transport === 'object' && pkg.transport.type === 'stdio',
    'packages[].transport must be an object with type "stdio"'
  );
  expect(
    pkg.fileSha256 === undefined,
    'packages[].fileSha256 is MCPB-only and is rejected for npm packages'
  );
  expect(
    pkg.registryBaseUrl === undefined || pkg.registryBaseUrl === NPM_REGISTRY_URL,
    `packages[].registryBaseUrl must be omitted or ${NPM_REGISTRY_URL}`
  );

  return { failures, serverName, serverVersion, packageName, packageVersion };
}

/** Reproduce the registry's live npm ownership check for the pinned version. */
export async function verifyPublishedNpmPackage({ packageName, packageVersion, serverName }) {
  const url = `${NPM_REGISTRY_URL}/${encodeURIComponent(packageName)}/${encodeURIComponent(packageVersion)}`;
  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new Error(`npm metadata request failed for ${url}: ${String(error)}`);
  }

  if (response.status === 404) {
    throw new Error(
      `${packageName}@${packageVersion} is not on npm yet. Publish and approve that exact version before publishing server.json`
    );
  }
  if (!response.ok) {
    throw new Error(`npm metadata request for ${url} returned HTTP ${response.status}`);
  }

  const metadata = await response.json();
  if (!metadata.mcpName) {
    throw new Error(
      `${packageName}@${packageVersion} is missing "mcpName" in package.json; the registry requires "mcpName": "${serverName}"`
    );
  }
  if (metadata.mcpName !== serverName) {
    throw new Error(
      `npm ownership validation would fail: expected mcpName "${serverName}", got "${metadata.mcpName}"`
    );
  }
  return { version: metadata.version, mcpName: metadata.mcpName };
}

async function main() {
  const args = process.argv.slice(2);
  const unknown = args.filter((arg) => arg !== '--check-npm');
  if (unknown.length > 0) {
    console.error(
      `Unknown option(s): ${unknown.join(', ')}. Usage: verify-mcp-registry-package.mjs [--check-npm]`
    );
    process.exitCode = 2;
    return;
  }

  const root = fileURLToPath(new URL('..', import.meta.url));
  const [server, launcher] = await Promise.all([
    readFile(resolve(root, 'server.json'), 'utf8').then(JSON.parse),
    readFile(resolve(root, 'mcp-launcher/package.json'), 'utf8').then(JSON.parse),
  ]);

  const result = verifyRegistryMetadata(server, launcher);
  if (result.failures.length > 0) {
    console.error('MCP Registry package declaration is invalid:');
    for (const failure of result.failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
    return;
  }

  let npm = null;
  if (args.includes('--check-npm')) {
    try {
      npm = await verifyPublishedNpmPackage(result);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
      return;
    }
  }

  console.log(
    JSON.stringify(
      {
        status: 'PASS',
        server: `${result.serverName}@${result.serverVersion}`,
        package: `${result.packageName}@${result.packageVersion}`,
        mcpName: launcher.mcpName,
        npm: npm ?? 'not checked (pass --check-npm)',
      },
      null,
      2
    )
  );
}

const isDirectExecution =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
