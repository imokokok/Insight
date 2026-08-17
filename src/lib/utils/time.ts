/**
 * Time helpers shared across the oracle-safety / attestation / rate-limit code.
 *
 * The codebase repeats `Math.floor(Date.now() / 1000)` in ~12 places to derive
 * the current Unix epoch in whole seconds (oracle-state freshness windows,
 * attestation validity, rate-limit resets). This named helper makes the intent
 * obvious and keeps the floor in one place instead of 12 inline copies
 * (category B — collapse repetition + category H — name the magic expression).
 */
export function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
