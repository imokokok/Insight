'use client';

import { useEffect } from 'react';

import Link from 'next/link';

import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

import { EditorialStatePage } from '@/components/editorial';
import { captureException } from '@/lib/monitoring';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    captureException(error, { digest: error.digest, source: 'global-error' });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <EditorialStatePage
          index="E0"
          eyebrow="System interruption"
          code="PAUSED"
          title="Insight cannot complete this view right now."
          description="A critical interface error interrupted the current request. Retry the application state, or return home and begin from a clean route."
          icon={<AlertOctagon className="h-6 w-6" />}
          fullHeight
          detail={
            <>
              {error.message && process.env.NODE_ENV === 'development' && (
                <p className="max-h-40 overflow-auto border-l-2 border-red-500 bg-red-50 p-3 text-left font-mono text-sm text-slate-600">
                  {error.message}
                </p>
              )}
              {error.digest && (
                <p className="mt-3 font-mono text-xs text-slate-400">Error ID: {error.digest}</p>
              )}
            </>
          }
          actions={
            <>
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 border border-slate-950 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-700"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </Link>
            </>
          }
        />
      </body>
    </html>
  );
}
