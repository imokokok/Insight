#!/usr/bin/env node
// Thin launcher for the hosted Insight MCP server. It keeps the endpoint URL
// and the bounded attribution label out of every agent config while delegating
// the stdio <-> streamable-HTTP bridge to the published mcp-remote package.
// It has no Insight source dependency and never handles a private key.

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

const DEFAULT_URL = 'https://www.oracleinsight.xyz/api/mcp';

// Mirrors X402_ACQUISITION_SOURCES in src/lib/api/x402/guard.ts. A label is
// advisory analytics metadata only and never affects pricing or settlement.
const ENTRY_SOURCES = new Set([
  'direct',
  'docs',
  'bazaar',
  'mcp',
  'sdk',
  'skill',
  'wallet_mcp',
  'sendaifun',
  'solana_directory',
  'unknown',
]);

/** Build the mcp-remote argument list. Exported for the offline unit tests. */
export function buildRemoteArgs(env = process.env, extraArgs = []) {
  const url = env.INSIGHT_MCP_URL?.trim() || DEFAULT_URL;
  const requested = env.INSIGHT_ENTRY_SOURCE?.trim().toLowerCase();
  const source = requested && ENTRY_SOURCES.has(requested) ? requested : 'mcp';
  const args = [url, '--header', `x-insight-entry-source:${source}`];

  // Let mcp-remote expand the key from the child environment so it never
  // appears in the process argument list.
  if (env.INSIGHT_API_KEY) {
    args.push('--header', 'X-API-Key:${INSIGHT_API_KEY}');
  }
  return [...args, ...extraArgs];
}

/** Resolve the installed mcp-remote proxy entry without assuming its layout. */
function resolveProxy() {
  try {
    const pkg = require('mcp-remote/package.json');
    const entry = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.['mcp-remote'];
    if (entry) {
      return require.resolve(`mcp-remote/${entry.replaceAll('\\', '/')}`);
    }
  } catch {
    // Older or repackaged builds may not expose package.json; use the known bin.
  }
  return require.resolve('mcp-remote/dist/proxy.js');
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const args = buildRemoteArgs(process.env, process.argv.slice(2));
  const child = spawn(process.execPath, [resolveProxy(), ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 1);
    }
  });
  child.on('error', (error) => {
    console.error(`[insight-mcp] failed to start mcp-remote: ${error.message}`);
    process.exit(1);
  });
}
