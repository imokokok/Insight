'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

export default function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        setLoading(true);
        try {
          await router.refresh();
        } finally {
          setLoading(false);
        }
      }}
      className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
    >
      {loading ? 'Refreshing…' : 'Refresh'}
    </button>
  );
}
