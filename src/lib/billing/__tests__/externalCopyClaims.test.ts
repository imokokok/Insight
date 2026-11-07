import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { PLANS, PLAN_ORDER } from '@/lib/billing/plans';

/**
 * Guard for customer-facing billing copy.
 *
 * The product sells usage allowances. It does not ship seats, SSO, RBAC,
 * SAML/SCIM provisioning, uptime SLAs, priority queues, or managed support, so
 * no pricing page, product page, or plan feature list may imply otherwise.
 *
 * This is deliberately a text scan rather than an import of the rendered
 * strings: a claim can re-enter as an inline JSX literal (for example inside
 * the pricing page's BILLING_FACTS constant) and still reach customers. The
 * test fails on any such line so drift is caught before deploy.
 */
const CUSTOMER_FACING_COPY_FILES = [
  'src/app/pricing/page.tsx',
  'src/components/pricing/PricingCards.tsx',
  'src/components/pricing/PricingCtaSection.tsx',
  'src/components/pricing/DataAccessTierMatrix.tsx',
  'src/app/api/ApiPageContent.tsx',
  'src/app/ai/AiPageContent.tsx',
  'src/app/register/RegisterContent.tsx',
  'src/app/refund/page.tsx',
  'src/app/terms/page.tsx',
  'public/llms.txt',
  'public/openapi.yaml',
] as const;

const FORBIDDEN_CAPABILITY_CLAIM =
  /\bSSO\b|\bRBAC\b|\bSLA\b|席位|团队治理|\bSAML\b|\bSCIM\b|\bseats?\b|single sign-on|role-based access|service level|priority queue|dedicated support|support channel|support engineer|on-call escalation|dedicated rate limit|\bSlack\b|reliability review/i;

/**
 * Denying a capability ("this is not an uptime SLA") is the opposite of a
 * claim, so a line that negates the term in the same clause is allowed.
 */
const NEGATED_CAPABILITY_CLAIM =
  /\b(?:not|never|no)\b[^.]{0,80}\b(?:SLA|SSO|RBAC|seats?|service level)\b/i;

/** The complete vocabulary a self-serve usage pack may use to describe itself. */
const CAPACITY_ONLY_FEATURE =
  /^(?:\d[\d,]* credits \/ month included|\d[\d,]* requests \/ minute|\d+ API keys|Full platform access — every endpoint & MCP tool|Credits can be topped up at any time|Unlimited API calls|Contact sales for volume terms)$/;

describe('external billing copy', () => {
  it.each(CUSTOMER_FACING_COPY_FILES)(
    '%s makes no capability claim the product does not ship',
    (relativePath) => {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8');
      const offenders = source
        .split('\n')
        .map((line, index) => ({ number: index + 1, text: line.trim() }))
        .filter(
          ({ text }) =>
            FORBIDDEN_CAPABILITY_CLAIM.test(text) && !NEGATED_CAPABILITY_CLAIM.test(text)
        );

      expect(offenders).toEqual([]);
    }
  );

  it.each(['developer', 'team', 'scale', 'enterprise'] as const)(
    'lists no service commitment as a %s plan feature',
    (plan) => {
      const offenders = PLANS[plan].features.filter((feature) =>
        FORBIDDEN_CAPABILITY_CLAIM.test(feature)
      );
      expect(offenders).toEqual([]);
    }
  );

  it.each(['team', 'scale', 'enterprise'] as const)(
    'describes the %s plan with capacity only',
    (plan) => {
      for (const feature of PLANS[plan].features) {
        expect(feature).toMatch(CAPACITY_ONLY_FEATURE);
      }
    }
  );
});

describe('plan display naming', () => {
  it('keeps the internal plan keys and billing identifiers unchanged', () => {
    // Renaming is a display-layer change only: the `plan` enum values that
    // api_keys rows and billing code depend on must not move.
    expect(Object.keys(PLANS)).toEqual(['developer', 'team', 'scale', 'enterprise']);
    expect(PLAN_ORDER).toEqual(['developer', 'team', 'scale', 'enterprise']);
  });

  it('shows the former Team/Scale tiers as usage packs', () => {
    expect(PLANS.team.name).toBe('Usage Pack 120K');
    expect(PLANS.scale.name).toBe('Usage Pack 500K');
    for (const plan of Object.values(PLANS)) {
      expect(plan.name).not.toMatch(/\bTeam\b|\bScale\b/);
    }
  });

  it('makes the number in each Usage Pack name equal the credits actually granted', () => {
    // The name is a promise: "500K" must mean 500,000 credits reach the
    // wallet, not a request count and not a rounded figure. Bind it to the
    // SQL that performs the grant so a quota edit cannot leave the shopfront
    // advertising the old number.
    const migrationsDir = join(process.cwd(), 'supabase/migrations');
    const files = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    const definer = [...files]
      .reverse()
      .find((file) =>
        readFileSync(join(migrationsDir, file), 'utf8').includes(
          'FUNCTION "public"."add_monthly_credits"'
        )
      );
    expect(definer).toBeDefined();
    const sql = readFileSync(join(migrationsDir, definer as string), 'utf8');
    const grants: Record<string, number> = {};
    for (const match of sql.matchAll(/WHEN\s+'([a-z]+)'\s+THEN\s+(\d+)/g)) {
      grants[match[1]] = Number(match[2]);
    }

    const suffixCredits = (name: string): number => {
      const match = name.match(/^Usage Pack (\d+(?:\.\d+)?)([KM])$/);
      expect(match).not.toBeNull();
      const [, amount, unit] = match as RegExpMatchArray;
      return Number(amount) * (unit === 'K' ? 1_000 : 1_000_000);
    };

    for (const plan of ['team', 'scale'] as const) {
      expect(grants[plan]).toBeGreaterThan(0);
      expect(PLANS[plan].monthlyQuota).toBe(grants[plan]);
      expect(suffixCredits(PLANS[plan].name)).toBe(grants[plan]);
    }
    // The entry plan has no number in its name, but it must still grant what
    // the billing code says it does.
    expect(PLANS.developer.monthlyQuota).toBe(grants.developer);
  });
});
