'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

/**
 * A wallet discovered via EIP-6963 (multi-injected provider discovery).
 * `provider` is itself an EIP-1193 object, so the rest of the connect logic
 * is provider-agnostic — we only swap *which* provider we call.
 */
export interface DetectedWallet {
  /** EIP-6963 reverse-DNS id, e.g. "io.metamask", "io.rabby". Stable key. */
  rdns: string;
  name: string;
  /** Icon as a data URI (SVG/PNG) provided by the wallet. */
  icon: string;
  uuid: string;
  provider: InjectedProvider;
}

/**
 * WalletConnect (EIP-6963-incompatible,扫码) provider surface we actually use.
 * Only the EIP-1193 subset + lifecycle methods; the heavy SDK is loaded lazily.
 */
interface WalletConnectProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
  disconnect(): Promise<void>;
  close?(): Promise<void>;
}

const WALLET_STORAGE_KEY = 'safety-check:wallet-rdns';
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * EVM chains advertised to WalletConnect. The safety-check import only reads
 * the address, so these are a sensible mainstream subset — the wallet app uses
 * them to scope the session, not to gate which address it returns.
 */
const WALLETCONNECT_CHAINS: [number, ...number[]] = [
  1, 10, 56, 137, 250, 324, 8453, 42161, 42170, 43114, 59144, 534352, 81457, 5000, 100, 1088, 1284,
  1285, 9001, 57073,
];

interface Eip6963AnnounceDetail {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: InjectedProvider;
}

function getInjectedProvider(): InjectedProvider | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { ethereum?: InjectedProvider }).ethereum;
}

export interface UseWalletConnectReturn {
  /** Connected address, or null when not connected / unavailable. */
  address: string | null;
  isConnecting: boolean;
  /** rdns of the wallet currently connecting, for per-row spinner. */
  connectingRdns: string | null;
  error: string | null;
  /** Wallets discovered via EIP-6963 (+ a fallback "Browser Wallet" entry). */
  wallets: DetectedWallet[];
  /** True while we are still waiting for wallets to announce themselves. */
  discovering: boolean;
  /** rdns of the wallet last connected (for UI pre-selection). */
  selectedRdns: string | null;
  /** Connects the wallet identified by `rdns`; omits arg to use window.ethereum. */
  connect: (rdns?: string) => Promise<string | null>;
  /** Clears local connected state (does not revoke wallet permission). */
  disconnect: () => void;
  /** True when no injected wallet is present in the browser. */
  unavailable: boolean;
  /** True when a WalletConnect projectId is configured (mobile/QR entry shows). */
  walletConnectEnabled: boolean;
  /** Live WalletConnect URI to render as a QR code, or null before/after scan. */
  walletConnectUri: string | null;
  /** Error specific to the WalletConnect flow. */
  walletConnectError: string | null;
  /** True while a WalletConnect session is being established (awaiting scan). */
  isWalletConnecting: boolean;
  /** Starts a WalletConnect session and returns the connected address. */
  connectWalletConnect: () => Promise<string | null>;
  /** Aborts an in-progress WalletConnect session / clears the QR code. */
  cancelWalletConnect: () => void;
}

