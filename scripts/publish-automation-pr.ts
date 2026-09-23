import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const gitName = 'imokokok';
const gitEmail = '145034722+imokokok@users.noreply.github.com';

const configurations = {
  'npm-release': {
    branchPrefix: 'automation/npm-release',
    commitMessage: 'chore(deps): sync npm releases',
    title: 'chore(deps): sync npm releases',
    body: [
      'Automated npm release synchronization.',
      '',
      'The source update, generated cron bundles, full validation suite, and browser smoke tests passed before this pull request was created.',
    ].join('\n'),
    paths: [
      'package.json',
      'package-lock.json',
      'src/lib/npmPackageVersions.ts',
      '.github/cron-dist',
    ],
  },
  'ml-model': {
    branchPrefix: 'automation/ml-model',
    commitMessage: 'chore(ml): retrain oracle risk model',
    title: 'chore(ml): retrain oracle risk model',
    body: [
      'Automated oracle risk-model promotion.',
      '',
      'The regression gate, generated cron bundles, full validation suite, and browser smoke tests passed before this pull request was created.',
    ].join('\n'),
    paths: ['ml/models/oracle_risk_model.json', '.github/cron-dist'],
  },
} as const;

type PublicationKind = keyof typeof configurations;

function run(command: string, args: string[], capture = false): string {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: process.env,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed with status ${result.status ?? 'unknown'}`
    );
  }
  return capture ? result.stdout.trim() : '';
}

const kind = process.argv[2] as PublicationKind | undefined;
if (!kind || !(kind in configurations)) {
  throw new Error('Usage: publish-automation-pr.ts <npm-release|ml-model>');
}
if (!process.env.GH_TOKEN) throw new Error('GH_TOKEN is required');

const runId = process.env.GITHUB_RUN_ID;
if (!runId || !/^\d+$/.test(runId)) throw new Error('GITHUB_RUN_ID must be numeric');

const repository = process.env.GITHUB_REPOSITORY;
if (!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
  throw new Error('GITHUB_REPOSITORY must be an owner/repository pair');
}

const configuration = configurations[kind];
const branch = `${configuration.branchPrefix}-${runId}`;

run('git', ['config', 'user.name', gitName]);
run('git', ['config', 'user.email', gitEmail]);
run('git', ['switch', '-c', branch]);
run('git', ['add', '--', ...configuration.paths]);

const staged = spawnSync('git', ['diff', '--cached', '--quiet'], { stdio: 'inherit' });
if (staged.error) throw staged.error;
if (staged.status === 0) throw new Error('No verified changes are available to publish');
if (staged.status !== 1) throw new Error('Unable to inspect staged automation changes');

run('git', ['commit', '--no-verify', '-m', configuration.commitMessage]);
const author = run('git', ['show', '-s', '--format=%an <%ae>%n%cn <%ce>', 'HEAD'], true);
const expectedIdentity = `${gitName} <${gitEmail}>\n${gitName} <${gitEmail}>`;
if (author !== expectedIdentity)
  throw new Error('Automation commit identity does not match policy');

run('git', ['push', '--set-upstream', 'origin', branch]);
const pullRequestUrl = run(
  'gh',
  [
    'pr',
    'create',
    '--repo',
    repository,
    '--base',
    'main',
    '--head',
    branch,
    '--title',
    configuration.title,
    '--body',
    configuration.body,
  ],
  true
);

const expectedSha = run('git', ['rev-parse', 'HEAD'], true);
if (!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error('Unable to resolve automation commit');

// Pull requests created with GITHUB_TOKEN do not recursively start workflows,
// so dispatch the required checks explicitly against the immutable branch head.
run('gh', [
  'workflow',
  'run',
  'ci.yml',
  '--repo',
  repository,
  '--ref',
  branch,
  '-f',
  `expected_sha=${expectedSha}`,
]);
run('gh', ['workflow', 'run', 'codeql.yml', '--repo', repository, '--ref', branch]);

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  appendFileSync(summaryPath, `### Verified update ready for review\n\n${pullRequestUrl}\n`);
}
console.log(`Published ${pullRequestUrl} at ${expectedSha}`);
