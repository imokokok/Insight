import { createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const logPath = path.join(repositoryRoot, '.dev-testnet.log');
const log = createWriteStream(logPath, { flags: 'a' });
const childEnvironment: NodeJS.ProcessEnv = { ...process.env, PORT: '3010' };
delete childEnvironment.NODE_OPTIONS;

const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
  cwd: repositoryRoot,
  env: childEnvironment,
  stdio: ['ignore', 'pipe', 'pipe'],
});

child.stdout?.pipe(log);
child.stderr?.pipe(log);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => child.kill(signal));
}

console.log(`Starting the Base Sepolia dev server on port 3010; log: ${logPath}`);

const exitCode = await new Promise<number>((resolve) => {
  child.once('error', (error: Error) => {
    console.error(`Could not start the dev server: ${error.name}`);
    resolve(1);
  });
  child.once('exit', (code) => resolve(code ?? 1));
});

await new Promise<void>((resolve) => log.end(resolve));
process.exitCode = exitCode;
