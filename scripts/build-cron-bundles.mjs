/* eslint-disable no-console */
/**
 * Build dependency-free Node.js bundles for scheduled GitHub workflows.
 *
 * High-frequency workflows used to run `npm ci` on every invocation. The
 * install normally cost ~40 seconds and occasionally stalled for seven
 * minutes. These checked-in bundles share common chunks and run immediately
 * after checkout, while the TypeScript sources remain the source of truth.
 */
import { rm } from 'node:fs/promises';

import { build } from 'esbuild';

const outdir = '.github/cron-dist';

const entryPoints = {
  'backfill-market-reference': 'scripts/backfill-market-reference.ts',
  billing: 'scripts/billing.ts',
  'collect-market-reference': 'scripts/collect-market-reference.ts',
  'collect-oracle-watch': 'scripts/collect-oracle-watch.ts',
  'collect-snapshot': 'scripts/collect-snapshot.ts',
  'daily-report-publish': 'scripts/daily-report-publish.ts',
  'feed-cadence': 'scripts/feed-cadence.ts',
  'protocol-metrics': 'scripts/protocol-metrics.ts',
  reputation: 'scripts/reputation.ts',
  'safety-outcome': 'scripts/safety-outcome.ts',
  'sync-feeds': 'scripts/sync-feeds.ts',
};

const esmCompatibilityBanner = [
  "import { createRequire as __createRequire } from 'node:module';",
  "import { fileURLToPath as __fileURLToPath } from 'node:url';",
  "import { dirname as __pathDirname } from 'node:path';",
  'const require = __createRequire(import.meta.url);',
  'const __filename = __fileURLToPath(import.meta.url);',
  'const __dirname = __pathDirname(__filename);',
].join(' ');

await rm(outdir, { recursive: true, force: true });

const result = await build({
  entryPoints,
  outdir,
  bundle: true,
  splitting: true,
  platform: 'node',
  format: 'esm',
  // GitHub-hosted Ubuntu runners currently expose Node 20 to shell steps.
  target: 'node20',
  tsconfig: 'tsconfig.json',
  entryNames: '[name]',
  chunkNames: 'chunks/[name]-[hash]',
  outExtension: { '.js': '.mjs' },
  banner: { js: esmCompatibilityBanner },
  minifySyntax: true,
  minifyWhitespace: true,
  // Keep identifiers readable so production stack traces remain useful.
  minifyIdentifiers: false,
  legalComments: 'eof',
  metafile: true,
  logLevel: 'warning',
});

const totalBytes = Object.values(result.metafile.outputs).reduce(
  (total, output) => total + output.bytes,
  0
);
console.log(
  `[build-cron-bundles] ${Object.keys(entryPoints).length} entries, ${(
    totalBytes /
    1024 /
    1024
  ).toFixed(1)} MiB total`
);
