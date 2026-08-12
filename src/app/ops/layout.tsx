import type { ReactNode } from 'react';

import { requireOpsOwner } from '@/lib/ops/auth';

import OpsSidebar from './OpsSidebar';

export const metadata = {
  title: 'Ops Console - Insight',
  description: 'Internal API & safety operations console',
};

export default async function OpsLayout({ children }: { children: ReactNode }) {
  await requireOpsOwner();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <OpsSidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
