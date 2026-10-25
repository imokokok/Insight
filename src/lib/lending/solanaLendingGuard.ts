/**
 * Read-only, exact-transaction Lending Guard for Kamino Lend and Marginfi v2
 * on Solana mainnet.  The protocol itself is simulated before any ALLOW: this
 * avoids replacing its position-health and reserve checks with guessed SDK
 * math.  Every transport or protocol-read failure closes the decision.
 */

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
  KAMINO_LEND_PROGRAM_ID,
  MARGINFI_V2_PROGRAM_ID,
  SolanaLendingActionSchema,
  SolanaLendingProtocolIdSchema,
  SolanaLendingTransactionSchema,
  decodeSolanaLendingExactCall,
  serializeUnsignedSolanaLendingTransaction,
  type SolanaLendingAction,
  type SolanaLendingDecodedAction,
  type SolanaLendingProtocolId,
  type SolanaLendingTransaction,
} from './solanaLendingAction';

export const SolanaLendingGuardInputSchema = z
  .object({
    protocolId: SolanaLendingProtocolIdSchema,
    action: SolanaLendingActionSchema,
    collateralSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    loanSymbol: z.string().regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/),
    collateralValueUsd: z.number().finite().positive().max(1_000_000_000_000),
    debtValueUsd: z.number().finite().min(0).max(1_000_000_000_000),
  })
  .strict();
export type SolanaLendingGuardInput = z.infer<typeof SolanaLendingGuardInputSchema>;

export const SolanaLendingGuardExactInputSchema = z
  .object({ guard: SolanaLendingGuardInputSchema, transaction: SolanaLendingTransactionSchema })
  .strict();
export type SolanaLendingGuardExactInput = z.infer<typeof SolanaLendingGuardExactInputSchema>;

export type SolanaLendingGuardVerdict = 'ALLOW' | 'CAUTION' | 'BLOCK';
type OracleCheckSummary = {
  verdict: PreTradeSafetyResult['verdict'] | 'UNAVAILABLE';
  maxDeviationPct: number | null;
  staleDataRisk: boolean | null;
  participantCount: number | null;
  attestationUid: string | null;
  attester: string | null;
};
export type SolanaProtocolAccountCheck = {
  address: string;
  role: 'program' | 'market-or-group' | 'reserve-or-bank' | 'position';
  owner: string | null;
  executable: boolean | null;
};
export type SolanaLendingSimulation = Pick<
  SolanaSimulationPayload,
  | 'network'
  | 'messageHash'
  | 'simulationSlot'
  | 'simulatedAt'
  | 'status'
  | 'unitsConsumed'
  | 'feeLamports'
>;

export interface SolanaLendingGuardResult {
  schema: 'insight.solana-lending-guard.v1';
  verdict: SolanaLendingGuardVerdict;
  chainId: 0;
  chainRef: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
  protocolId: SolanaLendingProtocolId;
  action: SolanaLendingAction;
  evaluatedAt: string;
  scope: {
    transactionAuthority: 'none';
    valuation: 'caller_declared_post_action_usd';
    protocolRiskEnforcement: 'live_unsigned_transaction_simulation';
  };
  market: {
    collateralSymbol: string;
    loanSymbol: string;
    parameterSource: 'protocol-simulation-live';
  };
  projected: { collateralValueUsd: number; debtValueUsd: number; ltv: number };
  exactAction: SolanaLendingDecodedAction | null;
  protocolChecks: {
    status: 'VERIFIED' | 'UNAVAILABLE' | 'INVALID';
    accounts: SolanaProtocolAccountCheck[];
  };
  simulation: SolanaLendingSimulation | null;
  oracleChecks: { collateral: OracleCheckSummary; loan: OracleCheckSummary };
  reasons: string[];
  next: { execution: 'not_performed'; priorSeal: string };
}

export interface SolanaLendingGuardDependencies {
  checkOracle?: typeof preTradeSafetyCheck;
  verifyProtocolAccounts?: (
    action: SolanaLendingDecodedAction
  ) => Promise<SolanaProtocolAccountCheck[]>;
  simulate?: (transaction: SolanaLendingTransaction) => Promise<SolanaLendingSimulation>;
  now?: () => Date;
}

