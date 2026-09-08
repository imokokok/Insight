import activationSetV1Json from '../../../protocol/mainline/activation-sets/v1.json';
import activationPointerJson from '../../../protocol/mainline/activations.json';
import agentPassportJson from '../../../protocol/mainline/policies/agent-passport/v1.json';
import andydgreaJson from '../../../protocol/mainline/policies/andydgrea/v1.json';
import emiliaJson from '../../../protocol/mainline/policies/emilia/v1.json';
import frontierComputeJson from '../../../protocol/mainline/policies/frontier-compute/v1.json';
import headlessJson from '../../../protocol/mainline/policies/headless/v1.json';
import interaiJson from '../../../protocol/mainline/policies/interai/v1.json';
import raulJson from '../../../protocol/mainline/policies/raul/v1.json';
import vaaraJson from '../../../protocol/mainline/policies/vaara/v1.json';
import veritasJson from '../../../protocol/mainline/policies/veritas/v1.json';

import { bodyWithoutId, keccakContentId } from './contentAddress';

export const PARTNER_IDS = [
  'agent-passport',
  'andydgrea',
  'emilia',
  'frontier-compute',
  'headless',
  'interai',
  'raul',
  'vaara',
  'veritas',
] as const;

export type PartnerId = (typeof PARTNER_IDS)[number];
export type PartnerPolicyLifecycle = 'draft' | 'verified' | 'promoted' | 'retired';

export interface PartnerIntegrationPolicy {
  policyId: `0x${string}`;
  kind: 'MainlinePartnerPolicy';
  policyVersion: number;
  partnerId: PartnerId;
  lifecycle: PartnerPolicyLifecycle;
  activation: 'explicit-policy-id';
  surfaces: string[];
  pins: {
    oracleRegistryReleaseIds: `0x${string}`[];
    executionProfileIds: `0x${string}`[];
    executionSchemaVersions: number[];
    externalContracts: string[];
  };
  legacyRule: string;
  productionReachability: 'enabled' | 'disabled';
}

export interface PartnerActivationSet {
  activationSetId: `0x${string}`;
  kind: 'MainlinePartnerActivationSet';
  activationVersion: number;
  rule: string;
  partners: Record<PartnerId, `0x${string}`>;
}

interface PartnerActivationPointer {
  activationSetId: `0x${string}`;
  path: string;
}

const rawPolicies = [
  agentPassportJson,
  andydgreaJson,
  emiliaJson,
  frontierComputeJson,
  headlessJson,
  interaiJson,
  raulJson,
  vaaraJson,
  veritasJson,
] as unknown as PartnerIntegrationPolicy[];

function assertPolicy(policy: PartnerIntegrationPolicy): void {
  if (policy.kind !== 'MainlinePartnerPolicy' || policy.activation !== 'explicit-policy-id') {
    throw new Error(`Invalid mainline partner policy for ${policy.partnerId}`);
  }
  const expected = keccakContentId(bodyWithoutId(policy, 'policyId'));
  if (policy.policyId !== expected) {
    throw new Error(
      `Partner policy ${policy.partnerId} is immutable: expected ${policy.policyId}, computed ${expected}`
    );
  }
}

for (const policy of rawPolicies) assertPolicy(policy);

export const PARTNER_INTEGRATION_POLICIES = Object.freeze(
  Object.fromEntries(
    rawPolicies.map((policy) => [policy.policyId, Object.freeze(policy)])
  ) as Record<`0x${string}`, Readonly<PartnerIntegrationPolicy>>
);

const activationPointer = activationPointerJson as PartnerActivationPointer;
const activationSetV1 = activationSetV1Json as unknown as PartnerActivationSet;

export const PARTNER_ACTIVATION_SETS = Object.freeze({
  [activationSetV1.activationSetId]: Object.freeze(activationSetV1),
});

