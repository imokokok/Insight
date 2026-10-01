import { activePartnerIntegrationPolicy } from '@/lib/protocol/partnerIntegrationRegistry';

import {
  assertVeritasJointRun1800Admission,
  VERITAS_JOINT_RUN_POLICY_ID,
} from '../veritasJointRunValidity';

const context = {
  partnerId: 'veritas',
  policyId: VERITAS_JOINT_RUN_POLICY_ID,
  apiKeyId: 'window-five-key',
  asset: 'WETH',
  destinationAsset: 'USDC',
  chainId: 1,
  action: 'swap',
  tradeAmountUsd: 50_000,
  schemaVersion: 3,
};

test('October policy is active but issuance remains gated by the key, date and UTC cutoffs', () => {
  expect(activePartnerIntegrationPolicy('veritas')?.policyId).toBe(VERITAS_JOINT_RUN_POLICY_ID);
  expect(() =>
    assertVeritasJointRun1800Admission(
      context,
      'request',
      new Date('2026-10-02T14:20:00Z'),
      '2026-10-02',
      'window-five-key'
    )
  ).not.toThrow();
  expect(() =>
    assertVeritasJointRun1800Admission(
      context,
      'request',
      new Date('2026-10-02T14:20:00Z'),
      '2026-10-02',
      ''
    )
  ).toThrow('not authorized');
  expect(() =>
    assertVeritasJointRun1800Admission(
      context,
      'request',
      new Date('2026-10-02T13:59:59Z'),
      '2026-10-02',
      'window-five-key'
    )
  ).toThrow('outside its one-time cutoff');
});
