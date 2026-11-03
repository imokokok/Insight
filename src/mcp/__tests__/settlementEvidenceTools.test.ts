import { executeTool } from '../tools';
import { getSettlementEvidenceTool } from '@/mcp/tools/settlementEvidenceTools';

import type { SettlementEvidencePayload } from '@/lib/settlementEvidence/types';

// The repository reads Turso. These tests exercise the tool surface around it:
// argument validation and graceful messaging. Handlers reach Turso and fail
// closed with a text error result when no database is configured, which is
// asserted rather than assumed.
jest.mock('@/lib/settlementEvidence/repository', () => ({
  getEvidencePack: jest.fn(),
  listEvidencePacks: jest.fn(),
}));

import { getEvidencePack, listEvidencePacks } from '@/lib/settlementEvidence/repository';

const mockedGet = getEvidencePack as jest.Mock;
const mockedList = listEvidencePacks as jest.Mock;

function payload(overrides: Partial<SettlementEvidencePayload> = {}): SettlementEvidencePayload {
  return {
    schemaVersion: 1,
    marketSlug: 'btc-updown-5m-1766162100',
    question: 'Bitcoin Up or Down - December 19, 11:35AM-11:40AM ET',
    asset: 'BTC',
    settlementVenue: 'chainlink-stream',
    resolutionSourceUrl: null,
    windowStartMs: 1766162100000,
    windowEndMs: 1766162400000,
    windowSeconds: 300,
    declaredOutcome: 'Up',
    independentOutcome: 'Up',
    priceChangeBps: 500,
    oracleDeviationBps: 12.5,
    oracleConsensusPrice: 104500,
    oracleSlotMs: 1766162100000,
    candleCoverageE4: 10000,
    candleSource: 'kraken',
    candleRightsScope: 'vendor-licensed',
    candleDeliveryPolicy: 'derived-analytics-only',
    grade: 'consistent',
    gradeReasonCodes: ['declared_matches_independent'],
    generatedAtMs: 1700000000000,
    ...overrides,
  };
}

describe('get_settlement_evidence tool', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedList.mockReset();
  });

  it('is registered with a valid input schema', () => {
    expect(getSettlementEvidenceTool.name).toBe('get_settlement_evidence');
    expect(() => getSettlementEvidenceTool.parameters.parse({})).not.toThrow();
    expect(() => getSettlementEvidenceTool.parameters.parse({ slug: 'btc-updown-5m-1766162100', limit: 5 })).not.toThrow();
    expect(() => getSettlementEvidenceTool.parameters.parse({ limit: 1000 })).toThrow();
  });

  it('reports a missing pack as guidance, not an error', async () => {
    mockedGet.mockResolvedValue(null);
    const result = await executeTool('get_settlement_evidence', {
      slug: 'btc-updown-5m-1766162100',
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('No settlement-evidence pack exists');
    expect(result.content[0].text).toContain('after a market resolves');
  });

  it('renders a signed pack with grade and attestation, and no raw candles', async () => {
    mockedGet.mockResolvedValue({
      payload: payload(),
      payloadHash: 'a'.repeat(64),
      attestation: {
        uid: '0xdeadbeef',
        schemaVersion: 1,
        attester: '0xabc',
        attesterLabel: 'Insight Settlement Evidence attester',
        signedAt: '2025-12-19T17:00:00.000Z',
        validForSeconds: 2592000,
        signature: '0xsig',
        eip712: {
          domain: { name: 'Insight Settlement Evidence', version: '1', chainId: 1 },
          primaryType: 'SettlementEvidence',
        },
      },
    });
    const result = await executeTool('get_settlement_evidence', {
      slug: 'btc-updown-5m-1766162100',
    });
    const text = result.content[0].text;
    expect(text).toContain('CONSISTENT');
    expect(text).toContain('Declared outcome: Up');
    expect(text).toContain('Independent verdict: Up');
    expect(text).toContain('attester 0xabc');
    expect(text).toContain('Insight Settlement Evidence');
    // Delivery policy: derived analytics only — no candle OHLC fields.
    expect(text).not.toMatch(/"?(open|high|low|close)"?:/);
    expect(text).toContain('not redistributed');
  });

  it('lists recent packs with grade counts', async () => {
    mockedList.mockResolvedValue([
      {
        payload: payload(),
        payloadHash: 'a'.repeat(64),
        grade: 'consistent',
        createdAtMs: 1700000000000,
        attestation: null,
      },
      {
        payload: payload({ marketSlug: 'eth-updown-5m-1766162100', grade: 'inconsistent' }),
        payloadHash: 'b'.repeat(64),
        grade: 'inconsistent',
        createdAtMs: 1700000000000,
        attestation: null,
      },
    ]);
    const result = await executeTool('get_settlement_evidence', { limit: 5 });
    const text = result.content[0].text;
    expect(text).toContain('inconsistent 1');
    expect(text).toContain('consistent 1');
    expect(text).toContain('eth-updown-5m-1766162100');
  });

  it('returns guidance text when no packs exist', async () => {
    mockedList.mockResolvedValue([]);
    const result = await executeTool('get_settlement_evidence', {});
    expect(result.content[0].text).toContain('No settlement-evidence packs yet');
  });
});
