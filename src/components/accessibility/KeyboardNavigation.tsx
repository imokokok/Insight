'use client';

import React, { useEffect, useRef, useCallback, useState, type ElementType } from 'react';

import { useTranslations } from '@/i18n';

// ============================================
// Skip Link Component
// ============================================

interface SkipLinkProps {
  targetId: string;
  label?: string;
  className?: string;
}

export function SkipLink({ targetId, label, className = '' }: SkipLinkProps) {
  const t = useTranslations('accessibility');

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={`skip-link sr-only-focusable ${className}`}
    >
      {label || t('skipLink')}
    </a>
  );
}

// ============================================
// Visually Hidden Component
// ============================================

interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: ElementType;
  className?: string;
}

export function VisuallyHidden({
  children,
  as: Component = 'span',
  className = '',
}: VisuallyHiddenProps) {
  return <Component className={`sr-only ${className}`}>{children}</Component>;
}

// ============================================
// Live Region Component
// ============================================

interface LiveRegionProps {
  id?: string;
  level?: 'polite' | 'assertive';
  atomic?: boolean;
  className?: string;
}

export function LiveRegion({
  id,
  level = 'polite',
  atomic = true,
  className = '',
}: LiveRegionProps) {
  return <div id={id} aria-live={level} aria-atomic={atomic} className={`sr-only ${className}`} />;
}

// ============================================
// Focus Trap Component
// ============================================

interface FocusTrapProps {
  children: React.ReactNode;
  isActive: boolean;
  onEscape?: () => void;
  className?: string;
}

export function FocusTrap({ children, isActive, onEscape, className = '' }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Save previous focus
  useEffect(() => {
    if (isActive) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [isActive]);

  // Restore focus on unmount
  useEffect(() => {
    return () => {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  // Handle tab key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isActive) return;

      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusableElements = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    },
    [isActive, onEscape]
  );

  // Focus first element when activated
  useEffect(() => {
    if (isActive && containerRef.current) {
      const focusableElement = containerRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusableElement?.focus();
    }
  }, [isActive]);

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} className={className}>
      {children}
    </div>
  );
}

// ============================================
// Keyboard Navigation Hook
// ============================================

interface UseKeyboardNavigationOptions {
  orientation?: 'horizontal' | 'vertical';
  loop?: boolean;
  onSelect?: (index: number) => void;
  onEscape?: () => void;
}

export function useKeyboardNavigation(
  itemCount: number,
  options: UseKeyboardNavigationOptions = {}
) {
  const { orientation = 'vertical', loop = true, onSelect, onEscape } = options;
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (itemCount === 0) return;

      const isHorizontal = orientation === 'horizontal';
      const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
      const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

      switch (e.key) {
        case nextKey:
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev + 1;
            if (next >= itemCount) {
              return loop ? 0 : prev;
            }
            return next;
          });
          break;

        case prevKey:
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev - 1;
            if (next < 0) {
              return loop ? itemCount - 1 : prev;
            }
            return next;
          });
          break;

        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;

        case 'End':
          e.preventDefault();
          setFocusedIndex(itemCount - 1);
          break;

        case 'Enter':
        case ' ':
          if (focusedIndex >= 0 && onSelect) {
            e.preventDefault();
            onSelect(focusedIndex);
          }
          break;

        case 'Escape':
          if (onEscape) {
            e.preventDefault();
            onEscape();
          }
          break;
      }
    },
    [itemCount, orientation, loop, onSelect, onEscape, focusedIndex]
  );

  // Focus the item when index changes
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < itemCount) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, itemCount]);

  const getItemProps = useCallback(
    (index: number) => ({
      ref: (el: HTMLElement | null) => {
        itemRefs.current[index] = el;
      },
      tabIndex: index === focusedIndex ? 0 : -1,
      onFocus: () => setFocusedIndex(index),
    }),
    [focusedIndex]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    getItemProps,
  };
}

// ============================================
// Keyboard Navigation Component
// ============================================

interface KeyboardNavigationProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function KeyboardNavigation({
  children,
  orientation = 'vertical',
  className = '',
  onKeyDown,
}: KeyboardNavigationProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    onKeyDown?.(e);
  };

  return (
    <div
      role="group"
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
      className={className}
    >
      {children}
    </div>
  );
}

// ============================================
// Focus Manager Hook
// ============================================

