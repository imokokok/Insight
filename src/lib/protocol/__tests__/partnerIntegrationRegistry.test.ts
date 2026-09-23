import { EXECUTION_PROFILE_V1_ID } from '@/lib/attestations/executionProfiles';
import {
  ORACLE_REGISTRY_RELEASE_2026_09_08_1_ID,
  ORACLE_REGISTRY_RELEASE_2026_09_09_1_ID,
  ORACLE_REGISTRY_RELEASE_2026_09_10_1_ID,
  ORACLE_REGISTRY_RELEASE_2026_09_11_1_ID,
} from '@/lib/attestations/oracleRegistryRelease';

import {
  CURRENT_PARTNER_ACTIVATION_SET,
  CURRENT_PARTNER_ACTIVATION_SET_ID,
  PARTNER_IDS,
  activePartnerIntegrationPolicy,
  evaluateActivePartnerExecutionPolicy,
  evaluateExecutionPolicy,
  partnerActivationSetById,
  partnerIntegrationPolicyById,
} from '../partnerIntegrationRegistry';
import {
  evaluateActivePartnerExecutionPolicyForRegistryRelease,
  evaluateExecutionPolicyForRegistryRelease,
} from '../registryReleasePolicy';

const VERITAS_V2_POLICY_ID = '0x162d3fe744acc2041a959daf40dc3fe9242b654aef58acbb991acbf605885085';
const VERITAS_V2_CANDIDATE_ACTIVATION_SET_ID =
  '0xc83feebc5fe8722129a27c015192e6583cd166e0cd149dd6a7d99564474728db';

