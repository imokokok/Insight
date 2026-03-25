'use client';

import { useTranslations } from '@/i18n';

interface LoadingStateProps {
  themeColor?: string;
  message?: string;
}

export function LoadingState({ themeColor = 'blue', message }: LoadingStateProps) {
  const t = useTranslations();

  const borderColorClass = `border-${themeColor}-200`;
  const spinnerColorClass = `border-t-${themeColor}-600`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div
          className={`w-12 h-12 border-4 ${borderColorClass} ${spinnerColorClass} rounded-full animate-spin`}
        />
        <p className="text-gray-500">{message || t('status.loading')}</p>
      </div>
    </div>
  );
}
