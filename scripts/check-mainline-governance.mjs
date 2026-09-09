import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { keccak256, toBytes } from 'viem';

const workspace = resolve(import.meta.dirname, '..');
const policyRoot = join(workspace, 'protocol/mainline/policies');
const activationPath = join(workspace, 'protocol/mainline/activations.json');
const currentPromotionPath = join(workspace, 'protocol/mainline/current-promotion.json');
const ciWorkflowPath = join(workspace, '.github/workflows/ci.yml');
const workflowsRoot = join(workspace, '.github/workflows');
const vercelConfigPath = join(workspace, 'vercel.json');

function canonicalJson(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalJson(entryValue)}`)
      .join(',')}}`;
  }
  throw new Error('Value is not JSON-canonicalizable');
}

function withoutId(value, idKey) {
  const copy = { ...value };
  delete copy[idKey];
  return copy;
}

function contentId(value) {
  return keccak256(toBytes(canonicalJson(value)));
}

function json(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const vercelConfig = json(vercelConfigPath);
if (vercelConfig.git?.deploymentEnabled !== false) {
  throw new Error('vercel.json must disable Git auto-deployment; CI owns production release');
}

const ciWorkflow = readFileSync(ciWorkflowPath, 'utf8');
const requiredDeploymentGateFragments = [
  'deploy-production:',
  "github.ref == 'refs/heads/main'",
  "github.event_name == 'push' || github.event_name == 'workflow_dispatch'",
  'needs: [validate, smoke]',
  'VERCEL_DEPLOY_HOOK_URL: ${{ secrets.VERCEL_DEPLOY_HOOK_URL }}',
];
for (const fragment of requiredDeploymentGateFragments) {
  if (!ciWorkflow.includes(fragment)) {
    throw new Error(`CI production deployment gate is missing: ${fragment}`);
  }
}

for (const workflowFile of readdirSync(workflowsRoot)) {
  if (!workflowFile.match(/\.ya?ml$/) || workflowFile === 'ci.yml') continue;
  const workflow = readFileSync(join(workflowsRoot, workflowFile), 'utf8');
  if (workflow.includes('VERCEL_DEPLOY_HOOK_URL')) {
    throw new Error(
      `${workflowFile} must not access VERCEL_DEPLOY_HOOK_URL; only the gated CI deploy job may deploy production`
    );
  }
}

function policyFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((partner) => {
    if (!partner.isDirectory()) return [];
    return readdirSync(join(root, partner.name), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => join(root, partner.name, entry.name));
  });
}

const policies = new Map();
const calculatedPolicyIds = new Map();
const policyVersions = new Set();
for (const path of policyFiles(policyRoot)) {
  const policy = json(path);
  const expected = contentId(withoutId(policy, 'policyId'));
  calculatedPolicyIds.set(`${policy.partnerId}@${policy.policyVersion}`, expected);
  if (!process.argv.includes('--calculate') && policy.policyId !== expected) {
    throw new Error(`${relative(workspace, path)} policyId must be ${expected}`);
  }
  if (!process.argv.includes('--calculate') && policies.has(policy.policyId)) {
    throw new Error(`Duplicate policyId ${policy.policyId}`);
  }
  const versionKey = `${policy.partnerId}@${policy.policyVersion}`;
  if (!process.argv.includes('--calculate') && policyVersions.has(versionKey)) {
    throw new Error(`Partner policy version ${versionKey} is duplicated`);
  }
  policyVersions.add(versionKey);
  policies.set(process.argv.includes('--calculate') ? expected : policy.policyId, policy);
}

const activationPointer = json(activationPath);
const activationSetPath = join(workspace, activationPointer.path);
const activations = json(activationSetPath);
const expectedActivationId = contentId(withoutId(activations, 'activationSetId'));
if (!process.argv.includes('--calculate') && activations.activationSetId !== expectedActivationId) {
  throw new Error(`activations.json activationSetId must be ${expectedActivationId}`);
}
if (
  !process.argv.includes('--calculate') &&
  activationPointer.activationSetId !== activations.activationSetId
) {
  throw new Error('activations.json must point to the immutable current activation set');
}
for (const [partnerId, policyId] of Object.entries(activations.partners)) {
  if (process.argv.includes('--calculate')) continue;
  const policy = policies.get(policyId);
  if (!policy || policy.partnerId !== partnerId) {
    throw new Error(`Activation ${partnerId} must resolve to its own immutable policy`);
  }
}
if (!process.argv.includes('--calculate')) {
  for (const partnerId of Object.keys(activations.partners)) {
    if (![...policies.values()].some((policy) => policy.partnerId === partnerId)) {
      throw new Error(`Partner ${partnerId} has no immutable policy`);
    }
  }
}

