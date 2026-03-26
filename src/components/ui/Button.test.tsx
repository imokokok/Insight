/**
 * @fileoverview Tests for Button component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Button, IconButton } from './Button';
import { Loader2 } from 'lucide-react';

describe('Button', () => {
  it('should render button with children', () => {
    render(<Button>Click me</Button>);
    
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should be disabled when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should display loading spinner when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);
    
    // Check for the spinner icon (Loader2 has aria-hidden by default)
    const button = screen.getByRole('button');
    expect(button).toContainHTML('svg');
  });

  it('should render with primary variant by default', () => {
    render(<Button>Primary</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary-600');
  });

  it('should render with secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-white');
  });

  it('should render with ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-transparent');
  });

  it('should render with danger variant', () => {
    render(<Button variant="danger">Danger</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-danger-600');
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('px-3');
    
    rerender(<Button size="md">Medium</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('px-4');
    
    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('px-6');
  });

  it('should render with left icon', () => {
    render(<Button leftIcon={<span data-testid="left-icon">←</span>}>With Icon</Button>);
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('should render with right icon', () => {
    render(<Button rightIcon={<span data-testid="right-icon">→</span>}>With Icon</Button>);
    
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('should forward ref correctly', () => {
    const ref = jest.fn();
    render(<Button ref={ref}>Ref Test</Button>);
    
    expect(ref).toHaveBeenCalled();
  });

  it('should not show children when size is icon', () => {
    render(<Button size="icon">Icon</Button>);
    
    // The button should not contain the text when size is icon
    const button = screen.getByRole('button');
    expect(button).not.toHaveTextContent('Icon');
  });
});

describe('IconButton', () => {
  it('should render icon button with aria-label', () => {
    render(<IconButton icon={<span>★</span>} aria-label="Star" />);
    
    expect(screen.getByRole('button', { name: /star/i })).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(<IconButton icon={<span>★</span>} aria-label="Star" onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<IconButton icon={<span>★</span>} aria-label="Star" disabled />);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should show loading spinner when isLoading is true', () => {
    render(<IconButton icon={<span>★</span>} aria-label="Star" isLoading />);
    
    const button = screen.getByRole('button');
    expect(button).toContainHTML('svg');
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<IconButton icon={<span>★</span>} aria-label="Star" size="sm" />);
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('w-8', 'h-8');
    
    rerender(<IconButton icon={<span>★</span>} aria-label="Star" size="md" />);
    button = screen.getByRole('button');
    expect(button).toHaveClass('w-10', 'h-10');
    
    rerender(<IconButton icon={<span>★</span>} aria-label="Star" size="lg" />);
    button = screen.getByRole('button');
    expect(button).toHaveClass('w-12', 'h-12');
  });
});
