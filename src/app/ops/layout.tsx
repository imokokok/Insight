import type { ReactNode } from 'react';

import { requireOpsOwner } from '@/lib/ops/auth';

import HealthStrip from './HealthStrip';
import OpsSidebar from './OpsSidebar';

// L2 hardening: never let search engines index the internal console.
// The <meta name="robots"> tag here covers HTML discovery; middleware also
// stamps X-Robots-Tag on the response for belt-and-suspenders.
export const metadata = {
  title: 'Ops Console - Insight',
  description: 'Internal API & safety operations console',
  robots: {
    index: false,
    follow: false,
  },
};

// Authentication and every child page depend on request cookies/live
// operational data. Never execute or freeze this private console at build time.
export const dynamic = 'force-dynamic';

const ENV =
  process.env.NEXT_PUBLIC_ENV ??
  process.env.VERCEL_ENV ??
  (process.env.NODE_ENV === 'development' ? 'DEV' : 'PROD');

export default async function OpsLayout({ children }: { children: ReactNode }) {
  await requireOpsOwner();

  return (
    <div className="ops-workspace flex min-h-screen bg-[#f8f7f4]">
      <OpsSidebar env={ENV} />
      <main className="min-w-0 flex-1 overflow-y-auto pt-12 lg:pt-0">
        <HealthStrip />
        {children}
      </main>
    </div>
  );
}
