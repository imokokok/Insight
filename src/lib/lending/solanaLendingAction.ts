/**
 * Strict Solana message decoder for the direct lending instructions that this
 * product is willing to attest.  It intentionally accepts a single lending
 * instruction only: a caller that needs a transaction bundle must obtain a
 * new review profile instead of smuggling side effects into this one.
 */

import { createHash } from 'node:crypto';

import { z } from 'zod';

export const SOLANA_MAINNET_CAIP2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;
export const KAMINO_LEND_PROGRAM_ID = 'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD' as const;
export const MARGINFI_V2_PROGRAM_ID = 'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA' as const;

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_DATA = /^[1-9A-HJ-NP-Za-km-z]*$/;
const KAMINO_DEPOSIT_RESERVE_LIQUIDITY = Uint8Array.from([169, 201, 30, 126, 6, 205, 102, 68]);
const KAMINO_BORROW_OBLIGATION_LIQUIDITY = Uint8Array.from([121, 127, 18, 204, 73, 245, 225, 65]);
const MARGINFI_DEPOSIT = anchorDiscriminator('lending_account_deposit');
const MARGINFI_BORROW = anchorDiscriminator('lending_account_borrow');

function publicKey(value: string): boolean {
  try {
    return value.length >= 32 && value.length <= 44 && decodeBase58(value).length === 32;
  } catch {
    return false;
  }
}

const PublicKeySchema = z.string().refine(publicKey, 'Expected a 32-byte base58 Solana public key');
const ByteIndexSchema = z.number().int().min(0).max(255);
const HeaderSchema = z
  .object({
    numRequiredSignatures: z.number().int().min(1).max(32),
    numReadonlySignedAccounts: z.number().int().min(0).max(32),
    numReadonlyUnsignedAccounts: z.number().int().min(0).max(255),
  })
  .strict();
const InstructionSchema = z
  .object({
    programIdIndex: ByteIndexSchema,
    accountIndexes: z.array(ByteIndexSchema).max(64),
    data: z.string().max(8192).regex(BASE58_DATA),
  })
  .strict();
const LookupSchema = z
  .object({
    accountKey: PublicKeySchema,
    writableIndexes: z.array(ByteIndexSchema).max(256),
    readonlyIndexes: z.array(ByteIndexSchema).max(256),
  })
  .strict();

/** The portable, fully-resolved compiled-message shape shared with PriorSeal. */
export const SolanaLendingTransactionSchema = z
  .object({
    network: z.literal('mainnet-beta'),
    messageVersion: z.enum(['legacy', 'v0']),
    feePayer: PublicKeySchema,
    recentBlockhash: PublicKeySchema,
    header: HeaderSchema,
    accountKeys: z.array(PublicKeySchema).min(1).max(256),
    addressTableLookups: z.array(LookupSchema).max(32),
    loadedAddresses: z
      .object({
        writable: z.array(PublicKeySchema).max(256),
        readonly: z.array(PublicKeySchema).max(256),
      })
      .strict(),
    instructions: z.array(InstructionSchema).min(1).max(64),
  })
  .strict()
  .superRefine((value, context) => {
    const { header, accountKeys, addressTableLookups, loadedAddresses, messageVersion } = value;
    if (accountKeys[0] !== value.feePayer || new Set(accountKeys).size !== accountKeys.length) {
      context.addIssue({
        code: 'custom',
        path: ['accountKeys'],
        message: 'feePayer must be the first unique static account key',
      });
    }
    if (
      header.numRequiredSignatures > accountKeys.length ||
      header.numReadonlySignedAccounts >= header.numRequiredSignatures ||
      header.numReadonlyUnsignedAccounts > accountKeys.length - header.numRequiredSignatures
    ) {
      context.addIssue({
        code: 'custom',
        path: ['header'],
        message: 'Solana message header is inconsistent',
      });
    }
    const writable = addressTableLookups.reduce(
      (total, entry) => total + entry.writableIndexes.length,
      0
    );
    const readonly = addressTableLookups.reduce(
      (total, entry) => total + entry.readonlyIndexes.length,
      0
    );
    if (
      (messageVersion !== 'v0' && addressTableLookups.length !== 0) ||
      writable !== loadedAddresses.writable.length ||
      readonly !== loadedAddresses.readonly.length
    ) {
      context.addIssue({
        code: 'custom',
        path: ['addressTableLookups'],
        message: 'Address lookup tables are not fully resolved',
      });
    }
    const accountCount = accountKeys.length + writable + readonly;
    if (
      accountCount > 256 ||
      value.instructions.some(
        (entry) =>
          entry.programIdIndex >= accountCount ||
          entry.accountIndexes.some((index) => index >= accountCount)
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['instructions'],
        message: 'Instruction references an unknown account',
      });
    }
  });

export type SolanaLendingTransaction = z.infer<typeof SolanaLendingTransactionSchema>;
export const SolanaLendingProtocolIdSchema = z.enum(['kamino-lend', 'marginfi-v2']);
export type SolanaLendingProtocolId = z.infer<typeof SolanaLendingProtocolIdSchema>;
export const SolanaLendingActionSchema = z.enum(['supply', 'borrow']);
export type SolanaLendingAction = z.infer<typeof SolanaLendingActionSchema>;

