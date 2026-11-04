import { z } from 'zod';

import {
  SolanaSwapGuardExactInputSchema,
  type SolanaSwapGuardExactInput,
  type SolanaSwapGuardResult,
} from '@/lib/dex/solanaSwapGuard';
import { createSolanaSwapGuardDecision } from '@/lib/dex/solanaSwapGuardAttestation';
import {
  settleSolanaSwapGuard,
  verifySolanaSwapGuardSettlement,
} from '@/lib/dex/solanaSwapGuardSettlement';
import { executionAdapterRegistry } from '@/lib/execution/adapters';

import { formatAsText } from './formatters';

import type { McpToolDefinition } from './types';

const SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;

export const SolanaSwapGuardSettlementInputSchema = z
  .object({
    decision: z.record(z.string(), z.unknown()),
    signature: z.string().regex(SIGNATURE),
  })
  .strict();

export type SolanaSwapGuardSettlementInput = z.infer<typeof SolanaSwapGuardSettlementInputSchema>;

export const SolanaSwapGuardVerificationInputSchema = z
  .object({ settlement: z.record(z.string(), z.unknown()) })
  .strict();

export type SolanaSwapGuardVerificationInput = z.infer<
  typeof SolanaSwapGuardVerificationInputSchema
>;

/**
 * One agent-facing boundary for the reviewed Orca Whirlpool USDC/USDT lane on
 * Solana mainnet.  The guard is exact-transaction: the caller brings the fully
 * resolved unsigned swap message, and the guard deliberately returns no
 * executable payload for CAUTION or BLOCK, so a caller cannot accidentally
 * treat risk evidence as permission to trade.
 */
export const solanaSwapGuardTool: McpToolDefinition<typeof SolanaSwapGuardExactInputSchema> = {
  name: 'solana_swap_guard',
  description:
    'Gate exactly one unsigned Orca Whirlpool swap on Solana mainnet: the reviewed USDC/USDT 0.01% pool (both directions). The caller supplies the fully resolved compiled unsigned transaction containing exactly one legacy Whirlpool swap instruction (no swapV2, no aggregators, no bundles). Insight canonical-decodes the instruction, re-verifies the pool, vaults, tick array, oracle, and both user token accounts from live mainnet state, prices the pool from its own sqrtPrice against independent oracle consensus, requires a positive otherAmountThreshold consistent with the declared decision prices, and simulates the exact unsigned message. ALLOW returns a short-lived signed decision bound to the exact message hash; CAUTION or BLOCK returns no executable payload. After settlement, pair the signed decision with the transaction signature via settle_solana_swap_guard. It does not sign, submit, relay, or authorize anything.',
  parameters: SolanaSwapGuardExactInputSchema,
  handler: async ({ guard: guardInput, transaction }) => {
    const prepared = await executionAdapterRegistry.preflight<
      SolanaSwapGuardExactInput,
      SolanaSwapGuardResult
    >('insight.solana.direct-swap-guard.v1', { guard: guardInput, transaction });
    const native = prepared.native;
    const decision = createSolanaSwapGuardDecision(native, transaction);
    return formatAsText({
      ...native,
      decision,
      agentInstructions:
        native.verdict === 'ALLOW' && decision.attestation !== null
          ? [
              'Present the signed Insight decision and the exact unsigned Solana message to the user before requesting any signature.',
              'Create one PriorSeal authorization bound to the exact message hash; do not modify any account, amount, or instruction after the decision.',
              'After settlement, preserve the signed decision and the transaction signature, then call settle_solana_swap_guard for the signed closure.',
            ]
          : native.verdict === 'ALLOW'
            ? [
                'Do not request a signature: this ALLOW has no trusted Insight attestation and cannot form a portable PriorSeal authorization binding.',
                'Configure and publish the Insight production attester, then obtain a fresh assessment; do not reuse this unsigned result.',
              ]
            : native.verdict === 'CAUTION'
              ? [
                  'Do not request a signature or submit this transaction automatically.',
                  'Explain the caution, then obtain a newly assessed proposal if the user chooses a different policy or trade.',
                ]
              : [
                  'Do not request a signature, submit the transaction, or bypass the result with a different route.',
                  'Create a separate assessment only after the underlying market, policy, or price inputs have materially changed.',
                ],
    });
  },
};

export const settleSolanaSwapGuardTool: McpToolDefinition<
  typeof SolanaSwapGuardSettlementInputSchema
> = {
  name: 'settle_solana_swap_guard',
  description:
    'Close the loop on a settled Solana Swap Guard swap. Present the signed guard decision the agent executed under plus the on-chain transaction signature. Insight verifies the decision, re-collects execution facts from Solana JSON-RPC, reconciles the observed SPL input and output balance deltas against the reviewed exact amounts (amountInRaw and the otherAmountThreshold minimum output), and returns a signed settlement bound to the decisionHash with an explicit status (SETTLED, REVERTED, or UNRECONCILED) and reconciliation code. A decision that does not verify is rejected. This is settlement evidence, not transaction authority, a price-correctness claim, or a guarantee of good timing.',
  parameters: SolanaSwapGuardSettlementInputSchema,
  handler: async (args) => {
    const result = await settleSolanaSwapGuard({
      decision: args.decision,
      signature: args.signature,
    });
    if (!result.ok) {
      throw new Error(`settle_solana_swap_guard failed (${result.code}): ${result.message}`);
    }
    if (result.settlement === null) {
      throw new Error(
        'settle_solana_swap_guard could not sign the settlement: the Insight Solana evidence signer is unavailable'
      );
    }
    return formatAsText({
      settlement: result.settlement,
      facts: {
        signature: result.facts.signature,
        status: result.facts.status,
        slot: result.facts.slot,
        sourceAmountRaw: result.facts.sourceAmountRaw,
        destinationAmountRaw: result.facts.destinationAmountRaw,
        feeLamports: result.facts.feeLamports,
      },
      verificationHint:
        'Verify the signed settlement independently via verify_solana_swap_guard_settlement with { settlement: <object> }.',
      agentInstructions: [
        'Preserve the signed settlement with the guard decision and the transaction signature; they form one evidence chain.',
        result.settlement.payload.status !== 'SETTLED'
          ? `Review the settlement before treating this closure as routine: ${result.settlement.payload.reconciliation}.`
          : 'The executed output met the guarded minimum output; the settlement is not a claim the price was optimal.',
      ],
    });
  },
};

export const verifySolanaSwapGuardSettlementTool: McpToolDefinition<
  typeof SolanaSwapGuardVerificationInputSchema
> = {
  name: 'verify_solana_swap_guard_settlement',
  description:
    'Independently verify a signed Solana Swap Guard settlement: structural shape, the Ed25519 attester signature, and attester trust against the published Insight public key. Returns valid/invalid with a machine-readable reason plus the signed decisionHash, transaction signature, status, and attester so a third party can detect two valid closures binding one decisionHash to different transactions. This checks the signature only; it does not re-read the chain.',
  parameters: SolanaSwapGuardVerificationInputSchema,
  handler: async (args) => {
    const verification = verifySolanaSwapGuardSettlement(args.settlement);
    return formatAsText({
      verification,
      note: 'valid=true means the settlement signature and integrity check out; it does not re-read the chain.',
    });
  },
};
