import { executionAdapterRegistry } from '@/lib/execution/adapters';
import {
  SolanaLendingGuardExactInputSchema,
  type SolanaLendingGuardExactInput,
  type SolanaLendingGuardResult,
} from '@/lib/lending/solanaLendingGuard';
import { createSolanaLendingGuardDecision } from '@/lib/lending/solanaLendingGuardAttestation';

import type { McpToolDefinition } from './types';

/**
 * Agent-facing native Solana gate.  A complete unsigned message is required
 * so Insight can simulate protocol-native position health rather than trust a
 * claimed account snapshot.
 */
export const solanaLendingGuardTool: McpToolDefinition<typeof SolanaLendingGuardExactInputSchema> =
  {
    name: 'solana_lending_guard',
    description:
      'Create portable Insight risk evidence for exactly one unsigned direct Kamino Lend, Marginfi v2, Jupiter Lend Earn deposit, or Save Lend reserve-liquidity deposit instruction on Solana mainnet. Save additionally verifies the submitted asset mint against the live source SPL token account. It accepts no transaction authority, verifies reviewed program-owned accounts, simulates the full unsigned message, checks both assets’ oracle evidence, and returns ALLOW / CAUTION / BLOCK. An ALLOW still needs a separately user-authorized PriorSeal binding before execution.',
    parameters: SolanaLendingGuardExactInputSchema,
    handler: async ({ guard: input, transaction }) => {
      const prepared = await executionAdapterRegistry.preflight<
        SolanaLendingGuardExactInput,
        SolanaLendingGuardResult
      >('insight.solana.direct-lending-guard.v1', { guard: input, transaction });
      const guard = prepared.native;
      const decision = createSolanaLendingGuardDecision(guard, transaction);
      return [
        `**Solana Lending Guard: ${guard.protocolId} · ${guard.action}**`,
        `- Decision: **${guard.verdict}**`,
        `- Exact message: ${guard.exactAction?.messageHash ?? 'not accepted'}`,
        `- Protocol simulation: ${guard.simulation?.status ?? 'not run'}`,
        `- Collateral oracle: ${guard.oracleChecks.collateral.verdict}; loan oracle: ${guard.oracleChecks.loan.verdict}`,
        `- Insight attestation: ${decision.attestation ? `available until ${new Date(decision.attestation.payload.validUntil * 1000).toISOString()}` : 'unavailable (do not use as execution evidence)'}`,
        '',
        '**Reasons:**',
        ...guard.reasons.map((reason) => `- ${reason}`),
        '',
        'Scope: this decision is read-only and transaction-specific. It never signs, submits, or authorizes a transaction.',
        '```json',
        JSON.stringify(decision),
        '```',
      ].join('\n');
    },
  };
