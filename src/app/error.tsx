'use client';

import { useEffect } from 'react';

import Link from 'next/link';

import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

import { EditorialStatePage } from '@/components/editorial';
import { captureException } from '@/lib/monitoring';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    captureException(error, { digest: error.digest, source: 'route-error' });
  }, [error]);

  return (
    <EditorialStatePage
      index="E1"
      eyebrow="Recoverable interruption"
      code="ERROR"
      title="This record could not be assembled."
      description="The page encountered an unexpected condition while loading its evidence. Retry the request, or return to the main index without losing the rest of your session."
      icon={<AlertTriangle className="h-6 w-6" />}
      detail={
        <>
          {error.message && process.env.NODE_ENV === 'development' && (
            <p className="max-h-32 overflow-auto border-l-2 border-red-500 bg-red-50 p-3 text-left font-mono text-sm text-slate-600">
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
  );
}
