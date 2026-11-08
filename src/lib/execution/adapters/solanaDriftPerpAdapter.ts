/**
 * Solana Drift perpetual-order adapter.
 *
 * The artifact is a Borsh instruction fragment, not a message: remaining Drift
 * accounts are caller-supplied, so the payload has no `messageHash` and the
 * state is `REQUIRES_COMPLETION` when the envelope verdict allows signing.
 */

import { createHash } from 'node:crypto';

import {
  prepareSolanaDriftPerpOrder,
  type SolanaDriftPerpOrderPayload,
  type SolanaDriftPerpOrderRequest,
} from '@/lib/dex/solanaDriftPerpOrder';

import { noVenueFeeCommercialTerms } from '../commerce';

import { createPreparedExecution, type ExecutionAdapter } from './contracts';

export const SOLANA_DRIFT_PERPS_ADAPTER_ID = 'insight.solana.drift-perp-order.v1';

function sha256Hex(value: string): `0x${string}` {
  return `0x${createHash('sha256').update(value).digest('hex')}`;
}

export const solanaDriftPerpAdapter: ExecutionAdapter<
  SolanaDriftPerpOrderRequest,
  SolanaDriftPerpOrderPayload
> = {
  id: SOLANA_DRIFT_PERPS_ADAPTER_ID,
  family: 'solana',
  supportsObservation: false,
  async preflight(request) {
    const native = await prepareSolanaDriftPerpOrder(request);
    const state = native.verdict === 'READY_TO_SIGN' ? 'REQUIRES_COMPLETION' : 'BLOCK';
    const instruction = native.instruction;
    const observedAt = native.riskVerdictRef.evaluatedAt ?? new Date().toISOString();
    // Blocked orders carry no instruction, so the intent binds the refusal.
    const digest =
      instruction?.dataHash ??
      sha256Hex(JSON.stringify({ adapterId: this.id, state, reasons: native.blockingReasons }));
    return createPreparedExecution({
      schema: 'insight.prepared-execution.v1',
      adapterId: this.id,
      state,
      authorization: 'user-controlled',
      intent: { algorithm: 'sha256', digest },
      observedAt,
      expiresAt: native.orderExpiresAt,
      validityAnchor: native.orderExpiresAt
        ? { kind: 'timestamp', expiresAt: native.orderExpiresAt }
        : null,
      evidence: [
        {
          kind: 'solana-perp-guard-verdict',
          observedAt,
          source: native.riskVerdictRef.source,
        },
      ],
      caveats: [...native.blockingReasons, ...native.caveats],
      commerce: noVenueFeeCommercialTerms(),
      payload:
        state === 'BLOCK' || instruction === null
          ? null
          : {
              kind: 'solana-instruction',
              network: native.network,
              programId: instruction.programId,
              discriminator: instruction.discriminator,
              dataBase58: instruction.dataBase58,
              dataBase64: instruction.dataBase64,
              dataHash: instruction.dataHash,
              accounts: instruction.accounts.map((account) => ({
                pubkey: account.address,
                isSigner: account.isSigner,
                isWritable: account.isWritable,
              })),
              requiresCallerCompletion: true,
              requiredInputs: ['remaining-drift-accounts', 'recent-blockhash'],
            },
      native,
    });
  },
};