export const CURRENT_PARTNER_ACTIVATION_SET =
  PARTNER_ACTIVATION_SETS[
    activationPointer.activationSetId as keyof typeof PARTNER_ACTIVATION_SETS
  ];
if (!CURRENT_PARTNER_ACTIVATION_SET) {
  throw new Error(`Unknown current partner activation set ${activationPointer.activationSetId}`);
}

const expectedActivationSetId = keccakContentId(
  bodyWithoutId(CURRENT_PARTNER_ACTIVATION_SET, 'activationSetId')
);
if (CURRENT_PARTNER_ACTIVATION_SET.activationSetId !== expectedActivationSetId) {
  throw new Error(
    `Partner activation set is immutable: expected ${CURRENT_PARTNER_ACTIVATION_SET.activationSetId}, computed ${expectedActivationSetId}`
  );
}

const activationPartnerIds = Object.keys(CURRENT_PARTNER_ACTIVATION_SET.partners).sort();
if (activationPartnerIds.join(',') !== [...PARTNER_IDS].sort().join(',')) {
  throw new Error('Partner activation set must name every mainline integration exactly once');
}

for (const partnerId of PARTNER_IDS) {
  const policyId = CURRENT_PARTNER_ACTIVATION_SET.partners[partnerId];
  const policy = PARTNER_INTEGRATION_POLICIES[policyId];
  if (!policy || policy.partnerId !== partnerId) {
    throw new Error(`Partner activation ${partnerId} does not resolve to its own immutable policy`);
  }
}

export const CURRENT_PARTNER_ACTIVATION_SET_ID = CURRENT_PARTNER_ACTIVATION_SET.activationSetId;

export function partnerActivationSetById(activationSetId: string) {
  return (
    PARTNER_ACTIVATION_SETS[
      activationSetId.toLowerCase() as keyof typeof PARTNER_ACTIVATION_SETS
    ] ?? null
  );
}

export function partnerIntegrationPolicyById(policyId: string) {
  return PARTNER_INTEGRATION_POLICIES[policyId.toLowerCase() as `0x${string}`] ?? null;
}

export function activePartnerIntegrationPolicy(partnerId: PartnerId) {
  return partnerIntegrationPolicyById(CURRENT_PARTNER_ACTIVATION_SET.partners[partnerId]);
}

export interface ExecutionPolicyResult {
  valid: boolean;
  policyId: string;
  partnerId: PartnerId | null;
  reason: string;
}

/** Apply a verifier-selected consumer policy. The policy is not receipt data;
 * it is the relying party's immutable admission contract. */
export function evaluateExecutionPolicy(
  policyId: string,
  schemaVersion: number,
  profileId: string | null
): ExecutionPolicyResult {
  const policy = partnerIntegrationPolicyById(policyId);
  if (!policy) {
    return { valid: false, policyId, partnerId: null, reason: 'unknown_partner_policy' };
  }
  if (!policy.surfaces.includes('execution-receipt')) {
    return {
      valid: false,
      policyId: policy.policyId,
      partnerId: policy.partnerId,
      reason: 'policy_does_not_admit_execution_receipts',
    };
  }
  if (!policy.pins.executionSchemaVersions.includes(schemaVersion)) {
    return {
      valid: false,
      policyId: policy.policyId,
      partnerId: policy.partnerId,
      reason: `schema_not_admitted_by_policy:${schemaVersion}`,
    };
  }
  if (schemaVersion >= 5) {
    if (!profileId || !policy.pins.executionProfileIds.includes(profileId as `0x${string}`)) {
      return {
        valid: false,
        policyId: policy.policyId,
        partnerId: policy.partnerId,
        reason: 'profile_not_admitted_by_policy',
      };
    }
  }
  return {
    valid: true,
    policyId: policy.policyId,
    partnerId: policy.partnerId,
    reason: schemaVersion >= 5 ? 'policy_profile_match' : 'legacy_snapshot_required',
  };
}
