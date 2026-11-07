import {
  getCatalogNetworkChainIds,
  CHAINLINK_CATALOG_VERSION,
} from '@/lib/oracles/constants/chainlinkCatalogLoader';
import { CHAINLINK_SUPPORTED_CHAINS } from '@/lib/oracles/constants/chainlinkSupportedChains';
import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { CHAINLINK_RPC_CONFIG } from '@/lib/oracles/services/chainlinkDataSources/rpcConfig';
import { Blockchain } from '@/types/oracle';

/**
 * Consistency guard for the Chainlink chain-coverage single source.
 *
 * CHAINLINK_SUPPORTED_CHAINS is derived from the committed catalog directory.
 * When `scripts/sync-chainlink-catalog.ts` commits a new network, these tests
 * force the operator to also wire its RPC entry — otherwise the derived list
 * would advertise a chain whose reads cannot resolve (over-claiming).
 */
describe('chainlink catalog consistency', () => {
  it('maps every catalog network to a known Blockchain', () => {
    const catalogChainIds = getCatalogNetworkChainIds();
    expect(catalogChainIds.length).toBeGreaterThan(0);

    const unmapped = catalogChainIds.filter((id) => getBlockchainByChainId(id) === undefined);
    expect(unmapped).toEqual([]);
  });

  it('has an RPC config entry for every catalog network', () => {
    const rpcChainIds = Object.keys(CHAINLINK_RPC_CONFIG).map(Number);
    const missingRpc = getCatalogNetworkChainIds().filter((id) => !rpcChainIds.includes(id));
    expect(missingRpc).toEqual([]);
  });

  it('derives exactly the served chain set (catalog EVM networks + Solana)', () => {
    const expected = [
      // Pinned intentionally: a catalog resync that adds/removes a network
      // must be a deliberate, reviewed change (see module doc on
      // chainlinkSupportedChains.ts). Update this list together with the
      // catalog, the RPC config, and the catalog version below. Order
      // follows numeric chain-id ascending (catalog key order), Solana last.
      Blockchain.ETHEREUM, // 1
      Blockchain.OPTIMISM, // 10
      Blockchain.BNB_CHAIN, // 56
      Blockchain.POLYGON, // 137
      Blockchain.MONAD, // 143
      Blockchain.HYPEREVM, // 999
      Blockchain.BASE, // 8453
      Blockchain.ARBITRUM, // 42161
      Blockchain.AVALANCHE, // 43114
      Blockchain.SOLANA,
    ];
    expect(CHAINLINK_SUPPORTED_CHAINS).toEqual(expected);
  });

  it('contains no duplicates', () => {
    expect(new Set(CHAINLINK_SUPPORTED_CHAINS).size).toBe(CHAINLINK_SUPPORTED_CHAINS.length);
  });

  it('catalog version is stamped so resyncs are auditable', () => {
    expect(CHAINLINK_CATALOG_VERSION).toBe('2026-11-08');
  });
});
