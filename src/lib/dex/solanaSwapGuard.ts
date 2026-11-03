/**
 * Read-only, exact-transaction Swap Guard for the reviewed Orca Whirlpool
 * USDC/USDT lane on Solana mainnet.  The caller brings one fully-resolved
 * unsigned transaction containing exactly one legacy Whirlpool `swap`
 * instruction.  The guard re-derives every identity from live mainnet state
 * (pool account, vaults, user token accounts, tick array, oracle), prices the
 * pool from its own sqrtPrice, runs both oracle checks, and simulates the exact
 * unsigned message before any ALLOW.  Every transport or protocol-read failure
 * closes the decision.  The guard never signs, submits, or grants authority.
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
  serializeUnsignedSolanaLendingTransaction,
  SolanaLendingTransactionSchema,
  type SolanaLendingTransaction,
} from '@/lib/lending/solanaLendingAction';

import {
  reviewedSolanaSwapProfile,
  SOLANA_SWAP_GUARD_PROFILE_IDS,
  type SolanaSwapGuardDirection,
  type SolanaSwapGuardProfileId,
} from './solanaOrcaWhirlpool';
import { decodeSolanaSwapExactCall, type SolanaSwapDecodedAction } from './solanaSwapAction';

export const SOLANA_SWAP_GUARD_SCHEMA = 'insight.solana-swap-guard.v1' as const;
export const SOLANA_MAINNET_CHAIN_REF = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;
const SOLANA_MAINNET_GENESIS_HASH = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

export const SolanaSwapGuardInputSchema = z
  .object({
    profileId: z.enum(SOLANA_SWAP_GUARD_PROFILE_IDS),
    direction: z.enum(['usdc-to-usdt', 'usdt-to-usdc']),
    /** The USD price the agent used for the asset it is selling. */
    sourceDecisionPriceUsd: z.number().finite().positive().max(1_000_000_000),
    /** The USD price the agent used for the asset it expects to receive. */
    destinationDecisionPriceUsd: z.number().finite().positive().max(1_000_000_000),
    policy: z
      .object({
        maxSlippageBps: z.number().int().min(0).max(1_000),
        maxReferenceDeviationBps: z.number().int().min(0).max(1_000),
      })
      .strict(),
  })
  .strict();
export type SolanaSwapGuardInput = z.infer<typeof SolanaSwapGuardInputSchema>;

export const SolanaSwapGuardExactInputSchema = z
  .object({ guard: SolanaSwapGuardInputSchema, transaction: SolanaLendingTransactionSchema })
  .strict();
export type SolanaSwapGuardExactInput = z.infer<typeof SolanaSwapGuardExactInputSchema>;

export type SolanaSwapGuardVerdict = 'ALLOW' | 'CAUTION' | 'BLOCK';

type OracleCheckSummary = {
  verdict: PreTradeSafetyResult['verdict'] | 'UNAVAILABLE';
  maxDeviationPct: number | null;
  staleDataRisk: boolean | null;
  participantCount: number | null;
  attestationUid: string | null;
  attester: string | null;
};

export type SolanaSwapAccountCheck = {
  address: string;
  role: 'program' | 'pool' | 'vault' | 'user-token-account' | 'tick-array' | 'oracle';
  owner: string | null;
  executable: boolean | null;
};

export type SolanaPoolStateCheck = {
  owner: string | null;
  config: string;
  mintA: string;
  mintB: string;
  vaultA: string;
  vaultB: string;
  tickSpacing: number;
  feeRate: number;
  protocolFeeRate: number;
  sqrtPriceX64: string;
  /** Live pool price in destination-per-source human units, derived from sqrtPrice. */
  poolPrice: number | null;
};

export type SolanaSwapSimulation = Pick<
  SolanaSimulationPayload,
  | 'network'
  | 'messageHash'
  | 'simulationSlot'
  | 'simulatedAt'
  | 'status'
  | 'unitsConsumed'
  | 'feeLamports'
>;

