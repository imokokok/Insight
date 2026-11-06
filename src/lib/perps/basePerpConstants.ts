/**
 * Shared protocol identifier for the Synthetix Perps V3 Base guard family.
 *
 * Lives in its own dependency-free module so that `basePerpGuard.ts` and
 * `basePerpAction.ts` can both reference it without forming an import cycle.
 */
export const SYNTHETIX_PERPS_V3_BASE_PROTOCOL_ID = 'synthetix-perps-v3-base' as const;
