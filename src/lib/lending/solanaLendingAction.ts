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
/** Official Jupiter Lend main-market programs from the published Anchor IDL. */
export const JUPITER_LEND_PROGRAM_ID = 'jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9' as const;
export const JUPITER_LEND_LIQUIDITY_PROGRAM_ID =
  'jupeiUmn818Jg1ekPURTpr4mFo29p46vygyykFJ3wZC' as const;
/** Save uses the audited SPL Token Lending program on its mainnet market. */
export const SAVE_LEND_PROGRAM_ID = 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo' as const;

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_DATA = /^[1-9A-HJ-NP-Za-km-z]*$/;
const KAMINO_DEPOSIT_RESERVE_LIQUIDITY = Uint8Array.from([169, 201, 30, 126, 6, 205, 102, 68]);
const KAMINO_BORROW_OBLIGATION_LIQUIDITY = Uint8Array.from([121, 127, 18, 204, 73, 245, 225, 65]);
const MARGINFI_DEPOSIT = anchorDiscriminator('lending_account_deposit');
const MARGINFI_BORROW = anchorDiscriminator('lending_account_borrow');
const JUPITER_LEND_DEPOSIT = Uint8Array.from([242, 35, 198, 137, 82, 225, 242, 182]);
const SAVE_DEPOSIT_RESERVE_LIQUIDITY = 4;
const SOLANA_SYSTEM_PROGRAM_ID = '11111111111111111111111111111111' as const;
const SOLANA_CLOCK_SYSVAR_ID = 'SysvarC1ock11111111111111111111111111111111' as const;
const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as const;

function publicKey(value: string): boolean {
  try {
    return value.length >= 32 && value.length <= 44 && decodeBase58(value).length === 32;
  } catch {
    return false;
  }
}

export const SolanaPublicKeySchema = z
  .string()
  .refine(publicKey, 'Expected a 32-byte base58 Solana public key');
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
    accountKey: SolanaPublicKeySchema,
    writableIndexes: z.array(ByteIndexSchema).max(256),
    readonlyIndexes: z.array(ByteIndexSchema).max(256),
  })
  .strict();

