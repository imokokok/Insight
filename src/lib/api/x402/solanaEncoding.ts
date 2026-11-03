const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_INDEX = new Map([...BASE58_ALPHABET].map((character, index) => [character, index]));

/** Validate a base58 string by its decoded byte length at an untrusted config boundary. */
export function isBase58ByteString(value: string, expectedBytes: number): boolean {
  if (value.length === 0 || ![...value].every((character) => BASE58_INDEX.has(character))) {
    return false;
  }

  let decoded = 0n;
  for (const character of value) {
    const digit = BASE58_INDEX.get(character);
    if (digit === undefined) return false;
    decoded = decoded * 58n + BigInt(digit);
  }

  const leadingZeroBytes = [...value].findIndex((character) => character !== '1');
  const leadingBytes = leadingZeroBytes === -1 ? value.length : leadingZeroBytes;
  const significantBytes = decoded === 0n ? 0 : Math.ceil(decoded.toString(16).length / 2);
  return leadingBytes + significantBytes === expectedBytes;
}

export function isSolanaPublicKey(value: string): boolean {
  return isBase58ByteString(value, 32);
}

export function isSolanaSignature(value: string): boolean {
  return isBase58ByteString(value, 64);
}
