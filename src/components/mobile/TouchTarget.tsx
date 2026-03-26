'use client';

import {
  forwardRef,
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
  type ReactNode,
  type ElementType,
  ComponentPropsWithoutRef,
} from 'react';

import Link from 'next/link';

// Minimum touch target size (44x44 points as per Apple HIG and Material Design)
export const MIN_TOUCH_SIZE = 44;

interface TouchTargetBaseProps {
  className?: string;
  minSize?: number;
  expandTouchArea?: boolean;
}

// Button component with guaranteed minimum touch target
interface TouchButtonProps extends TouchTargetBaseProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  (
    {
      children,
      className = '',
      minSize = MIN_TOUCH_SIZE,
      expandTouchArea = true,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200';

    const variantStyles = {
      primary:
        'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 disabled:bg-primary-300',
      secondary:
        'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400',
      ghost:
        'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:text-gray-400',
      danger:
        'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800 disabled:bg-red-300',
    };

    const sizeStyles = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const touchAreaStyles = expandTouchArea
      ? 'relative after:absolute after:inset-0 after:-m-2 after:content-[""]'
      : '';

    const minSizeStyle = {
      minWidth: minSize,
      minHeight: minSize,
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${touchAreaStyles} ${className}`}
        style={minSizeStyle}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

TouchButton.displayName = 'TouchButton';

// Link component with guaranteed minimum touch target
interface TouchLinkProps extends TouchTargetBaseProps {
  children: ReactNode;
  href: string;
  external?: boolean;
}

export const TouchLink = forwardRef<HTMLAnchorElement, TouchLinkProps>(
  (
    {
      children,
      className = '',
      minSize = MIN_TOUCH_SIZE,
      expandTouchArea = true,
      href,
      external = false,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center text-primary-600 hover:text-primary-700 active:text-primary-800 transition-colors';

    const touchAreaStyles = expandTouchArea
      ? 'relative after:absolute after:inset-0 after:-m-2 after:content-[""]'
      : '';

    const minSizeStyle = {
      minWidth: minSize,
      minHeight: minSize,
    };

    const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

    return (
      <Link
        ref={ref}
        href={href}
        className={`${baseStyles} ${touchAreaStyles} ${className}`}
        style={minSizeStyle}
        {...linkProps}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

TouchLink.displayName = 'TouchLink';

// Icon button with guaranteed minimum touch target
interface TouchIconButtonProps {
  icon: ReactNode;
  label: string;
  className?: string;
  minSize?: number;
  variant?: 'default' | 'ghost' | 'primary';
  onClick?: () => void;
  disabled?: boolean;
}

export const TouchIconButton = forwardRef<HTMLButtonElement, TouchIconButtonProps>(
  (
    { icon, label, className = '', minSize = MIN_TOUCH_SIZE, variant = 'default', ...props },
    ref
  ) => {
    const variantStyles = {
      default: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
      ghost: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
      primary: 'text-primary-600 hover:bg-primary-50 active:bg-primary-100',
    };

    return (
      <button
        ref={ref}
        type="button"
        className={`inline-flex items-center justify-center rounded-lg transition-colors ${variantStyles[variant]} ${className}`}
        style={{ minWidth: minSize, minHeight: minSize }}
        aria-label={label}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

TouchIconButton.displayName = 'TouchIconButton';

// Touch target wrapper for custom elements
interface TouchTargetWrapperProps extends TouchTargetBaseProps {
  children: ReactNode;
  as?: ElementType;
}

export function TouchTargetWrapper({
  children,
  className = '',
  minSize = MIN_TOUCH_SIZE,
  expandTouchArea = true,
  as: Component = 'div',
  ...props
}: TouchTargetWrapperProps & Record<string, unknown>) {
  const touchAreaStyles = expandTouchArea
    ? 'relative after:absolute after:inset-0 after:-m-2 after:content-[""]'
    : '';

  return (
    <Component
      className={`inline-flex items-center justify-center ${touchAreaStyles} ${className}`}
      style={{ minWidth: minSize, minHeight: minSize }}
      {...props}
    >
      {children}
    </Component>
  );
}

// Hook to check touch target sizes
export function useTouchTargetCheck() {
  const checkTouchTargets = () => {
    if (typeof window === 'undefined') return [];

    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'
    );

    const violations: Array<{
      element: Element;
      width: number;
      height: number;
      recommended: number;
    }> = [];

    interactiveElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const minSize = Math.min(rect.width, rect.height);

      if (minSize < MIN_TOUCH_SIZE) {
        violations.push({
          element,
          width: rect.width,
          height: rect.height,
          recommended: MIN_TOUCH_SIZE,
        });
      }
    });

    return violations;
  };

  return { checkTouchTargets, MIN_TOUCH_SIZE };
}

export default {
  TouchButton,
  TouchLink,
  TouchIconButton,
  TouchTargetWrapper,
  useTouchTargetCheck,
  MIN_TOUCH_SIZE,
};
