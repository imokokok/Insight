'use client';

import { Fragment } from 'react';

import { Check, Crown, Globe, Minus, Sparkles, Zap } from 'lucide-react';

/**
 * Data Access Tier Matrix
 *
 * Visualises the 4-tier data-access model so users can see exactly which
 * data categories and endpoints each plan unlocks. This is the single
 * place that documents the tier ladder on the marketing surface — the
 * authoritative source of truth for enforcement lives in:
 *   - src/lib/billing/plans.ts  (plan definitions + tier ladder)
 *   - src/lib/api/middleware/planGuard.ts  (runtime enforcement)
 *
 * Tier ladder:
 *   Tier 0 — Public metadata (no key required): symbols, feeds, provider list
 *   Tier 1 — Free reliability snapshots: current prices, reputation (7d), daily reports
 *   Tier 2 — Pro deep analysis: deviation, correlation, latency, snapshots, stress tests
 *   Tier 3 — Protocol intelligence: oracle exposure, cross-chain spreads, incidents, coverage
 */

type CellValue = boolean | string;

interface AccessRow {
  label: string;
  free: CellValue;
  pro: CellValue;
  protocol: CellValue;
  hint?: string;
}

interface AccessGroup {
  tierLabel: string;
  tierDescription: string;
  tierBadge: string;
  tierIcon: React.ReactNode;
  rows: AccessRow[];
}

// --- Access data -----------------------------------------------------------
// Cells: true = full checkmark, false = dash (not available), string = custom badge

const accessGroups: AccessGroup[] = [
  {
    tierLabel: 'Tier 0 · Public Metadata',
    tierDescription: 'No API key required — public reference data',
    tierBadge: 'bg-slate-100 text-slate-600',
    tierIcon: <Globe className="w-4 h-4" />,
    rows: [
      {
        label: 'Oracle feed registry (symbols, providers, chains)',
        free: true,
        pro: true,
        protocol: true,
      },
      {
        label: 'API health & status endpoints',
        free: true,
        pro: true,
        protocol: true,
      },
    ],
  },
  {
    tierLabel: 'Tier 1 · Reliability Snapshots',
    tierDescription: 'Free plan — 15-minute reliability assessment essentials',
    tierBadge: 'bg-blue-100 text-blue-700',
    tierIcon: <Zap className="w-4 h-4" />,
    rows: [
      {
        label: 'Current prices + on-chain verification',
        free: true,
        pro: true,
        protocol: true,
      },
      {
        label: 'Oracle reliability rankings & reputation',
        free: '7-day trend',
        pro: '30-day trend',
        protocol: '90-day trend',
        hint: 'Deeper trend history is a paid differentiator',
      },
      {
        label: 'Daily reliability reports',
        free: true,
        pro: true,
        protocol: true,
      },
    ],
  },
  {
    tierLabel: 'Tier 2 · Deep Analysis',
    tierDescription: 'Pro plan — the analytical value that distinguishes paid tiers',
    tierBadge: 'bg-primary-100 text-primary-700',
    tierIcon: <Sparkles className="w-4 h-4" />,
    rows: [
      {
        label: 'Deviation, correlation & divergence signals',
        free: '5 trial/day',
        pro: true,
        protocol: true,
        hint: 'Free users get a limited daily trial quota on Tier 2 endpoints',
      },
      {
        label: 'Latency, feed freshness & heartbeat stats',
        free: '5 trial/day',
        pro: true,
        protocol: true,
      },
      {
        label: 'Historical snapshots (6-month archive, 15-min grain)',
        free: false,
        pro: true,
        protocol: true,
      },
      {
        label: 'Protocol risk parameters & liquidation stress tests',
        free: false,
        pro: true,
        protocol: true,
      },
      {
        label: 'Stablecoin depeg & wrapped-asset peg tracking',
        free: '5 trial/day',
        pro: true,
        protocol: true,
      },
      {
        label: 'Anomaly detection (30-day window)',
        free: false,
        pro: true,
        protocol: true,
      },
      {
        label: 'CSV / Excel export',
        free: false,
        pro: true,
        protocol: true,
      },
    ],
  },
  {
    tierLabel: 'Tier 3 · Protocol Intelligence',
    tierDescription: 'Protocol plan — premium data for protocol teams & risk committees',
    tierBadge: 'bg-purple-100 text-purple-700',
    tierIcon: <Crown className="w-4 h-4" />,
    rows: [
      {
        label: 'Oracle exposure analysis (per-protocol)',
        free: false,
        pro: false,
        protocol: true,
        hint: 'Hard-gated: Pro (even with active trial) is blocked',
      },
      {
        label: 'Cross-chain price spreads',
        free: false,
        pro: false,
        protocol: true,
      },
      {
        label: 'Incident timeline & coverage analysis',
        free: false,
        pro: false,
        protocol: true,
      },
      {
        label: 'Batch query priority queue',
        free: false,
        pro: false,
        protocol: true,
      },
    ],
  },
];

