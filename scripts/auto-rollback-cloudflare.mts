import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const expectedSha = process.env.GITHUB_SHA;
const baseUrl = process.env.ROLLBACK_BASE_URL ?? 'https://www.oracleinsight.xyz';

if (!expectedSha || !/^[0-9a-f]{40}$/i.test(expectedSha)) {
  throw new Error('GITHUB_SHA must contain the full commit SHA before a rollback can run.');
}

const response = await fetch(new URL('/api/health/release', baseUrl), {
  signal: AbortSignal.timeout(10_000),
}).catch(() => null);
const payload: unknown = response?.ok ? await response.json().catch(() => null) : null;
const currentSha =
  typeof payload === 'object' &&
  payload !== null &&
  'releaseSha' in payload &&
  typeof payload.releaseSha === 'string'
    ? payload.releaseSha
    : null;

function setRollbackOutput(value: 'executed' | 'skipped'): void {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath) appendFileSync(outputPath, `rollback=${value}\n`, 'utf8');
}

if (currentSha?.toLowerCase() !== expectedSha.toLowerCase()) {
  console.log(
    `rollback=skipped; production no longer reports the release from this run (expected ${expectedSha}).`
  );
  setRollbackOutput('skipped');
  process.exit(0);
}

execFileSync(
  'node_modules/.bin/wrangler',
  [
    'rollback',
    '--name',
    'insight-web',
    '--message',
    `Automatic rollback after smoke failure for ${expectedSha}`,
    '--yes',
  ],
  { stdio: 'inherit' }
);

setRollbackOutput('executed');
console.log('rollback=executed');
