'use client';

import { useEffect } from 'react';

import Link from 'next/link';

import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
          <div className="text-center max-w-lg bg-white p-8 border border-gray-200">
            <div className="w-24 h-24 bg-danger-50 flex items-center justify-center mx-auto mb-6">
              <AlertOctagon className="w-12 h-12 text-danger-500" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">Something went wrong</h1>

            <p className="text-gray-600 mb-4">
              We apologize for the inconvenience. A critical error has occurred.
            </p>

            {error.message && process.env.NODE_ENV === 'development' && (
              <p className="text-sm text-gray-500 mb-6 font-mono bg-gray-50 p-3 text-left overflow-auto max-h-40">
                {error.message}
              </p>
            )}

            {error.digest && <p className="text-xs text-gray-400 mb-6">Error ID: {error.digest}</p>}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
