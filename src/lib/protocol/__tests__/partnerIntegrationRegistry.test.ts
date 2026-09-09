import { EXECUTION_PROFILE_V1_ID } from '@/lib/attestations/executionProfiles';

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
