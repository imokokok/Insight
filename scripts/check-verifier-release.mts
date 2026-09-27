import { mkdtemp, readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const browser = process.argv.includes('--browser');
if (process.argv.slice(2).some((a) => a !== '--browser'))
  throw new Error('Usage: npm run verifier:release:check [-- --browser]');
const artifacts = join(root, '.local/verifier-release');
await mkdir(artifacts, { recursive: true });
execFileSync('npm', ['run', 'build', '--prefix', 'verifier'], { cwd: root, stdio: 'inherit' });
const packed = JSON.parse(
  execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', artifacts], {
    cwd: join(root, 'verifier'),
    encoding: 'utf8',
  })
)[0] as { filename: string; integrity: string; files: { path: string }[] };
assert.ok(packed.files.some((f) => f.path === 'dist/offline.mjs'));
assert.ok(packed.files.every((f) => !f.path.startsWith('src/') && !f.path.includes('.env')));
const tarball = join(artifacts, packed.filename),
  consumer = await mkdtemp(join(tmpdir(), 'insight-verifier-consumer-'));
try {
  await writeFile(
    join(consumer, 'package.json'),
    JSON.stringify({ private: true, type: 'module' })
  );
  execFileSync(
    'npm',
    ['install', '--prefer-offline', '--ignore-scripts', '--no-audit', '--no-fund', tarball],
    { cwd: consumer, stdio: 'inherit' }
  );
  await build({
    entryPoints: [join(root, 'scripts/lib/verifier-package-conformance.mts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    packages: 'external',
    outfile: join(consumer, 'conformance.mjs'),
  });
  const validated = JSON.parse(
    execFileSync(process.execPath, [join(consumer, 'conformance.mjs')], {
      cwd: consumer,
      encoding: 'utf8',
    })
  );
  const { browserFixture, ...checks } = validated;
  if (browser) {
    const { chromium } = await import('@playwright/test');
    const bundled = await build({
      stdin: {
        contents:
          "import {verifyExecutionPair,parsePinnedKeyRegistry} from 'verify-insight-receipt';globalThis.checkVerifier=async (x)=>{const bytes=new TextEncoder().encode(JSON.stringify(x.registry,null,2)+'\\n');const pinned=parsePinnedKeyRegistry(bytes,x.pin);return verifyExecutionPair(x.source,x.execution,null,{keyRegistry:pinned.registry});};",
        resolveDir: consumer,
      },
      bundle: true,
      platform: 'browser',
      format: 'iife',
      write: false,
    });
    const instance = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
    try {
      const page = await instance.newPage();
      await page.route('**/*', (route) => route.abort());
      await page.addScriptTag({
        content:
          'globalThis.fetch=()=>{throw new Error("Network forbidden in offline verifier");};' +
          bundled.outputFiles[0].text,
      });
      const result = await page.evaluate(
        async (x) =>
          (
            globalThis as unknown as {
              checkVerifier: (input: unknown) => Promise<{ pairedValid: boolean }>;
            }
          ).checkVerifier(x),
        browserFixture
      );
      assert.equal(result.pairedValid, true);
      checks.checks.browser = true;
    } finally {
      await instance.close();
    }
  }
  const file = await readFile(tarball);
  const lockBytes = await readFile(join(consumer, 'package-lock.json'));
  const lock = JSON.parse(lockBytes.toString('utf8'));
  assert.equal(typeof lock.packages?.['node_modules/viem']?.version, 'string');
  const manifest = {
    schema: 'insight.verifier-release-check.v1',
    package: 'verify-insight-receipt',
    version: checks.version,
    checkedAt: new Date().toISOString(),
    tarball: packed.filename,
    sha256: createHash('sha256').update(file).digest('hex'),
    byteLength: file.length,
    integrity: packed.integrity,
    testedDependencies: { viem: lock.packages['node_modules/viem'].version },
    consumerLockSha256: createHash('sha256').update(lockBytes).digest('hex'),
    scope: 'PACKED_SYNTHETIC_CONFORMANCE_NOT_PRODUCTION_ISSUER_EVIDENCE',
    ...checks.checks,
  };
  await writeFile(join(artifacts, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  for (const name of await readdir(consumer))
    if (['registry.json', 'source.json', 'execution.json'].includes(name))
      await writeFile(join(artifacts, name), await readFile(join(consumer, name)));
  process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
} finally {
  await rm(consumer, { recursive: true, force: true });
}
