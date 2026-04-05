'use client';

import { Loader2 } from 'lucide-react';

import { Skeleton } from '@/components/ui/Skeleton';
import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  themeColor?: string;
  message?: string;
  variant?: 'page' | 'card' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  showSpinner?: boolean;
  className?: string;
}

const tailwindColorStyles: Record<string, { spinner: string; skeleton: string }> = {
  blue: {
    spinner: 'text-blue-600',
    skeleton: 'bg-blue-100',
  },
  green: {
    spinner: 'text-green-600',
    skeleton: 'bg-green-100',
  },
  purple: {
    spinner: 'text-purple-600',
    skeleton: 'bg-purple-100',
  },
  red: {
    spinner: 'text-red-600',
    skeleton: 'bg-red-100',
  },
  orange: {
    spinner: 'text-orange-600',
    skeleton: 'bg-orange-100',
  },
  indigo: {
    spinner: 'text-indigo-600',
    skeleton: 'bg-indigo-100',
  },
  pink: {
    spinner: 'text-pink-600',
    skeleton: 'bg-pink-100',
  },
  cyan: {
    spinner: 'text-cyan-600',
    skeleton: 'bg-cyan-100',
  },
  yellow: {
    spinner: 'text-yellow-600',
    skeleton: 'bg-yellow-100',
  },
};

const isHexColor = (color: string): boolean => {
  return color.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(color);
};

const sizeConfig = {
  sm: {
    spinner: 'w-6 h-6',
    gap: 'gap-2',
    text: 'text-sm',
  },
  md: {
    spinner: 'w-10 h-10',
    gap: 'gap-3',
    text: 'text-base',
  },
  lg: {
    spinner: 'w-14 h-14',
    gap: 'gap-4',
    text: 'text-lg',
  },
};

export function LoadingState({
  themeColor = 'blue',
  message,
  variant = 'page',
  size = 'md',
  showSpinner = true,
  className,
}: LoadingStateProps) {
  const t = useTranslations();

  const hexColor = isHexColor(themeColor) ? themeColor : null;
  const colorStyles = hexColor ? null : tailwindColorStyles[themeColor] || tailwindColorStyles.blue;
  const sizes = sizeConfig[size];

  const containerClasses = {
    page: 'min-h-screen bg-gray-50 flex items-center justify-center',
    card: 'bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center min-h-[200px]',
    inline: 'flex items-center justify-center py-4',
  };

  const displayMessage = message || t('status.loading');

  if (variant === 'inline') {
    return (
      <div className={cn(containerClasses[variant], className)}>
        <div className={cn('flex items-center', sizes.gap)}>
          {showSpinner ? (
            <Loader2
              className={cn(
                sizes.spinner,
                'animate-spin',
                hexColor ? '' : colorStyles?.spinner
              )}
              style={hexColor ? { color: hexColor } : undefined}
            />
          ) : (
            <Skeleton
              variant="circular"
              width={size === 'sm' ? 24 : size === 'md' ? 40 : 56}
              height={size === 'sm' ? 24 : size === 'md' ? 40 : 56}
              className={cn(hexColor ? '' : colorStyles?.skeleton)}
              style={hexColor ? { backgroundColor: `${hexColor}20` } : undefined}
            />
          )}
          <span className={cn('text-gray-500', sizes.text)}>{displayMessage}</span>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn(containerClasses[variant], className)}>
        <div className={cn('flex flex-col items-center', sizes.gap)}>
          {showSpinner ? (
            <Loader2
              className={cn(
                sizes.spinner,
                'animate-spin',
                hexColor ? '' : colorStyles?.spinner
              )}
              style={hexColor ? { color: hexColor } : undefined}
            />
          ) : (
            <Skeleton
              variant="circular"
              width={size === 'sm' ? 24 : size === 'md' ? 40 : 56}
              height={size === 'sm' ? 24 : size === 'md' ? 40 : 56}
              className={cn(hexColor ? '' : colorStyles?.skeleton)}
              style={hexColor ? { backgroundColor: `${hexColor}20` } : undefined}
            />
          )}
          <span className={cn('text-gray-500', sizes.text)}>{displayMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(containerClasses[variant], className)}>
      <div className={cn('flex flex-col items-center', sizes.gap)}>
        {showSpinner ? (
          <Loader2
            className={cn(
              sizes.spinner,
              'animate-spin',
              hexColor ? '' : colorStyles?.spinner
            )}
            style={hexColor ? { color: hexColor } : undefined}
          />
        ) : (
          <Skeleton
            variant="circular"
            width={size === 'sm' ? 24 : size === 'md' ? 40 : 56}
            height={size === 'sm' ? 24 : size === 'md' ? 40 : 56}
            className={cn(hexColor ? '' : colorStyles?.skeleton)}
            style={hexColor ? { backgroundColor: `${hexColor}20` } : undefined}
          />
        )}
        <span className={cn('text-gray-500', sizes.text)}>{displayMessage}</span>
      </div>
    </div>
  );
}

export function PageLoadingState({
  themeColor,
  message,
  className,
}: Omit<LoadingStateProps, 'variant'>) {
  return <LoadingState variant="page" themeColor={themeColor} message={message} className={className} />;
}

export function CardLoadingState({
  themeColor,
  message,
  size = 'sm',
  className,
}: Omit<LoadingStateProps, 'variant'>) {
  return (
    <LoadingState variant="card" themeColor={themeColor} message={message} size={size} className={className} />
  );
}

export function InlineLoadingState({
  themeColor,
  message,
  size = 'sm',
  className,
}: Omit<LoadingStateProps, 'variant'>) {
  return (
    <LoadingState variant="inline" themeColor={themeColor} message={message} size={size} className={className} />
  );
}