export interface SolanaSwapGuardResult {
  schema: typeof SOLANA_SWAP_GUARD_SCHEMA;
  verdict: SolanaSwapGuardVerdict;
  chainId: 0;
  chainRef: typeof SOLANA_MAINNET_CHAIN_REF;
  profileId: SolanaSwapGuardProfileId;
  direction: SolanaSwapGuardDirection;
  evaluatedAt: string;
  scope: {
    transactionAuthority: 'none';
    tradeSize: 'decoded_exact_input_amount_and_declared_prices';
    protocolRiskEnforcement: 'live_unsigned_transaction_simulation';
  };
  policy: SolanaSwapGuardInput['policy'];
  market: {
    venue: 'orca-whirlpool';
    market: 'USDC/USDT';
    sourceAsset: 'USDC' | 'USDT';
    destinationAsset: 'USDC' | 'USDT';
    pool: string;
    parameterSource: 'whirlpool-account-live';
    exactSwap: {
      amountInRaw: string;
      minOutRaw: string;
      /** minOut / amount in human units; both reviewed mints use 6 decimals. */
      impliedMinDestinationPerSource: number | null;
      /** impliedMinDestinationPerSource × destinationDecisionPriceUsd. */
      impliedMinRoutePriceUsd: number | null;
    };
  };
  exactAction: SolanaSwapDecodedAction | null;
  protocolChecks: {
    status: 'VERIFIED' | 'UNAVAILABLE' | 'INVALID';
    accounts: SolanaSwapAccountCheck[];
    poolState: SolanaPoolStateCheck | null;
  };
  simulation: SolanaSwapSimulation | null;
  oracleChecks: { source: OracleCheckSummary; destination: OracleCheckSummary };
  reasons: string[];
  next: {
    execution: 'not_performed';
    priorSeal: string;
  };
}

export interface SolanaSwapGuardDependencies {
  checkOracle?: typeof preTradeSafetyCheck;
  /** Live account reads; defaults to Solana mainnet JSON-RPC with failover. */
  readMainnetAccount?: (
    address: string
  ) => Promise<{ owner: string; executable: boolean; data: Buffer }>;
  /** Live SPL token account reads; defaults to mainnet jsonParsed reads. */
  readSplTokenAccount?: (address: string) => Promise<{ owner: string; mint: string }>;
  simulate?: (transaction: SolanaLendingTransaction) => Promise<SolanaSwapSimulation>;
  now?: () => Date;
}

const UNAVAILABLE_ORACLE: OracleCheckSummary = {
  verdict: 'UNAVAILABLE',
  maxDeviationPct: null,
  staleDataRisk: null,
  participantCount: null,
  attestationUid: null,
  attester: null,
};

