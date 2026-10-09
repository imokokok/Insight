/**
 * Single source of truth for all billing plan configuration.
 *
 * Every component that needs to know "what does plan X include?" reads from
 * this file — the API key creation, the quota middleware, the billing panel,
 * and the pricing page. Changing a limit here propagates everywhere.
 *
 * Per-call credit prices are deliberately NOT copied into components. The cost
 * of each metering class lives in ./metering.ts (CREDIT_COST) and every surface
 * derives its numbers from {@link creditPricePaths} / {@link callPriceRange}
 * below, so the pricing page cannot drift from what the middleware charges.
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
 * Pricing model (2026-10):
 *   - x402 remains the public per-call list price: C1 $0.002, C2 $0.008,
 *     C3 $0.02, C4 $0.04 (1 credit = $0.004).
 *   - The annual commitment carries the discount. Measured against the x402
 *     list price, annual plans land 12.5%–19.8% below and monthly plans
 *     4.6%–12.5% below. Monthly-only volume pricing is therefore shallow
 *     (Developer → Scale, a 16.7x volume step, is only ~9% cheaper per call).
 *   - Prepaid packs are NOT a volume discount. Per call they sit within ~1%–8%
 *     of the x402 list price (Starter is within 1%). Their value is settlement
 *     batching: one invoice instead of a per-call on-chain x402 payment. Do not
 *     advertise them as cheaper — advertise them as fewer settlements.
 *   - Developer 229 USDC/mo : 60K credits, entry production workload
 *   - Team 1,099 USDC/mo    : 300K credits, multi-agent workload
 *   - Scale 3,499 USDC/mo   : 1M credits, high-volume production workload
 *   - Yearly = 11x monthly for 12 monthly credit grants (one month included)
 *   - Packs: Starter 99 / 25K, Builder 389 / 100K, Agent 1,849 / 500K
 *
 * Payments are processed via NOWPayments (crypto only). Prices are denominated
 * in USDC at 1:1 with USD; the payer may settle in any NOWPayments-supported
 * currency at the invoice-time exchange rate. There is no auto-renewal —
 * subscriptions are activated for one billing cycle and require manual renewal.
 */

import { CREDIT_COST, creditAllowanceExamples, type MeteringClass } from './metering';

export const PLANS = {
  developer: {
    name: 'Developer',
    rateLimit: 60, // requests per minute
    monthlyQuota: 60_000, // credits included per billing cycle with a subscription
    priceMonthly: 229,
    priceYearly: 2519,
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
    priceMonthly: 1099,
    priceYearly: 12089,
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
    priceMonthly: 3499,
    priceYearly: 38489,
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
    priceUsd: 99,
    description: creditAllowanceExamples(25_000, ['C2', 'C3']),
  },
  builder: {
    name: 'Builder Pack',
    credits: 100_000,
    priceUsd: 389,
    description: creditAllowanceExamples(100_000, ['C2', 'C3']),
  },
  agent: {
    name: 'Agent Pack',
    credits: 500_000,
    priceUsd: 1849,
    description: creditAllowanceExamples(500_000, ['C3', 'C4']),
  },
} as const;

export type CreditPack = keyof typeof CREDIT_PACKS;

export const CREDIT_PACK_ORDER: CreditPack[] = ['starter', 'builder', 'agent'];

// ---------------------------------------------------------------------------
// Derived per-call pricing
//
// The pricing page must never hardcode a credit cost or a per-call dollar
// figure: both are functions of CREDIT_COST (metering.ts) and the plan/pack
// tables above. These helpers are the only supported way to render them.
// ---------------------------------------------------------------------------

/** A way to buy credits: a subscription interval or a one-off prepaid pack. */
export interface CreditPricePath {
  /** Stable identifier, e.g. `developer-yearly` or `starter-pack`. */
  id: string;
  /** Human label for the path. */
  label: string;
  kind: 'subscription' | 'pack';
  interval: BillingInterval | 'one-off';
  /** Effective USD price of a single credit on this path. */
  usdPerCredit: number;
}

/**
 * Every paid path that yields credits, with its effective per-credit price.
 * Enterprise is excluded — it is contact-sales and has no listed rate.
 */
export function creditPricePaths(): CreditPricePath[] {
  const subscriptions = PLAN_ORDER.flatMap((plan) => {
    if (plan === 'enterprise') return [];
    const config = PLANS[plan];
    return [
      {
        id: `${plan}-monthly`,
        label: `${config.name} monthly`,
        kind: 'subscription' as const,
        interval: 'month' as const,
        usdPerCredit: config.priceMonthly / config.monthlyQuota,
      },
      {
        id: `${plan}-yearly`,
        label: `${config.name} yearly`,
        kind: 'subscription' as const,
        interval: 'year' as const,
        usdPerCredit: config.priceYearly / (config.monthlyQuota * 12),
      },
    ];
  });

  const packs = CREDIT_PACK_ORDER.map((pack) => ({
    id: `${pack}-pack`,
    label: CREDIT_PACKS[pack].name,
    kind: 'pack' as const,
    interval: 'one-off' as const,
    usdPerCredit: CREDIT_PACKS[pack].priceUsd / CREDIT_PACKS[pack].credits,
  }));

  return [...subscriptions, ...packs];
}

/**
 * USD cost of a single call in the given metering class, as a range across
 * every paid path — the cheapest path and the most expensive listed path.
 * This is what the pricing page shows instead of a hand-written number.
 */
export function callPriceRange(cls: MeteringClass): { min: number; max: number } {
  const prices = creditPricePaths().map((path) => path.usdPerCredit * CREDIT_COST[cls]);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/**
 * Credits a plan grants per billing cycle as a function of the metering class,
 * so the pricing page can translate an allowance into concrete call counts.
 */
export function callsPerCycle(plan: Plan, cls: MeteringClass): number {
  const quota = PLANS[plan].monthlyQuota;
  if (quota < 0) return Number.POSITIVE_INFINITY;
  return Math.floor(quota / CREDIT_COST[cls]);
}

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