function oracleSymbol(value: string): string {
  const symbol = value.trim().toUpperCase();
  if (symbol === 'WSOL') return 'SOL';
  if (symbol === 'WBTC') return 'BTC';
  if (symbol === 'WETH') return 'ETH';
  return symbol;
}
function blocksOracle(result: PreTradeSafetyResult): boolean {
  return result.verdict === 'DANGER' || result.verdict === 'BLOCK';
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
const UNAVAILABLE_ORACLE: OracleCheckSummary = {
  verdict: 'UNAVAILABLE',
  maxDeviationPct: null,
  staleDataRisk: null,
  participantCount: null,
  attestationUid: null,
  attester: null,
};

/** Evaluate and simulate a sole direct lending instruction without receiving execution authority. */
export async function assessSolanaLendingGuard(
  rawInput: SolanaLendingGuardInput,
  rawTransaction: SolanaLendingTransaction,
  dependencies: SolanaLendingGuardDependencies = {}
): Promise<SolanaLendingGuardResult> {
  const input = SolanaLendingGuardInputSchema.parse(rawInput);
  const transaction = SolanaLendingTransactionSchema.parse(rawTransaction);
  const reasons: string[] = [];
  let exactAction: SolanaLendingDecodedAction | null = null;
  let accountChecks: SolanaProtocolAccountCheck[] = [];
  let protocolStatus: SolanaLendingGuardResult['protocolChecks']['status'] = 'INVALID';
  let simulation: SolanaLendingSimulation | null = null;
  let collateral: OracleCheckSummary = UNAVAILABLE_ORACLE;
  let loan: OracleCheckSummary = UNAVAILABLE_ORACLE;
  let verdict: SolanaLendingGuardVerdict = 'ALLOW';

  try {
    exactAction = decodeSolanaLendingExactCall(transaction, input);
  } catch (error) {
    verdict = 'BLOCK';
    reasons.push(
      `The transaction is outside the reviewed direct lending profile: ${message(error)}`
    );
  }

  const checkOracle = dependencies.checkOracle ?? preTradeSafetyCheck;
  try {
    const [collateralResult, loanResult] = await Promise.all([
      checkOracle({
        asset: oracleSymbol(input.collateralSymbol),
        chainId: 0,
        action: input.action === 'borrow' ? 'borrow' : 'lend',
        tradeAmountUsd: input.collateralValueUsd,
        schemaVersion: 3,
      }),
      checkOracle({
        asset: oracleSymbol(input.loanSymbol),
        chainId: 0,
        action: input.action === 'borrow' ? 'borrow' : 'lend',
        tradeAmountUsd: Math.max(input.debtValueUsd, 1),
        schemaVersion: 3,
      }),
    ]);
    collateral = summarize(collateralResult);
    loan = summarize(loanResult);
    if (blocksOracle(collateralResult) || blocksOracle(loanResult)) {
      verdict = 'BLOCK';
      reasons.push('At least one collateral or loan oracle assessment is DANGER or BLOCK.');
    } else if (
      (collateralResult.verdict === 'CAUTION' || loanResult.verdict === 'CAUTION') &&
      verdict !== 'BLOCK'
    ) {
      verdict = 'CAUTION';
      reasons.push('At least one oracle assessment requires review before execution.');
    }
  } catch (error) {
    verdict = 'BLOCK';
    reasons.push(`Required oracle safety evidence is unavailable: ${message(error)}`);
  }

  if (exactAction) {
    try {
      accountChecks = await (dependencies.verifyProtocolAccounts ?? verifyLiveProtocolAccounts)(
        exactAction
      );
      protocolStatus = 'VERIFIED';
    } catch (error) {
      protocolStatus = 'UNAVAILABLE';
      verdict = 'BLOCK';
      reasons.push(`Reviewed protocol accounts could not be verified live: ${message(error)}`);
    }
    try {
      simulation = await (dependencies.simulate ?? simulateLiveTransaction)(transaction);
      if (simulation.status !== 'SIMULATED')
        throw new Error('Solana RPC reported a failed protocol simulation');
      if (simulation.messageHash !== exactAction.messageHash)
        throw new Error('Solana RPC simulation is not for the exact reviewed message');
    } catch (error) {
      verdict = 'BLOCK';
      reasons.push(
        `The exact unsigned transaction did not pass live protocol simulation: ${message(error)}`
      );
    }
  }

  if (!exactAction || protocolStatus !== 'VERIFIED' || !simulation) verdict = 'BLOCK';
  if (reasons.length === 0) {
    reasons.push(
      'Exact direct call, program-owned accounts, live protocol simulation, and both oracle checks passed.'
    );
  }
  return {
    schema: 'insight.solana-lending-guard.v1',
    verdict,
    chainId: 0,
    chainRef: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    protocolId: input.protocolId,
    action: input.action,
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
    projected: {
      collateralValueUsd: input.collateralValueUsd,
      debtValueUsd: input.debtValueUsd,
      ltv: input.debtValueUsd / input.collateralValueUsd,
    },
    exactAction,
    protocolChecks: { status: protocolStatus, accounts: accountChecks },
    simulation,
    oracleChecks: { collateral, loan },
    reasons,
    next: {
      execution: 'not_performed',
      priorSeal:
        'Bind only an ALLOW decision to this exact Solana message through PriorSeal before user authorization.',
    },
  };
}

async function simulateLiveTransaction(
  transaction: SolanaLendingTransaction
): Promise<SolanaLendingSimulation> {
  const endpoints = getRpcEndpoints(0);
  if (!endpoints) throw new Error('No Solana mainnet RPC endpoint is configured');
  const result = await simulateSolanaTransaction({
    transactionBase64: serializeUnsignedSolanaLendingTransaction(transaction),
    endpoints,
  });
  if (!result.ok) throw new Error(result.message);
  const { payload } = result;
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

async function verifyLiveProtocolAccounts(
  action: SolanaLendingDecodedAction
): Promise<SolanaProtocolAccountCheck[]> {
  const endpoints = getRpcEndpoints(0);
  if (!endpoints) throw new Error('No Solana mainnet RPC endpoint is configured');
  const checks: Array<{
    address: string;
    role: SolanaProtocolAccountCheck['role'];
    expectedOwner: string | null;
  }> = [
    { address: action.programId, role: 'program', expectedOwner: null },
    { address: action.marketId, role: 'market-or-group', expectedOwner: action.programId },
    { address: action.reserveOrBank, role: 'reserve-or-bank', expectedOwner: action.programId },
    ...(action.positionAccount
      ? [
          {
            address: action.positionAccount,
            role: 'position' as const,
            expectedOwner: action.programId,
          },
        ]
      : []),
  ];
  const output: SolanaProtocolAccountCheck[] = [];
  for (const check of checks) {
    const account = await getMainnetAccountInfo(check.address, endpoints);
    const owner = typeof account.owner === 'string' ? account.owner : null;
    const executable = typeof account.executable === 'boolean' ? account.executable : null;
    if (check.role === 'program') {
      if (executable !== true) throw new Error('Reviewed program account is no longer executable');
    } else if (owner !== check.expectedOwner) {
      throw new Error(`Reviewed ${check.role} is not owned by the expected lending program`);
    }
    output.push({ address: check.address, role: check.role, owner, executable });
  }
  return output;
}

async function getMainnetAccountInfo(
  address: string,
  endpoints: string[]
): Promise<Record<string, unknown>> {
  let last: unknown;
  for (const endpoint of endpoints) {
    try {
      const genesis = await rpc(endpoint, 'getGenesisHash', []);
      if (genesis !== '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d') continue;
      const result = await rpc(endpoint, 'getAccountInfo', [
        address,
        { encoding: 'base64', commitment: 'confirmed', dataSlice: { offset: 0, length: 0 } },
      ]);
      if (!isRecord(result) || !isRecord(result.value))
        throw new Error('RPC returned no account information');
      return result.value;
    } catch (error) {
      last = error;
    }
  }
  throw new Error(last instanceof Error ? last.message : 'All Solana RPC account reads failed');
}
async function rpc(endpoint: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `insight-solana-lending-${method}`,
      method,
      params,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`RPC ${method} returned HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (!isRecord(body) || body.error !== undefined || !('result' in body))
    throw new Error(`RPC ${method} returned an invalid response`);
  return body.result;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export { KAMINO_LEND_PROGRAM_ID, MARGINFI_V2_PROGRAM_ID };
