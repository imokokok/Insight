'use client';

import { useTranslations } from 'next-intl';

interface ErrorFallbackProps {
  error: Error;
  onRetry: () => void;
  themeColor?: string;
}

export function ErrorFallback({ error, onRetry, themeColor = 'blue' }: ErrorFallbackProps) {
  const t = useTranslations();

  const bgColorClass = `bg-${themeColor}-100`;
  const textColorClass = `text-${themeColor}-600`;
  const buttonBgClass = `bg-${themeColor}-600`;
  const buttonHoverClass = `hover:bg-${themeColor}-700`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="py-4 border-b border-gray-100 max-w-md w-full mx-4">
        <div
          className={`flex items-center justify-center w-12 h-12 ${bgColorClass} rounded-full mb-4 mx-auto`}
        >
          <svg
            className={`w-6 h-6 ${textColorClass}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 text-center mb-2">
          {t('common.error.loadingFailed')}
        </h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          {error.message || t('common.error.loadingFailed')}
        </p>
        <button
          onClick={onRetry}
          className={`w-full px-3 py-1.5 ${buttonBgClass} text-white rounded-md text-sm ${buttonHoverClass} transition-colors`}
        >
          {t('common.retry')}
        </button>
      </div>
    </div>
  );
}