const currentPromotionPointer = json(currentPromotionPath);
const currentPromotionFile = join(workspace, currentPromotionPointer.path);
const currentPromotion = json(currentPromotionFile);
const expectedPromotionId = contentId(withoutId(currentPromotion, 'promotionId'));
if (!process.argv.includes('--calculate') && currentPromotion.promotionId !== expectedPromotionId) {
  throw new Error(`${currentPromotionPointer.path} promotionId must be ${expectedPromotionId}`);
}
if (
  !process.argv.includes('--calculate') &&
  currentPromotionPointer.promotionId !== currentPromotion.promotionId
) {
  throw new Error('current-promotion.json must point to the immutable current promotion');
}
if (
  !process.argv.includes('--calculate') &&
  currentPromotion.activationSetId !== activations.activationSetId
) {
  throw new Error('The current promotion must name the current partner activation set');
}
const currentMatrixPartners = currentPromotion.compatibilityMatrix?.map((entry) => entry.partnerId);
if (
  !process.argv.includes('--calculate') &&
  (new Set(currentMatrixPartners).size !== Object.keys(activations.partners).length ||
    currentMatrixPartners?.length !== Object.keys(activations.partners).length)
) {
  throw new Error('The current promotion must contain each active partner exactly once');
}

const printIds = process.argv.includes('--print-ids') || process.argv.includes('--calculate');
if (printIds) {
  process.stdout.write(
    `${JSON.stringify(
      {
        policies: Object.fromEntries(calculatedPolicyIds),
        activationSetId: expectedActivationId,
        promotionId: expectedPromotionId,
      },
      null,
      2
    )}\n`
  );
}

const baseFlag = process.argv.indexOf('--base');
const base = baseFlag >= 0 ? process.argv[baseFlag + 1] : process.env.PROTOCOL_GOVERNANCE_BASE;
if (base && !/^0+$/.test(base)) {
  const diff = execFileSync('git', ['diff', '--name-status', `${base}...HEAD`], {
    cwd: workspace,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, ...paths] = line.split('\t');
      return { status, path: paths.at(-1) };
    });

  const immutableObjectMutation = diff.find(
    (entry) =>
      (entry.path?.startsWith('protocol/mainline/policies/') ||
        entry.path?.startsWith('protocol/mainline/activation-sets/') ||
        entry.path?.startsWith('protocol/mainline/promotions/')) &&
      entry.path.endsWith('.json') &&
      entry.status !== 'A'
  );
  if (immutableObjectMutation) {
    throw new Error(
      `Immutable object ${immutableObjectMutation.path} was modified or deleted; append a new version instead`
    );
  }

  const sharedPrefixes = [
    'src/lib/attestations/execution',
    'src/lib/attestations/oracleSafety',
    'src/lib/attestations/oracleRegistryRelease.ts',
    'src/lib/attestations/keyRegistryConfig.ts',
    'src/lib/envelope/preTradeEnvelope.ts',
    'src/lib/protocol/',
    'src/app/.well-known/oracle-',
    'src/app/api/v1/execution/attestation/',
    'src/app/api/v1/safety/attestation/',
    'verifier/src/',
    'sdk/src/index.ts',
  ];
  const sharedChanged = diff.some((entry) =>
    sharedPrefixes.some((prefix) => entry.path?.startsWith(prefix))
  );
  const activationChanged = diff.some(
    (entry) => entry.path === 'protocol/mainline/activations.json'
  );

  if (sharedChanged || activationChanged) {
    const promotionAdds = diff.filter(
      (entry) =>
        entry.status === 'A' &&
        entry.path?.startsWith('protocol/mainline/promotions/') &&
        entry.path.endsWith('.json')
    );
    const currentChanged = diff.some(
      (entry) => entry.path === 'protocol/mainline/current-promotion.json'
    );
    if (!currentChanged || promotionAdds.length !== 1) {
      throw new Error(
        'Shared protocol or activation changes require one new immutable promotion and an updated current-promotion.json pointer'
      );
    }
    const current = json(currentPromotionPath);
    const promotion = json(join(workspace, promotionAdds[0].path));
    if (current.promotionId !== promotion.promotionId) {
      throw new Error('current-promotion.json must point at the newly added promotion');
    }
    const expectedPromotionId = contentId(withoutId(promotion, 'promotionId'));
    if (promotion.promotionId !== expectedPromotionId) {
      throw new Error(`Promotion id must be ${expectedPromotionId}`);
    }
    if (promotion.activationSetId !== activations.activationSetId) {
      throw new Error('Promotion must name the activation set checked in with the change');
    }
    const matrixEntries = promotion.compatibilityMatrix ?? [];
    const matrixPartners = new Set(matrixEntries.map((entry) => entry.partnerId));
    if (matrixPartners.size !== matrixEntries.length) {
      throw new Error('Promotion compatibility matrix contains a duplicate partner');
    }
    for (const partnerId of Object.keys(activations.partners)) {
      if (!matrixPartners.has(partnerId)) {
        throw new Error(`Promotion compatibility matrix is missing ${partnerId}`);
      }
    }
    if (matrixEntries.length !== Object.keys(activations.partners).length) {
      throw new Error('Promotion compatibility matrix may not contain unknown partners');
    }
  }
}

process.stdout.write(
  `mainline governance OK: ${policies.size} immutable partner policies, activation ${activations.activationSetId}\n`
);