/** The portable, fully-resolved compiled-message shape shared with PriorSeal. */
export const SolanaLendingTransactionSchema = z
  .object({
    network: z.literal('mainnet-beta'),
    messageVersion: z.enum(['legacy', 'v0']),
    feePayer: SolanaPublicKeySchema,
    recentBlockhash: SolanaPublicKeySchema,
    header: HeaderSchema,
    accountKeys: z.array(SolanaPublicKeySchema).min(1).max(256),
    addressTableLookups: z.array(LookupSchema).max(32),
    loadedAddresses: z
      .object({
        writable: z.array(SolanaPublicKeySchema).max(256),
        readonly: z.array(SolanaPublicKeySchema).max(256),
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
export const SolanaLendingProtocolIdSchema = z.enum([
  'kamino-lend',
  'marginfi-v2',
  'jupiter-lend-earn',
  'save-lend',
  'loopscale-vault',
]);
export type SolanaLendingProtocolId = z.infer<typeof SolanaLendingProtocolIdSchema>;
export const SolanaLendingActionSchema = z.enum(['supply', 'borrow']);
export type SolanaLendingAction = z.infer<typeof SolanaLendingActionSchema>;

export type SolanaLendingDecodedAction = {
  protocolId: SolanaLendingProtocolId;
  action: SolanaLendingAction;
  /** The reviewed program for direct profiles, or the exact Tars-built message's first instruction program for Loopscale. */
  programId: string;
  instructionDataHash: `0x${string}`;
  messageHash: `0x${string}`;
  amount: string;
  account: string;
  marketId: string;
  reserveOrBank: string;
  positionAccount: string | null;
  assetMint: string | null;
  /** Required owner for the liquidity-layer account in Jupiter Earn. */
  secondaryProgramId: typeof JUPITER_LEND_LIQUIDITY_PROGRAM_ID | null;
  /** User-owned SPL token account for Save's direct deposit profile. */
  sourceTokenAccount: string | null;
};

type ExpectedScope = {
  protocolId: SolanaLendingProtocolId;
  action: SolanaLendingAction;
  collateralSymbol?: string;
  loanSymbol?: string;
  /** Save mint independently checked against the source SPL token account live. */
  assetMint?: string;
  /** Internal-only scope supplied after Insight has built a Loopscale vault deposit with its official API. */
  loopscaleVaultAddress?: string;
  loopscaleStakeAccount?: string;
  loopscaleMessageHash?: string;
  loopscaleAmount?: string;
};

function decodeLoopscaleVaultCall(
  transaction: SolanaLendingTransaction,
  expected: ExpectedScope,
  keys: string[],
  account: string
): SolanaLendingDecodedAction {
  if (
    expected.action !== 'supply' ||
    !expected.assetMint ||
    !expected.loopscaleVaultAddress ||
    !expected.loopscaleStakeAccount ||
    !expected.loopscaleMessageHash ||
    !expected.loopscaleAmount ||
    !publicKey(expected.assetMint) ||
    !publicKey(expected.loopscaleVaultAddress) ||
    !publicKey(expected.loopscaleStakeAccount) ||
    !/^0x[0-9a-f]{64}$/i.test(expected.loopscaleMessageHash) ||
    !/^(?:0|[1-9][0-9]*)$/.test(expected.loopscaleAmount)
  ) {
    throw new Error(
      'Loopscale vault exact call requires an Insight-built, fully scoped deposit message'
    );
  }
  if (transaction.instructions.length < 1) {
    throw new Error('Loopscale vault message must contain at least one instruction');
  }
  const messageHash = solanaLendingMessageHash(transaction);
  if (messageHash.toLowerCase() !== expected.loopscaleMessageHash.toLowerCase()) {
    throw new Error('Loopscale vault message does not match the Insight-built exact message');
  }
  assertAssetSymbol(expected.assetMint, expected.collateralSymbol);
  const firstInstruction = transaction.instructions[0];
  return decoded({
    protocolId: 'loopscale-vault',
    action: 'supply',
    programId: keys[firstInstruction.programIdIndex],
    data: new Uint8Array(),
    transaction,
    account,
    marketId: expected.loopscaleVaultAddress,
    reserveOrBank: expected.loopscaleStakeAccount,
    positionAccount: null,
    assetMint: expected.assetMint,
    secondaryProgramId: null,
    sourceTokenAccount: null,
    amount: expected.loopscaleAmount,
  });
}

/**
 * Decode one canonical direct Kamino, Marginfi, or Jupiter Earn instruction. There is no
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
  const keys = effectiveKeys(transaction);
  const account = transaction.feePayer;

  if (expected.protocolId === 'loopscale-vault') {
    return decodeLoopscaleVaultCall(transaction, expected, keys, account);
  }

  if (transaction.instructions.length !== 1) {
    throw new Error('The Solana lending profile permits exactly one protocol instruction');
  }
  const instruction = transaction.instructions[0];
  const programId = keys[instruction.programIdIndex];
  const data = decodeBase58(instruction.data);

  if (expected.protocolId === 'jupiter-lend-earn') {
    if (expected.action !== 'supply') {
      throw new Error(
        'Jupiter Lend Borrow operates a position batch and is outside the direct profile'
      );
    }
    if (programId !== JUPITER_LEND_PROGRAM_ID) {
      throw new Error('Exact call target is not the reviewed Jupiter Lend Earn program');
    }
    if (!startsWith(data, JUPITER_LEND_DEPOSIT) || data.length !== 16) {
      throw new Error('Jupiter Lend direct profile accepts only canonical deposit instructions');
    }
    if (instruction.accountIndexes.length !== 17) {
      throw new Error('Jupiter Lend deposit instruction account layout is not canonical');
    }
    if (keys[instruction.accountIndexes[0]] !== account) {
      throw new Error('Jupiter Lend deposit signer must be the fee payer');
    }
    if (keys[instruction.accountIndexes[12]] !== JUPITER_LEND_LIQUIDITY_PROGRAM_ID) {
      throw new Error('Jupiter Lend deposit must bind the reviewed liquidity program');
    }
    if (keys[instruction.accountIndexes[16]] !== SOLANA_SYSTEM_PROGRAM_ID) {
      throw new Error('Jupiter Lend deposit must bind the Solana system program');
    }
    const amount = decodeAmount(data, 8, 16);
    const assetMint = keys[instruction.accountIndexes[3]];
    assertAssetSymbol(assetMint, expected.collateralSymbol);
    return decoded({
      protocolId: 'jupiter-lend-earn',
      action: 'supply',
      programId,
      data,
      transaction,
      account,
      marketId: keys[instruction.accountIndexes[5]],
      reserveOrBank: keys[instruction.accountIndexes[8]],
      positionAccount: null,
      assetMint,
      secondaryProgramId: JUPITER_LEND_LIQUIDITY_PROGRAM_ID,
      sourceTokenAccount: null,
      amount,
    });
  }

  if (expected.protocolId === 'save-lend') {
    if (expected.action !== 'supply') {
      throw new Error('Save Lend direct profile currently accepts only reserve-liquidity deposits');
    }
    if (!expected.assetMint || !publicKey(expected.assetMint)) {
      throw new Error('Save Lend direct profile requires a validated assetMint');
    }
    if (programId !== SAVE_LEND_PROGRAM_ID) {
      throw new Error('Exact call target is not the reviewed Save Lend program');
    }
    if (data.length !== 9 || data[0] !== SAVE_DEPOSIT_RESERVE_LIQUIDITY) {
      throw new Error('Save Lend direct profile accepts only canonical DepositReserveLiquidity');
    }
    if (instruction.accountIndexes.length !== 10) {
      throw new Error('Save Lend deposit instruction account layout is not canonical');
    }
    if (keys[instruction.accountIndexes[7]] !== account) {
      throw new Error('Save Lend deposit transfer authority must be the fee payer');
    }
    if (keys[instruction.accountIndexes[8]] !== SOLANA_CLOCK_SYSVAR_ID) {
      throw new Error('Save Lend deposit must bind the Solana Clock sysvar');
    }
    if (keys[instruction.accountIndexes[9]] !== SPL_TOKEN_PROGRAM_ID) {
      throw new Error('Save Lend deposit must bind the canonical SPL Token program');
    }
    assertAssetSymbol(expected.assetMint, expected.collateralSymbol);
    return decoded({
      protocolId: 'save-lend',
      action: 'supply',
      programId,
      data,
      transaction,
      account,
      marketId: keys[instruction.accountIndexes[5]],
      reserveOrBank: keys[instruction.accountIndexes[2]],
      positionAccount: null,
      assetMint: expected.assetMint,
      secondaryProgramId: null,
      sourceTokenAccount: keys[instruction.accountIndexes[0]],
      amount: decodeAmount(data, 1, 9),
    });
  }

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
      secondaryProgramId: null,
      sourceTokenAccount: null,
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
    secondaryProgramId: null,
    sourceTokenAccount: null,
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
    throw new Error('Solana direct profile currently reviews only SOL and USDC mint bindings');
  if (assetMint !== expected)
    throw new Error('Solana lending instruction mint does not match the declared asset');
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