export function useWalletConnect(): UseWalletConnectReturn {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingRdns, setConnectingRdns] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);
  const [discovering, setDiscovering] = useState(true);
  const [selectedRdns, setSelectedRdns] = useState<string | null>(null);

  // WalletConnect-specific state.
  const [walletConnectUri, setWalletConnectUri] = useState<string | null>(null);
  const [walletConnectError, setWalletConnectError] = useState<string | null>(null);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);

  // Refs let the connect callback read the latest wallet list / provider
  // without being re-created on every discovery update.
  const walletsRef = useRef<DetectedWallet[]>([]);
  const selectedProviderRef = useRef<InjectedProvider | undefined>(undefined);
  const accountsChangedHandlerRef = useRef<((...args: unknown[]) => void) | null>(null);
  const wcProviderRef = useRef<WalletConnectProvider | null>(null);

  useEffect(() => {
    walletsRef.current = wallets;
  }, [wallets]);

  // Read at render time (not module load) so tests can toggle it via env
  // without re-importing the module, and so SSR never advertises it.
  const walletConnectEnabled =
    typeof window !== 'undefined' && Boolean(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID);

  const attachAccountListener = useCallback((provider: InjectedProvider) => {
    if (accountsChangedHandlerRef.current && selectedProviderRef.current?.removeListener) {
      selectedProviderRef.current.removeListener(
        'accountsChanged',
        accountsChangedHandlerRef.current
      );
    }
    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = (args[0] as unknown[]) ?? [];
      const next = (accounts.find((a) => typeof a === 'string') as string | undefined) ?? null;
      setAddress(next && ADDRESS_RE.test(next) ? next : null);
    };
    provider.on?.('accountsChanged', onAccountsChanged);
    accountsChangedHandlerRef.current = onAccountsChanged;
    selectedProviderRef.current = provider;
  }, []);

  // EIP-6963 discovery: ask wallets to announce, then fall back to
  // window.ethereum after a short window and silently restore any prior session.
  useEffect(() => {
    const found = new Map<string, DetectedWallet>();

    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<Eip6963AnnounceDetail>).detail;
      const { info, provider } = detail;
      if (!info?.rdns || !provider) return;
      found.set(info.rdns, { ...info, provider });
      const list = [...found.values()];
      walletsRef.current = list;
      setWallets(list);
    };

    window.addEventListener('eip6963:announceProvider', onAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    const timer = setTimeout(() => {
      if (found.size === 0) {
        const injected = getInjectedProvider();
        if (injected) {
          const fallback: DetectedWallet = {
            rdns: 'injected',
            name: 'Browser Wallet',
            icon: '',
            uuid: 'injected',
            provider: injected,
          };
          found.set('injected', fallback);
          walletsRef.current = [fallback];
          setWallets([fallback]);
        }
      }
      setDiscovering(false);

      // Silent restore: re-read already-authorized accounts without prompting.
      const savedRdns = localStorage.getItem(WALLET_STORAGE_KEY);
      const restored = (savedRdns && found.get(savedRdns)?.provider) ?? getInjectedProvider();
      if (restored) {
        restored
          .request({ method: 'eth_accounts' })
          .then((accounts) => {
            const addr = (accounts as unknown[]).find((a): a is string => typeof a === 'string');
            if (addr && ADDRESS_RE.test(addr)) {
              setAddress(addr);
              setSelectedRdns(savedRdns ?? 'injected');
              attachAccountListener(restored);
            }
          })
          .catch(() => {
            /* not authorized — ignore, user can connect on click */
          });
      }
    }, 300);

    return () => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce);
      clearTimeout(timer);
    };
  }, [attachAccountListener]);

  const connect = useCallback(
    async (rdns?: string): Promise<string | null> => {
      const target =
        (rdns && walletsRef.current.find((w) => w.rdns === rdns)?.provider) ??
        getInjectedProvider();
      if (!target) {
        setError('No browser wallet detected. Install MetaMask or Rabby.');
        return null;
      }

      setIsConnecting(true);
      setConnectingRdns(rdns ?? 'injected');
      setError(null);
      try {
        attachAccountListener(target);
        const accounts = (await target.request({
          method: 'eth_requestAccounts',
        })) as unknown[];
        const addr = (accounts?.find((a) => typeof a === 'string') as string | undefined) ?? null;

        if (!addr || !ADDRESS_RE.test(addr)) {
          setError('No account authorized.');
          return null;
        }

        localStorage.setItem(WALLET_STORAGE_KEY, rdns ?? 'injected');
        setSelectedRdns(rdns ?? 'injected');
        setAddress(addr);
        return addr;
      } catch (err) {
        // EIP-1193 user-rejection code; keep the message short and non-technical.
        const code = (err as { code?: number })?.code;
        setError(code === 4001 ? 'Connection rejected.' : 'Wallet connection failed.');
        return null;
      } finally {
        setIsConnecting(false);
        setConnectingRdns(null);
      }
    },
    [attachAccountListener]
  );

  /**
   * WalletConnect path for browsers without an injected provider (mobile).
   * Lazily loads the SDK to avoid SSR/bundle bloat, renders a QR code from the
   * `display_uri` event, and resolves with the address once the user scans + approves.
   */
  const connectWalletConnect = useCallback(async (): Promise<string | null> => {
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    if (!projectId) {
      setWalletConnectError('WalletConnect is not configured.');
      return null;
    }

    setIsWalletConnecting(true);
    setWalletConnectUri(null);
    setWalletConnectError(null);
    try {
      const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
      const provider = (await EthereumProvider.init({
        projectId,
        optionalChains: WALLETCONNECT_CHAINS,
        showQrModal: false,
        methods: ['eth_requestAccounts', 'eth_accounts', 'eth_sendTransaction', 'personal_sign'],
        events: ['accountsChanged', 'chainChanged'],
      })) as unknown as WalletConnectProvider;
      wcProviderRef.current = provider;

      provider.on('display_uri', (uri: unknown) => setWalletConnectUri(String(uri)));

      const accounts = (await provider.request({
        method: 'eth_requestAccounts',
      })) as unknown[];
      const first = (accounts?.find((a) => typeof a === 'string') as string | undefined) ?? '';
      // WalletConnect returns CAIP-10 accounts: "eip155:1:0x..." — keep the address.
      const addr = first.includes(':') ? first.split(':').pop()! : first;

      if (!addr || !ADDRESS_RE.test(addr)) {
        setWalletConnectError('No account returned.');
        return null;
      }

      attachAccountListener(provider);
      setAddress(addr);
      setSelectedRdns('walletconnect');
      return addr;
    } catch (err) {
      const code = (err as { code?: number })?.code;
      setWalletConnectError(
        code === 4001 ? 'Connection rejected.' : 'WalletConnect connection failed.'
      );
      return null;
    } finally {
      setIsWalletConnecting(false);
    }
  }, [attachAccountListener]);

  const cancelWalletConnect = useCallback(() => {
    setWalletConnectUri(null);
    const provider = wcProviderRef.current;
    if (provider) {
      provider.close?.().catch(() => undefined);
      wcProviderRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    const provider = wcProviderRef.current;
    if (provider) {
      provider.disconnect?.().catch(() => undefined);
      provider.close?.().catch(() => undefined);
      wcProviderRef.current = null;
    }
    setAddress(null);
    setError(null);
    setWalletConnectUri(null);
    setWalletConnectError(null);
  }, []);

  // Tear down any live WalletConnect session on unmount.
  useEffect(() => {
    return () => {
      const provider = wcProviderRef.current;
      if (provider) {
        provider.disconnect?.().catch(() => undefined);
        provider.close?.().catch(() => undefined);
        wcProviderRef.current = null;
      }
    };
  }, []);

  return {
    address,
    isConnecting,
    connectingRdns,
    error,
    wallets,
    discovering,
    selectedRdns,
    connect,
    disconnect,
    unavailable: typeof window !== 'undefined' && wallets.length === 0 && !getInjectedProvider(),
    walletConnectEnabled,
    walletConnectUri,
    walletConnectError,
    isWalletConnecting,
    connectWalletConnect,
    cancelWalletConnect,
  };
}
