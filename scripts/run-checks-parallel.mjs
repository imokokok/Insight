#!/usr/bin/env node
// Runs npm scripts in parallel with bounded concurrency and prefixed output.
// Usage: node scripts/run-checks-parallel.mjs <npm-script-name> [...more]
// Concurrency can be tuned with CHECKS_PARALLEL_LIMIT (default: 6).
//
// Checks that read a build artifact declare their producer in package.json's
// `checkPrerequisites` map. The scheduler runs those producers to completion
// before any requested check starts, so bounded parallelism can never race a
// consumer against an unfinished build (the old `sdk/dist/index.js`
// ERR_MODULE_NOT_FOUND).
//
// Scripts are spawned through `npm run` only when they need npm's PATH shims;
// a plain `node`/`npx` command line is executed directly, which skips one npm
// process per check (22 checks would otherwise pay ~22 process startups).

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { EOL } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

import { resolvePrerequisiteOrder } from './lib/check-prerequisites.mjs';

const names = process.argv.slice(2);
if (names.length === 0) {
  console.error('Usage: node scripts/run-checks-parallel.mjs <npm-script-name> [...more]');
  process.exit(1);
}

const packageJson = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8')
);
const scripts = packageJson.scripts;
const prerequisites = packageJson.checkPrerequisites ?? {};

const cpus = os.availableParallelism?.() ?? os.cpus().length;
const limit = Number(process.env.CHECKS_PARALLEL_LIMIT ?? Math.max(2, Math.min(6, cpus - 2)));

const results = new Map();

// `npm run` is only needed for scripts that rely on node_modules/.bin resolution
// or on shell operators; those keep going through npm.
function commandFor(name) {
  const script = scripts[name];
  if (typeof script !== 'string') return ['npm', ['run', '--silent', name]];
  if (/^(node|npx|tsgo|eslint|tsc)\s/.test(script) && !/&&|\|\||;|>|\||\$\(/.test(script)) {
    return ['sh', ['-c', script]];
  }
  return ['npm', ['run', '--silent', name]];
}

function run(name) {
  const [command, args] = commandFor(name);
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: `${join(process.cwd(), 'node_modules', '.bin')}:${process.env.PATH}`,
      },
    });

    const tag = `[${name}] `;
    const pipe = (stream, out) => {
      let buffer = '';
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split(EOL);
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.length > 0) out.write(`${tag}${line}${EOL}`);
        }
      });
      stream.on('end', () => {
        if (buffer.length > 0) out.write(`${tag}${buffer}${EOL}`);
      });
    };
    pipe(child.stdout, process.stdout);
    pipe(child.stderr, process.stderr);

    child.on('close', (code) => {
      const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`${tag}finished in ${seconds}s (exit ${code ?? 1})`);
      results.set(name, code ?? 1);
      resolve();
    });
  });
}

async function runAll(list) {
  const queue = [...list];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    for (;;) {
      const name = queue.shift();
      if (name === undefined) return;
      await run(name);
    }
  });
  await Promise.all(workers);
}

async function main() {
  let prerequisiteOrder;
  try {
    prerequisiteOrder = resolvePrerequisiteOrder(names, prerequisites);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (prerequisiteOrder.length > 0) {
    console.log(`Running prerequisites first: ${prerequisiteOrder.join(', ')}`);
    await runAll(prerequisiteOrder);
    const failedPrerequisites = prerequisiteOrder.filter((name) => results.get(name) !== 0);
    if (failedPrerequisites.length > 0) {
      console.error(`Failed prerequisites: ${failedPrerequisites.join(', ')}`);
      process.exit(1);
    }
  }

  await runAll(names);

  const failures = names.filter((name) => results.get(name) !== 0);
  if (failures.length > 0) {
    console.error(`Failed checks: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log(`All ${names.length} checks passed.`);
}

await main();
