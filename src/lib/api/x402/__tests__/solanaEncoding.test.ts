import { isBase58ByteString, isSolanaPublicKey, isSolanaSignature } from '../solanaEncoding';

describe('Solana base58 encoding validation', () => {
  it('accepts 32-byte public keys and rejects other lengths', () => {
    expect(isSolanaPublicKey('seFkxFkXEY9JGEpCyPfCWTuPZG9WK6ucf95zvKCfsRX')).toBe(true);
    expect(isSolanaPublicKey('11111111111111111111111111111111')).toBe(true);
    expect(isSolanaPublicKey('0')).toBe(false);
    expect(isSolanaPublicKey('111111111111111111111111111111111')).toBe(false);
  });

  it('accepts 64-byte transaction signatures and rejects malformed base58', () => {
    expect(isSolanaSignature('1'.repeat(64))).toBe(true);
    expect(isSolanaSignature('1'.repeat(63))).toBe(false);
    expect(isBase58ByteString('0'.repeat(64), 64)).toBe(false);
  });
});
