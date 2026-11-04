import { createHash } from 'node:crypto';

import { solanaLendingMessageHash } from '@/lib/lending/solanaLendingAction';

import { DRIFT_V2_MAINNET_PROGRAM_ID } from '../driftPerpMarket';
import { decodeSolanaPerpExactCall, type DriftPerpTransaction } from '../solanaPerpAction';

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = value * 256n + BigInt(byte);
  let output = '';
  while (value > 0n) {
    output = ALPHABET[Number(value % 58n)] + output;
    value /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    output = `1${output}`;
  }
  return output || '1';
}
function key(seed: number): string {
  return base58(Uint8Array.from({ length: 32 }, (_, index) => ((seed + index) % 255) + 1));
}
function base58Decode(value: string): Uint8Array {
  let integer = 0n;
  for (const character of value) integer = integer * 58n + BigInt(ALPHABET.indexOf(character));
  const bytes: number[] = [];
  while (integer > 0n) {
    bytes.push(Number(integer & 0xffn));
    integer >>= 8n;
  }
  bytes.reverse();
  let zeroes = 0;
  while (value[zeroes] === '1') zeroes += 1;
  return Uint8Array.from([...new Array(zeroes).fill(0), ...bytes]);
}

function littleEndian(value: bigint | number, size: number): number[] {
  let current = BigInt(value);
  const bytes: number[] = [];
  for (let index = 0; index < size; index += 1) {
    bytes.push(Number(current & 0xffn));
    current >>= 8n;
  }
  return bytes;
}

/**
 * OrderParams borsh layout from the official Drift v2 IDL
 * (`@drift-labs/sdk@2.156.0`, provenance documented in solanaPerpAction.ts).
 * Options encode as a one-byte tag plus the payload when present.
 */
function orderParamsData(options: {
  orderType?: number;
  marketType?: number;
  direction?: number;
  userOrderId?: number;
  baseAssetAmount?: bigint;
  price?: bigint;
  marketIndex?: number;
  reduceOnly?: boolean;
  postOnly?: number;
  bitFlags?: number;
  maxTs?: bigint | null;
  triggerPrice?: bigint | null;
  triggerCondition?: number;
  oraclePriceOffset?: bigint | null;
  auctionDuration?: bigint | null;
  auctionStartPrice?: bigint | null;
  auctionEndPrice?: bigint | null;
  trailing?: number[];
}): string {
  const option = (value: bigint | null, size: number): number[] =>
    value === null ? [0] : [1, ...littleEndian(value, size)];
  const bytes = [
    ...createHash('sha256').update('global:place_perp_order').digest().subarray(0, 8),
    options.orderType ?? 0,
    options.marketType ?? 1,
    options.direction ?? 0,
    options.userOrderId ?? 0,
    ...littleEndian(options.baseAssetAmount ?? 360_000_000n, 8),
    ...littleEndian(options.price ?? 0n, 8),
    ...littleEndian(options.marketIndex ?? 1, 2),
    options.reduceOnly === true ? 1 : 0,
    options.postOnly ?? 0,
    options.bitFlags ?? 0,
    ...option(options.maxTs ?? null, 8),
    ...option(options.triggerPrice ?? null, 8),
    options.triggerCondition ?? 0,
    ...option(options.oraclePriceOffset ?? null, 4),
    ...option(options.auctionDuration ?? 0n, 1),
    ...option(options.auctionStartPrice ?? 0n, 8),
    ...option(options.auctionEndPrice ?? 0n, 8),
    ...(options.trailing ?? []),
  ];
  return base58(Uint8Array.from(bytes));
}

function transaction(
  data: string,
  overrides: Partial<DriftPerpTransaction> = {}
): DriftPerpTransaction {
  const accountKeys = [key(1), key(2), key(3), key(4), DRIFT_V2_MAINNET_PROGRAM_ID];
  return {
    network: 'mainnet-beta',
    messageVersion: 'legacy',
    feePayer: accountKeys[0],
    recentBlockhash: key(12),
    header: {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 1,
    },
    accountKeys,
    addressTableLookups: [],
    loadedAddresses: { writable: [], readonly: [] },
    instructions: [{ programIdIndex: 4, accountIndexes: [0, 1, 2, 3], data }],
    ...overrides,
  };
}

