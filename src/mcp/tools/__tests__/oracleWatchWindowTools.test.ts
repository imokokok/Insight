import {
  beginOracleWatchWindow,
  closeOracleWatchWindow,
  OracleWatchWindowError,
  pollOracleWatchWindow,
} from '@/lib/api/services/oracleWatchWindowService';

import {
  oracleWatchWindowBeginTool,
  oracleWatchWindowCloseTool,
  oracleWatchWindowPollTool,
} from '../oracleWatchWindowTools';

jest.mock('@/lib/api/services/oracleWatchWindowService', () => ({
  beginOracleWatchWindow: jest.fn(),
  pollOracleWatchWindow: jest.fn(),
  closeOracleWatchWindow: jest.fn(),
  OracleWatchWindowError: class extends Error {
    constructor(
      readonly code: string,
      readonly retryAfterSeconds?: number
    ) {
      super(`Oracle Watch window failure: ${code}`);
      this.name = 'OracleWatchWindowError';
    }
  },
}));

const mockBegin = beginOracleWatchWindow as jest.MockedFunction<typeof beginOracleWatchWindow>;
const mockPoll = pollOracleWatchWindow as jest.MockedFunction<typeof pollOracleWatchWindow>;
const mockClose = closeOracleWatchWindow as jest.MockedFunction<typeof closeOracleWatchWindow>;

describe('oracleWatchWindowBeginTool', () => {
  it('opens a window and shows the one-time token exactly once', async () => {
    mockBegin.mockResolvedValueOnce({
      window: {
        windowId: 'win-1',
        symbol: 'ETH',
        chain: 'arbitrum',
        status: 'active',
        paymentMethod: 'x402',
        openedAt: '2026-01-01T00:00:00Z',
        expiresAt: '2026-01-02T00:00:00Z',
        closedAt: null,
        pollCount: 0,
        pollCap: 300,
      },
      windowToken: 'oww_abc',
    });

    const result = await oracleWatchWindowBeginTool.handler({ symbol: 'ETH', chain: 'arbitrum' });

    expect(mockBegin).toHaveBeenCalledWith({
      symbol: 'ETH',
      chain: 'arbitrum',
      paymentMethod: 'x402',
      apiKeyId: null,
    });
    expect(result).toContain('Oracle Watch monitored window opened: ETH on arbitrum');
    expect(result).toContain('win-1');
    expect(result).toContain('`oww_abc`');
    // The token appears exactly once in the whole report.
    expect(result.match(/oww_abc/g)).toHaveLength(1);
  });

  it('records credits provenance when the caller presented an API key', async () => {
    mockBegin.mockResolvedValueOnce({
      window: {
        windowId: 'win-2',
        symbol: 'BTC',
        chain: null,
        status: 'active',
        paymentMethod: 'credits',
        openedAt: '2026-01-01T00:00:00Z',
        expiresAt: '2026-01-02T00:00:00Z',
        closedAt: null,
        pollCount: 0,
        pollCap: 300,
      },
      windowToken: 'oww_def',
    });

    await oracleWatchWindowBeginTool.handler({ symbol: 'BTC' }, { apiKeyId: 'key-123' });

    expect(mockBegin).toHaveBeenCalledWith({
      symbol: 'BTC',
      chain: null,
      paymentMethod: 'credits',
      apiKeyId: 'key-123',
    });
  });
});

