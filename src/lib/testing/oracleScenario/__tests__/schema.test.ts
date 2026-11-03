import { getFixtures } from '@/lib/testing/oracleScenario/fixtures';
import {
  OracleScenarioSchema,
  canonicalJson,
  parseScenario,
} from '@/lib/testing/oracleScenario/schema';

describe('oracle scenario DSL schema', () => {
  it('accepts every built-in fixture', () => {
    for (const fixture of getFixtures()) {
      const parsed = OracleScenarioSchema.safeParse(fixture.scenario);
      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.id).toBe(fixture.scenario.id);
    }
  });

  it('rejects an unknown scenario kind', () => {
    const base = getFixtures()[0].scenario;
    const bad = { ...base, id: 'bad-kind', kind: 'moon_price' };
    expect(OracleScenarioSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects non-increasing step timestamps', () => {
    const base = getFixtures()[0].scenario;
    const bad = {
      ...base,
      id: 'bad-steps',
      steps: [...base.steps],
    };
    bad.steps[1] = { ...bad.steps[1], t: 0 };
    expect(OracleScenarioSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a scenario with no steps', () => {
    const base = getFixtures()[0].scenario;
    const bad = { ...base, id: 'no-steps', steps: [] };
    expect(OracleScenarioSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a non-kebab-case id', () => {
    const base = getFixtures()[0].scenario;
    expect(OracleScenarioSchema.safeParse({ ...base, id: 'Not Kebab!' }).success).toBe(false);
  });

  it('parseScenario returns the typed scenario on valid input', () => {
    const fixture = getFixtures()[0];
    expect(parseScenario(fixture.scenario).policy.maxStalenessSeconds).toBe(
      fixture.scenario.policy.maxStalenessSeconds
    );
  });

  it('canonicalJson is stable under key reordering', () => {
    const fixture = getFixtures()[0].scenario;
    const reordered = {
      ...fixture,
      policy: {
        minSources: fixture.policy.minSources,
        maxDeviationPct: fixture.policy.maxDeviationPct,
        maxStalenessSeconds: fixture.policy.maxStalenessSeconds,
      },
      steps: fixture.steps.map((s) => ({
        sources: s.sources,
        settlementPrice: s.settlementPrice,
        phase: s.phase,
        t: s.t,
      })),
    };
    expect(canonicalJson(reordered)).toBe(canonicalJson(fixture));
  });

  it('canonicalJson changes when content changes', () => {
    const fixture = getFixtures()[0].scenario;
    const altered = { ...fixture, title: 'changed' };
    expect(canonicalJson(altered)).not.toBe(canonicalJson(fixture));
  });
});
