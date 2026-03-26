/**
 * @fileoverview Tests for Card component
 */

import { render, screen, fireEvent } from '@testing-library/react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatCard,
} from './Card';

describe('Card', () => {
  it('should render card with children', () => {
    render(<Card data-testid="card">Card content</Card>);

    expect(screen.getByTestId('card')).toHaveTextContent('Card content');
  });

  it('should render with default variant', () => {
    render(<Card data-testid="card">Default card</Card>);

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('bg-white', 'border', 'border-gray-200');
  });

  it('should render with elevated variant', () => {
    render(
      <Card data-testid="card" variant="elevated">
        Elevated card
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('shadow-md');
  });

  it('should render with bordered variant', () => {
    render(
      <Card data-testid="card" variant="bordered">
        Bordered card
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('border-2', 'border-primary-500');
  });

  it('should render with filled variant', () => {
    render(
      <Card data-testid="card" variant="filled">
        Filled card
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('bg-gray-50');
  });

  it('should render with interactive variant', () => {
    render(
      <Card data-testid="card" variant="interactive">
        Interactive card
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('cursor-pointer');
  });

  it('should render with different sizes', () => {
    const { rerender } = render(
      <Card data-testid="card" size="sm">
        Small card
      </Card>
    );

    let card = screen.getByTestId('card');
    expect(card).toHaveClass('p-4');

    rerender(
      <Card data-testid="card" size="md">
        Medium card
      </Card>
    );
    card = screen.getByTestId('card');
    expect(card).toHaveClass('p-5');

    rerender(
      <Card data-testid="card" size="lg">
        Large card
      </Card>
    );
    card = screen.getByTestId('card');
    expect(card).toHaveClass('p-6');
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(
      <Card data-testid="card" onClick={handleClick}>
        Clickable card
      </Card>
    );

    fireEvent.click(screen.getByTestId('card'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply custom className', () => {
    render(
      <Card data-testid="card" className="custom-class">
        Custom card
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('custom-class');
  });

  it('should forward ref correctly', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<Card ref={ref}>Ref test</Card>);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardHeader', () => {
  it('should render header with children', () => {
    render(<CardHeader data-testid="header">Header content</CardHeader>);

    expect(screen.getByTestId('header')).toHaveTextContent('Header content');
  });

  it('should apply custom className', () => {
    render(
      <CardHeader data-testid="header" className="custom-header">
        Header
      </CardHeader>
    );

    const header = screen.getByTestId('header');
    expect(header).toHaveClass('custom-header');
  });
});

describe('CardTitle', () => {
  it('should render title with correct element', () => {
    render(<CardTitle>Card Title</CardTitle>);

    const title = screen.getByRole('heading', { level: 3 });
    expect(title).toHaveTextContent('Card Title');
    expect(title).toHaveClass('text-base', 'font-semibold');
  });
});

describe('CardDescription', () => {
  it('should render description with correct styling', () => {
    render(<CardDescription>Description text</CardDescription>);

    const description = screen.getByText('Description text');
    expect(description.tagName).toBe('P');
    expect(description).toHaveClass('text-sm', 'text-gray-500');
  });
});

describe('CardContent', () => {
  it('should render content with correct styling', () => {
    render(<CardContent data-testid="content">Content area</CardContent>);

    const content = screen.getByTestId('content');
    expect(content).toHaveClass('pt-4');
  });
});

describe('CardFooter', () => {
  it('should render footer with correct styling', () => {
    render(<CardFooter data-testid="footer">Footer content</CardFooter>);

    const footer = screen.getByTestId('footer');
    expect(footer).toHaveClass('flex', 'items-center', 'justify-between');
  });
});

describe('StatCard', () => {
  it('should render stat card with title and value', () => {
    render(<StatCard title="Total Price" value="$68,000" />);

    expect(screen.getByText('Total Price')).toBeInTheDocument();
    expect(screen.getByText('$68,000')).toBeInTheDocument();
  });

  it('should render with positive change', () => {
    render(<StatCard title="Price" value="$68,000" change="5.2%" changeType="positive" />);

    const changeElement = screen.getByText('5.2%');
    expect(changeElement).toBeInTheDocument();
    expect(changeElement.parentElement).toHaveClass('text-success-600');
  });

  it('should render with negative change', () => {
    render(<StatCard title="Price" value="$68,000" change="-2.1%" changeType="negative" />);

    const changeElement = screen.getByText('-2.1%');
    expect(changeElement).toBeInTheDocument();
    expect(changeElement.parentElement).toHaveClass('text-danger-600');
  });

  it('should render with neutral change', () => {
    render(<StatCard title="Price" value="$68,000" change="0%" changeType="neutral" />);

    const changeElement = screen.getByText('0%');
    expect(changeElement).toBeInTheDocument();
    expect(changeElement.parentElement).toHaveClass('text-gray-600');
  });

  it('should render with icon', () => {
    render(<StatCard title="Price" value="$68,000" icon={<span data-testid="icon">💰</span>} />);

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should not render change indicator when change is not provided', () => {
    render(<StatCard title="Price" value="$68,000" />);

    const changeElements = screen.queryAllByText(/[↑↓→]/);
    expect(changeElements).toHaveLength(0);
  });
});
