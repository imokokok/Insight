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

    expect(screen.getByText(/no lending positions found/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a position manually/i)).toBeInTheDocument();
    expect(screen.getByText(/scan again/i)).toBeInTheDocument();
    expect(screen.getByText(/possible reasons/i)).toBeInTheDocument();
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

    fireEvent.click(screen.getByText(/enter a position manually/i));
    fireEvent.click(screen.getByText(/scan again/i));
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
    fireEvent.click(screen.getByText(/view .* supported protocols/i));
    expect(screen.getByText('Aave V3')).toBeInTheDocument();
    expect(screen.getByText('Compound V3')).toBeInTheDocument();
    expect(screen.getByText('Morpho Blue')).toBeInTheDocument();
  });
});
