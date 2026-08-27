import { render, screen, fireEvent } from '@testing-library/react';

import { NoLendingEmptyState } from './NoLendingEmptyState';

const supported = [
  { name: 'Aave V3', chain: 'ethereum' },
  { name: 'Compound V3', chain: 'ethereum' },
  { name: 'Morpho Blue', chain: 'base' },
];

describe('NoLendingEmptyState', () => {
  const onManualEntry = jest.fn();
  const onRescan = jest.fn();

  it('explains that no positions were found and offers the three CTAs', () => {
    render(
      <NoLendingEmptyState
        address="0xabc1230000000000000000000000000000000000"
        supportedProtocols={supported}
        onManualEntry={onManualEntry}
        onRescan={onRescan}
      />
    );

    expect(screen.getByText(/未检测到借贷持仓/i)).toBeInTheDocument();
    expect(screen.getByText(/手动录入仓位/i)).toBeInTheDocument();
    expect(screen.getByText(/重新扫描/i)).toBeInTheDocument();
    expect(screen.getByText(/可能的原因/i)).toBeInTheDocument();
  });

  it('wires the manual entry and rescan buttons', () => {
    render(
      <NoLendingEmptyState
        address="0xabc1230000000000000000000000000000000000"
        supportedProtocols={supported}
        onManualEntry={onManualEntry}
        onRescan={onRescan}
      />
    );

    fireEvent.click(screen.getByText(/手动录入仓位/i));
    fireEvent.click(screen.getByText(/重新扫描/i));
    expect(onManualEntry).toHaveBeenCalledTimes(1);
    expect(onRescan).toHaveBeenCalledTimes(1);
  });

  it('expands the supported-protocols list', () => {
    render(
      <NoLendingEmptyState
        address={null}
        supportedProtocols={supported}
        onManualEntry={onManualEntry}
        onRescan={onRescan}
      />
    );

    expect(screen.queryByText('Aave V3')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/查看已支持/i));
    expect(screen.getByText('Aave V3')).toBeInTheDocument();
    expect(screen.getByText('Compound V3')).toBeInTheDocument();
    expect(screen.getByText('Morpho Blue')).toBeInTheDocument();
  });
});
