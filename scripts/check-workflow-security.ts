import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

async function checkNodeVersionAlignment(workspace: string, workflows: Map<string, string>) {
  const failures: string[] = [];
  const nodeVersion = (await readFile(resolve(workspace, '.node-version'), 'utf8')).trim();
  if (!/^v?\d+\.\d+\.\d+$/.test(nodeVersion)) {
    failures.push(`.node-version: expected an exact version such as 22.23.2, got "${nodeVersion}"`);
    return failures;
  }
  const major = nodeVersion.replace(/^v/, '').split('.')[0];

  const packageJson = JSON.parse(
    await readFile(resolve(workspace, 'package.json'), 'utf8')
  ) as { engines?: { node?: unknown } };
  const enginesNode = packageJson.engines?.node;
  if (typeof enginesNode !== 'string' || enginesNode.length === 0) {
    failures.push('package.json: engines.node is required to pin the Vercel runtime');
  } else {
    if (/[<>*]|\|\|/.test(enginesNode)) {
      failures.push(
        `package.json: engines.node "${enginesNode}" must pin one major (for example 22.x), not an open-ended range`
      );
    } else if (enginesNode.match(/\d+/)?.[0] !== major) {
      failures.push(
        `package.json: engines.node "${enginesNode}" must match .node-version major ${major}`
      );
    }
  }

  for (const [name, source] of workflows) {
    let declarations = 0;
    for (const [index, line] of source.split('\n').entries()) {
      const literal = line
        .match(/^\s*node-version:\s*(\S+)/)?.[1]
        ?.replace(/^['"]|['"]$/g, '');
      if (literal) {
        declarations += 1;
        if (literal.includes('${{')) {
          failures.push(
            `${name}:${index + 1}: node-version must be a literal or use node-version-file`
          );
        } else if (literal !== nodeVersion) {
          failures.push(
            `${name}:${index + 1}: node-version ${literal} must match .node-version ${nodeVersion}`
          );
        }
      }
      const versionFile = line
        .match(/^\s*node-version-file:\s*(\S+)/)?.[1]
        ?.replace(/^['"]|['"]$/g, '');
      if (versionFile) {
        declarations += 1;
        if (versionFile !== '.node-version') {
          failures.push(
            `${name}:${index + 1}: node-version-file ${versionFile} must be .node-version`
          );
        }
      }
    }
    const setupNodeSteps = (source.match(/^\s*-?\s*uses:\s*actions\/setup-node@/gm) ?? []).length;
    if (setupNodeSteps > 0 && declarations === 0) {
      failures.push(`${name}: every actions/setup-node step must declare node-version`);
    }
  }

  return failures;
}

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

  failures.push(...(await checkNodeVersionAlignment(workspace, workflows)));

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

  const npmSync = workflows.get('sync-npm-releases.yml');
  if (!npmSync?.includes('gh pr list') || !npmSync.includes('automation/npm-release-')) {
    failures.push('sync-npm-releases.yml: an existing release PR must block duplicates');
  }

  const dependabotRepair = workflows.get('dependabot-lock-repair.yml');
  if (
    !dependabotRepair?.includes('scripts/inspect-dependabot-lock-repair.mts') ||
    !dependabotRepair?.includes('scripts/approve-dependabot-workflow-runs.mts') ||
    !dependabotRepair.includes('npm install --ignore-scripts') ||
    !dependabotRepair.includes('npm run build:cron') ||
    !dependabotRepair.includes('npm run validate:generated') ||
    dependabotRepair.includes('gh workflow run')
  ) {
    failures.push(
      'dependabot-lock-repair.yml: repair must validate the PR, disable package scripts, rebuild cron bundles, and approve native checks'
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
