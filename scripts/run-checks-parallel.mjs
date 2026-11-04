#!/usr/bin/env node
// Runs npm scripts in parallel with bounded concurrency and prefixed output.
// Usage: node scripts/run-checks-parallel.mjs <npm-script-name> [...more]
// Concurrency can be tuned with CHECKS_PARALLEL_LIMIT (default: 6).

import { spawn } from 'node:child_process';
import { EOL } from 'node:os';
import os from 'node:os';

const names = process.argv.slice(2);
if (names.length === 0) {
  console.error('Usage: node scripts/run-checks-parallel.mjs <npm-script-name> [...more]');
  process.exit(1);
}

const cpus = os.availableParallelism?.() ?? os.cpus().length;
const limit = Number(process.env.CHECKS_PARALLEL_LIMIT ?? Math.max(2, Math.min(6, cpus - 2)));

const results = new Map();

function run(name) {
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', '--silent', name], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
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
      results.set(name, code ?? 1);
      resolve();
    });
  });
}

async function main() {
  const queue = [...names];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    for (;;) {
      const name = queue.shift();
      if (name === undefined) return;
      await run(name);
    }
  });
  await Promise.all(workers);

  const failures = names.filter((name) => results.get(name) !== 0);
  if (failures.length > 0) {
    console.error(`Failed checks: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log(`All ${names.length} checks passed.`);
}

await main();
