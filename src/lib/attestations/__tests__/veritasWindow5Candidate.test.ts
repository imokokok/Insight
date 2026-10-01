import { activePartnerIntegrationPolicy } from '@/lib/protocol/partnerIntegrationRegistry';

import {
  assertVeritasJointRun1800Admission,
  VERITAS_JOINT_RUN_POLICY_ID,
} from '../veritasJointRunValidity';

test('October candidate remains unreachable while the September activation is current', () => {
  expect(activePartnerIntegrationPolicy('veritas')?.policyId).toBe(
    '0x022050775106ce8cd9a9fd57904a3a9ca2c9b491f5073871ab17ed2dcb1d054a'
  );
  expect(() =>
    assertVeritasJointRun1800Admission(
      {
        partnerId: 'veritas',
        policyId: VERITAS_JOINT_RUN_POLICY_ID,
        apiKeyId: 'window-five-key',
        asset: 'WETH',
        destinationAsset: 'USDC',
        chainId: 1,
        action: 'swap',
        tradeAmountUsd: 50_000,
        schemaVersion: 3,
      },
      'request',
      new Date('2026-10-02T14:20:00Z'),
      '2026-10-02',
      'window-five-key'
    )
  ).toThrow('not active');
});
