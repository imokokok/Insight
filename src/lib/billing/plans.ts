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
 * Model (2026-11): Codex-style paid platform.
 *   - NO recurring free tier. API access requires either an active
 *     subscription or a positive credit-wallet balance.
 *   - New users get ONE non-refreshing trial grant (400 cr) after email
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
 * Pricing model (2026-11-07 audit v2.1; 1 credit = $0.001):
 *   - x402 list price = API-key list price: C1 $0.002, C2 $0.004, C3 $0.02,
 *     C4 $0.04, watch window $0.50, position lifecycle $0.55.
 *   - Subscriptions are real discounts against credit face value, not face
 *     value itself. Face value = credits × $0.001 ($25.00 / $120.00 / $500.00):
 *     Starter $19/mo (−24.0%), Team $79/mo (−34.2%), Scale $299/mo (−40.2%).
 *   - Yearly = 10× monthly for 12 monthly credit grants:
 *     $190 / $790 / $2,990 (−36.7% / −45.1% / −50.2% vs face value).
 *   - Prepaid packs are NOT a volume discount. Their value is settlement
 *     batching: one invoice instead of a per-call on-chain x402 payment. Do not
 *     advertise them as cheaper — advertise them as fewer settlements.
 *   - Starter $19/mo : 25K credits, entry production workload
 *   - Team $79/mo    : 120K credits, multi-agent workload
 *   - Scale $299/mo  : 500K credits, high-volume production workload
 *   - Packs: Starter 99 / 100K, Builder 389 / 400K, Agent 1,849 / 2M
 *
 * Payments are processed via NOWPayments (crypto only). Prices are denominated
 * in USDC at 1:1 with USD; the payer may settle in any NOWPayments-supported
 * currency at the invoice-time exchange rate. There is no auto-renewal —
 * subscriptions are activated for one billing cycle and require manual renewal.
 */

import { CREDIT_COST, creditAllowanceExamples, type MeteringClass } from './metering';

export const PLANS = {
  developer: {
    name: 'Starter',
    rateLimit: 120, // requests per minute
    monthlyQuota: 25_000, // credits included per billing cycle with a subscription
    priceMonthly: 19,
    priceYearly: 190,
    features: [
      '25,000 credits / month included',
      '120 requests / minute',
      '2 API keys',
      'Full platform access — every endpoint & MCP tool',
      'Historical 15-minute snapshots (90-day archive)',
      'Protocol risk parameters & position stress tests',
      'Email support (48h SLA)',
    ],
  },
  team: {
    name: 'Team',
    rateLimit: 400, // requests per minute
    monthlyQuota: 120_000, // credits included per billing cycle with a subscription
    priceMonthly: 79,
    priceYearly: 790,
    features: [
      '120,000 credits / month included',
      '400 requests / minute',
      '10 API keys',
      '5 team seats',
      'Full platform access — every endpoint & MCP tool',
      'Batch query priority queue',
      '99.5% uptime SLA',
      'Slack support (24h SLA)',
    ],
  },
  scale: {
    name: 'Scale',
    rateLimit: 1_200, // requests per minute
    monthlyQuota: 500_000, // credits included per billing cycle with a subscription
    priceMonthly: 299,
    priceYearly: 2_990,
    features: [
      '500,000 credits / month included',
      '1,200 requests / minute',
      '50 API keys',
      '20 team seats',
      'Full platform access — every endpoint & MCP tool',
      'Highest-priority batch queue',
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

/**
 * Canonical USD value of one credit after the 2026-11 rebase. The public USD
 * list prices are unchanged (C1 $0.002, C2 $0.004); only the unit changed
 * from $0.004 to $0.001, so credit counts are 4× larger and existing balances
 * are migrated ×4.
 */
export const USD_PER_CREDIT = 0.001;

/** Convert a USD list price into its integer credit cost at {@link USD_PER_CREDIT}. */
export function usdToCredits(usd: number): number {
  return Math.round(usd / USD_PER_CREDIT);
}

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
    credits: 100_000,
    priceUsd: 99,
    description: creditAllowanceExamples(100_000, ['C2', 'C3']),
  },
  builder: {
    name: 'Builder Pack',
    credits: 400_000,
    priceUsd: 389,
    description: creditAllowanceExamples(400_000, ['C2', 'C3']),
  },
  agent: {
    name: 'Agent Pack',
    credits: 2_000_000,
    priceUsd: 1849,
    description: creditAllowanceExamples(2_000_000, ['C3', 'C4']),
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
  if (planValue === 'developer') return PLANS.developer.monthlyQuota; // 25_000
  if (planValue === 'team') return PLANS.team.monthlyQuota; // 120_000
  if (planValue === 'scale') return PLANS.scale.monthlyQuota; // 500_000
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