export type SolanaLendingDecodedAction = {
  protocolId: SolanaLendingProtocolId;
  action: SolanaLendingAction;
  programId: typeof KAMINO_LEND_PROGRAM_ID | typeof MARGINFI_V2_PROGRAM_ID;
  instructionDataHash: `0x${string}`;
  messageHash: `0x${string}`;
  amount: string;
  account: string;
  marketId: string;
  reserveOrBank: string;
  positionAccount: string | null;
  assetMint: string | null;
};

type ExpectedScope = {
  protocolId: SolanaLendingProtocolId;
  action: SolanaLendingAction;
  collateralSymbol?: string;
  loanSymbol?: string;
};

/**
 * Decode one canonical direct Kamino or Marginfi instruction.  There is no
 * authority delegation, multisig, instruction bundle, or unknown program in
 * this profile.  The returned message hash is the digest PriorSeal commits.
 */
export function decodeSolanaLendingExactCall(
  rawTransaction: SolanaLendingTransaction,
  expected: ExpectedScope
): SolanaLendingDecodedAction {
  const transaction = SolanaLendingTransactionSchema.parse(rawTransaction);
  if (transaction.header.numRequiredSignatures !== 1) {
    throw new Error('The Solana lending profile permits exactly one fee-payer signature');
  }
  if (transaction.instructions.length !== 1) {
    throw new Error('The Solana lending profile permits exactly one protocol instruction');
  }
  const instruction = transaction.instructions[0];
  const keys = effectiveKeys(transaction);
  const programId = keys[instruction.programIdIndex];
  const data = decodeBase58(instruction.data);
  const account = transaction.feePayer;

  if (expected.protocolId === 'kamino-lend') {
    if (programId !== KAMINO_LEND_PROGRAM_ID)
      throw new Error('Exact call target is not the reviewed Kamino Lend program');
    const action = instructionAction(
      data,
      KAMINO_DEPOSIT_RESERVE_LIQUIDITY,
      KAMINO_BORROW_OBLIGATION_LIQUIDITY,
      'kamino-lend'
    );
    if (action !== expected.action)
      throw new Error('Exact call discriminator does not match the declared lending action');
    if (instruction.accountIndexes.length !== 12)
      throw new Error('Kamino direct lending instruction account layout is not canonical');
    if (keys[instruction.accountIndexes[0]] !== account)
      throw new Error('Kamino instruction authority must be the fee payer');
    const amount = decodeAmount(data, 8, 16);
    const marketId = keys[instruction.accountIndexes[2]];
    const reserveOrBank = keys[instruction.accountIndexes[1 + (action === 'borrow' ? 3 : 0)]];
    const assetMint = keys[instruction.accountIndexes[action === 'borrow' ? 5 : 4]];
    assertAssetSymbol(
      assetMint,
      action === 'supply' ? expected.collateralSymbol : expected.loanSymbol
    );
    return decoded({
      protocolId: 'kamino-lend',
      action,
      programId,
      data,
      transaction,
      account,
      marketId,
      reserveOrBank,
      positionAccount: action === 'borrow' ? keys[instruction.accountIndexes[1]] : null,
      assetMint,
      amount,
    });
  }

  if (programId !== MARGINFI_V2_PROGRAM_ID)
    throw new Error('Exact call target is not the reviewed Marginfi v2 program');
  const action = instructionAction(data, MARGINFI_DEPOSIT, MARGINFI_BORROW, 'marginfi-v2');
  if (action !== expected.action)
    throw new Error('Exact call discriminator does not match the declared lending action');
  const minimumAccounts = action === 'supply' ? 7 : 8;
  if (
    instruction.accountIndexes.length < minimumAccounts ||
    instruction.accountIndexes.length > 40
  ) {
    throw new Error('Marginfi direct lending instruction account layout is not canonical');
  }
  if (keys[instruction.accountIndexes[2]] !== account)
    throw new Error('Marginfi instruction authority must be the fee payer');
  const amount = decodeMarginfiAmount(data, action);
  return decoded({
    protocolId: 'marginfi-v2',
    action,
    programId,
    data,
    transaction,
    account,
    marketId: keys[instruction.accountIndexes[0]],
    reserveOrBank: keys[instruction.accountIndexes[3]],
    positionAccount: keys[instruction.accountIndexes[1]],
    assetMint: null,
    amount,
  });
}

/** Build an unsigned wire transaction for live RPC simulation. */
export function serializeUnsignedSolanaLendingTransaction(raw: SolanaLendingTransaction): string {
  const transaction = SolanaLendingTransactionSchema.parse(raw);
  if (transaction.header.numRequiredSignatures !== 1)
    throw new Error('Expected exactly one required signature');
  const message = encodeMessage(transaction);
  return Buffer.from([...shortVector(1), ...new Array(64).fill(0), ...message]).toString('base64');
}

