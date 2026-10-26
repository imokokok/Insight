/**
 * Loopscale vault deposits are built by Loopscale's documented production
 * transaction API. Unlike single-program lending instructions, a vault
 * deposit may include setup instructions and address lookup tables, so this
 * module authenticates the live vault metadata, parses the exact returned
 * message, resolves every lookup table, and simulates that message before
 * issuing evidence. It never signs or sends it.
 */

import { createHash } from 'node:crypto';

import { z } from 'zod';

import {
  preTradeSafetyCheck,
  type PreTradeSafetyResult,
} from '@/lib/api/services/preTradeSafetyService';
import { getRpcEndpoints } from '@/lib/execution/rpcEndpoints';
import {
  simulateSolanaTransaction,
  type SolanaSimulationPayload,
} from '@/lib/execution/solanaSimulation';

import {
  SolanaPublicKeySchema,
  SolanaLendingTransactionSchema,
  decodeSolanaLendingExactCall,
  serializeUnsignedSolanaLendingTransaction,
  type SolanaLendingDecodedAction,
  type SolanaLendingTransaction,
} from './solanaLendingAction';

import type {
  SolanaLendingGuardResult,
  SolanaLendingSimulation,
  SolanaProtocolAccountCheck,
} from './solanaLendingGuard';

export const LOOPSCALE_TARS_API = 'https://tars.loopscale.com/v1' as const;
const MAINNET_GENESIS_HASH = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const UINT = /^(?:0|[1-9][0-9]*)$/;

export const LoopscaleVaultDepositInputSchema = z
  .object({
    wallet: SolanaPublicKeySchema,
    vault: SolanaPublicKeySchema,
    assetMint: SolanaPublicKeySchema,
    collateralSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    loanSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    collateralValueUsd: z.number().finite().positive().max(1_000_000_000_000),
    /** Atomic units of the vault's principal mint. */
    principalAmount: z.string().regex(/^[1-9][0-9]*$/),
    /** Atomic LP shares acceptable to the caller; zero opts out of this floor. */
    minLpAmount: z.string().regex(UINT).default('0'),
  })
  .strict();
export type LoopscaleVaultDepositInput = z.infer<typeof LoopscaleVaultDepositInputSchema>;

