import { renderHook, act } from '@testing-library/react';
import { EthereumProvider } from '@walletconnect/ethereum-provider';

import { useWalletConnect, type InjectedProvider } from './useWalletConnect';

// Reference the mocked SDK for assertions inside the WalletConnect suite.

// WalletConnect SDK is heavy and touches WebSocket/window — mock it so the
// connect flow runs synchronously against a fake provider.
jest.mock('@walletconnect/ethereum-provider', () => ({
  EthereumProvider: { init: jest.fn() },
}));

const RABBY_ADDR = '0x' + 'b'.repeat(40);
const METAMASK_ADDR = '0x' + 'a'.repeat(40);

/** Build a fake EIP-1193 provider. eth_requestAccounts returns the connect
 *  address; every other method (e.g. eth_accounts) returns an empty list. */
function makeProvider(connectAddress: string): InjectedProvider & { request: jest.Mock } {
  return {
    request: jest
      .fn()
      .mockImplementation((args: { method: string }) =>
        args.method === 'eth_requestAccounts'
          ? Promise.resolve([connectAddress])
          : Promise.resolve([])
      ),
    on: jest.fn(),
    removeListener: jest.fn(),
  };
}

function announce(rdns: string, name: string, provider: InjectedProvider) {
  const event = new CustomEvent('eip6963:announceProvider', {
    detail: { info: { uuid: `uuid-${rdns}`, name, icon: '', rdns }, provider },
  });
  window.dispatchEvent(event);
}

describe('useWalletConnect (EIP-6963)', () => {
  let metamask: InjectedProvider & { request: jest.Mock };
  let rabby: InjectedProvider & { request: jest.Mock };

  beforeEach(() => {
    // Recreate per test: jest.config has resetMocks:true, which wipes any
    // mockImplementation defined at describe-scope between runs.
    metamask = makeProvider('0x' + 'a'.repeat(40));
    rabby = makeProvider('0x' + 'b'.repeat(40));
    // Legacy global injected by MetaMask — must NOT be the default anymore.
    (window as unknown as { ethereum?: InjectedProvider }).ethereum = metamask;
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    (window as unknown as { ethereum?: InjectedProvider }).ethereum = undefined;
  });

  it('discovers every EIP-6963 wallet instead of defaulting to window.ethereum', () => {
    const { result } = renderHook(() => useWalletConnect());

    act(() => {
      announce('io.metamask', 'MetaMask', metamask);
      announce('io.rabby', 'Rabby', rabby);
    });

    const rdns = result.current.wallets.map((w) => w.rdns);
    expect(rdns).toEqual(expect.arrayContaining(['io.metamask', 'io.rabby']));
    // The legacy global must only appear as the explicit 'injected' fallback,
    // never silently as the only option when real wallets are present.
    expect(result.current.wallets.length).toBeGreaterThanOrEqual(2);
  });

  it('connect(rdns) uses the SELECTED wallet provider, not window.ethereum', async () => {
    const { result } = renderHook(() => useWalletConnect());

    act(() => {
      announce('io.metamask', 'MetaMask', metamask);
      announce('io.rabby', 'Rabby', rabby);
    });

    let addr: string | null = null;
    await act(async () => {
      addr = await result.current.connect('io.rabby');
    });

    expect(addr).toBe(RABBY_ADDR);
    // The chosen wallet's provider handled the connect request...
    expect(rabby.request).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
    // ...and the legacy MetaMask global was NOT touched for connecting.
    expect(metamask.request).not.toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
    expect(result.current.selectedRdns).toBe('io.rabby');
  });

  it('connect() with no rdns still falls back to window.ethereum (legacy only)', async () => {
    const { result } = renderHook(() => useWalletConnect());

    // No EIP-6963 wallet announced: only the legacy global exists.
    act(() => {
      jest.advanceTimersByTime(300);
    });

    let addr: string | null = null;
    await act(async () => {
      addr = await result.current.connect(); // no rdns
    });

    expect(addr).toBe(METAMASK_ADDR);
    expect(metamask.request).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
    // Fallback entry is the only wallet and is flagged as 'injected'.
    expect(result.current.wallets.map((w) => w.rdns)).toEqual(['injected']);
  });
});

describe('useWalletConnect (WalletConnect)', () => {
  const WC_ADDR = '0x' + 'c'.repeat(40);
  const init = EthereumProvider.init as unknown as jest.Mock;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = 'test-project-id';
    init.mockReset();
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    delete process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  });

  it('exposes walletConnectEnabled when a projectId is configured', () => {
    const { result } = renderHook(() => useWalletConnect());
    expect(result.current.walletConnectEnabled).toBe(true);
  });

  it('connectWalletConnect uses the WalletConnect provider and returns the address', async () => {
    const mockProvider = {
      on: jest.fn(),
      removeListener: jest.fn(),
      request: jest.fn().mockResolvedValue([`eip155:1:${WC_ADDR}`]),
      disconnect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };
    init.mockResolvedValue(mockProvider);

    const { result } = renderHook(() => useWalletConnect());

    let addr: string | null = null;
    await act(async () => {
      addr = await result.current.connectWalletConnect();
    });

    expect(addr).toBe(WC_ADDR);
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'test-project-id', showQrModal: false })
    );
    expect(mockProvider.on).toHaveBeenCalledWith('display_uri', expect.any(Function));
    expect(mockProvider.request).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
    expect(result.current.address).toBe(WC_ADDR);
    expect(result.current.selectedRdns).toBe('walletconnect');
  });

  it('reports an error and returns null when no projectId is configured', async () => {
    delete process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    const { result } = renderHook(() => useWalletConnect());
    expect(result.current.walletConnectEnabled).toBe(false);

    let addr: string | null = null;
    await act(async () => {
      addr = await result.current.connectWalletConnect();
    });
    expect(addr).toBe(null);
    expect(result.current.walletConnectError).toBe('WalletConnect is not configured.');
  });
});
