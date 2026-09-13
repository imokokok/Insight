import { oracleRegistryReleaseById } from '@/lib/attestations/oracleRegistryRelease';

import {
  ORACLE_REGISTRY_RELEASE_PIN_RULE,
  type ExecutionPolicyResult,
  evaluateActivePartnerExecutionPolicy,
  evaluateExecutionPolicy,
  partnerIntegrationPolicyById,
} from './partnerIntegrationRegistry';

function applyRegistryReleaseFloor(
  policyResult: ExecutionPolicyResult,
  registryReleaseId: string
): ExecutionPolicyResult {
  if (!policyResult.valid) return policyResult;

  const policy = partnerIntegrationPolicyById(policyResult.policyId);
  if (!policy) return policyResult;

  const floors = new Set(policy.pins.oracleRegistryReleaseIds.map((id) => id.toLowerCase()));
  let cursor = registryReleaseId.toLowerCase();
  const visited = new Set<string>();

  while (true) {
    if (floors.has(cursor)) {
      return {
        ...policyResult,
        registryReleaseId: registryReleaseId.toLowerCase(),
        registryReleasePinRule: ORACLE_REGISTRY_RELEASE_PIN_RULE,
        registryReleaseMatchedFloor: cursor,
      };
    }

    if (visited.has(cursor)) {
      return {
        ...policyResult,
        valid: false,
        reason: 'registry_release_lineage_cycle',
        registryReleaseId: registryReleaseId.toLowerCase(),
        registryReleasePinRule: ORACLE_REGISTRY_RELEASE_PIN_RULE,
        registryReleaseMatchedFloor: null,
      };
    }
    visited.add(cursor);

    const release = oracleRegistryReleaseById(cursor);
    if (!release) {
      return {
        ...policyResult,
        valid: false,
        reason: 'unknown_oracle_registry_release',
        registryReleaseId: registryReleaseId.toLowerCase(),
        registryReleasePinRule: ORACLE_REGISTRY_RELEASE_PIN_RULE,
        registryReleaseMatchedFloor: null,
      };
    }

    if (!('predecessorReleaseId' in release)) {
      return {
        ...policyResult,
        valid: false,
        reason: 'registry_release_not_admitted_by_policy',
        registryReleaseId: registryReleaseId.toLowerCase(),
        registryReleasePinRule: ORACLE_REGISTRY_RELEASE_PIN_RULE,
        registryReleaseMatchedFloor: null,
      };
    }

    cursor = release.predecessorReleaseId.toLowerCase();
  }
}

export function evaluateExecutionPolicyForRegistryRelease(
  policyId: string,
  schemaVersion: number,
  profileId: string | null,
  registryReleaseId: string
): ExecutionPolicyResult {
  return applyRegistryReleaseFloor(
    evaluateExecutionPolicy(policyId, schemaVersion, profileId),
    registryReleaseId
  );
}

export function evaluateActivePartnerExecutionPolicyForRegistryRelease(
  partnerId: string,
  policyId: string,
  schemaVersion: number,
  profileId: string | null,
  registryReleaseId: string
): ExecutionPolicyResult {
  return applyRegistryReleaseFloor(
    evaluateActivePartnerExecutionPolicy(partnerId, policyId, schemaVersion, profileId),
    registryReleaseId
  );
}