export function useFocusManager() {
  const [focusVisible, setFocusVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setFocusVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return { focusVisible };
}

// ============================================
// Focus Indicator Component
// ============================================

interface FocusIndicatorProps {
  children: React.ReactElement;
  className?: string;
  ringColor?: string;
  ringWidth?: number;
  ringOffset?: number;
}

export function FocusIndicator({
  children,
  className = '',
  ringColor = 'ring-primary-500',
  ringWidth = 2,
  ringOffset = 2,
}: FocusIndicatorProps) {
  const child = children as React.ReactElement<{ className?: string }>;
  return React.cloneElement(child, {
    className: `${child.props.className || ''} focus-visible:outline-none focus-visible:ring-${ringWidth} focus-visible:${ringColor} focus-visible:ring-offset-${ringOffset} ${className}`,
  });
}

// ============================================
// Accessible Button Component
// ============================================

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      children,
      isLoading,
      loadingText,
      leftIcon,
      rightIcon,
      disabled,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="sr-only">{loadingText || 'Loading'}</span>
            <span aria-hidden="true">{leftIcon}</span>
            {children}
          </>
        ) : (
          <>
            {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

// ============================================
// Accessible Link Component
// ============================================

interface AccessibleLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  external?: boolean;
  underline?: boolean;
}

export const AccessibleLink = React.forwardRef<HTMLAnchorElement, AccessibleLinkProps>(
  ({ children, external, underline = true, href = '#', ...props }, ref) => {
    const externalProps = external
      ? {
          target: '_blank',
          rel: 'noopener noreferrer',
          'aria-label': `${props['aria-label'] || children} (opens in new tab)`,
        }
      : {};

    return (
      <a
        ref={ref}
        href={href}
        className={`${underline ? 'underline' : ''} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2`}
        {...externalProps}
        {...props}
      >
        {children}
        {external && (
          <span aria-hidden="true" className="ml-1">
            ↗
          </span>
        )}
      </a>
    );
  }
);

AccessibleLink.displayName = 'AccessibleLink';

// ============================================
// Keyboard Shortcuts Hook
// ============================================

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  handler: () => void;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const matchesKey = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = !!shortcut.ctrlKey === e.ctrlKey;
        const matchesAlt = !!shortcut.altKey === e.altKey;
        const matchesShift = !!shortcut.shiftKey === e.shiftKey;
        const matchesMeta = !!shortcut.metaKey === e.metaKey;

        if (matchesKey && matchesCtrl && matchesAlt && matchesShift && matchesMeta) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          shortcut.handler();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// ============================================
// Announce to Screen Reader
// ============================================

export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// ============================================
// Roving Tabindex Component
// ============================================

interface RovingTabindexProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function RovingTabindex({
  children,
  className = '',
  orientation = 'vertical',
}: RovingTabindexProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const items = Array.from(container.querySelectorAll<HTMLElement>('[data-roving-tabindex]'));
      const currentIndex = items.findIndex((item) => item === document.activeElement);

      const isHorizontal = orientation === 'horizontal';
      const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
      const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

      switch (e.key) {
        case nextKey:
          e.preventDefault();
          {
            const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            items[nextIndex]?.focus();
            setActiveIndex(nextIndex);
          }
          break;

        case prevKey:
          e.preventDefault();
          {
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            items[prevIndex]?.focus();
            setActiveIndex(prevIndex);
          }
          break;

        case 'Home':
          e.preventDefault();
          items[0]?.focus();
          setActiveIndex(0);
          break;

        case 'End':
          e.preventDefault();
          items[items.length - 1]?.focus();
          setActiveIndex(items.length - 1);
          break;
      }
    },
    [orientation]
  );

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={className}
      role="group"
      aria-orientation={orientation}
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<{ 'data-roving-tabindex'?: boolean; tabIndex?: number }>,
            {
              'data-roving-tabindex': true,
              tabIndex: index === activeIndex ? 0 : -1,
            }
          );
        }
        return child;
      })}
    </div>
  );
}

// ============================================
// Export types
// ============================================

export type {
  SkipLinkProps,
  VisuallyHiddenProps,
  LiveRegionProps,
  FocusTrapProps,
  UseKeyboardNavigationOptions,
  KeyboardNavigationProps,
  FocusIndicatorProps,
  AccessibleButtonProps,
  AccessibleLinkProps,
  KeyboardShortcut,
  RovingTabindexProps,
};
