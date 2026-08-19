/**
 * @fileoverview v2.1 source-group classification — the independence gate's
 * single source of truth.
 *
 * Signed off by Raul 2026-08-19 16:09 (see v2.1-source-group-mapping-table.md).
 * The runtime independence gate reads ONLY this table; it must stay 1:1 with the
 * reviewed mapping. Independence is operator-level (ERC-8004): two providers
 * share a group iff they share a legal entity, node infrastructure / signers, or
 * primary data source.
 *
 * The independence gate is ORTHOGONAL to the quorum gate (participant count):
 *   - coverageStatus: participantCount < 3 → INSUFFICIENT_COVERAGE (quorum gate)
 *   - independenceStatus: distinct NON-DERIVED groups < 2 → INSUFFICIENT_INDEPENDENCE
 *     (independence gate; derived sources like TWAP do NOT count toward the
 *     group count — they may still feed the quorum's mechanism diversity).
 *
 * Raul 16:09 change: TWAP is NOT a full independent peer group. Keep derived:yes.
 * The gate requires distinct non-derived groups (minimum 2); derived-only
 * sources must not satisfy independence. TWAP may still contribute to the quorum.
 */

/** provider → source group (operator-level). Each of the 10 production
 *  providers is its own distinct operator; TWAP is the one derived exception. */
export const PROVIDER_SOURCE_GROUP: Readonly<Record<string, string>> = {
  chainlink: 'chainlink',
  api3: 'api3',
  redstone: 'redstone',
  dia: 'dia',
  winklink: 'winklink',
  supra: 'supra',
  twap: 'twap',
  reflector: 'reflector',
  flare: 'flare',
  switchboard: 'switchboard',
} as const;

/** Groups that are DERIVED (on-chain, not externally attested). Excluded from
 *  the independence group count per Raul 16:09. */
export const DERIVED_SOURCE_GROUPS: ReadonlySet<string> = new Set<string>(['twap']);

/**
 * Alias / wrapper reclassification (Raul 16:09 caveat). If a runtime provider is
 * actually a wrapper or alias of another operator, reclassify it under the
 * primary operator's group so it cannot manufacture a fake independent group.
 *
 * Key = the runtime provider id (as it appears in consensus.providers); value =
 * the primary provider whose group it inherits. Empty until a wrapper is
 * observed. Add entries here (and keep this 1:1 with the reviewed mapping) when
 * a new provider turns out to be a rebrand / white-label of an existing operator.
 */
export const PROVIDER_ALIASES: Readonly<Record<string, string>> = {} as const;

/** Resolve the source group for a runtime provider, applying alias reclass. */
export function resolveSourceGroup(provider: string): string {
  const primary = PROVIDER_ALIASES[provider] ?? provider;
  return PROVIDER_SOURCE_GROUP[primary] ?? primary;
}

/**
 * Distinct NON-DERIVED source groups among the given providers. Drives the v2.1
 * independence gate (requires >= V2_REQUIRED_NON_DERIVED_GROUPS). TWAP and any
 * other derived group are excluded.
 *
 * Unknown providers (not in the map and not aliased) count as their own
 * (non-derived) group. This is the SAFE default: an un-aliased wrapper can't
 * silently collapse into a known operator (no false pass), but it also won't be
 * deduped — so a genuinely new operator is treated as independent until it is
 * classified. The alias map is the mechanism to catch known white-labels.
 */
export function nonDerivedGroupCount(providers: ReadonlyArray<string>): number {
  const groups = new Set<string>();
  for (const p of providers) {
    const group = resolveSourceGroup(p);
    if (!DERIVED_SOURCE_GROUPS.has(group)) {
      groups.add(group);
    }
  }
  return groups.size;
}

/** Distinct source groups (derived + non-derived) — informational symmetry with
 *  {@link nonDerivedGroupCount}; not used for the gate or the signed count. */
export function distinctSourceGroups(providers: ReadonlyArray<string>): number {
  const groups = new Set<string>();
  for (const p of providers) {
    groups.add(resolveSourceGroup(p));
  }
  return groups.size;
}
