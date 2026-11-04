import { render, screen } from '@testing-library/react';

import { EvidenceProcessRail } from '../EvidenceProcessRail';

describe('EvidenceProcessRail', () => {
  const fourStepItems = [
    { label: 'Observe', detail: 'Source record' },
    { label: 'Compare', detail: 'Source context' },
    { label: 'Assess', detail: 'Action context' },
    { label: 'Verify', detail: 'Inspectable record' },
  ] as const;

  it('marks a four-step rail so the shared layout can select its four-column treatment', () => {
    render(<EvidenceProcessRail label="Decision integrity loop" items={fourStepItems} />);

    expect(screen.getByLabelText('Decision integrity loop')).toHaveAttribute(
      'data-item-count',
      '4'
    );
    expect(screen.getByText('04 / 04')).toBeInTheDocument();
  });

  it('keeps the active step bounded to the available items', () => {
    render(
      <EvidenceProcessRail label="Decision integrity loop" items={fourStepItems} activeIndex={99} />
    );

    expect(screen.getByText('Verify').closest('li')).toHaveAttribute('aria-current', 'step');
  });
});