export function solanaLendingMessageHash(raw: SolanaLendingTransaction): `0x${string}` {
  const transaction = SolanaLendingTransactionSchema.parse(raw);
  return `0x${createHash('sha256')
    .update(Buffer.from(encodeMessage(transaction)))
    .digest('hex')}`;
}

function decoded(
  input: Omit<SolanaLendingDecodedAction, 'instructionDataHash' | 'messageHash'> & {
    data: Uint8Array;
    transaction: SolanaLendingTransaction;
  }
): SolanaLendingDecodedAction {
  const { data, transaction, ...rest } = input;
  return {
    ...rest,
    instructionDataHash: `0x${createHash('sha256').update(data).digest('hex')}`,
    messageHash: solanaLendingMessageHash(transaction),
  };
}

function instructionAction(
  data: Uint8Array,
  supply: Uint8Array,
  borrow: Uint8Array,
  protocol: string
): SolanaLendingAction {
  if (startsWith(data, supply)) return 'supply';
  if (startsWith(data, borrow)) return 'borrow';
  throw new Error(`Unsupported ${protocol} direct lending instruction`);
}

function decodeAmount(data: Uint8Array, offset: number, expectedLength: number): string {
  if (data.length !== expectedLength) throw new Error('Lending instruction data is not canonical');
  const amount = littleEndianU64(data.slice(offset, offset + 8));
  if (amount <= 0n) throw new Error('Lending amount must be greater than zero');
  return amount.toString();
}

function decodeMarginfiAmount(data: Uint8Array, action: SolanaLendingAction): string {
  const expectedLength = action === 'supply' ? 17 : 16;
  if (data.length !== expectedLength || (action === 'supply' && data[16] !== 0)) {
    throw new Error('Marginfi instruction data is not canonical');
  }
  const amount = littleEndianU64(data.slice(8, 16));
  if (amount <= 0n) throw new Error('Lending amount must be greater than zero');
  return amount.toString();
}

function assertAssetSymbol(assetMint: string, symbol: string | undefined): void {
  if (!symbol) return;
  const expected =
    symbol.trim().toUpperCase() === 'SOL'
      ? 'So11111111111111111111111111111111111111112'
      : symbol.trim().toUpperCase() === 'USDC'
        ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
        : null;
  if (!expected)
    throw new Error('Kamino direct profile currently reviews only SOL and USDC mint bindings');
  if (assetMint !== expected)
    throw new Error('Kamino instruction mint does not match the declared asset');
}

function effectiveKeys(transaction: SolanaLendingTransaction): string[] {
  return [
    ...transaction.accountKeys,
    ...transaction.loadedAddresses.writable,
    ...transaction.loadedAddresses.readonly,
  ];
}

function encodeMessage(transaction: SolanaLendingTransaction): number[] {
  const header = [
    transaction.header.numRequiredSignatures,
    transaction.header.numReadonlySignedAccounts,
    transaction.header.numReadonlyUnsignedAccounts,
  ];
  const keys = transaction.accountKeys.flatMap((key) => [...decodeBase58(key)]);
  const bytes = [
    ...(transaction.messageVersion === 'v0' ? [0x80] : []),
    ...header,
    ...shortVector(transaction.accountKeys.length),
    ...keys,
    ...decodeBase58(transaction.recentBlockhash),
    ...shortVector(transaction.instructions.length),
  ];
  for (const instruction of transaction.instructions) {
    const data = [...decodeBase58(instruction.data)];
    bytes.push(
      instruction.programIdIndex,
      ...shortVector(instruction.accountIndexes.length),
      ...instruction.accountIndexes,
      ...shortVector(data.length),
      ...data
    );
  }
  if (transaction.messageVersion === 'v0') {
    bytes.push(...shortVector(transaction.addressTableLookups.length));
    for (const lookup of transaction.addressTableLookups) {
      bytes.push(
        ...decodeBase58(lookup.accountKey),
        ...shortVector(lookup.writableIndexes.length),
        ...lookup.writableIndexes,
        ...shortVector(lookup.readonlyIndexes.length),
        ...lookup.readonlyIndexes
      );
    }
  }
  return bytes;
}

function anchorDiscriminator(name: string): Uint8Array {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
}
function startsWith(value: Uint8Array, prefix: Uint8Array): boolean {
  return value.length >= prefix.length && prefix.every((entry, index) => value[index] === entry);
}
function littleEndianU64(bytes: Uint8Array): bigint {
  return bytes.reduceRight((total, byte) => (total << 8n) | BigInt(byte), 0n);
}
function shortVector(value: number): number[] {
  const bytes: number[] = [];
  let remaining = value;
  while (remaining >= 0x80) {
    bytes.push((remaining & 0x7f) | 0x80);
    remaining >>= 7;
  }
  bytes.push(remaining);
  return bytes;
}
export function decodeSolanaBase58(value: string): Uint8Array {
  return decodeBase58(value);
}
function decodeBase58(value: string): Uint8Array {
  if (!BASE58_DATA.test(value)) throw new TypeError('Invalid base58 value');
  let integer = 0n;
  for (const character of value) integer = integer * 58n + BigInt(BASE58.indexOf(character));
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
