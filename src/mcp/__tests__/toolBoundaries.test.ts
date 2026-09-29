import { OracleProviderQuerySchema } from '@/lib/security/validation';

import { executeTool } from '../tools';
import {
  AnomaliesInputSchema,
  PriceHistoryInputSchema,
  ReputationRankingsInputSchema,
} from '../tools/schemas';

const mockLogError = jest.fn();

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: (...args: unknown[]) => mockLogError(...args),
    debug: jest.fn(),
  }),
  normalizeError: (error: unknown) => error,
}));

describe('REST and MCP integer request boundaries', () => {
  it.each(['1abc', '1.9', '1e2', '0x10', '', 'Infinity'])(
    'rejects a partial or non-decimal integer: %s',
    (value) => {
      expect(OracleProviderQuerySchema.safeParse({ symbol: 'BTC', period: value }).success).toBe(
        false
      );
      expect(
        PriceHistoryInputSchema.safeParse({ provider: 'chainlink', symbol: 'BTC', period: value })
          .success
      ).toBe(false);
      expect(ReputationRankingsInputSchema.safeParse({ days: value }).success).toBe(false);
      expect(AnomaliesInputSchema.safeParse({ days: value }).success).toBe(false);
    }
  );

  it('accepts bounded integer numbers and decimal strings', () => {
    expect(OracleProviderQuerySchema.parse({ symbol: 'BTC', period: '24' }).period).toBe(24);
    expect(
      PriceHistoryInputSchema.parse({ provider: 'chainlink', symbol: 'BTC', period: 24 }).period
    ).toBe(24);
    expect(ReputationRankingsInputSchema.parse({ days: '7' }).days).toBe(7);
    expect(AnomaliesInputSchema.parse({ days: 7 }).days).toBe(7);
    expect(ReputationRankingsInputSchema.safeParse({ days: 91 }).success).toBe(false);
  });

  it('does not log user supplied tool arguments or validation details', async () => {
    mockLogError.mockClear();
    const privateInput = {
      provider: 'chainlink',
      symbol: 'BTC',
      period: '1abc',
      secret: 'PRIVATE_EVIDENCE_MARKER',
    };
    const result = await executeTool('get_price_history', privateInput);
    expect(result.isError).toBe(true);
    expect(mockLogError).toHaveBeenCalledWith('MCP tool execution failed', undefined, {
      tool: 'get_price_history',
      category: 'validation',
    });
    expect(JSON.stringify(mockLogError.mock.calls)).not.toContain('PRIVATE_EVIDENCE_MARKER');
  });
});
