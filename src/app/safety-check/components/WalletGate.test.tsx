import { render, screen, fireEvent } from '@testing-library/react';

import { WalletGate } from './WalletGate';
import type { UseWalletConnectReturn } from '../hooks/useWalletConnect';

const baseWallet = {
  address: null,
  isConnecting: false,
  connectingRdns: null,
  error: null,
  wallets: [],
  discovering: false,
  selectedRdns: null,
  connect: jest.fn(),
  disconnect: jest.fn(),
  unavailable: false,
  walletConnectEnabled: false,
  walletConnectUri: null,
  walletConnectError: null,
  isWalletConnecting: false,
  connectWalletConnect: jest.fn(),
  cancelWalletConnect: jest.fn(),
} as unknown as UseWalletConnectReturn;

describe('WalletGate', () => {
  it('calls onAddress with the pasted address on Scan', () => {
    const onAddress = jest.fn();
    render(
      <WalletGate
        address={null}
        onAddress={onAddress}
        wallet={baseWallet}
        detecting={false}
        detectError={null}
        positionsFound={null}
        supportedCount={12}
        onDisconnect={jest.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/粘贴钱包地址/i);
    fireEvent.change(input, { target: { value: '0xabc1230000000000000000000000000000000000' } });
    fireEvent.click(screen.getByRole('button', { name: /Scan/i }));

    expect(onAddress).toHaveBeenCalledWith('0xabc1230000000000000000000000000000000000');
  });

  it('shows the connected address chip and calls onDisconnect', () => {
    const onDisconnect = jest.fn();
    render(
      <WalletGate
        address="0xabc1230000000000000000000000000000000000"
        onAddress={jest.fn()}
        wallet={baseWallet}
        detecting={false}
        detectError={null}
        positionsFound={null}
        supportedCount={12}
        onDisconnect={onDisconnect}
      />
    );

    // chip shows truncated address
    expect(screen.getByText(/0xabc1…0000/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Disconnect/i));
    expect(onDisconnect).toHaveBeenCalled();
  });

  it('renders a scanning status line while detecting', () => {
    render(
      <WalletGate
        address="0xabc1230000000000000000000000000000000000"
        onAddress={jest.fn()}
        wallet={baseWallet}
        detecting
        detectError={null}
        positionsFound={null}
        supportedCount={12}
        onDisconnect={jest.fn()}
      />
    );
    expect(screen.getByText(/正在扫描 12 个借贷协议/i)).toBeInTheDocument();
  });
});
