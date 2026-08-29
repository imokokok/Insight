import {
  getOracleWatchHistory,
  type OracleWatchHistoryResult,
} from '@/lib/api/services/oracleWatchTrendService';

import { oracleWatchHistoryTool } from '../oracleWatchHistoryTools';

jest.mock('@/lib/api/services/oracleWatchTrendService', () => ({
  getOracleWatchHistory: jest.fn(),
}));

const mockHistory = getOracleWatchHistory as jest.MockedFunction<typeof getOracleWatchHistory>;

const NOW = '2026-08-29T12:00:00.000Z';

function result(overrides: Partial<OracleWatchHistoryResult> = {}): OracleWatchHistoryResult {
  return {
    symbol: 'ETH',
    chain: 'arbitrum',
    days: 7,
    grain: 'hourly',
    series: [
      {
        evaluatedAt: '2026-08-29T11:00:00.000Z',
        verdict: 'normal',
        recommendation: 'proceed',
        maxDeviationPct: 0.2,
        agreement: 0.99,
        participantCount: 4,
        mlRiskScore: 0.1,
        mlRiskLevel: 'low',
        trustScore: 88,
        trustLevel: 'high',
      },
      {
        evaluatedAt: NOW,
        verdict: 'caution',
        recommendation: 'proceed_with_caution',
        maxDeviationPct: 1.4,
        agreement: 0.97,
        participantCount: 4,
        mlRiskScore: 0.4,
        mlRiskLevel: 'medium',
        trustScore: 71,
        trustLevel: 'medium',
      },
    ],
    summary: {
      pointCount: 2,
      currentVerdict: 'caution',
      normal: 1,
      caution: 1,
      danger: 0,
      degradedRatio: 0.5,
      stabilityScore: 50,
      avgAgreement: 0.98,
      maxDeviationPct: 1.4,
      trustScore: 79.5,
      trustLevel: 'high',
      lastCollectedAt: NOW,
      spineStale: false,
    },
    ...overrides,
  };
}

beforeEach(() => {
  mockHistory.mockReset();
});

describe('oracleWatchHistoryTool', () => {
  it('summarises the trend rather than dumping the whole series', async () => {
    mockHistory.mockResolvedValueOnce(result());

    const out = await oracleWatchHistoryTool.handler({
      symbol: 'ETH',
      chain: 'arbitrum',
      days: 7,
      interval: 'hourly',
    });

    expect(out).toContain('Oracle Watch history: ETH on arbitrum');
    expect(out).toContain('Stability: 50/100');
    expect(out).toContain('Time degraded: 50.0%');
    expect(out).toContain('1 normal / 1 caution / 0 danger');
    expect(out).toContain('Worst deviation:');
    expect(out).toContain('Mean credibility: 79.5/100 (HIGH)');
    // The tail is shown for shape; the summary carries the trend.
    expect(out).toContain('Recent (last 2 points)');
    expect(out).toContain('CAUTION');
  });

  it('flags a stale spine instead of letting it read as "quiet"', async () => {
    mockHistory.mockResolvedValueOnce(
      result({
        summary: {
          ...result().summary,
          spineStale: true,
          lastCollectedAt: '2026-08-28T04:00:00.000Z',
        },
      })
    );

    const out = await oracleWatchHistoryTool.handler({ symbol: 'ETH', chain: 'arbitrum', days: 7 });

    // A collector outage is a monitoring failure, not a feed verdict. An agent
    // must not read "no recent DANGER" off a spine that stopped writing.
    expect(out).toContain('collection is STALE');
    expect(out).toContain('must not be treated as "quiet"');
  });

  it('explains an empty series for a pair we DO promise', async () => {
    mockHistory.mockResolvedValueOnce(result({ series: [] }));

    const out = await oracleWatchHistoryTool.handler({ symbol: 'ETH', chain: 'arbitrum', days: 7 });

    // ETH@arbitrum is inside the committed universe, so empty means the
    // collector is behind or down — not "healthy".
    expect(out).toContain('IS inside the committed history universe');
    expect(out).toContain('UNKNOWN, not as healthy');
    expect(out).toContain('oracle_watch');
  });

  it('explains an empty series for a pair we never promised', async () => {
    mockHistory.mockResolvedValueOnce(result({ symbol: 'DOGE', chain: 'ethereum', series: [] }));

    const out = await oracleWatchHistoryTool.handler({
      symbol: 'DOGE',
      chain: 'ethereum',
      days: 7,
    });

    expect(out).toContain('OUTSIDE the committed history universe');
    expect(out).toContain('DOGE has no per-chain history at all');
  });

  it('points at the covered chains when only the chain is wrong', async () => {
    mockHistory.mockResolvedValueOnce(result({ symbol: 'ETH', chain: 'solana', series: [] }));

    const out = await oracleWatchHistoryTool.handler({ symbol: 'ETH', chain: 'solana', days: 7 });

    // Different remediation from "we don't cover this asset": ETH is covered,
    // just not on Solana.
    expect(out).toContain('ETH IS covered on other chains');
    expect(out).toContain('try passing one of them');
  });

  it('passes the requested window and grain straight through', async () => {
    mockHistory.mockResolvedValueOnce(result());

    await oracleWatchHistoryTool.handler({
      symbol: 'BTC',
      chain: 'base',
      days: 30,
      interval: 'daily',
    });

    expect(mockHistory).toHaveBeenCalledWith({
      symbol: 'BTC',
      chain: 'base',
      days: 30,
      interval: 'daily',
    });
  });
});
