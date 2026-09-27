import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const manifest: unknown = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
if (!manifest || typeof manifest !== 'object' || !('dependencies' in manifest)) {
  throw new Error('Invalid package manifest');
}
const dependencies = manifest.dependencies;
if (!dependencies || typeof dependencies !== 'object') throw new Error('Invalid dependencies');
const versions = readFileSync(new URL('src/lib/npmPackageVersions.ts', root), 'utf8');
const tracked = [
  ['oracle-insight-guard', 'ORACLE_INSIGHT_GUARD_VERSION'],
  ['verify-insight-receipt', 'VERIFY_INSIGHT_RECEIPT_VERSION'],
] as const;
let changed = false;
for (const [name, constant] of tracked) {
  const response = await fetch(`https://registry.npmjs.org/${name}/latest`, {
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Registry check failed for ${name}: HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== 'object' ||
    !('version' in data) ||
    typeof data.version !== 'string' ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(data.version)
  ) {
    throw new Error(`Invalid registry version for ${name}`);
  }
  const current = versions.match(new RegExp(`export const ${constant} = '([^']+)';`))?.[1];
  if (!current) throw new Error(`Missing tracked version for ${name}`);
  changed ||=
    current !== data.version ||
    (name === 'verify-insight-receipt' &&
      (!('verify-insight-receipt' in dependencies) ||
        dependencies['verify-insight-receipt'] !== data.version));
}
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `needed=${changed}\n`);
process.stdout.write(
  `${fileURLToPath(root)}: npm release update ${changed ? 'needed' : 'not needed'}\n`
);
