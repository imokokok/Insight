import { z } from 'zod';

import {
  apiErrorCode,
  apiErrorMessage,
  parseApiEnvelope,
  requireApiData,
} from '../responseValidation';

describe('responseValidation', () => {
  it('returns validated data from a successful envelope', () => {
    const envelope = parseApiEnvelope({ success: true, data: { id: 'snapshot-1' } });

    expect(requireApiData(envelope, z.object({ id: z.string() }))).toEqual({ id: 'snapshot-1' });
  });

  it('rejects a malformed envelope before consumers access it', () => {
    expect(() => parseApiEnvelope({ data: { id: 'snapshot-1' } })).toThrow('invalid JSON envelope');
  });

  it('uses safe error fallbacks when an API omits error fields', () => {
    const envelope = parseApiEnvelope({ success: false, error: {} });

    expect(apiErrorCode(envelope)).toBe('UNKNOWN');
    expect(apiErrorMessage(envelope, 'Request failed')).toBe('Request failed');
  });

  it('rejects a success envelope whose endpoint data has the wrong shape', () => {
    const envelope = parseApiEnvelope({ success: true, data: { id: 42 } });

    expect(() =>
      requireApiData(envelope, z.object({ id: z.string() }), 'Snapshot response')
    ).toThrow('Snapshot response has an invalid data payload');
  });
});
