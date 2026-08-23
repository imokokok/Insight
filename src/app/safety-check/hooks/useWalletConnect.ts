'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Minimal injected EIP-1193 provider surface (read-only connect).
 * We intentionally avoid wagmi / RainbowKit — the safety-check page only needs
 * the user's address to prefill an on-chain import, never to sign. A raw
 * `eth_requestAccounts` call is all that is required.
 */
interface InjectedProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

function getInjectedProvider(): InjectedProvider | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { ethereum?: InjectedProvider }).ethereum;
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export interface UseWalletConnectReturn {
  /** Connected address, or null when not connected / unavailable. */
  address: string | null;
  isConnecting: boolean;
  error: string | null;
  /** Prompts the wallet for accounts; returns the first address or null. */
  connect: () => Promise<string | null>;
  /** Clears local connected state (does not revoke wallet permission). */
  disconnect: () => void;
  /** True when no injected wallet is present in the browser. */
  unavailable: boolean;
}

export function useWalletConnect(): UseWalletConnectReturn {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (): Promise<string | null> => {
    const eth = getInjectedProvider();
    if (!eth) {
      setError('No browser wallet detected. Install MetaMask or Rabby.');
      return null;
    }

    setIsConnecting(true);
    setError(null);
    try {
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as unknown[];
      const addr = (accounts?.find((a) => typeof a === 'string') as string | undefined) ?? null;

      if (!addr || !ADDRESS_RE.test(addr)) {
        setError('No account authorized.');
        return null;
      }

      setAddress(addr);
      return addr;
    } catch (err) {
      // EIP-1193 user-rejection code; keep the message short and non-technical.
      const code = (err as { code?: number })?.code;
      setError(code === 4001 ? 'Connection rejected.' : 'Wallet connection failed.');
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
  }, []);

  // Keep local state in sync if the user switches accounts in their wallet.
  useEffect(() => {
    const eth = getInjectedProvider();
    if (!eth?.on) return;

    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = (args[0] as unknown[]) ?? [];
      const next = (accounts.find((a) => typeof a === 'string') as string | undefined) ?? null;
      setAddress(next && ADDRESS_RE.test(next) ? next : null);
    };

    eth.on('accountsChanged', onAccountsChanged);
    return () => eth.removeListener?.('accountsChanged', onAccountsChanged);
  }, []);

  return {
    address,
    isConnecting,
    error,
    connect,
    disconnect,
    unavailable: typeof window !== 'undefined' && !getInjectedProvider(),
  };
}
