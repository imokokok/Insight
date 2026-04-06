'use client';

import { useTranslations } from '@/i18n';

export interface ExportButtonProps {
  isExporting: boolean;
  disabled: boolean;
  isOpen: boolean;
  onClick: () => void;
  compact?: boolean;
}

export function ExportButton({
  isExporting,
  disabled,
  isOpen,
  onClick,
  compact = false,
}: ExportButtonProps) {
  const t = useTranslations();

  if (compact) {
    return (
      <button
        onClick={onClick}
        disabled={disabled || isExporting}
        className={`p-2 transition-colors ${
          disabled || isExporting
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title={t('priceChart.export.exportChart')}
      >
        {isExporting ? <LoadingSpinner size={4} /> : <DownloadIcon size={4} />}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || isExporting}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
        disabled || isExporting
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {isExporting ? (
        <>
          <LoadingSpinner size={4} />
          <span>{t('priceChart.export.exporting')}</span>
        </>
      ) : (
        <>
          <DownloadIcon size={4} />
          <span>{t('priceChart.export.title')}</span>
          <ChevronDownIcon />
        </>
      )}
    </button>
  );
}

function LoadingSpinner({ size }: { size: number }) {
  return (
    <svg className={`w-${size} h-${size} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function DownloadIcon({ size }: { size: number }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
