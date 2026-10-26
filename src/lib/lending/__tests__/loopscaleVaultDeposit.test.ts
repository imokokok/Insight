import { createHash } from 'node:crypto';

import { parseLoopscaleMessage, prepareLoopscaleVaultDeposit } from '../loopscaleVaultDeposit';
import { solanaLendingMessageHash } from '../solanaLendingAction';
import {
  createSolanaLendingGuardDecision,
  verifySolanaLendingGuardDecision,
} from '../solanaLendingGuardAttestation';

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
function fromBase58(value: string): Uint8Array {
  let number = 0n;
  for (const character of value) number = number * 58n + BigInt(ALPHABET.indexOf(character));
  const output: number[] = [];
  while (number > 0n) {
    output.push(Number(number & 0xffn));
    number >>= 8n;
  }
  output.reverse();
  let zeroes = 0;
  while (value[zeroes] === '1') zeroes += 1;
  return Uint8Array.from([...new Array(zeroes).fill(0), ...output]);
}
function short(value: number): number[] {
  const result: number[] = [];
  do {
    const next = value & 0x7f;
    value >>>= 7;
    result.push(value ? next | 0x80 : next);
  } while (value);
  return result;
}
function key(seed: number): string {
  return base58(Uint8Array.from({ length: 32 }, (_, index) => ((seed + index) % 255) + 1));
}
function loopscaleMessage(wallet: string): string {
  const keys = [wallet, key(50), key(80)];
  const bytes = Uint8Array.from([
    1,
    0,
    1,
    ...short(keys.length),
    ...keys.flatMap((entry) => [...fromBase58(entry)]),
    ...fromBase58(key(120)),
    ...short(1),
    2,
    ...short(2),
    0,
    1,
    ...short(3),
    1,
    2,
    3,
  ]);
  return Buffer.from(bytes).toString('base64');
}
function loopscaleV0Message(wallet: string, lookupTable: string): string {
  const keys = [wallet, key(50), key(80)];
  const bytes = Uint8Array.from([
    0x80,
    1,
    0,
    1,
    ...short(keys.length),
    ...keys.flatMap((entry) => [...fromBase58(entry)]),
    ...fromBase58(key(120)),
    ...short(1),
    2,
    ...short(2),
    0,
    1,
    ...short(3),
    1,
    2,
    3,
    ...short(1),
    ...fromBase58(lookupTable),
    ...short(1),
    0,
    ...short(1),
    1,
  ]);
  return Buffer.from(bytes).toString('base64');
}
const wallet = key(1);
const vault = key(20);
const stake = key(40);
const mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const oracle = {
  verdict: 'PASS',
  maxDeviationPct: 0.1,
  staleDataRisk: false,
  participantCount: 4,
  attestation: null,
};

describe('Loopscale vault deposit', () => {
  it('resolves every v0 address lookup before producing a portable exact message', async () => {
    const table = key(140);
    const loaded = [key(160), key(190)];
    const transaction = await parseLoopscaleMessage(
      loopscaleV0Message(wallet, table),
      async (address) => {
        expect(address).toBe(table);
        return loaded;
      }
    );
    expect(transaction).toMatchObject({
      messageVersion: 'v0',
      addressTableLookups: [{ accountKey: table, writableIndexes: [0], readonlyIndexes: [1] }],
      loadedAddresses: { writable: [loaded[0]], readonly: [loaded[1]] },
    });
  });

  it('only attests a single official-API-built message after live metadata, message parsing, and simulation', async () => {
    const message = loopscaleMessage(wallet);
    const responses = [
      {
        lendVaults: [
          {
            vault: { address: vault, principalMint: mint, depositsEnabled: true },
            pause: { depositsPaused: false },
          },
        ],
      },
      { transaction: { message, signatures: [] }, stakeAccount: stake },
    ];
    const result = await prepareLoopscaleVaultDeposit(
      {
        wallet,
        vault,
        assetMint: mint,
        collateralSymbol: 'USDC',
        loanSymbol: 'USDC',
        collateralValueUsd: 100,
        principalAmount: '1000000',
        minLpAmount: '0',
      },
      {
        fetchImpl: jest.fn(
          async () => new Response(JSON.stringify(responses.shift()), { status: 200 })
        ) as never,
        resolveLookupTable: async () => [],
        checkOracle: jest.fn().mockResolvedValue(oracle) as never,
        simulate: async (transaction) => ({
          network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          messageHash: solanaLendingMessageHash(transaction),
          simulationSlot: 1,
          simulatedAt: 1_792_252_800,
          status: 'SIMULATED',
          unitsConsumed: 10,
          feeLamports: '5000',
        }),
      }
    );
    expect(result.transaction?.feePayer).toBe(wallet);
    expect(result.guard).toMatchObject({
      verdict: 'ALLOW',
      protocolId: 'loopscale-vault',
      exactAction: {
        account: wallet,
        marketId: vault,
        reserveOrBank: stake,
        assetMint: mint,
        amount: '1000000',
      },
    });
    expect(result.guard.exactAction?.messageHash).toBe(
      `0x${createHash('sha256').update(Buffer.from(message, 'base64')).digest('hex')}`
    );
    const previousSeed = process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED;
    process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED = '12'.repeat(32);
    try {
      const decision = createSolanaLendingGuardDecision(result.guard, result.transaction!);
      expect(decision.attestation).not.toBeNull();
      expect(verifySolanaLendingGuardDecision(decision)).toMatchObject({
        valid: true,
        reason: 'OK',
      });
    } finally {
      if (previousSeed === undefined) delete process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED;
      else process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED = previousSeed;
    }
  });
});
