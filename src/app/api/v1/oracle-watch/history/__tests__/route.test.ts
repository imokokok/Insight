/**
 * Unit tests for the Oracle Watch history endpoint.
 *
 * Unwraps createApiHandler but runs the real Zod query validation (via
 * validateQuerySchema) so the actual gate + plan-tiering logic is exercised.
 * The time-series service is mocked. Covers plan-based history-window
 * clipping (Free→7d, Pro→30d, Protocol stays at the requested window),
 * session (UI) requests left unclamped, and schema rejection.
 */

import { getOracleWatchHistory } from '@/lib/api/services/oracleWatchTrendService';
import { validateQuerySchema } from '@/lib/validation';

import { OracleWatchHistoryQuerySchema } from '../route';

jest.mock('@/lib/api/handler', () => {
  const actual = jest.requireActual('@/lib/api/handler');
  return {
    ...actual,
    createApiHandler: (handler: unknown) => handler,
    createOptionsHandler: () => () => new Response(null, { status: 204 }),
    ApiResponseBuilder: actual.ApiResponseBuilder,
  };
});

jest.mock('@/lib/api/services/oracleWatchTrendService', () => ({
  getOracleWatchHistory: jest.fn(),
}));

const mockGetHistory = getOracleWatchHistory as jest.MockedFunction<typeof getOracleWatchHistory>;

function buildResult(symbol: string, chain: string | null, days: number) {
  return {
    symbol,
    chain,
    days,
    series: [],
    summary: {
      pointCount: 0,
      currentVerdict: null,
      normal: 0,
      caution: 0,
      danger: 0,
      degradedRatio: 0,
      avgAgreement: 0,
      maxDeviationPct: null,
    },
  };
}

async function callGet(query: string, context: Record<string, unknown> = {}): Promise<Response> {
  const request = new Request(`https://www.oracleinsight.xyz/api/v1/oracle-watch/history?${query}`);

  // Run the real validation middleware, mirroring what createApiHandler does.
  const validation = await validateQuerySchema(OracleWatchHistoryQuerySchema)(request);
  if (!validation.success) {
    return validation.response!;
  }

  const { GET } = await import('../route');
  return GET(request, {
    requestId: 'test',
    ...context,
    validated: { query: validation.data!.query },
  } as never);
}

describe('Oracle Watch history route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns history with the requested window for a pro API key (<= 30d)', async () => {
    mockGetHistory.mockResolvedValue(buildResult('ETH', 'ethereum', 15));
    const response = await callGet('symbol=ETH&chain=ethereum&days=15', {
      auth: { apiKey: { plan: 'pro' } },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.days).toBe(15);
    expect(body.meta.currentVerdict).toBeNull();
    expect(mockGetHistory).toHaveBeenCalledWith({
      symbol: 'ETH',
      chain: 'ethereum',
      days: 15,
    });
  });

  it('clips the window to 7 days for a free API key', async () => {
    mockGetHistory.mockResolvedValue(buildResult('BTC', null, 7));
    const response = await callGet('symbol=BTC&days=60', {
      auth: { apiKey: { plan: 'free' } },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.days).toBe(7);
    expect(mockGetHistory).toHaveBeenCalledWith({ symbol: 'BTC', chain: undefined, days: 7 });
  });

  it('clips the window to 30 days for a pro API key requesting more', async () => {
    mockGetHistory.mockResolvedValue(buildResult('SOL', null, 30));
    const response = await callGet('symbol=SOL&days=90', {
      auth: { apiKey: { plan: 'pro' } },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.days).toBe(30);
    expect(mockGetHistory).toHaveBeenCalledWith({ symbol: 'SOL', chain: undefined, days: 30 });
  });

  it('keeps a 90d window for protocol keys', async () => {
    mockGetHistory.mockResolvedValue(buildResult('SOL', null, 90));
    const response = await callGet('symbol=SOL&days=90', {
      auth: { apiKey: { plan: 'protocol' } },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.days).toBe(90);
    expect(mockGetHistory).toHaveBeenCalledWith({ symbol: 'SOL', chain: undefined, days: 90 });
  });

  it('leaves the window unclamped when no API key plan is present (session request)', async () => {
    mockGetHistory.mockResolvedValue(buildResult('LINK', 'arbitrum', 45));
    const response = await callGet('symbol=LINK&chain=arbitrum&days=45', { auth: {} });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.days).toBe(45);
    expect(mockGetHistory).toHaveBeenCalledWith({
      symbol: 'LINK',
      chain: 'arbitrum',
      days: 45,
    });
  });

  it('defaults days to 30 when omitted', async () => {
    mockGetHistory.mockResolvedValue(buildResult('ETH', null, 30));
    const response = await callGet('symbol=ETH');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.days).toBe(30);
    expect(mockGetHistory).toHaveBeenCalledWith({ symbol: 'ETH', chain: undefined, days: 30 });
  });

  it('rejects a missing symbol with 400', async () => {
    const response = await callGet('days=30');
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid days value with 400', async () => {
    const response = await callGet('symbol=ETH&days=0');
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
