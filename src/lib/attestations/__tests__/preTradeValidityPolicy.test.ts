import { selectPreTradeValidity, type PreTradeValidityContext } from '../preTradeValidityPolicy';

const fixture: PreTradeValidityContext = {
  schemaVersion: 3,
  subjectChainId: 84532,
  sourceAssetId: 'eip155:84532/erc20:0x4200000000000000000000000000000000000006',
  destinationAssetId: 'eip155:84532/erc20:0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  action: 'swap',
  tradeAmountUsd: 4,
  workflowTag: 'wak.insight-priorseal.p1.v1',
  apiKeyId: 'test-key-id',
};

it('requires operator enablement and accepts both reviewed directions', () => {
  expect(selectPreTradeValidity(fixture, '600')).toBe(600);
  expect(selectPreTradeValidity(fixture, '900')).toBe(900);
  expect(
    selectPreTradeValidity(
      {
        ...fixture,
        sourceAssetId: fixture.destinationAssetId,
        destinationAssetId: fixture.sourceAssetId,
      },
      '900'
    )
  ).toBe(900);
});

it.each([
  { schemaVersion: 2 },
  { subjectChainId: 8453 },
  { workflowTag: 'other' },
  { apiKeyId: undefined },
  { apiKeyId: '' },
  { action: 'borrow' },
  { tradeAmountUsd: 5 },
  { sourceAssetId: 'unresolved:WETH@84532' },
  { destinationAssetId: fixture.sourceAssetId },
])('keeps the default validity outside the bounded profile: %j', (change) => {
  expect(selectPreTradeValidity({ ...fixture, ...change }, '900')).toBe(600);
});

it.each(['780', '901', '1200', '1801', 'NaN', '0'])(
  'rejects unapproved server settings: %s',
  (setting) => {
    expect(selectPreTradeValidity(fixture, setting)).toBe(600);
  }
);

it('requires an unexpired issuance cutoff for the one-time 1800-second exception', () => {
  const now = Math.floor(Date.now() / 1000);
  expect(selectPreTradeValidity(fixture, '1800', String(now + 3600))).toBe(1800);
  for (const until of [undefined, '', 'NaN', String(now), String(now - 1)]) {
    expect(selectPreTradeValidity(fixture, '1800', until)).toBe(600);
  }
});

it.each([
  { schemaVersion: 2 },
  { subjectChainId: 8453 },
  { workflowTag: 'other' },
  { apiKeyId: '' },
  { action: 'borrow' },
  { tradeAmountUsd: 5 },
  { destinationAssetId: fixture.sourceAssetId },
])('keeps other requests at 600 with the 1800 switch: %j', (change) => {
  expect(
    selectPreTradeValidity(
      { ...fixture, ...change },
      '1800',
      String(Math.floor(Date.now() / 1000) + 3600)
    )
  ).toBe(600);
});
