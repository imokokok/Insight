'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const t = useTranslations('error');

  useEffect(() => {
    // Log error to monitoring service
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-50 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">{t('title')}</h1>

        <p className="text-gray-600 mb-2">{t('description')}</p>

        {error.message && process.env.NODE_ENV === 'development' && (
          <p className="text-sm text-gray-500 mb-6 font-mono bg-gray-50 p-3 text-left overflow-auto max-h-32">
            {error.message}
          </p>
        )}

        {error.digest && (
          <p className="text-xs text-gray-400 mb-6">
            {t('errorId')}: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('retry')}
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            {t('backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