/** Evaluate and simulate one exact unsigned Whirlpool swap without execution authority. */
export async function assessSolanaSwapGuard(
  rawInput: SolanaSwapGuardInput,
  rawTransaction: SolanaLendingTransaction,
  dependencies: SolanaSwapGuardDependencies = {}
): Promise<SolanaSwapGuardResult> {
  const input = SolanaSwapGuardInputSchema.parse(rawInput);
  const profile = reviewedSolanaSwapProfile(input.profileId);
  const source = input.direction === 'usdc-to-usdt' ? profile.tokenA : profile.tokenB;
  const destination = input.direction === 'usdc-to-usdt' ? profile.tokenB : profile.tokenA;
  const reasons: string[] = [];
  let verdict: SolanaSwapGuardVerdict = 'ALLOW';

  let exactAction: SolanaSwapDecodedAction | null = null;
  try {
    exactAction = decodeSolanaSwapExactCall(rawTransaction, {
      profileId: input.profileId,
      direction: input.direction,
    });
  } catch (error) {
    verdict = 'BLOCK';
    reasons.push(
      `The transaction is outside the reviewed Whirlpool swap profile: ${message(error)}`
    );
  }

  let tradeAmountUsd: number | null = null;
  if (exactAction) {
    const economics = checkSwapEconomics(exactAction, input);
    reasons.push(...economics.reasons);
    if (economics.reasons.length > 0) verdict = 'BLOCK';
    else tradeAmountUsd = economics.tradeAmountUsd;
  }

  let sourceCheck: OracleCheckSummary = UNAVAILABLE_ORACLE;
  let destinationCheck: OracleCheckSummary = UNAVAILABLE_ORACLE;
  let consensusRatio: number | null = null;
  if (tradeAmountUsd !== null) {
    const oracleResult = await runOracleChecks(
      dependencies.checkOracle ?? preTradeSafetyCheck,
      input,
      source.symbol,
      destination.symbol,
      tradeAmountUsd
    );
    sourceCheck = oracleResult.source;
    destinationCheck = oracleResult.destination;
    consensusRatio = oracleResult.consensusRatio;
    reasons.push(...oracleResult.reasons);
    if (oracleResult.reasons.length > 0) verdict = oracleResult.verdict ?? 'BLOCK';
  }

  let accountChecks: SolanaSwapAccountCheck[] = [];
  let poolState: SolanaPoolStateCheck | null = null;
  if (exactAction && verdict !== 'BLOCK') {
    const live = await verifyLiveAccounts(dependencies, exactAction, profile);
    accountChecks = live.accounts;
    poolState = live.poolState;
    reasons.push(...live.reasons);
    if (live.reasons.length > 0) verdict = 'BLOCK';
    else if (poolState?.poolPrice != null && consensusRatio != null) {
      const deviationReason = checkPoolPriceDeviation(
        poolState.poolPrice,
        consensusRatio,
        input.policy.maxReferenceDeviationBps
      );
      if (deviationReason) {
        verdict = 'BLOCK';
        reasons.push(deviationReason);
      }
      const minOutReason = checkMinOutAgainstPoolPrice(
        exactAction,
        poolState.poolPrice,
        input.policy.maxSlippageBps
      );
      if (minOutReason) {
        verdict = 'BLOCK';
        reasons.push(minOutReason);
      }
    }
  }

  let simulation: SolanaSwapSimulation | null = null;
  if (exactAction && verdict !== 'BLOCK') {
    try {
      simulation = await (dependencies.simulate ?? simulateLiveTransaction)(rawTransaction);
      if (simulation.status !== 'SIMULATED') {
        throw new Error('Solana RPC reported a failed protocol simulation');
      }
      if (simulation.messageHash !== exactAction.messageHash) {
        throw new Error('Solana RPC simulation is not for the exact reviewed message');
      }
    } catch (error) {
      verdict = 'BLOCK';
      reasons.push(
        `The exact unsigned transaction did not pass live protocol simulation: ${message(error)}`
      );
    }
  }

  if (!exactAction || verdict === 'BLOCK') simulation = null;
  if (!exactAction) {
    accountChecks = [];
    poolState = null;
  }
  if (reasons.length === 0) {
    reasons.push(
      'Exact swap instruction, program-owned accounts, live pool price within reference tolerance, both oracle checks, and live protocol simulation passed.'
    );
  }

  return {
    schema: SOLANA_SWAP_GUARD_SCHEMA,
    verdict,
    chainId: 0,
    chainRef: SOLANA_MAINNET_CHAIN_REF,
    profileId: input.profileId,
    direction: input.direction,
    evaluatedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
    scope: {
      transactionAuthority: 'none',
      tradeSize: 'decoded_exact_input_amount_and_declared_prices',
      protocolRiskEnforcement: 'live_unsigned_transaction_simulation',
    },
    policy: input.policy,
    market: {
      venue: profile.venue,
      market: profile.market,
      sourceAsset: source.symbol,
      destinationAsset: destination.symbol,
      pool: profile.pool,
      parameterSource: 'whirlpool-account-live',
      exactSwap: exactAction
        ? {
            amountInRaw: exactAction.amount,
            minOutRaw: exactAction.minOut,
            impliedMinDestinationPerSource: Number(exactAction.minOut) / Number(exactAction.amount),
            impliedMinRoutePriceUsd:
              (Number(exactAction.minOut) / Number(exactAction.amount)) *
              input.destinationDecisionPriceUsd,
          }
        : {
            amountInRaw: '',
            minOutRaw: '',
            impliedMinDestinationPerSource: null,
            impliedMinRoutePriceUsd: null,
          },
    },
    exactAction,
    protocolChecks: {
      status: poolState ? 'VERIFIED' : exactAction ? 'UNAVAILABLE' : 'INVALID',
      accounts: accountChecks,
      poolState,
    },
    simulation,
    oracleChecks: { source: sourceCheck, destination: destinationCheck },
    reasons,
    next: {
      execution: 'not_performed',
      priorSeal:
        'Bind only an ALLOW decision to this exact Solana message through PriorSeal before user authorization.',
    },
  };
}