describe('decodeSolanaPerpExactCall', () => {
  it('decodes a canonical reviewed market order', () => {
    const data = orderParamsData({});
    const tx = transaction(data);
    const decoded = decodeSolanaPerpExactCall(tx);
    expect(decoded.protocolId).toBe('drift-v2-mainnet');
    expect(decoded.action).toBe('open_long');
    expect(decoded.programId).toBe(DRIFT_V2_MAINNET_PROGRAM_ID);
    expect(decoded.account).toBe(tx.feePayer);
    expect(decoded.marketIndex).toBe(1);
    expect(decoded.baseAssetAmount).toBe('360000000');
    expect(decoded.limitPrice).toBe('0');
    expect(decoded.userOrderId).toBe('0');
    expect(decoded.maxTs).toBeNull();
    expect(decoded.messageHash).toBe(solanaLendingMessageHash(tx));
    expect(decoded.instructionDataHash).toBe(
      `0x${createHash('sha256').update(base58Decode(data)).digest('hex')}`
    );
  });

  it('decodes an open_short with a maxTs expiry', () => {
    const decoded = decodeSolanaPerpExactCall(
      transaction(orderParamsData({ direction: 1, maxTs: 1_800_000_000n }))
    );
    expect(decoded.action).toBe('open_short');
    expect(decoded.maxTs).toBe(1_800_000_000);
  });

  it('rejects non-market order types', () => {
    for (const orderType of [1, 2, 3, 4]) {
      expect(() => decodeSolanaPerpExactCall(transaction(orderParamsData({ orderType })))).toThrow(
        /market orders only/i
      );
    }
  });

  it('rejects spot market type, reduce-only, post-only, and bitFlags', () => {
    expect(() =>
      decodeSolanaPerpExactCall(transaction(orderParamsData({ marketType: 0 })))
    ).toThrow(/perp market orders only/i);
    expect(() =>
      decodeSolanaPerpExactCall(transaction(orderParamsData({ reduceOnly: true })))
    ).toThrow(/reduce-only/i);
    expect(() => decodeSolanaPerpExactCall(transaction(orderParamsData({ postOnly: 2 })))).toThrow(
      /post-only/i
    );
    expect(() => decodeSolanaPerpExactCall(transaction(orderParamsData({ bitFlags: 1 })))).toThrow(
      /bitFlags/i
    );
  });

  it('rejects limit prices, triggers, oracle offsets, and nonzero auctions', () => {
    expect(() => decodeSolanaPerpExactCall(transaction(orderParamsData({ price: 5n })))).toThrow(
      /limit price/i
    );
    expect(() =>
      decodeSolanaPerpExactCall(transaction(orderParamsData({ triggerPrice: 1n })))
    ).toThrow(/trigger prices/i);
    expect(() =>
      decodeSolanaPerpExactCall(transaction(orderParamsData({ oraclePriceOffset: 10n })))
    ).toThrow(/oracle price offsets/i);
    expect(() =>
      decodeSolanaPerpExactCall(transaction(orderParamsData({ auctionStartPrice: 5n })))
    ).toThrow(/auction parameters/i);
  });

  it('rejects a wrong program, bundles, truncated params, unknown option tags, and trailing bytes', () => {
    expect(() =>
      decodeSolanaPerpExactCall(
        transaction(orderParamsData({}), {
          instructions: [
            { programIdIndex: 3, accountIndexes: [0, 1, 2], data: orderParamsData({}) },
          ],
        })
      )
    ).toThrow(/reviewed Drift v2 program/i);
    expect(() =>
      decodeSolanaPerpExactCall(
        transaction(orderParamsData({}), {
          instructions: [
            { programIdIndex: 4, accountIndexes: [0, 1, 2, 3], data: orderParamsData({}) },
            { programIdIndex: 4, accountIndexes: [0, 1, 2, 3], data: orderParamsData({}) },
          ],
        })
      )
    ).toThrow(/exactly one protocol instruction/i);
    expect(() =>
      decodeSolanaPerpExactCall(
        transaction(
          base58(
            Uint8Array.from([
              ...createHash('sha256').update('global:place_perp_order').digest().subarray(0, 8),
              0,
            ])
          )
        )
      )
    ).toThrow(/truncated/i);
    expect(() =>
      decodeSolanaPerpExactCall(
        transaction(
          base58(
            Uint8Array.from([
              ...createHash('sha256').update('global:place_perp_order').digest().subarray(0, 8),
              0,
              1,
              0,
              0,
              ...littleEndian(360_000_000n, 8),
              ...littleEndian(0n, 8),
              ...littleEndian(1, 2),
              0,
              0,
              0,
              2, // maxTs Option tag = 2 (invalid)
            ])
          )
        )
      )
    ).toThrow(/invalid Option tag/i);
    expect(() =>
      decodeSolanaPerpExactCall(transaction(orderParamsData({ trailing: [0] })))
    ).toThrow(/trailing bytes/i);
  });

  it('rejects an unknown direction tag and a multi-signature header', () => {
    expect(() => decodeSolanaPerpExactCall(transaction(orderParamsData({ direction: 5 })))).toThrow(
      /PositionDirection/i
    );
    expect(() =>
      decodeSolanaPerpExactCall(
        transaction(orderParamsData({}), {
          header: {
            numRequiredSignatures: 2,
            numReadonlySignedAccounts: 0,
            numReadonlyUnsignedAccounts: 1,
          },
        })
      )
    ).toThrow(/exactly one fee-payer signature/i);
  });
});
