/**
 * Solana Jupiter swap adapter.
 *
 * Jupiter returns a complete, unsigned versioned transaction, so this one maps
 * to `solana-message`. Its validity is anchored to `lastValidBlockHeight` and
 * the observed slot rather than a wall-clock timestamp.
 */

import { createHash } from 'node:crypto';

import {
  prepareSolanaJupiterSwap,
  type SolanaJupiterSwapRequest,
  type SolanaJupiterSwapResult,
} from '@/lib/dex/solanaJupiterSwap';

import { noVenueFeeCommercialTerms } from '../commerce';

import { createPreparedExecution, type ExecutionAdapter } from './contracts';

export const SOLANA_JUPITER_SWAP_ADAPTER_ID = 'insight.solana.jupiter-swap.v1';

function sha256OfBase64(value: string): `0x${string}` {
  return `0x${createHash('sha256').update(Buffer.from(value, 'base64')).digest('hex')}`;
}

function sha256Hex(value: string): `0x${string}` {
  return `0x${createHash('sha256').update(value).digest('hex')}`;
}

export const solanaJupiterSwapAdapter: ExecutionAdapter<
  SolanaJupiterSwapRequest,
  SolanaJupiterSwapResult
> = {
  id: SOLANA_JUPITER_SWAP_ADAPTER_ID,
  family: 'solana',
  supportsObservation: false,
  async preflight(request, options) {
    const native = await prepareSolanaJupiterSwap(request, { signal: options?.signal });
    const state = native.verdict === 'READY_TO_SIGN' ? 'READY' : 'BLOCK';
    const transaction = native.transaction;
    const quote = native.quote;
    const observedAt =
      quote?.quotedAt ?? native.riskVerdictRef?.evaluatedAt ?? new Date().toISOString();
    if (transaction !== null && quote === null) {
      throw new TypeError('A Jupiter transaction cannot be prepared without its quote context.');
    }
    // Blocked swaps carry no transaction, so the intent binds the refusal.
    const digest =
      transaction === null
        ? sha256Hex(JSON.stringify({ adapterId: this.id, state, reasons: native.blockingReasons }))
        : sha256OfBase64(transaction.base64);
    return createPreparedExecution({
      schema: 'insight.prepared-execution.v1',
      adapterId: this.id,
      state,
      authorization: 'user-controlled',
      intent: { algorithm: 'sha256', digest },
      observedAt,
      expiresAt: native.quoteExpiresAt,
      validityAnchor:
        transaction === null || quote === null
          ? null
          : {
              kind: 'solana-block-height',
              network: native.network,
              lastValidBlockHeight: transaction.lastValidBlockHeight,
              contextSlot: quote.contextSlot,
            },
      evidence: [
        {
          kind: 'jupiter-swap-quote',
          observedAt,
          source: 'jupiter-swap-api',
        },
      ],
      caveats: [...native.blockingReasons, ...native.caveats],
      commerce: noVenueFeeCommercialTerms(),
      payload:
        state === 'BLOCK' || transaction === null
          ? null
          : {
              kind: 'solana-message',
              network: native.network,
              transactionBase64: transaction.base64,
              // sha256 over the exact unsigned transaction bytes. It binds the
              // byte content only, not message-segment consistency, and it is
              // not signature-verifiable.
              transactionHash: digest,
              // Jupiter returns opaque versioned bytes and the shared layer has
              // no message parser, so the real message hash is explicitly
              // unavailable rather than approximated.
              messageHash: null,
            },
      native,
    });
  },
};
