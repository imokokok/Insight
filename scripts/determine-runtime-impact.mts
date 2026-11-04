import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const NON_RUNTIME_PATHS = new Set([
  'AGENTS.md',
  'CODEOWNERS',
  'LICENSE',
  'README.md',
  '.editorconfig',
  '.gitignore',
]);
const SHA = /^[0-9a-f]{40}$/;

function isNonRuntimePath(path: string) {
  return path.startsWith('.github/') || path.startsWith('docs/') || NON_RUNTIME_PATHS.has(path);
}

export function requiresRuntimeBuild(changedPaths: readonly string[]) {
  // An empty diff is unexpected for a dispatched run. Fail closed so a
  // comparison failure can never silently suppress verification or release.
  return changedPaths.length === 0 || changedPaths.some((path) => !isNonRuntimePath(path));
}

export function changedPathsSince(baseSha: string, headSha: string) {
  if (!SHA.test(baseSha) || !SHA.test(headSha)) {
    throw new Error('Runtime-impact comparison requires full Git commit SHAs');
  }
  return execFileSync('git', ['diff', '--name-only', '-z', baseSha, headSha], {
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean);
}

function writeOutput(runtime: boolean) {
  const value = `runtime=${runtime}\n`;
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, value);
  console.log(`Runtime build required: ${runtime}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const baseSha = process.env.CHANGE_BASE_SHA;
  const headSha = process.env.GITHUB_SHA;
  if (!baseSha || !headSha || !SHA.test(baseSha) || !SHA.test(headSha)) {
    writeOutput(true);
  } else {
    writeOutput(requiresRuntimeBuild(changedPathsSince(baseSha, headSha)));
  }
}