/** The caller's min-out must be consistent with its own declared prices. */
function checkSwapEconomics(
  action: SolanaSwapDecodedAction,
  input: SolanaSwapGuardInput
): { reasons: string[]; tradeAmountUsd: number | null } {
  const amount = Number(action.amount);
  const minOut = Number(action.minOut);
  if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(minOut)) {
    return { reasons: ['SWAP_AMOUNT_NOT_A_SAFE_INTEGER'], tradeAmountUsd: null };
  }
  const minOutPerSource = minOut / amount;
  const impliedMinRoutePriceUsd = minOutPerSource * input.destinationDecisionPriceUsd;
  const sourcePrice = input.sourceDecisionPriceUsd;
  if (!Number.isFinite(impliedMinRoutePriceUsd) || impliedMinRoutePriceUsd <= 0) {
    return { reasons: ['MIN_OUT_PRICE_INVALID'], tradeAmountUsd: null };
  }
  const tradeAmountUsd = (amount / 1e6) * sourcePrice;
  const deviationBps = (Math.abs(impliedMinRoutePriceUsd - sourcePrice) / sourcePrice) * 10_000;
  if (deviationBps > input.policy.maxSlippageBps) {
    return {
      reasons: ['MIN_OUT_INCONSISTENT_WITH_DECLARED_PRICES'],
      tradeAmountUsd: null,
    };
  }
  return { reasons: [], tradeAmountUsd };
}

async function runOracleChecks(
  checkOracle: typeof preTradeSafetyCheck,
  input: SolanaSwapGuardInput,
  sourceSymbol: string,
  destinationSymbol: string,
  tradeAmountUsd: number
): Promise<{
  source: OracleCheckSummary;
  destination: OracleCheckSummary;
  consensusRatio: number | null;
  reasons: string[];
  verdict?: SolanaSwapGuardVerdict;
}> {
  try {
    const [sourceResult, destinationResult] = await Promise.all([
      checkOracle({
        asset: sourceSymbol,
        destinationAsset: destinationSymbol,
        chainId: 0,
        action: 'swap',
        tradeAmountUsd,
        schemaVersion: 3,
      }),
      checkOracle({
        asset: destinationSymbol,
        destinationAsset: sourceSymbol,
        chainId: 0,
        action: 'swap',
        tradeAmountUsd,
        schemaVersion: 3,
      }),
    ]);
    const source = summarize(sourceResult);
    const destination = summarize(destinationResult);
    const reasons: string[] = [];
    let verdict: SolanaSwapGuardVerdict | undefined;
    if (
      sourceResult.verdict === 'DANGER' ||
      sourceResult.verdict === 'BLOCK' ||
      destinationResult.verdict === 'DANGER' ||
      destinationResult.verdict === 'BLOCK'
    ) {
      reasons.push('At least one source or destination oracle assessment is DANGER or BLOCK.');
      verdict = 'BLOCK';
    } else if (sourceResult.verdict === 'CAUTION' || destinationResult.verdict === 'CAUTION') {
      reasons.push('At least one oracle assessment requires review before execution.');
      verdict = 'CAUTION';
    }
    if (!Number.isFinite(sourceResult.consensusPrice) || sourceResult.consensusPrice <= 0) {
      reasons.push('SOURCE_CONSENSUS_PRICE_INVALID');
      verdict = 'BLOCK';
    }
    if (
      !Number.isFinite(destinationResult.consensusPrice) ||
      destinationResult.consensusPrice <= 0
    ) {
      reasons.push('DESTINATION_CONSENSUS_PRICE_INVALID');
      verdict = 'BLOCK';
    }
    const sourceDeviation = deviationBps(input.sourceDecisionPriceUsd, sourceResult.consensusPrice);
    const destinationDeviation = deviationBps(
      input.destinationDecisionPriceUsd,
      destinationResult.consensusPrice
    );
    if (sourceDeviation === null || sourceDeviation > input.policy.maxReferenceDeviationBps) {
      reasons.push('SOURCE_DECISION_PRICE_DEVIATION_EXCEEDED');
      verdict = 'BLOCK';
    }
    if (
      destinationDeviation === null ||
      destinationDeviation > input.policy.maxReferenceDeviationBps
    ) {
      reasons.push('DESTINATION_DECISION_PRICE_DEVIATION_EXCEEDED');
      verdict = 'BLOCK';
    }
    const consensusRatio =
      destinationResult.consensusPrice > 0
        ? sourceResult.consensusPrice / destinationResult.consensusPrice
        : null;
    return {
      source,
      destination,
      consensusRatio:
        consensusRatio !== null && Number.isFinite(consensusRatio) && consensusRatio > 0
          ? consensusRatio
          : null,
      reasons,
      verdict,
    };
  } catch (error) {
    return {
      source: UNAVAILABLE_ORACLE,
      destination: UNAVAILABLE_ORACLE,
      consensusRatio: null,
      reasons: [`Required oracle safety evidence is unavailable: ${message(error)}`],
      verdict: 'BLOCK',
    };
  }
}

