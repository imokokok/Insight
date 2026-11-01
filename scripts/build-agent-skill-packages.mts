import { access, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const run = promisify(execFile);
const root = process.cwd();
const check = process.argv.includes('--check');
const packages = [
  {
    directory: 'skills/insight-pre-trade-safety',
    archive: 'insight-pre-trade-safety-skill-v0.2.0.zip',
  },
  { directory: 'skills/insight-lending-guard', archive: 'insight-lending-guard-skill-v0.1.0.zip' },
  {
    directory: 'skills/insight-base-agent-swap-guard',
    archive: 'insight-base-agent-swap-guard-skill-v0.1.0.zip',
  },
] as const;
const destination = path.join(root, 'public', 'downloads');

for (const entry of packages) {
  await access(path.join(root, entry.directory));
  const output = path.join(destination, entry.archive);
  if (check) {
    await access(output);
    const listed = await run('/usr/bin/unzip', ['-Z1', output]);
    const files = listed.stdout.split('\n').filter(Boolean);
    if (
      !files.includes(`${entry.directory}/SKILL.md`) ||
      !files.includes(`${entry.directory}/README.md`) ||
      !files.includes(`${entry.directory}/mcp.json`)
    ) {
      throw new Error(`${entry.archive} is missing a required skill file`);
    }
    continue;
  }
  await mkdir(destination, { recursive: true });
  await rm(output, { force: true });
  await run('/usr/bin/zip', ['-r', '-X', output, entry.directory], { cwd: root });
  process.stdout.write(`built ${path.relative(root, output)}\n`);
}
