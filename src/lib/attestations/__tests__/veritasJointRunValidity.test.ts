import { activePartnerIntegrationPolicy } from '@/lib/protocol/partnerIntegrationRegistry';

import {
  assertVeritasJointRun1800Admission,
  VERITAS_JOINT_RUN_POLICY_ID,
} from '../veritasJointRunValidity';

jest.mock('@/lib/protocol/partnerIntegrationRegistry', () => ({
  activePartnerIntegrationPolicy: jest.fn(),
}));

const activePolicy = activePartnerIntegrationPolicy as jest.MockedFunction<
  typeof activePartnerIntegrationPolicy
>;
const context = {
  partnerId: 'veritas',
  policyId: VERITAS_JOINT_RUN_POLICY_ID,
  apiKeyId: 'veritas-temporary-key',
  asset: 'WETH',
  destinationAsset: 'USDC',
  chainId: 1,
  action: 'swap',
  tradeAmountUsd: 50_000,
  schemaVersion: 3,
};
const requestTime = new Date('2026-09-30T02:20:00Z');

beforeEach(() => {
  activePolicy.mockReturnValue({
    partnerId: 'veritas',
    policyId: VERITAS_JOINT_RUN_POLICY_ID,
    productionReachability: 'enabled',
  } as ReturnType<typeof activePartnerIntegrationPolicy>);
});

test('admits the exact partner, policy, key, trade, and selected window', () => {
  expect(() =>
    assertVeritasJointRun1800Admission(
      context,
      'request',
      requestTime,
      '2026-09-30',
      'veritas-temporary-key'
    )
  ).not.toThrow();
});

test.each([
  ['inactive policy', () => activePolicy.mockReturnValue(null)],
  [
    'disabled policy',
    () =>
      activePolicy.mockReturnValue({
        ...activePolicy(),
        productionReachability: 'disabled',
      } as ReturnType<typeof activePartnerIntegrationPolicy>),
  ],
])('fails closed for %s', (_name, alterPolicy) => {
  alterPolicy();
  expect(() =>
    assertVeritasJointRun1800Admission(
      context,
      'request',
      requestTime,
      '2026-09-30',
      'veritas-temporary-key'
    )
  ).toThrow();
});

test.each([
  ['cross-partner', { partnerId: 'headless' }, requestTime, '2026-09-30', 'veritas-temporary-key'],
  [
    'stale policy',
    { policyId: `0x${'0'.repeat(64)}` },
    requestTime,
    '2026-09-30',
    'veritas-temporary-key',
  ],
  ['wrong pair', { destinationAsset: 'WETH' }, requestTime, '2026-09-30', 'veritas-temporary-key'],
  ['missing key', {}, requestTime, '2026-09-30', ''],
  ['missing window', {}, requestTime, undefined, 'veritas-temporary-key'],
  ['review-only date', {}, new Date('2026-09-29T02:20:00Z'), '2026-09-29', 'veritas-temporary-key'],
  ['early request', {}, new Date('2026-09-30T01:59:59Z'), '2026-09-30', 'veritas-temporary-key'],
  ['late request', {}, new Date('2026-09-30T02:50:00Z'), '2026-09-30', 'veritas-temporary-key'],
])('fails closed for %s', (_name, override, now, window, key) => {
  expect(() =>
    assertVeritasJointRun1800Admission({ ...context, ...override }, 'request', now, window, key)
  ).toThrow();
});

test('rejects a signature at 02:55 UTC even if its request began earlier', () => {
  expect(() =>
    assertVeritasJointRun1800Admission(
      context,
      'sign',
      new Date('2026-09-30T02:55:00Z'),
      '2026-09-30',
      'veritas-temporary-key'
    )
  ).toThrow();
});
