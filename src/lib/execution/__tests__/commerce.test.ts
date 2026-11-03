import {
  estimateVenueNativeFee,
  reconcileVenueNativeFee,
  type ExecutionCommercialTerms,
} from '../commerce';

const terms: ExecutionCommercialTerms = {
  schema: 'execution.commerce.v1',
  productId: 'verified-execution',
  metering: { preflight: 'C3', observation: 'C4', evidenceExport: 'C4' },
  venueFee: {
    kind: 'venue-native',
    venue: 'hyperliquid',
    beneficiary: '0x1111111111111111111111111111111111111111',
    unit: 'tenths-of-basis-point',
    rate: 10,
    maximumRate: 10,
    approval: 'USER_SIGNATURE_REQUIRED_OR_UNVERIFIED',
    settlement: 'VENUE_RECONCILIATION_REQUIRED',
  },
};

describe('execution commerce', () => {
  it('keeps observed-notional estimates distinct from venue-reported reconciliation', () => {
    const estimate = estimateVenueNativeFee({
      terms,
      venue: 'hyperliquid',
      reference: {
        account: '0x2222222222222222222222222222222222222222',
        clientOrderId: '0x1234567890abcdef1234567890abcdef',
      },
      observedAt: '2026-10-31T00:00:00.000Z',
      filledNotionalUsd: '25000',
    });
    expect(estimate).toMatchObject({
      type: 'VENUE_FEE_ESTIMATED',
      estimatedFeeUsd: '2.5',
      settlement: 'VENUE_RECONCILIATION_REQUIRED',
    });
    const reconciliation = reconcileVenueNativeFee({
      estimate: estimate!,
      reportedFeeUsd: '2.45',
      reportedAt: '2026-11-01T00:00:00.000Z',
      reportReference: 'hyperliquid-builder-fills-2026-10-31',
    });
    expect(reconciliation.type).toBe('VENUE_FEE_RECONCILED');
    expect(reconciliation.varianceUsd).toBe('-0.05');
  });

  it('does not manufacture venue revenue when no fee was disclosed', () => {
    expect(
      estimateVenueNativeFee({
        terms: { ...terms, venueFee: null },
        venue: 'hyperliquid',
        reference: {
          account: '0x2222222222222222222222222222222222222222',
          clientOrderId: '0x1234567890abcdef1234567890abcdef',
        },
        observedAt: '2026-10-31T00:00:00.000Z',
        filledNotionalUsd: '25000',
      })
    ).toBeNull();
  });
});
