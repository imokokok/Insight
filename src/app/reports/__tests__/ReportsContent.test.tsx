import { render, screen } from '@testing-library/react';

import ReportsContent from '../ReportsContent';

describe('ReportsContent', () => {
  it('distinguishes a temporarily unavailable archive from an empty archive', () => {
    render(<ReportsContent initialReports={[]} initialDataUnavailable />);

    expect(screen.getByText('Archive temporarily unavailable')).toBeInTheDocument();
    expect(screen.getByText(/No evidence record has been removed/i)).toBeInTheDocument();
  });
});
