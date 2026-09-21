/* eslint-disable no-console */
/**
 * Build dependency-free Node.js bundles for scheduled GitHub workflows.
 *
 * High-frequency workflows used to run `npm ci` on every invocation. The
 * install normally cost ~40 seconds and occasionally stalled for seven
 * minutes. These checked-in bundles share common chunks and run immediately
 * after checkout, while the TypeScript sources remain the source of truth.
 */
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { build } from 'esbuild';

const committedOutdir = '.github/cron-dist';
const check = process.argv.includes('--check');
const outdir = check ? await mkdtemp(join(tmpdir(), 'insight-cron-bundles-')) : committedOutdir;

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

if (!check) await rm(outdir, { recursive: true, force: true });

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

if (check) {
  async function files(root, directory = root) {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? files(root, path) : [relative(root, path)];
      })
    );
    return nested.flat().sort();
  }

  try {
    const generated = await files(outdir);
    const committed = await files(committedOutdir);
    const missing = generated.filter((path) => !committed.includes(path));
    const obsolete = committed.filter((path) => !generated.includes(path));
    const changed = [];
    for (const path of generated.filter((entry) => committed.includes(entry))) {
      const [actual, expected] = await Promise.all([
        readFile(join(outdir, path)),
        readFile(join(committedOutdir, path)),
      ]);
      if (!actual.equals(expected)) changed.push(path);
    }
    if (missing.length || obsolete.length || changed.length) {
      throw new Error(
        `Committed cron bundles are stale. Run npm run build:cron.\n` +
          [
            ...missing.map((path) => `missing: ${path}`),
            ...obsolete.map((path) => `obsolete: ${path}`),
            ...changed.map((path) => `changed: ${path}`),
          ].join('\n')
      );
    }
    console.log('[build-cron-bundles] committed bundles match source');
  } finally {
    await rm(outdir, { recursive: true, force: true });
  }
}