/** Re-derive every reviewed identity from live mainnet state; fail closed. */
async function verifyLiveAccounts(
  dependencies: SolanaSwapGuardDependencies,
  action: SolanaSwapDecodedAction,
  profile: ReturnType<typeof reviewedSolanaSwapProfile>
): Promise<{
  accounts: SolanaSwapAccountCheck[];
  poolState: SolanaPoolStateCheck | null;
  reasons: string[];
}> {
  const readAccount = dependencies.readMainnetAccount ?? readMainnetAccountDefault;
  const readToken = dependencies.readSplTokenAccount ?? readSplTokenAccountDefault;
  const accounts: SolanaSwapAccountCheck[] = [];
  const push = (
    address: string,
    role: SolanaSwapAccountCheck['role'],
    owner: string,
    executable = false
  ) => accounts.push({ address, role, owner, executable });
  try {
    const program = await readAccount(action.programId);
    if (program.executable !== true) throw new Error('Reviewed program account is not executable');
    push(action.programId, 'program', program.owner, program.executable);

    const pool = await readAccount(action.pool);
    const decoded = decodeWhirlpoolState(pool.data);
    if (pool.owner !== profile.programId) {
      throw new Error('Reviewed pool account is not owned by the Whirlpool program');
    }
    if (
      decoded.config !== profile.whirlpoolsConfig ||
      decoded.mintA !== profile.tokenA.mint ||
      decoded.mintB !== profile.tokenB.mint ||
      decoded.vaultA !== profile.vaultA ||
      decoded.vaultB !== profile.vaultB ||
      decoded.tickSpacing !== profile.tickSpacing ||
      decoded.feeRate !== profile.feeRate
    ) {
      throw new Error('Live pool state no longer matches the reviewed profile identities');
    }
    push(action.pool, 'pool', pool.owner);

    const vaultInput = await readToken(action.inputVault);
    const vaultOutput = await readToken(action.outputVault);
    const expectedInputMint =
      action.direction === 'usdc-to-usdt' ? profile.tokenA.mint : profile.tokenB.mint;
    const expectedOutputMint =
      action.direction === 'usdc-to-usdt' ? profile.tokenB.mint : profile.tokenA.mint;
    if (vaultInput.owner !== action.pool || vaultInput.mint !== expectedInputMint) {
      throw new Error('Input vault is not the reviewed pool-owned vault for the source mint');
    }
    if (vaultOutput.owner !== action.pool || vaultOutput.mint !== expectedOutputMint) {
      throw new Error('Output vault is not the reviewed pool-owned vault for the destination mint');
    }
    push(action.inputVault, 'vault', vaultInput.owner);
    push(action.outputVault, 'vault', vaultOutput.owner);

    // The remaining static pins were already re-read via the pool state; the
    // tick array and oracle must simply still belong to the program.
    const tickArray = await readAccount(action.tickArray0);
    if (tickArray.owner !== profile.programId) {
      throw new Error('Tick array is not owned by the Whirlpool program');
    }
    push(action.tickArray0, 'tick-array', tickArray.owner);
    const oracle = await readAccount(action.oracle);
    if (oracle.owner !== profile.programId) {
      throw new Error('Whirlpool oracle account is not owned by the Whirlpool program');
    }
    push(action.oracle, 'oracle', oracle.owner);

    const inputAccount = await readToken(action.inputTokenAccount);
    const outputAccount = await readToken(action.outputTokenAccount);
    if (inputAccount.owner !== action.account || inputAccount.mint !== expectedInputMint) {
      throw new Error('Input token account owner or mint is outside the reviewed exact scope');
    }
    if (outputAccount.owner !== action.account || outputAccount.mint !== expectedOutputMint) {
      throw new Error('Output token account owner or mint is outside the reviewed exact scope');
    }
    push(action.inputTokenAccount, 'user-token-account', inputAccount.owner);
    push(action.outputTokenAccount, 'user-token-account', outputAccount.owner);

    return {
      accounts,
      poolState: {
        owner: pool.owner,
        config: decoded.config,
        mintA: decoded.mintA,
        mintB: decoded.mintB,
        vaultA: decoded.vaultA,
        vaultB: decoded.vaultB,
        tickSpacing: decoded.tickSpacing,
        feeRate: decoded.feeRate,
        protocolFeeRate: decoded.protocolFeeRate,
        sqrtPriceX64: decoded.sqrtPriceX64.toString(),
        poolPrice: whirlpoolPrice(decoded.sqrtPriceX64),
      },
      reasons: [],
    };
  } catch (error) {
    return {
      accounts,
      poolState: null,
      reasons: [`Reviewed swap accounts could not be verified live: ${message(error)}`],
    };
  }
}

