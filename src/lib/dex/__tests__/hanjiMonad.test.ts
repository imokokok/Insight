import {
  HANJI_MONAD_CODE_IDENTITY,
  HANJI_MONAD_FAST_QUOTER,
  HANJI_MONAD_HTTP_API,
  HANJI_MONAD_ORDERBOOK,
  HANJI_MONAD_MARKET,
} from '../hanjiMonad';

describe('Hanji Monad reviewed CLOB identity', () => {
  it('pins the documented API, one MON/USDC orderbook, and both proxy implementation identities', () => {
    expect(HANJI_MONAD_HTTP_API).toBe('https://api-monad.hanji.io');
    expect(HANJI_MONAD_MARKET).toBe('MON/USDC');
    expect(HANJI_MONAD_ORDERBOOK).toBe('0xc35b1ca1a2c398a21df5783b3a5ea6a2d56f298f');
    expect(HANJI_MONAD_FAST_QUOTER).toBe('0x1aed222dda944a87703c918745b11be13f8eef10');
    for (const hash of Object.values(HANJI_MONAD_CODE_IDENTITY)) {
      expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
    }
  });
});
