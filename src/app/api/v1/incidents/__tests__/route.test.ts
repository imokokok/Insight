/** @jest-environment node */
import { NextRequest } from 'next/server';

import { getIncidentAggregation } from '@/lib/api/services/incidentService';

import { GET } from '../route';

jest.mock('@/lib/api/services/incidentService', () => ({
  getIncidentAggregation: jest.fn(),
}));

type Handler = (request: NextRequest, context: unknown) => Promise<Response>;

function makeRequest(query: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://test/api/v1/incidents?${query}`, { headers });
}

beforeEach(() => {
  jest
    .mocked(getIncidentAggregation)
    .mockReset()
    .mockResolvedValue({
      from: '2026-11-04',
      to: '2026-11-11',
      total: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byType: {},
      incidents: [],
    });
});

describe('GET /api/v1/incidents public tier', () => {
  it('serves anonymous requests within the public caps and appends the evidence block', async () => {
    const response = await (GET as unknown as Handler)(makeRequest('minSeverity=high&limit=50'), {
      requestId: 'test',
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(getIncidentAggregation).toHaveBeenCalledWith(
      expect.objectContaining({ minSeverity: 'high', limit: 50 })
    );
    expect(body.data.evidence.corpus.repository).toContain('oracle-incident-corpus');
    expect(body.data.evidence.corpus.verification).toContain('verify-corpus.mjs');
    expect(body.data.evidence.settlementEvidence.endpoint).toBe(
      '/api/v1/markets/settlement-evidence'
    );
    expect(body.data.evidence.attestation.endpoint).toBe('/api/v1/execution/attestation/verify');
    expect(body.data.evidence.disclosure).toMatch(/not why/i);
  });

  it('rejects anonymous windows beyond 30 days with 401 before touching the service', async () => {
    const response = await (GET as unknown as Handler)(
      makeRequest('from=2026-01-01&to=2026-11-11'),
      { requestId: 'test' }
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(getIncidentAggregation).not.toHaveBeenCalled();
  });

  it('rejects anonymous deep paging with 401', async () => {
    const response = await (GET as unknown as Handler)(makeRequest('offset=500'), {
      requestId: 'test',
    });
    expect(response.status).toBe(401);
    expect(getIncidentAggregation).not.toHaveBeenCalled();
  });

  it('lets credentialed callers use the full query space', async () => {
    const response = await (GET as unknown as Handler)(
      makeRequest('from=2026-01-01&to=2026-11-11&limit=200&offset=200', {
        'x-api-key': 'test-key',
      }),
      { requestId: 'test' }
    );
    expect(response.status).toBe(200);
    expect(getIncidentAggregation).toHaveBeenCalledWith(
      expect.objectContaining({ from: '2026-01-01', limit: 200, offset: 200 })
    );
  });

  it('does not attach the evidence block differently for credentialed calls', async () => {
    const response = await (GET as unknown as Handler)(makeRequest('', { 'x-api-key': 'k' }), {
      requestId: 'test',
    });
    const body = await response.json();
    expect(body.data.evidence.corpus.repository).toBeDefined();
  });
});
