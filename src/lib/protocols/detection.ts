import { importPosition } from './importer';
import { PROTOCOL_REGISTRY, type ProtocolConfig } from './protocolRegistry';

import type { ImportedPosition, SkippedAssetEntry } from './importer/types';

export interface ProtocolDetection {
  protocolId: string;
  name: string;
  chain: string;
  /** True when the protocol is a lending market with an importable on-chain reader. */
  supported: boolean;
  /** True when the address holds a non-empty position (collateral and/or borrow). */
  hasPosition: boolean;
  /** The imported on-chain position, or null when none / not supported / errored. */
  position: ImportedPosition | null;
  /** Assets on-chain that could not be mapped to a configured asset. */
  skippedAssets: SkippedAssetEntry[];
  /** Error message when the scan failed; null otherwise. */
  error: string | null;
}

/**
 * A protocol can be scanned for on-chain positions only when it is a lending
 * protocol and exposes an importable contract set (Aave / Compound / Morpho).
 * DEXes and protocols without configured contracts are reported as unsupported
 * so the UI can explain why they were skipped.
 */
export function isImportableProtocol(protocol: ProtocolConfig): boolean {
  if (protocol.protocolType !== 'lending') return false;
  const c = protocol.contracts;
  return Boolean(c?.poolDataProvider || c?.comet || c?.comptroller || c?.morpho);
}

/**
 * Scan every supported lending protocol for the given address in parallel.
 *
 * Each protocol is queried with its real on-chain reader (viem `readContract`).
 * `Promise.allSettled` isolates failures: a single slow / erroring RPC never
 * blocks the other protocols, and the failed one is returned with `error` set
 * rather than dropping the whole scan.
 */
export async function detectPositions(address: string): Promise<ProtocolDetection[]> {
  const results = await Promise.allSettled(
    PROTOCOL_REGISTRY.map(async (protocol): Promise<ProtocolDetection> => {
      const supported = isImportableProtocol(protocol);

      if (!supported) {
        return {
          protocolId: protocol.id,
          name: protocol.name,
          chain: protocol.chain,
          supported: false,
          hasPosition: false,
          position: null,
          skippedAssets: [],
          error: null,
        };
      }

      try {
        const position = await importPosition(protocol, address as `0x${string}`);
        const hasCollateral = position.collaterals.length > 0;
        const hasBorrow = position.borrows.length > 0;
        return {
          protocolId: protocol.id,
          name: protocol.name,
          chain: protocol.chain,
          supported: true,
          hasPosition: hasCollateral || hasBorrow,
          position,
          skippedAssets: position.skippedAssets,
          error: null,
        };
      } catch (err) {
        return {
          protocolId: protocol.id,
          name: protocol.name,
          chain: protocol.chain,
          supported: true,
          hasPosition: false,
          position: null,
          skippedAssets: [],
          error: err instanceof Error ? err.message : 'Failed to scan protocol',
        };
      }
    })
  );

  return results.map(
    (r): ProtocolDetection =>
      r.status === 'fulfilled'
        ? r.value
        : {
            protocolId: 'unknown',
            name: 'Unknown protocol',
            chain: '',
            supported: false,
            hasPosition: false,
            position: null,
            skippedAssets: [],
            error: r.reason instanceof Error ? r.reason.message : 'Failed to scan protocol',
          }
  );
}