describe('oracleWatchWindowPollTool', () => {
  it('formats an in-window signal with budget accounting', async () => {
    mockPoll.mockResolvedValueOnce({
      signal: {
        symbol: 'ETH',
        chain: 'arbitrum',
        verdict: 'caution',
        recommendation: 'proceed_with_caution',
        maxDeviationPct: 1.2,
        agreement: 0.98,
        participantCount: 3,
        outlierCount: 1,
        staleCount: 0,
        consensusPrice: 3000,
        reason: 'max_deviation_caution',
        quorumSatisfied: true,
        requiredParticipantCount: 3,
        reasonCodes: [],
        sourceGroupCount: 2,
        requiredSourceGroupCount: 2,
        independenceSatisfied: true,
        providers: [],
        evaluatedAt: '2026-01-01T00:00:00Z',
      },
      attestation: null,
      window: {
        windowId: 'win-1',
        pollCount: 12,
        pollCap: 300,
        expiresAt: '2026-01-02T00:00:00Z',
      },
    });

    const result = await oracleWatchWindowPollTool.handler({
      windowId: 'win-1',
      windowToken: 'oww_abc',
    });

    expect(mockPoll).toHaveBeenCalledWith('win-1', 'oww_abc');
    expect(result).toContain('Verdict: CAUTION');
    expect(result).toContain('Recommendation: proceed_with_caution');
    expect(result).toContain('Poll budget: 12/300 used');
    expect(result).toContain('Attestation: unavailable');
  });

  it('maps structured window failures to actionable tool errors', async () => {
    mockPoll.mockRejectedValue(new OracleWatchWindowError('POLL_TOO_SOON', 17));

    await expect(
      oracleWatchWindowPollTool.handler({ windowId: 'win-1', windowToken: 'oww_abc' })
    ).rejects.toThrow('POLL_TOO_SOON');
    await expect(
      oracleWatchWindowPollTool.handler({ windowId: 'win-1', windowToken: 'oww_abc' })
    ).rejects.toThrow('Retry after 17s');
  });

  it('fails closed on a wrong token without revealing existence', async () => {
    mockPoll.mockRejectedValueOnce(new OracleWatchWindowError('INVALID_TOKEN'));

    await expect(
      oracleWatchWindowPollTool.handler({ windowId: 'win-x', windowToken: 'oww_bad' })
    ).rejects.toThrow('Invalid or missing window token');
  });
});

describe('oracleWatchWindowCloseTool', () => {
  it('returns the per-window summary including halt timestamps', async () => {
    mockClose.mockResolvedValueOnce({
      windowId: 'win-1',
      symbol: 'ETH',
      chain: 'arbitrum',
      status: 'closed',
      expired: false,
      openedAt: '2026-01-01T00:00:00Z',
      closedAt: '2026-01-01T12:00:00Z',
      expiresAt: '2026-01-02T00:00:00Z',
      pollsIssued: 48,
      pollCap: 300,
      verdictCounts: { normal: 46, caution: 2, danger: 0 },
      recommendationCounts: { proceed: 46, proceed_with_caution: 2, halt: 0 },
      haltCount: 0,
      firstHaltAt: null,
      lastHaltAt: null,
    });

    const result = await oracleWatchWindowCloseTool.handler({
      windowId: 'win-1',
      windowToken: 'oww_abc',
    });

    expect(mockClose).toHaveBeenCalledWith('win-1', 'oww_abc');
    expect(result).toContain('closed early');
    expect(result).toContain('Polls issued: 48/300');
    expect(result).toContain('Halts: 0');
  });

  it('surfaces a halt-bearing summary', async () => {
    mockClose.mockResolvedValueOnce({
      windowId: 'win-1',
      symbol: 'ETH',
      chain: null,
      status: 'closed',
      expired: true,
      openedAt: '2026-01-01T00:00:00Z',
      closedAt: '2026-01-02T00:00:00Z',
      expiresAt: '2026-01-02T00:00:00Z',
      pollsIssued: 300,
      pollCap: 300,
      verdictCounts: { normal: 290, caution: 5, danger: 5 },
      recommendationCounts: { proceed: 290, proceed_with_caution: 5, halt: 5 },
      haltCount: 5,
      firstHaltAt: '2026-01-01T06:00:00Z',
      lastHaltAt: '2026-01-01T09:00:00Z',
    });

    const result = await oracleWatchWindowCloseTool.handler({
      windowId: 'win-1',
      windowToken: 'oww_abc',
    });

    expect(result).toContain('expired');
    expect(result).toContain('Halts: 5 (first 2026-01-01T06:00:00Z, last 2026-01-01T09:00:00Z)');
  });
});
