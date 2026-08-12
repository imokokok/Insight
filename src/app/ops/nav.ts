import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  CreditCard,
  LayoutDashboard,
  Rss,
  ShieldCheck,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

export interface OpNavItem {
  href: string;
  label: string;
  exact?: boolean;
  icon: LucideIcon;
}

export interface OpNavGroup {
  title: string;
  items: OpNavItem[];
}

/** Grouped navigation for the /ops console. Icons come from lucide-react. */
export const OPS_NAV: OpNavGroup[] = [
  {
    title: 'Monitor',
    items: [
      { href: '/ops', label: 'Overview', exact: true, icon: LayoutDashboard },
      { href: '/ops/health', label: 'Provider Reputation', icon: Activity },
      { href: '/ops/safety', label: 'Safety & Attestation', icon: ShieldCheck },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/ops/feeds', label: 'Feeds', icon: Rss },
      { href: '/ops/usage', label: 'API Usage', icon: BarChart3 },
      { href: '/ops/incidents', label: 'Incidents', icon: AlertTriangle },
      { href: '/ops/cron', label: 'Cron & Pipelines', icon: Clock },
    ],
  },
  {
    title: 'Admin',
    items: [{ href: '/ops/billing', label: 'Billing', icon: CreditCard }],
  },
];