function checkPoolPriceDeviation(
  poolPrice: number,
  consensusRatio: number,
  maxReferenceDeviationBps: number
): string | null {
  const deviationBpsValue = (Math.abs(poolPrice - consensusRatio) / consensusRatio) * 10_000;
  if (!Number.isFinite(deviationBpsValue) || deviationBpsValue > maxReferenceDeviationBps) {
    return 'POOL_PRICE_DEVIATION_EXCEEDED';
  }
  return null;
}

function checkMinOutAgainstPoolPrice(
  action: SolanaSwapDecodedAction,
  poolPrice: number,
  maxSlippageBps: number
): string | null {
  const minOutPerSource = Number(action.minOut) / Number(action.amount);
  const tolerance = 1 - maxSlippageBps / 10_000;
  if (!Number.isFinite(minOutPerSource) || minOutPerSource < poolPrice * tolerance) {
    return 'MIN_OUT_BELOW_POOL_PRICE_TOLERANCE';
  }
  return null;
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

function deviationBps(declared: number, consensus: number): number | null {
  if (
    !Number.isFinite(declared) ||
    declared <= 0 ||
    !Number.isFinite(consensus) ||
    consensus <= 0
  ) {
    return null;
  }
  return (Math.abs(declared - consensus) / consensus) * 10_000;
}

/**
 * Whirlpool PoolState layout (8-byte Anchor discriminator included):
 *   disc 8 | config 32 (8..40) | bump 1 | tickSpacing u16 (41) | seed 2 |
 *   feeRate u16 (45) | protocolFeeRate u16 (47) | liquidity u128 (49..65) |
 *   sqrtPrice u128 (65..81) | tickCurrentIndex i32 (81) | fees 8+8 |
 *   mintA 32 (101) | vaultA 32 (133) | feeGrowthA 16 | mintB 32 (181) |
 *   vaultB 32 (213) | ...
 */
export function decodeWhirlpoolState(data: Buffer): {
  config: string;
  mintA: string;
  mintB: string;
  vaultA: string;
  vaultB: string;
  tickSpacing: number;
  feeRate: number;
  protocolFeeRate: number;
  sqrtPriceX64: bigint;
} {
  return {
    config: base58Encode(data.subarray(8, 40)),
    tickSpacing: data.readUInt16LE(41),
    feeRate: data.readUInt16LE(45),
    protocolFeeRate: data.readUInt16LE(47),
    sqrtPriceX64: littleEndianUnsigned(data.subarray(65, 81)),
    mintA: base58Encode(data.subarray(101, 133)),
    vaultA: base58Encode(data.subarray(133, 165)),
    mintB: base58Encode(data.subarray(181, 213)),
    vaultB: base58Encode(data.subarray(213, 245)),
  };
}

/** Live pool price in destination-per-source for equal decimals: (sqrtPrice/2^64)^2. */
export function whirlpoolPrice(sqrtPriceX64: bigint): number | null {
  if (sqrtPriceX64 <= 0n) return null;
  const value = Number(sqrtPriceX64) / 2 ** 64;
  const price = value * value;
  return Number.isFinite(price) && price > 0 ? price : null;
}

async function simulateLiveTransaction(
  transaction: SolanaLendingTransaction
): Promise<SolanaSwapSimulation> {
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

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Encode(bytes: Uint8Array): string {
  const digits: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let out = '';
  for (const digit of digits) out = B58[digit] + out;
  for (const byte of bytes) {
    if (byte === 0) out = '1' + out;
    else break;
  }
  return out;
}

function littleEndianUnsigned(bytes: Uint8Array): bigint {
  return bytes.reduceRight((total, byte) => (total << 8n) | BigInt(byte), 0n);
}

async function rpc(endpoint: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: `insight-solana-swap-${method}`, method, params }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`RPC ${method} returned HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (typeof body !== 'object' || body === null || 'error' in body || !('result' in body)) {
    throw new Error(`RPC ${method} returned an invalid response`);
  }
  return (body as { result: unknown }).result;
}

async function readMainnetAccountDefault(
  address: string
): Promise<{ owner: string; executable: boolean; data: Buffer }> {
  const endpoints = getRpcEndpoints(0);
  if (!endpoints) throw new Error('No Solana mainnet RPC endpoint is configured');
  let last: unknown;
  for (const endpoint of endpoints) {
    try {
      const genesis = await rpc(endpoint, 'getGenesisHash', []);
      if (genesis !== SOLANA_MAINNET_GENESIS_HASH) continue;
      const result = await rpc(endpoint, 'getAccountInfo', [
        address,
        { encoding: 'base64', commitment: 'confirmed' },
      ]);
      if (
        typeof result !== 'object' ||
        result === null ||
        !('value' in result) ||
        typeof result.value !== 'object' ||
        result.value === null
      ) {
        throw new Error('RPC returned no account information');
      }
      const value = result.value as Record<string, unknown>;
      if (
        typeof value.owner !== 'string' ||
        typeof value.executable !== 'boolean' ||
        !Array.isArray(value.data) ||
        typeof value.data[0] !== 'string'
      ) {
        throw new Error('RPC account data is malformed');
      }
      return {
        owner: value.owner,
        executable: value.executable,
        data: Buffer.from(value.data[0], 'base64'),
      };
    } catch (error) {
      last = error;
    }
  }
  throw new Error(last instanceof Error ? last.message : 'All Solana RPC account reads failed');
}

async function readSplTokenAccountDefault(
  address: string
): Promise<{ owner: string; mint: string }> {
  const endpoints = getRpcEndpoints(0);
  if (!endpoints) throw new Error('No Solana mainnet RPC endpoint is configured');
  let last: unknown;
  for (const endpoint of endpoints) {
    try {
      const genesis = await rpc(endpoint, 'getGenesisHash', []);
      if (genesis !== SOLANA_MAINNET_GENESIS_HASH) continue;
      const result = await rpc(endpoint, 'getAccountInfo', [
        address,
        { encoding: 'jsonParsed', commitment: 'confirmed' },
      ]);
      const value = (
        result as { value?: { data?: { parsed?: { info?: Record<string, unknown> } } } }
      )?.value;
      const parsed = value?.data?.parsed?.info;
      if (typeof parsed?.owner !== 'string' || typeof parsed?.mint !== 'string') {
        throw new Error('RPC token account data is malformed');
      }
      return { owner: parsed.owner, mint: parsed.mint };
    } catch (error) {
      last = error;
    }
  }
  throw new Error(
    last instanceof Error ? last.message : 'All Solana RPC token-account reads failed'
  );
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
