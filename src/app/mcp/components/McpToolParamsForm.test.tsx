import { fireEvent, render, screen } from '@testing-library/react';

import { McpToolParamsForm } from './McpToolParamsForm';

describe('McpToolParamsForm', () => {
  it('preserves numeric and boolean enum values', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <McpToolParamsForm
        schema={{ properties: { level: { enum: [1, 2] } } }}
        value={{}}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'level' }), { target: { value: '1' } });
    expect(onChange).toHaveBeenLastCalledWith({ level: 2 });

    rerender(
      <McpToolParamsForm
        schema={{ properties: { enabled: { enum: [false, true] } } }}
        value={{}}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'enabled' }), {
      target: { value: '0' },
    });
    expect(onChange).toHaveBeenLastCalledWith({ enabled: false });
  });

  it('sends numeric array items as numbers', () => {
    const onChange = jest.fn();
    render(
      <McpToolParamsForm
        schema={{ properties: { thresholds: { type: 'array', items: { type: 'number' } } } }}
        value={{}}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'thresholds' }), {
      target: { value: '1, 2.5' },
    });
    expect(onChange).toHaveBeenCalledWith({ thresholds: [1, 2.5] });

    fireEvent.change(screen.getByRole('textbox', { name: 'thresholds' }), {
      target: { value: '1,,2' },
    });
    expect(onChange).toHaveBeenLastCalledWith({ thresholds: [1, '', 2] });
  });
});