type OracleCheckSummary = {
  verdict: PreTradeSafetyResult['verdict'] | 'UNAVAILABLE';
  maxDeviationPct: number | null;
  staleDataRisk: boolean | null;
  participantCount: number | null;
  attestationUid: string | null;
  attester: string | null;
};
type LiveVault = {
  vault: {
    address: string;
    principalMint: string;
    depositsEnabled: boolean;
  };
  pause: { depositsPaused: boolean };
};
export interface LoopscaleVaultDepositDependencies {
  fetchImpl?: typeof fetch;
  rpcEndpoints?: string[];
  resolveLookupTable?: (address: string) => Promise<string[]>;
  checkOracle?: typeof preTradeSafetyCheck;
  simulate?: (transaction: SolanaLendingTransaction) => Promise<SolanaLendingSimulation>;
  now?: () => Date;
}
export type LoopscalePreparedVaultDeposit = {
  guard: SolanaLendingGuardResult;
  transaction: SolanaLendingTransaction | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function base58(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = value * 256n + BigInt(byte);
  let output = '';
  while (value > 0n) {
    output = BASE58[Number(value % 58n)] + output;
    value /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    output = `1${output}`;
  }
  return output || '1';
}
function readShortVector(bytes: Uint8Array, cursor: { value: number }): number {
  let value = 0;
  let shift = 0;
  for (let count = 0; count < 4; count += 1) {
    if (cursor.value >= bytes.length) throw new Error('Loopscale transaction message is truncated');
    const byte = bytes[cursor.value++];
    value |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return value;
    shift += 7;
  }
  throw new Error('Loopscale transaction has an invalid short-vector length');
}
function readBytes(bytes: Uint8Array, cursor: { value: number }, count: number): Uint8Array {
  if (!Number.isSafeInteger(count) || count < 0 || cursor.value + count > bytes.length) {
    throw new Error('Loopscale transaction message is truncated');
  }
  const result = bytes.slice(cursor.value, cursor.value + count);
  cursor.value += count;
  return result;
}
function readPublicKey(bytes: Uint8Array, cursor: { value: number }): string {
  return base58(readBytes(bytes, cursor, 32));
}
function encodeInstructionData(bytes: Uint8Array): string {
  return base58(bytes);
}

/** Decode a Message/VersionedMessage response from Loopscale into PriorSeal's portable shape. */
export async function parseLoopscaleMessage(
  encodedMessage: string,
  resolveLookupTable: (address: string) => Promise<string[]>
): Promise<SolanaLendingTransaction> {
  const bytes = Uint8Array.from(Buffer.from(encodedMessage, 'base64'));
  if (bytes.length < 4 || Buffer.from(bytes).toString('base64') !== encodedMessage) {
    throw new Error('Loopscale API did not return canonical base64 message bytes');
  }
  const cursor = { value: 0 };
  let messageVersion: 'legacy' | 'v0' = 'legacy';
  if ((bytes[0] & 0x80) !== 0) {
    if ((bytes[0] & 0x7f) !== 0)
      throw new Error('Loopscale returned an unsupported Solana message version');
    messageVersion = 'v0';
    cursor.value += 1;
  }
  const header = {
    numRequiredSignatures: bytes[cursor.value++],
    numReadonlySignedAccounts: bytes[cursor.value++],
    numReadonlyUnsignedAccounts: bytes[cursor.value++],
  };
  if (header.numRequiredSignatures !== 1)
    throw new Error('Loopscale deposit must require exactly one wallet signature');
  const accountCount = readShortVector(bytes, cursor);
  if (accountCount < 1 || accountCount > 256)
    throw new Error('Loopscale message has an invalid static account set');
  const accountKeys = Array.from({ length: accountCount }, () => readPublicKey(bytes, cursor));
  const recentBlockhash = readPublicKey(bytes, cursor);
  const instructionCount = readShortVector(bytes, cursor);
  if (instructionCount < 1 || instructionCount > 64)
    throw new Error('Loopscale message has an invalid instruction count');
  const instructions = Array.from({ length: instructionCount }, () => {
    if (cursor.value >= bytes.length)
      throw new Error('Loopscale transaction instruction is truncated');
    const programIdIndex = bytes[cursor.value++];
    const accountLength = readShortVector(bytes, cursor);
    const accountIndexes = Array.from(readBytes(bytes, cursor, accountLength));
    const dataLength = readShortVector(bytes, cursor);
    return {
      programIdIndex,
      accountIndexes,
      data: encodeInstructionData(readBytes(bytes, cursor, dataLength)),
    };
  });
  const addressTableLookups: SolanaLendingTransaction['addressTableLookups'] = [];
  const writable: string[] = [];
  const readonly: string[] = [];
  if (messageVersion === 'v0') {
    const lookupCount = readShortVector(bytes, cursor);
    if (lookupCount > 32) throw new Error('Loopscale message has too many address lookup tables');
    for (let index = 0; index < lookupCount; index += 1) {
      const accountKey = readPublicKey(bytes, cursor);
      const writableIndexes = Array.from(readBytes(bytes, cursor, readShortVector(bytes, cursor)));
      const readonlyIndexes = Array.from(readBytes(bytes, cursor, readShortVector(bytes, cursor)));
      const addresses = await resolveLookupTable(accountKey);
      if (
        !Array.isArray(addresses) ||
        addresses.some((address) => !SolanaPublicKeySchema.safeParse(address).success)
      ) {
        throw new Error('Loopscale address lookup table could not be resolved on Solana mainnet');
      }
      for (const tableIndex of [...writableIndexes, ...readonlyIndexes]) {
        if (!addresses[tableIndex])
          throw new Error('Loopscale lookup table referenced a missing address');
      }
      writable.push(...writableIndexes.map((tableIndex) => addresses[tableIndex]));
      readonly.push(...readonlyIndexes.map((tableIndex) => addresses[tableIndex]));
      addressTableLookups.push({ accountKey, writableIndexes, readonlyIndexes });
    }
  }
  if (cursor.value !== bytes.length)
    throw new Error('Loopscale transaction message has trailing bytes');
  return SolanaLendingTransactionSchema.parse({
    network: 'mainnet-beta',
    messageVersion,
    feePayer: accountKeys[0],
    recentBlockhash,
    header,
    accountKeys,
    addressTableLookups,
    loadedAddresses: { writable, readonly },
    instructions,
  });
}

async function rpc(endpoint: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: `insight-loopscale-${method}`, method, params }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Solana RPC ${method} returned HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (!isRecord(body) || body.error !== undefined || !('result' in body))
    throw new Error(`Solana RPC ${method} returned invalid JSON`);
  return body.result;
}
async function resolveMainnetLookupTable(address: string, endpoints: string[]): Promise<string[]> {
  let last: unknown;
  for (const endpoint of endpoints) {
    try {
      if ((await rpc(endpoint, 'getGenesisHash', [])) !== MAINNET_GENESIS_HASH) continue;
      const result = await rpc(endpoint, 'getAccountInfo', [
        address,
        { encoding: 'base64', commitment: 'confirmed' },
      ]);
      if (
        !isRecord(result) ||
        !isRecord(result.value) ||
        !Array.isArray(result.value.data) ||
        typeof result.value.data[0] !== 'string'
      ) {
        throw new Error('Solana RPC returned no address lookup table account');
      }
      const data = Uint8Array.from(Buffer.from(result.value.data[0], 'base64'));
      // AddressLookupTableMeta occupies 56 bytes; the remainder is 32-byte keys.
      if (data.length < 56 || (data.length - 56) % 32 !== 0)
        throw new Error('Invalid address lookup table account data');
      const addresses: string[] = [];
      for (let offset = 56; offset < data.length; offset += 32)
        addresses.push(base58(data.slice(offset, offset + 32)));
      return addresses;
    } catch (error) {
      last = error;
    }
  }
  throw new Error(
    last instanceof Error ? last.message : 'No Solana mainnet lookup table RPC was available'
  );
}
function oracleSymbol(value: string): string {
  const symbol = value.trim().toUpperCase();
  return symbol === 'WSOL' ? 'SOL' : symbol === 'WBTC' ? 'BTC' : symbol === 'WETH' ? 'ETH' : symbol;
}
function summarize(result: PreTradeSafetyResult): OracleCheckSummary {
  return {
    verdict: result.verdict,
    maxDeviationPct: result.maxDeviationPct,
    staleDataRisk: result.staleDataRisk,
    participantCount: result.participantCount,
    attestationUid: result.attestation?.uid ?? null,
    attester: result.attestation?.attester ?? null,
  };
}
function blocksOracle(result: PreTradeSafetyResult): boolean {
  return result.verdict === 'DANGER' || result.verdict === 'BLOCK';
}
const unavailableOracle: OracleCheckSummary = {
  verdict: 'UNAVAILABLE',
  maxDeviationPct: null,
  staleDataRisk: null,
  participantCount: null,
  attestationUid: null,
  attester: null,
};
async function postJson(
  fetchImpl: typeof fetch,
  path: string,
  init: RequestInit
): Promise<unknown> {
  const response = await fetchImpl(`${LOOPSCALE_TARS_API}${path}`, {
    ...init,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Loopscale API ${path} returned HTTP ${response.status}`);
  return response.json();
}
async function simulateLoopscaleMessage(
  transaction: SolanaLendingTransaction
): Promise<SolanaLendingSimulation> {
  const endpoints = getRpcEndpoints(0);
  if (!endpoints) throw new Error('No Solana mainnet RPC endpoint is configured');
  const result = await simulateSolanaTransaction({
    transactionBase64: serializeUnsignedSolanaLendingTransaction(transaction),
    endpoints,
  });
  if (!result.ok) throw new Error(result.message);
  const payload: SolanaSimulationPayload = result.payload;
  return {
    network: payload.network,
    messageHash: payload.messageHash,
    simulationSlot: payload.simulationSlot,
    simulatedAt: payload.simulatedAt,
    status: payload.status,
    unitsConsumed: payload.unitsConsumed,
    feeLamports: payload.feeLamports,
  };
}

/** Build, resolve, simulate, and assess one official Loopscale lending-vault deposit. */
export async function prepareLoopscaleVaultDeposit(
  rawInput: LoopscaleVaultDepositInput,
  dependencies: LoopscaleVaultDepositDependencies = {}
): Promise<LoopscalePreparedVaultDeposit> {
  const input = LoopscaleVaultDepositInputSchema.parse(rawInput);
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const reasons: string[] = [];
  let transaction: SolanaLendingTransaction | null = null;
  let exactAction: SolanaLendingDecodedAction | null = null;
  let simulation: SolanaLendingSimulation | null = null;
  let protocolStatus: 'VERIFIED' | 'UNAVAILABLE' | 'INVALID' = 'INVALID';
  let accountChecks: SolanaProtocolAccountCheck[] = [];
  let collateral: OracleCheckSummary = unavailableOracle;
  let loan: OracleCheckSummary = unavailableOracle;
  let verdict: 'ALLOW' | 'CAUTION' | 'BLOCK' = 'ALLOW';

  try {
    const info = await postJson(fetchImpl, '/markets/lending_vaults/info', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ page: 0, pageSize: 1, vaultAddresses: [input.vault] }),
    });
    const row =
      isRecord(info) &&
      Array.isArray(info.lendVaults) &&
      info.lendVaults.length === 1 &&
      isRecord(info.lendVaults[0])
        ? info.lendVaults[0]
        : null;
    const vault = row && isRecord(row.vault) ? (row.vault as unknown as LiveVault['vault']) : null;
    const pause = row && isRecord(row.pause) ? (row.pause as unknown as LiveVault['pause']) : null;
    if (
      !vault ||
      !pause ||
      vault.address !== input.vault ||
      vault.principalMint !== input.assetMint ||
      vault.depositsEnabled !== true ||
      pause.depositsPaused !== false
    ) {
      throw new Error(
        'Loopscale live vault metadata does not match the requested enabled principal-mint deposit'
      );
    }
    const built = await postJson(fetchImpl, '/markets/lending_vaults/deposit', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'User-Wallet': input.wallet },
      body: JSON.stringify({
        vault: input.vault,
        principalAmount: input.principalAmount,
        minLpAmount: input.minLpAmount,
        depositOnly: true,
      }),
    });
    if (
      !isRecord(built) ||
      !isRecord(built.transaction) ||
      !Array.isArray(built.transaction.signatures) ||
      typeof built.transaction.message !== 'string' ||
      typeof built.stakeAccount !== 'string' ||
      !SolanaPublicKeySchema.safeParse(built.stakeAccount).success ||
      (built.preTransactions !== undefined &&
        (!Array.isArray(built.preTransactions) || built.preTransactions.length !== 0))
    ) {
      throw new Error('Loopscale API returned a deposit bundle outside the single-message profile');
    }
    const endpoints = dependencies.rpcEndpoints ?? getRpcEndpoints(0);
    if (!endpoints && !dependencies.resolveLookupTable)
      throw new Error('No Solana mainnet RPC endpoint is configured');
    transaction = await parseLoopscaleMessage(
      built.transaction.message,
      dependencies.resolveLookupTable ??
        ((address) => resolveMainnetLookupTable(address, endpoints!))
    );
    if (transaction.feePayer !== input.wallet)
      throw new Error('Loopscale-built message fee payer does not match the requested wallet');
    const messageHash =
      `0x${createHash('sha256').update(Buffer.from(built.transaction.message, 'base64')).digest('hex')}` as `0x${string}`;
    exactAction = decodeSolanaLendingExactCall(transaction, {
      protocolId: 'loopscale-vault',
      action: 'supply',
      collateralSymbol: input.collateralSymbol,
      loanSymbol: input.loanSymbol,
      assetMint: input.assetMint,
      loopscaleVaultAddress: input.vault,
      loopscaleStakeAccount: built.stakeAccount,
      loopscaleMessageHash: messageHash,
      loopscaleAmount: input.principalAmount,
    });
    protocolStatus = 'VERIFIED';
    accountChecks = [
      { address: input.vault, role: 'market-or-group', owner: null, executable: null },
    ];
    simulation = await (dependencies.simulate ?? simulateLoopscaleMessage)(transaction);
    if (
      simulation.status !== 'SIMULATED' ||
      simulation.messageHash.toLowerCase() !== exactAction.messageHash.toLowerCase()
    ) {
      throw new Error('The Loopscale-built message did not pass exact Solana simulation');
    }
  } catch (error) {
    verdict = 'BLOCK';
    reasons.push(
      `Loopscale vault deposit could not be built and validated: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  try {
    const checkOracle = dependencies.checkOracle ?? preTradeSafetyCheck;
    const [collateralResult, loanResult] = await Promise.all([
      checkOracle({
        asset: oracleSymbol(input.collateralSymbol),
        chainId: 0,
        action: 'lend',
        tradeAmountUsd: input.collateralValueUsd,
        schemaVersion: 3,
      }),
      checkOracle({
        asset: oracleSymbol(input.loanSymbol),
        chainId: 0,
        action: 'lend',
        tradeAmountUsd: 1,
        schemaVersion: 3,
      }),
    ]);
    collateral = summarize(collateralResult);
    loan = summarize(loanResult);
    if (blocksOracle(collateralResult) || blocksOracle(loanResult)) {
      verdict = 'BLOCK';
      reasons.push('At least one vault asset oracle assessment is DANGER or BLOCK.');
    } else if (
      (collateralResult.verdict === 'CAUTION' || loanResult.verdict === 'CAUTION') &&
      verdict !== 'BLOCK'
    ) {
      verdict = 'CAUTION';
      reasons.push('At least one vault asset oracle assessment requires review before execution.');
    }
  } catch (error) {
    verdict = 'BLOCK';
    reasons.push(
      `Required oracle safety evidence is unavailable: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!transaction || !exactAction || !simulation || protocolStatus !== 'VERIFIED')
    verdict = 'BLOCK';
  if (reasons.length === 0)
    reasons.push(
      'Loopscale live vault metadata, API-built exact message, lookup tables, simulation, and oracle checks passed.'
    );
  const guard: SolanaLendingGuardResult = {
    schema: 'insight.solana-lending-guard.v1',
    verdict,
    chainId: 0,
    chainRef: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    protocolId: 'loopscale-vault',
    action: 'supply',
    evaluatedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
    scope: {
      transactionAuthority: 'none',
      valuation: 'caller_declared_post_action_usd',
      protocolRiskEnforcement: 'live_unsigned_transaction_simulation',
    },
    market: {
      collateralSymbol: input.collateralSymbol,
      loanSymbol: input.loanSymbol,
      parameterSource: 'protocol-simulation-live',
    },
    projected: { collateralValueUsd: input.collateralValueUsd, debtValueUsd: 0, ltv: 0 },
    exactAction,
    protocolChecks: { status: protocolStatus, accounts: accountChecks },
    simulation,
    oracleChecks: { collateral, loan },
    reasons,
    next: {
      execution: 'not_performed',
      priorSeal:
        'Bind only an ALLOW decision to this exact Loopscale-built Solana message through PriorSeal before user authorization.',
    },
  };
  return { guard, transaction };
}

/** Recover the exact parsed transaction from a successful Loopscale assessment. */
export function loopscaleTransactionFromDecisionInput(
  messageBase64: string,
  resolveLookupTable: (address: string) => Promise<string[]>
): Promise<SolanaLendingTransaction> {
  return parseLoopscaleMessage(messageBase64, resolveLookupTable);
}
