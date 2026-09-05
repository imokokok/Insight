/**
 * Single source of truth for all billing plan configuration.
 *
 * Every component that needs to know "what does plan X include?" reads from
 * this file — the API key creation, the quota middleware, the billing panel,
 * and the pricing page. Changing a limit here propagates everywhere.
 *
 * Model (2026-09): Codex-style paid platform.
 *   - NO recurring free tier. API access requires either an active
 *     subscription or a positive credit-wallet balance.
 *   - New users get ONE non-refreshing trial grant (100 cr) after email
 *     verification so they can sample the API before paying — see
 *     POST /api/billing/signup-grant. It never refreshes and never re-issues.
 *   - ALL features are open to any paying user — there is no Tier 2/3 feature
 *     gating. The only gate is the wallet: a call is allowed iff the balance
 *     covers its credit cost (see metering.ts).
 *   - Subscriptions are Developer / Team / Scale (credit allowance + rate
 *     limit differ, features are identical). Enterprise is contact-sales
 *     unlimited.
 *   - Credits can be topped up on demand via CREDIT_PACKS, no subscription
 *     required (pure pay-as-you-go).
 *   - The public website (prices, protocols, rankings) stays free to browse;
 *     only API-key calls are metered.
 *
 * Positioning: Insight is NOT a real-time oracle tracker. It is a
 * reliability-assessment platform — price snapshots are polled every 15
 * minutes, reputation scores are recalculated hourly, and all data is
 * aggregated into daily reports. The allowances below are sized to that
 * cadence: polling faster than 15 minutes yields no fresher snapshot data, so
 * clients should cache on their side.
 *
 * Pricing rationale (validated against 2026-07 market):
 *   - Developer 49 USDC/mo  : 60K credits, entry production workload
 *   - Team 199 USDC/mo      : 300K credits, multi-agent workload
 *   - Scale 499 USDC/mo     : 1M credits, high-volume production workload
 *   - Yearly = 10x monthly (2 months free) : standard industry discount
 *
 * Payments are processed via NOWPayments (crypto only). Prices are denominated
 * in USDC at 1:1 with USD; the payer may settle in any NOWPayments-supported
 * currency at the invoice-time exchange rate. There is no auto-renewal —
 * subscriptions are activated for one billing cycle and require manual renewal.
 */

export const PLANS = {
  developer: {
    name: 'Developer',
    rateLimit: 60, // requests per minute
    monthlyQuota: 60_000, // credits included per billing cycle with a subscription
    priceMonthly: 49,
    priceYearly: 490,
    features: [
      '60,000 credits / month included',
      '60 requests / minute',
      'Full platform access — every endpoint & MCP tool',
      'Historical 15-minute snapshots (90-day archive)',
      'Reliability rankings (90-day trend)',
      'Protocol risk parameters & position stress tests',
      'Anomaly detection, incident timeline & coverage analysis',
      'CSV / Excel export',
      'Email support (48h SLA)',
    ],
  },
  team: {
    name: 'Team',
    rateLimit: 300, // requests per minute
    monthlyQuota: 300_000, // credits included per billing cycle with a subscription
    priceMonthly: 199,
    priceYearly: 1990,
    features: [
      '300,000 credits / month included',
      '300 requests / minute',
      'Full platform access — every endpoint & MCP tool',
      'Batch query priority queue',
      'Quarterly reliability review',
      '99.5% uptime SLA',
      'Slack support (24h SLA)',
    ],
  },
  scale: {
    name: 'Scale',
    rateLimit: 1_200, // requests per minute
    monthlyQuota: 1_000_000, // credits included per billing cycle with a subscription
    priceMonthly: 499,
    priceYearly: 4990,
    features: [
      '1,000,000 credits / month included',
      '1,200 requests / minute',
      'Full platform access — every endpoint & MCP tool',
      'Highest-priority batch queue',
      'Monthly reliability review',
      '99.9% uptime SLA',
      'Dedicated support channel (4h SLA)',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    rateLimit: -1, // unlimited
    monthlyQuota: -1, // unlimited
    priceMonthly: null, // contact sales
    priceYearly: null,
    features: [
      'Unlimited API calls',
      'Dedicated rate limits',
      'Custom endpoints & SLAs',
      '99.9% uptime SLA',
      'Dedicated support engineer',
      'On-call escalation',
    ],
  },
} as const;

export type Plan = keyof typeof PLANS;

/** Billing cycle options for subscriptions. */
export type BillingInterval = 'month' | 'year';

/** Ordered list for display in pricing page (also the tier ladder, ascending). */
export const PLAN_ORDER: Plan[] = ['developer', 'team', 'scale', 'enterprise'];

// ---------------------------------------------------------------------------
// Credit packs — prepaid top-ups. Available to every user (no subscription
// required): a wallet with balance can call ANY endpoint/tool at C1..C4 rates.
// ---------------------------------------------------------------------------

export const CREDIT_PACKS = {
  starter: {
    name: 'Starter Pack',
    credits: 25_000,
    priceUsd: 39,
    description: '≈12,500 deep-analysis calls or ≈5,000 pre-trade checks',
  },
  builder: {
    name: 'Builder Pack',
    credits: 100_000,
    priceUsd: 129,
    description: '≈50,000 deep-analysis calls or ≈20,000 pre-trade checks',
  },
  agent: {
    name: 'Agent Pack',
    credits: 500_000,
    priceUsd: 499,
    description: '≈100,000 pre-trade checks or ≈50,000 attested receipts',
  },
} as const;

export type CreditPack = keyof typeof CREDIT_PACKS;

export const CREDIT_PACK_ORDER: CreditPack[] = ['starter', 'builder', 'agent'];

/**
 * Monthly credit allowance a subscription plan grants to its holder's wallet
 * (per billing cycle, credited via add_monthly_credits cron + at subscription
 * activation). Enterprise is unlimited and receives no grant.
 */
export function planCreditGrant(planValue: Plan): number {
  if (planValue === 'developer') return PLANS.developer.monthlyQuota; // 60_000
  if (planValue === 'team') return PLANS.team.monthlyQuota; // 300_000
  if (planValue === 'scale') return PLANS.scale.monthlyQuota; // 1_000_000
  return 0; // enterprise — unlimited
}

/**
 * Maximum historical trend window (in days) the reputation / ranking endpoints
 * may return. All paying users get the full window — there is no free tier and
 * no feature gating, so this is a flat constant rather than a per-plan cap.
 */
export function maxTrendDays(_plan: Plan): number {
  return 90;
}

/** Normalize a plan string from the DB to a valid Plan key. Defaults to
 *  'developer' (the base tier) for unknown / null values. */
export function normalizePlan(plan: string | null | undefined): Plan {
  if (plan && plan in PLANS) {
    return plan as Plan;
  }
  return 'developer';
}