describe('main-only partner integration isolation', () => {
  it('resolves every partner through an independent immutable policy id', () => {
    expect(Object.keys(CURRENT_PARTNER_ACTIVATION_SET.partners).sort()).toEqual(
      [...PARTNER_IDS].sort()
    );
    expect(partnerActivationSetById(CURRENT_PARTNER_ACTIVATION_SET_ID)).toBe(
      CURRENT_PARTNER_ACTIVATION_SET
    );

    for (const partnerId of PARTNER_IDS) {
      const policyId = CURRENT_PARTNER_ACTIVATION_SET.partners[partnerId];
      expect(partnerIntegrationPolicyById(policyId)?.partnerId).toBe(partnerId);
    }
  });

  it('admits Headless v5 only with the profile its policy pins', () => {
    const policy = activePartnerIntegrationPolicy('headless');
    expect(policy).not.toBeNull();
    expect(policy!.policyVersion).toBe(2);
    expect(policy!.pins.executionSchemaVersions).toEqual([5]);

    expect(evaluateExecutionPolicy(policy!.policyId, 5, EXECUTION_PROFILE_V1_ID)).toEqual(
      expect.objectContaining({
        valid: true,
        partnerId: 'headless',
        reason: 'policy_profile_match',
      })
    );
    expect(evaluateExecutionPolicy(policy!.policyId, 5, `0x${'f'.repeat(64)}`)).toEqual(
      expect.objectContaining({ valid: false, reason: 'profile_not_admitted_by_policy' })
    );
    expect(evaluateExecutionPolicy(policy!.policyId, 4, null)).toEqual(
      expect.objectContaining({ valid: false, reason: 'schema_not_admitted_by_policy:4' })
    );
  });

  it('treats registry release pins as lineage floors and fails closed off lineage', () => {
    const policy = activePartnerIntegrationPolicy('headless')!;

    for (const releaseId of [
      ORACLE_REGISTRY_RELEASE_2026_09_09_1_ID,
      ORACLE_REGISTRY_RELEASE_2026_09_10_1_ID,
      ORACLE_REGISTRY_RELEASE_2026_09_11_1_ID,
    ]) {
      expect(
        evaluateExecutionPolicyForRegistryRelease(
          policy.policyId,
          5,
          EXECUTION_PROFILE_V1_ID,
          releaseId
        )
      ).toEqual(
        expect.objectContaining({
          valid: true,
          registryReleaseId: releaseId,
          registryReleasePinRule: 'lineage-floor-any',
          registryReleaseMatchedFloor: ORACLE_REGISTRY_RELEASE_2026_09_09_1_ID,
        })
      );
    }

    expect(
      evaluateExecutionPolicyForRegistryRelease(
        policy.policyId,
        5,
        EXECUTION_PROFILE_V1_ID,
        ORACLE_REGISTRY_RELEASE_2026_09_08_1_ID
      )
    ).toEqual(
      expect.objectContaining({
        valid: false,
        reason: 'registry_release_not_admitted_by_policy',
      })
    );

    expect(
      evaluateExecutionPolicyForRegistryRelease(
        policy.policyId,
        5,
        EXECUTION_PROFILE_V1_ID,
        `0x${'f'.repeat(64)}`
      )
    ).toEqual(expect.objectContaining({ valid: false, reason: 'unknown_oracle_registry_release' }));
  });

  it('enforces the current release lineage on the active partner path', () => {
    const policy = activePartnerIntegrationPolicy('headless')!;
    expect(
      evaluateActivePartnerExecutionPolicyForRegistryRelease(
        'headless',
        policy.policyId,
        5,
        EXECUTION_PROFILE_V1_ID,
        ORACLE_REGISTRY_RELEASE_2026_09_11_1_ID
      )
    ).toEqual(
      expect.objectContaining({
        valid: true,
        registryReleaseMatchedFloor: ORACLE_REGISTRY_RELEASE_2026_09_09_1_ID,
      })
    );
  });

  it('keeps the prior Headless policy addressable without leaving it active', () => {
    const priorPolicyId = '0xe9b9f708122b25998d55b7176aaac5e150c54651e36bf85ed947a061434819bb';
    const prior = partnerIntegrationPolicyById(priorPolicyId);
    expect(prior).toEqual(expect.objectContaining({ partnerId: 'headless', policyVersion: 1 }));
    expect(CURRENT_PARTNER_ACTIVATION_SET.partners.headless).not.toBe(priorPolicyId);
    expect(evaluateExecutionPolicy(priorPolicyId, 4, null)).toEqual(
      expect.objectContaining({ valid: true, reason: 'legacy_snapshot_required' })
    );
  });

  it('keeps VERITAS on its legacy snapshot instead of implicitly adopting v5', () => {
    const policy = activePartnerIntegrationPolicy('veritas');
    expect(evaluateExecutionPolicy(policy!.policyId, 4, null)).toEqual(
      expect.objectContaining({ valid: true, reason: 'legacy_snapshot_required' })
    );
    expect(evaluateExecutionPolicy(policy!.policyId, 5, EXECUTION_PROFILE_V1_ID)).toEqual(
      expect.objectContaining({ valid: false, reason: 'schema_not_admitted_by_policy:5' })
    );
  });

  it('publishes the VERITAS v5 policy and activation candidate without activating them', () => {
    const activePolicy = activePartnerIntegrationPolicy('veritas')!;
    const candidatePolicy = partnerIntegrationPolicyById(VERITAS_V2_POLICY_ID);
    const candidateSet = partnerActivationSetById(VERITAS_V2_CANDIDATE_ACTIVATION_SET_ID);

    expect(activePolicy).toEqual(
      expect.objectContaining({ policyVersion: 1, productionReachability: 'disabled' })
    );
    expect(candidatePolicy).toEqual(
      expect.objectContaining({
        partnerId: 'veritas',
        policyVersion: 2,
        lifecycle: 'verified',
        productionReachability: 'enabled',
        pins: expect.objectContaining({
          executionSchemaVersions: [5],
          executionProfileIds: [EXECUTION_PROFILE_V1_ID],
          oracleRegistryReleaseIds: [ORACLE_REGISTRY_RELEASE_2026_09_11_1_ID],
        }),
      })
    );
    expect(candidateSet).toEqual(
      expect.objectContaining({
        activationVersion: 3,
        predecessorActivationSetId: CURRENT_PARTNER_ACTIVATION_SET_ID,
        partners: expect.objectContaining({ veritas: VERITAS_V2_POLICY_ID }),
      })
    );
    expect(CURRENT_PARTNER_ACTIVATION_SET_ID).not.toBe(VERITAS_V2_CANDIDATE_ACTIVATION_SET_ID);
    expect(CURRENT_PARTNER_ACTIVATION_SET.partners.veritas).toBe(activePolicy.policyId);

    expect(evaluateExecutionPolicy(VERITAS_V2_POLICY_ID, 5, EXECUTION_PROFILE_V1_ID)).toEqual(
      expect.objectContaining({ valid: true, reason: 'policy_profile_match' })
    );
    expect(evaluateExecutionPolicy(VERITAS_V2_POLICY_ID, 4, null)).toEqual(
      expect.objectContaining({ valid: false, reason: 'schema_not_admitted_by_policy:4' })
    );
    expect(evaluateExecutionPolicy(VERITAS_V2_POLICY_ID, 5, `0x${'f'.repeat(64)}`)).toEqual(
      expect.objectContaining({ valid: false, reason: 'profile_not_admitted_by_policy' })
    );
    expect(
      evaluateExecutionPolicyForRegistryRelease(
        VERITAS_V2_POLICY_ID,
        5,
        EXECUTION_PROFILE_V1_ID,
        ORACLE_REGISTRY_RELEASE_2026_09_11_1_ID
      )
    ).toEqual(
      expect.objectContaining({
        valid: true,
        registryReleaseMatchedFloor: ORACLE_REGISTRY_RELEASE_2026_09_11_1_ID,
      })
    );

    expect(
      evaluateActivePartnerExecutionPolicy(
        'veritas',
        VERITAS_V2_POLICY_ID,
        5,
        EXECUTION_PROFILE_V1_ID
      )
    ).toEqual(expect.objectContaining({ valid: false, reason: 'policy_not_active_for_partner' }));
  });

  it('fails closed for unknown or non-execution policies', () => {
    expect(evaluateExecutionPolicy(`0x${'f'.repeat(64)}`, 5, EXECUTION_PROFILE_V1_ID)).toEqual(
      expect.objectContaining({ valid: false, reason: 'unknown_partner_policy' })
    );

    const emilia = activePartnerIntegrationPolicy('emilia');
    expect(evaluateExecutionPolicy(emilia!.policyId, 5, EXECUTION_PROFILE_V1_ID)).toEqual(
      expect.objectContaining({
        valid: false,
        reason: 'policy_does_not_admit_execution_receipts',
      })
    );
  });

  it('requires the active partner mapping and production reachability at runtime', () => {
    const headless = activePartnerIntegrationPolicy('headless')!;
    const veritas = activePartnerIntegrationPolicy('veritas')!;

    expect(
      evaluateActivePartnerExecutionPolicy(
        'headless',
        headless.policyId,
        5,
        EXECUTION_PROFILE_V1_ID
      )
    ).toEqual(expect.objectContaining({ valid: true, partnerId: 'headless' }));

    expect(
      evaluateActivePartnerExecutionPolicy('headless', veritas.policyId, 4, EXECUTION_PROFILE_V1_ID)
    ).toEqual(expect.objectContaining({ valid: false, reason: 'policy_not_active_for_partner' }));

    expect(evaluateActivePartnerExecutionPolicy('veritas', veritas.policyId, 4, null)).toEqual(
      expect.objectContaining({
        valid: false,
        reason: 'partner_policy_not_production_reachable',
      })
    );

    expect(
      evaluateActivePartnerExecutionPolicy(
        'not-a-partner',
        headless.policyId,
        5,
        EXECUTION_PROFILE_V1_ID
      )
    ).toEqual(expect.objectContaining({ valid: false, reason: 'unknown_partner' }));
  });
});
