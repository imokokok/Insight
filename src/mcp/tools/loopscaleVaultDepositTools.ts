import {
  LoopscaleVaultDepositInputSchema,
  prepareLoopscaleVaultDeposit,
} from '@/lib/lending/loopscaleVaultDeposit';
import { createSolanaLendingGuardDecision } from '@/lib/lending/solanaLendingGuardAttestation';

import type { McpToolDefinition } from './types';

/** Build and assess one official Loopscale lending-vault deposit without execution authority. */
export const loopscaleVaultDepositTool: McpToolDefinition<typeof LoopscaleVaultDepositInputSchema> =
  {
    name: 'loopscale_vault_deposit',
    description:
      'Build a single Solana mainnet Loopscale lending-vault deposit with Loopscale’s official production API, verify the live vault and principal mint, resolve every address lookup table, simulate the exact unsigned message, check oracle evidence, and return short-lived Insight evidence for PriorSeal. It does not sign, authorize, or broadcast. Deposit bundles requiring preliminary transactions are rejected rather than partially attested.',
    parameters: LoopscaleVaultDepositInputSchema,
    handler: async (input) => {
      const prepared = await prepareLoopscaleVaultDeposit(input);
      const decision = prepared.transaction
        ? createSolanaLendingGuardDecision(prepared.guard, prepared.transaction)
        : null;
      return [
        '**Loopscale Vault Deposit Guard**',
        `- Decision: **${prepared.guard.verdict}**`,
        `- Exact message: ${prepared.guard.exactAction?.messageHash ?? 'not accepted'}`,
        `- Protocol simulation: ${prepared.guard.simulation?.status ?? 'not run'}`,
        `- Insight attestation: ${decision?.attestation ? `available until ${new Date(decision.attestation.payload.validUntil * 1000).toISOString()}` : 'unavailable (do not use as execution evidence)'}`,
        '',
        '**Reasons:**',
        ...prepared.guard.reasons.map((reason) => `- ${reason}`),
        '',
        'Scope: this decision is read-only and binds only the exact official Loopscale-built Solana message. It never signs, submits, or authorizes a transaction.',
        '```json',
        JSON.stringify(decision ?? prepared.guard),
        '```',
      ].join('\n');
    },
  };
