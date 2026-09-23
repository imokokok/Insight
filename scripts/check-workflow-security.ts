import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main(): Promise<void> {
  const workspace = process.cwd();
  const workflowsRoot = resolve(workspace, '.github/workflows');
  const workflowFiles = (await readdir(workflowsRoot))
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .sort();

  if (workflowFiles.length === 0) throw new Error('No GitHub Actions workflows found');

  const failures: string[] = [];
  const workflows = new Map<string, string>();
  for (const name of workflowFiles) {
    const source = await readFile(resolve(workflowsRoot, name), 'utf8');
    workflows.set(name, source);

    if (source.includes('ubuntu-latest')) {
      failures.push(`${name}: runner image must be explicit, not ubuntu-latest`);
    }
    if (source.includes('pull_request_target')) {
      failures.push(`${name}: pull_request_target is prohibited for untrusted changes`);
    }
    if (/git config user\.(?:name|email)\s+["']?github-actions\[bot\]/.test(source)) {
      failures.push(`${name}: automation commits must preserve the repository owner identity`);
    }
    if (/git push origin (?:HEAD:)?main/.test(source)) {
      failures.push(`${name}: automation must publish a pull request instead of pushing to main`);
    }

    for (const [index, line] of source.split('\n').entries()) {
      const uses = line.match(/^\s*-?\s*uses:\s*([^\s#]+)/)?.[1];
      if (!uses || uses.startsWith('./') || uses.startsWith('docker://')) continue;
      if (!/@[0-9a-f]{40}$/.test(uses)) {
        failures.push(`${name}:${index + 1}: action must be pinned to a 40-character commit SHA`);
      }
    }
  }

  const codeql = workflows.get('codeql.yml');
  if (!codeql?.includes('workflow_dispatch:')) {
    failures.push('codeql.yml: workflow_dispatch is required for automation-created pull requests');
  }

  for (const [name, kind] of [
    ['sync-npm-releases.yml', 'npm-release'],
    ['ml-train-cron.yml', 'ml-model'],
  ] as const) {
    if (!workflows.get(name)?.includes(`npm run publish:automation-pr -- ${kind}`)) {
      failures.push(`${name}: verified updates must use the protected pull-request publisher`);
    }
  }

  const dependabotRepair = workflows.get('dependabot-lock-repair.yml');
  if (
    !dependabotRepair?.includes('scripts/inspect-dependabot-lock-repair.mts') ||
    !dependabotRepair.includes('npm install --ignore-scripts') ||
    !dependabotRepair.includes('npm run build:cron')
  ) {
    failures.push(
      'dependabot-lock-repair.yml: repair must validate the PR, disable package scripts, and rebuild cron bundles'
    );
  }

  if (failures.length > 0) {
    throw new Error(`Workflow security check failed:\n${failures.join('\n')}`);
  }

  console.log(`workflow security OK: ${workflowFiles.length} workflows use immutable dependencies`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
