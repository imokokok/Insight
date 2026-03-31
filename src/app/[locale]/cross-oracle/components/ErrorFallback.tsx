'use client';

import { type ErrorInfo } from 'react';

import Link from 'next/link';

import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

import { useTranslations } from '@/i18n';

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo?: ErrorInfo | null;
  onReset?: () => void;
}

export function ErrorFallback({ error, errorInfo, onReset }: ErrorFallbackProps) {
  const t = useTranslations();
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        {/* Error Title */}
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
          {t('errorFallback.title')}
        </h2>

        {/* Error Description */}
        <p className="text-sm text-gray-500 text-center mb-6">{t('errorFallback.description')}</p>

        {/* Error Details in Development Mode */}
        {isDevelopment && error && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200 overflow-auto">
            <p className="text-xs font-medium text-gray-700 mb-2">
              {t('errorFallback.errorDetails')}
            </p>
            <pre className="text-xs text-red-600 whitespace-pre-wrap break-all">
              {error.message}
            </pre>
            {errorInfo && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer">
                  {t('errorFallback.componentStack')}
                </summary>
                <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onReset && (
            <button
              onClick={onReset}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {t('errorFallback.retry')}
            </button>
          )}
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            {t('errorFallback.goHome')}
          </Link>
        </div>

        {/* Help Link */}
        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">{t('errorFallback.contactSupport')}</p>
        </div>
      </div>
    </div>
  );
}

export default ErrorFallback;
