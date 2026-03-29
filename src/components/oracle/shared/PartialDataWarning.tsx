'use client';

import { useTranslations } from '@/i18n';

interface PartialDataWarningProps {
  failedItems: string[];
  onRetry?: () => void;
  themeColor?: string;
}

export function PartialDataWarning({
  failedItems,
  onRetry,
  themeColor = 'blue',
}: PartialDataWarningProps) {
  const t = useTranslations();

  if (failedItems.length === 0) {
    return null;
  }

  const borderColorClass = `border-${themeColor}-200`;
  const bgColorClass = `bg-${themeColor}-50`;
  const textColorClass = `text-${themeColor}-700`;
  const buttonBgClass = `bg-${themeColor}-600`;
  const buttonHoverClass = `hover:bg-${themeColor}-700`;

  return (
    <div className={`mb-4 p-3 border ${borderColorClass} ${bgColorClass} rounded-lg`}>
      <div className="flex items-start gap-3">
        <svg
          className={`w-5 h-5 ${textColorClass} flex-shrink-0 mt-0.5`}
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
        <div className="flex-1">
          <p className={`text-sm font-medium ${textColorClass}`}>
            {t('common.warning.partialData')}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {t('common.warning.partialDataDescription', {
              items: failedItems.join(', '),
            })}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className={`px-3 py-1.5 ${buttonBgClass} text-white text-sm ${buttonHoverClass} transition-colors rounded`}
          >
            {t('actions.retry')}
          </button>
        )}
      </div>
    </div>
  );
}
