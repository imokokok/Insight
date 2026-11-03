import { listEvidencePacks } from '@/lib/settlementEvidence/repository';

import { buildSettlementEvidenceSection } from '../reportService';

jest.mock('@/lib/settlementEvidence/repository', () => ({
  listEvidencePacks: jest.fn(),
}));

const mockedList = listEvidencePacks as jest.Mock;

function pack(overrides: Record<string, unknown> = {}) {
  return {
    payload: {
      marketSlug: 'btc-updown-5m-1766162100',
      asset: 'BTC',
      declaredOutcome: 'Down',
      independentOutcome: 'Up',
      priceChangeBps: 500,
      windowStartMs: 1766162100000,
      windowEndMs: 1766162400000,
    },
    payloadHash: 'a'.repeat(64),
    grade: 'inconsistent',
    createdAtMs: Date.parse('2026-11-04T09:15:00.000Z'),
    attestation: null,
    ...overrides,
  };
}

describe('buildSettlementEvidenceSection', () => {
  beforeEach(() => {
    mockedList.mockReset();
  });

  it('summarizes the report day and calls out inconsistent windows', async () => {
    mockedList.mockResolvedValue([
      pack(),
      pack({
        marketSlug: 'eth-updown-5m-1766161800',
        asset: 'ETH',
        grade: 'consistent',
        createdAtMs: Date.parse('2026-11-04T10:00:00.000Z'),
      }),
      // Another day — must be filtered out.
      pack({ grade: 'consistent', createdAtMs: Date.parse('2026-11-05T10:00:00.000Z') }),
    ]);
    const section = await buildSettlementEvidenceSection('2026-11-04');
    expect(section?.packsCreated).toBe(2);
    expect(section?.grades).toEqual({ inconsistent: 1, consistent: 1 });
    expect(section?.inconsistent).toHaveLength(1);
    expect(section?.inconsistent[0]?.marketSlug).toBe('btc-updown-5m-1766162100');
  });

  it('omits the section on an empty day', async () => {
    mockedList.mockResolvedValue([]);
    expect(await buildSettlementEvidenceSection('2026-11-04')).toBeUndefined();
  });

  it('omits the section when the settlement store is unavailable', async () => {
    mockedList.mockRejectedValue(new Error('turso down'));
    expect(await buildSettlementEvidenceSection('2026-11-04')).toBeUndefined();
  });

  it('omits the section for an invalid date', async () => {
    expect(await buildSettlementEvidenceSection('not-a-date')).toBeUndefined();
  });
});
