import { fireEvent, render, screen } from '@testing-library/react';

import { PegRiskCategoryNav } from '../PegRiskCategoryNav';

describe('PegRiskCategoryNav', () => {
  const counts = { all: 8, stablecoins: 4, wrapped: 4 };
  const alertCounts = { all: 2, stablecoins: 1, wrapped: 1 };

  it('shows one unified asset universe with category counts', () => {
    render(
      <PegRiskCategoryNav
        activeCategory="all"
        counts={counts}
        alertCounts={alertCounts}
        onChange={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /all peg assets/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /stablecoins/i })).toHaveTextContent('4');
    expect(screen.getByRole('button', { name: /wrapped & lsts/i })).toHaveTextContent('1 alert');
  });

  it('changes the active category through one shared control', () => {
    const onChange = jest.fn();
    render(
      <PegRiskCategoryNav
        activeCategory="all"
        counts={counts}
        alertCounts={alertCounts}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /wrapped & lsts/i }));
    expect(onChange).toHaveBeenCalledWith('wrapped');
  });
});