// --- Cell renderer ---------------------------------------------------------

function AccessCell({ value }: { value: CellValue }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center">
        <Check className="w-4 h-4 text-success-500" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center">
        <Minus className="w-4 h-4 text-slate-300" />
      </span>
    );
  }
  // String value — render as a small badge (e.g. "7-day trend", "5 trial/day")
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
      {value}
    </span>
  );
}

// --- Component -------------------------------------------------------------

export function DataAccessTierMatrix({ className = '' }: { className?: string }) {
  return (
    <section className={`py-16 sm:py-20 bg-slate-50 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Data access by tier
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Four tiers of data, sized to a 15-minute reliability cadence. Free covers the
            essentials; Pro unlocks the deep-analysis suite; Protocol adds premium intelligence for
            risk committees.
          </p>
        </div>

        {/* Desktop table (hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="text-left py-4 px-4 text-sm font-semibold text-slate-900 w-2/5">
                  Data category
                </th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-slate-700">Free</th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-blue-700">Pro</th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-purple-700">
                  Protocol
                </th>
              </tr>
            </thead>
            <tbody>
              {accessGroups.map((group) => (
                <Fragment key={group.tierLabel}>
                  {/* Tier group header row */}
                  <tr className="bg-slate-50/70">
                    <td colSpan={4} className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${group.tierBadge}`}
                        >
                          {group.tierIcon}
                          {group.tierLabel}
                        </span>
                        <span className="text-xs text-slate-500">{group.tierDescription}</span>
                      </div>
                    </td>
                  </tr>
                  {/* Data rows */}
                  {group.rows.map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <span className="text-sm text-slate-700">{row.label}</span>
                          {row.hint && <p className="text-xs text-slate-400 mt-0.5">{row.hint}</p>}
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <AccessCell value={row.free} />
                      </td>
                      <td className="text-center py-3 px-4">
                        <AccessCell value={row.pro} />
                      </td>
                      <td className="text-center py-3 px-4">
                        <AccessCell value={row.protocol} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card layout (hidden on desktop) */}
        <div className="md:hidden space-y-8">
          {accessGroups.map((group) => (
            <div
              key={group.tierLabel}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${group.tierBadge}`}
                  >
                    {group.tierIcon}
                    {group.tierLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{group.tierDescription}</p>
              </div>
              <div className="divide-y divide-slate-100">
                {group.rows.map((row) => (
                  <div key={row.label} className="p-4 bg-white">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-sm text-slate-700 flex-1">{row.label}</span>
                    </div>
                    {row.hint && <p className="text-xs text-slate-400 mb-2">{row.hint}</p>}
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400">Free:</span>
                        <AccessCell value={row.free} />
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400">Pro:</span>
                        <AccessCell value={row.pro} />
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400">Protocol:</span>
                        <AccessCell value={row.protocol} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footnote */}
        <p className="text-xs text-slate-400 text-center mt-8 max-w-2xl mx-auto">
          Access is enforced at runtime by the plan-guard middleware. Tier 2 endpoints return HTTP
          402 for free users once the daily trial quota is exhausted; Tier 3 endpoints are
          hard-gated to the Protocol plan. Trend windows (7 / 30 / 90 days) are clamped per API key
          plan on the reputation endpoints.
        </p>
      </div>
    </section>
  );
}
