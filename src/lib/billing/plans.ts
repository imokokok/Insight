/**
 * Single source of truth for all billing plan configuration.
 *
 * Every component that needs to know "what does plan X include?" reads from
 * this file — the API key creation, the quota middleware, the plan guard, the
 * pricing page, and the billing panel. Changing a limit here propagates everywhere.
 *
 * Positioning: Insight is NOT a real-time oracle tracker. It is an hourly
 * reliability-assessment platform — data is polled on an hourly cadence
 * (price snapshots, reputation recalculation, feed health) and aggregated
 * into daily reports. The quotas below are sized to that cadence: polling
 * faster than hourly yields no fresher data, so clients should cache on
 * their side. The previous quotas (10K / 100K / 1M per month) were sized
 * like a real-time market-data API and were neither sustainable for a solo
 * project on Supabase nor aligned with the actual data freshness.
 *
 * Pricing rationale (validated against 2026-07 market):
 *   - Pro 49 USDC/mo     : matches Moralis Starter, QuickNode Build (developer sweet spot)
 *   - Protocol 499 USDC/mo: matches Pyth Starter, DefiLlama Pro, QuickNode Scale (team sweet spot)
 *   - Yearly = 10x monthly (2 months free) : standard industry discount
 *
 * Payments are processed via NOWPayments (crypto only). Prices are denominated
 * in USDC at 1:1 with USD; the payer may settle in any NOWPayments-supported
 * currency at the invoice-time exchange rate. There is no auto-renewal —
 * subscriptions are activated for one billing cycle and require manual renewal.
 */

export const PLANS = {
  free: {
    name: 'Free',
    rateLimit: 5, // requests per minute — hourly data, no need for fast polling
    monthlyQuota: 1_000, // requests per calendar month
    dailyTrialQuota: 5, // calls/day to Tier 2 deep-analysis endpoints for free users
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      '1,000 API calls / month',
      '5 requests / minute',
      'Oracle reliability rankings (7-day trend)',
      'Current prices across 11+ oracles',
      '5 trial calls/day to deep-analysis endpoints',
      'Daily reliability reports',
    ],
  },
  pro: {
    name: 'Pro',
    rateLimit: 30,
    monthlyQuota: 10_000,
    dailyTrialQuota: null, // unlimited — no daily cap for paid plans
    priceMonthly: 49,
    priceYearly: 490,
    features: [
      '10,000 API calls / month',
      '30 requests / minute',
      'Full deep-analysis suite (deviation, correlation, latency, risk)',
      'Historical hourly snapshots (1-year archive)',
      'Protocol risk parameters & position stress tests',
      'Anomaly detection (30-day window)',
      'Reliability rankings (30-day trend)',
      'CSV / Excel export',
      'Email support (48h SLA)',
    ],
  },
  protocol: {
    name: 'Protocol',
    rateLimit: 60,
    monthlyQuota: 100_000,
    dailyTrialQuota: null,
    priceMonthly: 499,
    priceYearly: 4990,
    features: [
      '100,000 API calls / month',
      '60 requests / minute',
      'Protocol-level intelligence (oracle exposure, cross-chain spreads)',
      'Incident timeline & single-point-of-failure coverage analysis',
      'Reliability rankings (90-day trend)',
      'Batch query priority queue',
      'Quarterly reliability review',
      '99.5% uptime SLA',
      'Slack support (24h SLA)',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    rateLimit: -1, // unlimited
    monthlyQuota: -1, // unlimited
    dailyTrialQuota: null,
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

/** Ordered list for display in pricing page. */
export const PLAN_ORDER: Plan[] = ['free', 'pro', 'protocol', 'enterprise'];

/**
 * Tier membership is NOT defined by allowlists here — it is enforced by the
 * planGuard middleware whenever a route MOUNTS it (`planGuard: true` for
 * Tier 2, `planGuard: { minPlan: 'protocol' }` for Tier 3). Mounting IS
 * protection; there is no separate runtime allowlist check. See
 * src/lib/api/middleware/planGuard.ts and the Data Access Tier Matrix on the
 * /api page for the documented tier membership.
 */

/** Trial duration in days for the 7-day Pro trial. */
export const TRIAL_DURATION_DAYS = 7;

/** Subscription billing intervals supported by NOWPayments checkout. */
export type BillingInterval = 'month' | 'year';

/**
 * Does the user's plan satisfy a minimum-plan requirement?
 *
 * Uses the tier ladder defined by PLAN_ORDER (free < pro < protocol <
 * enterprise). A higher tier always satisfies a lower requirement, so a
 * Protocol user passes a `minPlan: 'pro'` check, but a Pro user does NOT
 * pass a `minPlan: 'protocol'` check.
 *
 * Used by planGuard to decide Tier 2 (minPlan 'pro') vs Tier 3
 * (minPlan 'protocol') access.
 */
export function planSatisfies(userPlan: Plan, minPlan: Plan): boolean {
  return PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(minPlan);
}

/**
 * Maximum historical trend window (in days) a plan may request on the
 * reputation / ranking endpoints. Tiered so deeper reliability history is a
 * paid differentiator: Free 7d, Pro 30d, Protocol/Enterprise 90d.
 *
 * Applied only to API-key requests on the Tier 1 reputation endpoints
 * (rankings, per-provider trend). Session (UI) requests are left unclamped —
 * the UI governs its own display and session requests already bypass
 * API-plan gating.
 */
export function maxTrendDays(plan: Plan): number {
  if (plan === 'protocol' || plan === 'enterprise') return 90;
  if (plan === 'pro') return 30;
  return 7; // free
}

/** Is this key currently within its trial window? */
export function isTrialActive(trialEndsAt: string | null | undefined): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() > Date.now();
}

/**
 * Normalize a plan string from the DB to a valid Plan key.
 * Defaults to 'free' for unknown / null values.
 */
export function normalizePlan(plan: string | null | undefined): Plan {
  if (plan && plan in PLANS) {
    return plan as Plan;
  }
  return 'free';
}
