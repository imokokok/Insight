/**
 * @fileoverview Oracle scenario DSL — a declarative, JSON-serializable format
 * for describing oracle failure sequences so they can be replayed
 * deterministically against a detection policy.
 *
 * This is the input contract of the Oracle Scenario Testing harness. A scenario
 * is a time-ordered series of steps; each step carries the per-provider source
 * state a protocol's oracle adapter would observe at that moment, plus the
 * price the protocol would settle against. Steps are labeled `baseline` (a
 * correctly-behaving policy must NOT fire) or `attack` (the failure phase; a
 * correct policy SHOULD fire).
 *
 * Scenarios are pure data: no code, no network, fully hashable. The same bytes
 * that drive the TypeScript replay engine drive the Foundry harness, and the
 * canonical hash of a scenario is signed into its test attestation, so a
 * receipt names exactly the sequence that was executed.
 */

import { z } from 'zod';

/** The six failure classes the harness ships with. Each maps to a set of
 *  detection codes a correct policy is expected to fire (see engine.ts). */
export const SCENARIO_KINDS = [
  'stale_price',
  'deviation_spike',
  'flash_manipulation',
  'multi_source_divergence',
  'precision_error',
  'feed_failure',
] as const;

export type ScenarioKind = (typeof SCENARIO_KINDS)[number];

/** A single provider's observed state at one step. `status` mirrors what an
 *  adapter sees: ok (fresh usable value), stale (value older than the feed's
 *  cadence), error (call failed / reverted). */
export const ScenarioSourceSchema = z.object({
  provider: z.string().min(1),
  price: z.number().nonnegative(),
  /** Provider's own data timestamp (unix seconds). */
  timestamp: z.number().int().nonnegative(),
  status: z.enum(['ok', 'stale', 'error']),
});

export type ScenarioSource = z.infer<typeof ScenarioSourceSchema>;

export const ScenarioStepSchema = z.object({
  /** Seconds since `startedAt`. Steps must be strictly increasing. */
  t: z.number().int().nonnegative(),
  /** `baseline` = healthy period (must NOT trip a correct policy);
   *  `attack` = failure period (SHOULD trip it). */
  phase: z.enum(['baseline', 'attack']),
  /** The price the subject protocol would settle against at this step. */
  settlementPrice: z.number().nonnegative(),
  sources: z.array(ScenarioSourceSchema).min(1),
});

export type ScenarioStep = z.infer<typeof ScenarioStepSchema>;

/** The detection policy a scenario is replayed against. The harness is
 *  policy-relative by design: the same incident replayed against two policies
 *  shows exactly which one catches it and which one misses. */
export const ScenarioPolicySchema = z.object({
  /** Max acceptable age (seconds) of a provider's data timestamp. */
  maxStalenessSeconds: z.number().int().positive(),
  /** Max acceptable cross-source deviation, in percent. */
  maxDeviationPct: z.number().positive(),
  /** Min number of usable (ok) sources required to act. */
  minSources: z.number().int().positive(),
});

export type ScenarioPolicy = z.infer<typeof ScenarioPolicySchema>;

export const OracleScenarioSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'lowercase kebab-case id'),
    kind: z.enum(SCENARIO_KINDS),
    title: z.string().min(1),
    description: z.string().min(1),
    symbol: z.string().min(1),
    chainId: z.number().int().positive(),
    /** Unix-seconds anchor the step offsets are measured from. Chosen per
     *  fixture for reproducibility; reconstructions do NOT claim this is the
     *  real incident's wall-clock time. */
    startedAt: z.number().int().nonnegative(),
    policy: ScenarioPolicySchema,
    steps: z.array(ScenarioStepSchema).min(1),
  })
  .superRefine((scenario, ctx) => {
    for (let i = 1; i < scenario.steps.length; i++) {
      if (scenario.steps[i].t <= scenario.steps[i - 1].t) {
        ctx.addIssue({
          code: 'custom',
          message: `step timestamps must be strictly increasing (index ${i})`,
        });
        break;
      }
    }
  });

export type OracleScenario = z.infer<typeof OracleScenarioSchema>;

/** Parse + validate an untrusted scenario (inline API submissions). Throws a
 *  zod error with a precise path when invalid. */
export function parseScenario(input: unknown): OracleScenario {
  return OracleScenarioSchema.parse(input);
}

/**
 * Deterministic JSON serialization (recursively sorted keys) so the same
 * scenario always hashes to the same bytes regardless of key insertion order.
 * Feeds `computeScenarioHash` and the Foundry harness's on-chain hashing.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => [k, sortKeys(v)] as [string, unknown]);
    return Object.fromEntries(entries);
  }
  return value;
}
