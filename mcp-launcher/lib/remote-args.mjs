// Pure, importable half of the launcher. Kept separate from bin/insight-mcp.mjs
// so the CLI entry never has to guess whether it is the main module: npm links
// bins as symlinks in node_modules/.bin, and Node resolves the main module to
// its realpath while process.argv[1] keeps the symlink path. Any equality
// check between the two silently turns `npx insight-mcp` into a no-op.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const DEFAULT_URL = 'https://www.oracleinsight.xyz/api/mcp';

// Mirrors X402_ACQUISITION_SOURCES in src/lib/api/x402/guard.ts. A label is
// advisory analytics metadata only and never affects pricing or settlement.
export const ENTRY_SOURCES = new Set([
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
export function resolveProxy() {
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
