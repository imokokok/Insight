'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/ops', label: 'Overview', exact: true },
  { href: '/ops/safety', label: 'Safety & Attestation' },
  { href: '/ops/feeds', label: 'Feeds' },
  { href: '/ops/usage', label: 'API Usage' },
  { href: '/ops/health', label: 'Oracle Health' },
  { href: '/ops/incidents', label: 'Incidents' },
  { href: '/ops/cron', label: 'Cron & Pipelines' },
  { href: '/ops/billing', label: 'Billing' },
];

export default function OpsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 min-h-screen p-4">
      <div className="px-3 py-2 mb-4">
        <div className="text-sm font-semibold text-slate-900">Insight</div>
        <div className="text-xs text-slate-500">Internal Ops Console</div>
      </div>
      <nav className="space-y-1">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={
                active
                  ? 'block px-3 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white'
                  : 'block px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100'
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
