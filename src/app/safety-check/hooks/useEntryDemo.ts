import { useCallback, useEffect, useRef } from 'react';

import { isImportableProtocol } from '@/lib/protocols/detection';
import type { EnrichedProtocolConfig } from '@/lib/protocols/dynamicData';

/**
 * Wallet-first entry demo: on first visit (no connected/pasted address and no
 * deep-link share params) auto-select a default protocol and run its sample
 * position once, so the page immediately shows a live result while the manual
 * input form stays visible. Connecting a wallet skips the demo; the returned
 * `reset` re-arms it (used after disconnecting).
 */
export function useEntryDemo(
  protocols: EnrichedProtocolConfig[],
  address: string | null,
  hasDeepLink: boolean,
  onSelectProtocol: (protocol: EnrichedProtocolConfig) => void
): () => void {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (protocols.length === 0) return;
    if (address) return;
    if (hasDeepLink) return;

    const protocol =
      protocols.find((p) => p.id === 'aave-v3-ethereum') ??
      protocols.find(isImportableProtocol) ??
      protocols[0];
    if (!protocol) return;

    ranRef.current = true;
    onSelectProtocol(protocol);
  }, [protocols, address, hasDeepLink, onSelectProtocol]);

  return useCallback(() => {
    ranRef.current = false;
  }, []);
}
