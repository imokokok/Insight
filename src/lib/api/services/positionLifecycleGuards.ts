/**
 * @fileoverview Bundled guard-family registry for Position Lifecycle Bundles.
 *
 * Maps a caller-chosen guard family onto the native assessor and its input
 * schema. The lifecycle service dispatches through this registry so a bundled
 * assessment is byte-for-byte the same evaluation the family's native REST
 * route performs — the bundle changes who pays and how, never what is judged.
 *
 * Kept separate from the lifecycle service so tests can inject fake assessors
 * without importing the six real guard modules (each pulls oracle and venue
 * clients).
 */

import { type z } from 'zod';

import type { PositionLifecycleGuardFamily } from '@/lib/billing/positionLifecycle';
import {
  assessBaseLendingGuard,
  BaseLendingGuardInputSchema,
} from '@/lib/lending/baseLendingGuard';
import {
  assessMonadLendingGuard,
  MonadLendingGuardInputSchema,
} from '@/lib/lending/monadLendingGuard';
import {
  assessMultichainEvmLendingGuard,
  MultichainEvmLendingGuardInputSchema,
} from '@/lib/lending/multichainEvmLendingGuard';
import {
  assessSolanaLendingGuard,
  SolanaLendingGuardInputSchema,
} from '@/lib/lending/solanaLendingGuard';
import { assessBasePerpGuard, BasePerpGuardInputSchema } from '@/lib/perps/basePerpGuard';
import { assessBnbPerpGuard, BnbPerpGuardInputSchema } from '@/lib/perps/bnbPerpGuard';
import {
  assessHyperliquidPerpGuard,
  HyperliquidPerpGuardInputSchema,
} from '@/lib/perps/hyperliquidPerpGuard';
import {
  assessSolanaPerpGuardExact,
  SolanaPerpGuardInputSchema,
} from '@/lib/perps/solanaPerpGuard';

export interface PositionLifecycleGuardFamilyEntry {
  /** Params schema — identical to the family's native route input schema. */
  paramsSchema: z.ZodTypeAny;
  /**
   * Set when the native assessor needs a second argument (the exact unsigned
   * transaction the guard evaluates and simulates). The bundled body must then
   * carry a `transaction` field alongside `params`; the assessor validates it
   * through the same schema the native route uses.
   */
  requiresTransaction?: boolean;
  /** Deliberately method-typed: bivariance lets the native typed assessors register. */
  assess(input: unknown, transaction?: unknown): Promise<unknown>;
}

/**
 * Family → assessor registry. Every entry parses its params through the SAME
 * schema the native route uses before dispatching, so a bundled assessment can
 * never accept a shape the native guard would reject.
 */
export const POSITION_LIFECYCLE_GUARD_REGISTRY: Record<
  PositionLifecycleGuardFamily,
  PositionLifecycleGuardFamilyEntry
> = {
  base_perp: { paramsSchema: BasePerpGuardInputSchema, assess: assessBasePerpGuard },
  hyperliquid_perp: {
    paramsSchema: HyperliquidPerpGuardInputSchema,
    assess: assessHyperliquidPerpGuard,
  },
  base_lending: { paramsSchema: BaseLendingGuardInputSchema, assess: assessBaseLendingGuard },
  monad_lending: { paramsSchema: MonadLendingGuardInputSchema, assess: assessMonadLendingGuard },
  multichain_evm_lending: {
    paramsSchema: MultichainEvmLendingGuardInputSchema,
    assess: assessMultichainEvmLendingGuard,
  },
  solana_lending: {
    paramsSchema: SolanaLendingGuardInputSchema,
    requiresTransaction: true,
    assess: assessSolanaLendingGuard,
  },
  solana_perp: {
    paramsSchema: SolanaPerpGuardInputSchema,
    requiresTransaction: true,
    assess: assessSolanaPerpGuardExact,
  },
  bnb_perp: { paramsSchema: BnbPerpGuardInputSchema, assess: assessBnbPerpGuard },
};

export function isLifecycleGuardFamily(value: string): value is PositionLifecycleGuardFamily {
  return Object.prototype.hasOwnProperty.call(POSITION_LIFECYCLE_GUARD_REGISTRY, value);
}
