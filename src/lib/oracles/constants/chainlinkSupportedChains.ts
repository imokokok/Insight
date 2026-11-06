import { Blockchain } from '@/types/oracle';

import { getCatalogNetworkChainIds } from './chainlinkCatalogLoader';
import { getBlockchainByChainId } from './chainMapping';

/**
 * Single source of truth for the Chainlink chains this platform actually
 * serves, derived instead of hand-maintained:
 *
 *   - EVM chains come from the committed catalog directory
 *     (chainlinkCatalog.json) — a chain only appears here once the catalog
 *     sync script (`scripts/sync-chainlink-catalog.ts`) has committed its
 *     feed universe.
 *   - Solana is appended explicitly: its feed reads go through the dedicated
 *     Solana reader (chainlinkSolana.ts / chainlinkSolana constants) and it
 *     has no EVM catalog entry by design.
 *
 * This replaces two previously hand-written, drifting lists:
 *   - `ChainlinkClient.supportedChains` (runtime resolution surface)
 *   - `chainlinkConfig.supportedChains` (UI metadata surface), which had
 *     grown to 20 entries of which 11 had zero runtime data.
 *
 * Adding a chain therefore means: commit the catalog network, configure its
 * RPC entry in chainlinkDataSources/rpcConfig.ts, and every surface (client
 * resolution, /api/symbols, UI metadata) updates together. The consistency
 * test in src/lib/oracles/__tests__/chainlinkCatalogConsistency.test.ts
 * asserts every catalog network also has an RPC entry, so catalog growth
 * cannot silently over-claim resolution capability.
 */
export const CHAINLINK_SUPPORTED_CHAINS: readonly Blockchain[] = (() => {
  const evm = getCatalogNetworkChainIds()
    .map(getBlockchainByChainId)
    .filter((chain): chain is Blockchain => chain !== undefined);
  return [...evm, Blockchain.SOLANA];
})();
