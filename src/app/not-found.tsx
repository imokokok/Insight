'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

import { EditorialStatePage } from '@/components/editorial';

export default function NotFound() {
  const router = useRouter();

  return (
    <EditorialStatePage
      index="00"
      eyebrow="Unresolved route"
      code="404"
      title="This path does not resolve to an Insight record."
      description="The page may have moved, the address may be incomplete, or the record may no longer be available. Return to the evidence index or step back to the previous view."
      icon={<FileQuestion className="h-6 w-6" />}
      actions={
        <>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 border border-slate-950 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>

          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </>
      }
    />
  );
}
