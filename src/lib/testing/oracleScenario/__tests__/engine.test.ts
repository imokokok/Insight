import { EXPECTED_DETECTION, runScenario } from '@/lib/testing/oracleScenario/engine';
import { getFixtureById, getFixtures } from '@/lib/testing/oracleScenario/fixtures';

describe('oracle scenario replay engine', () => {
  describe('built-in fixtures (reconstructed public incidents)', () => {
    for (const fixture of getFixtures()) {
      it(`catches the attack phase of "${fixture.scenario.id}" without baseline false positives`, () => {
        const result = runScenario(fixture.scenario);
        expect(result.verdict).toBe('caught');
        expect(result.caughtStepCount).toBe(
          result.steps.filter((s) => s.phase === 'attack').length
        );
        expect(result.falsePositiveCount).toBe(0);
        expect(result.detectionRate).toBe(1);
      });
    }
  });

  it('emits the expected detection codes for each kind', () => {
    for (const fixture of getFixtures()) {
      const result = runScenario(fixture.scenario);
      const expected = EXPECTED_DETECTION[fixture.scenario.kind];
      const firedOnAttack = new Set(
        result.steps.filter((s) => s.phase === 'attack').flatMap((s) => s.detected)
      );
      // At least one EXPECTED code must fire on the attack phase for every
      // fixture; the engine must never rely on an unexpected code to pass.
      expect(expected.some((code) => firedOnAttack.has(code))).toBe(true);
    }
  });

  it('reports a benign single-price scenario as missed', () => {
    const fixture = getFixtures()[0];
    const benign = {
      ...fixture.scenario,
      id: 'benign-flat',
      kind: 'stale_price' as const,
      steps: [
        {
          t: 0,
          phase: 'attack' as const,
          settlementPrice: 3000,
          sources: [
            {
              provider: 'redstone-core',
              price: 3000,
              timestamp: fixture.scenario.startedAt,
              status: 'ok' as const,
            },
          ],
        },
      ],
    };
    const result = runScenario(benign);
    expect(result.verdict).toBe('missed');
    expect(result.detectionRate).toBe(0);
    expect(result.reasonCodes).toEqual([]);
  });

  it('flags baseline false positives explicitly', () => {
    const fixture = getFixtures()[0];
    const noisy = {
      ...fixture.scenario,
      id: 'noisy-baseline',
      steps: [
        {
          t: 0,
          phase: 'baseline' as const,
          settlementPrice: 3000,
          // A "baseline" step whose only source is already stale — a policy
          // firing here is correct-by-threshold but a fixture-design problem;
          // the harness must surface it, not hide it.
          sources: [
            {
              provider: 'redstone-core',
              price: 3000,
              timestamp: fixture.scenario.startedAt - 999,
              status: 'ok' as const,
            },
          ],
        },
      ],
    };
    const result = runScenario(noisy);
    expect(result.falsePositiveCount).toBe(1);
    expect(result.steps[0].detected).toContain('STALE_DATA');
  });

  it('is fully deterministic across runs', () => {
    const fixture = getFixtures()[2];
    expect(runScenario(fixture.scenario)).toEqual(runScenario(fixture.scenario));
  });

  describe('independence gate', () => {
    const base = getFixtureById('synthetic-correlated-sources')!.scenario;

    it('counts one group per operator, not per provider', () => {
      // Four sources, two operators: quorum is comfortably met and every price
      // agrees, so only independence can fail here.
      const result = runScenario(base);
      const attack = result.steps.filter((s) => s.phase === 'attack');
      expect(attack).toHaveLength(1);
      expect(attack[0].detected).toContain('INSUFFICIENT_INDEPENDENCE');
      expect(attack[0].detected).not.toContain('INSUFFICIENT_QUORUM');
      expect(attack[0].detected).not.toContain('MAX_DEVIATION');
    });

    it('excludes a derived source from independence while still using its price', () => {
      // spot feed + the TWAP derived from it: two usable sources, one witness.
      const derived = getFixtureById('synthetic-derived-twap-no-independence')!.scenario;
      const result = runScenario(derived);
      const attack = result.steps.filter((s) => s.phase === 'attack');
      expect(attack[0].detected).toContain('INSUFFICIENT_INDEPENDENCE');
      // The TWAP's price still counts toward cross-source comparison, so the
      // agreeing price must not produce a deviation.
      expect(attack[0].detected).not.toContain('MAX_DEVIATION');
    });

    it('is disabled when the policy sets no threshold, leaving old scenarios untouched', () => {
      // A scenario without minIndependentGroups must not emit the code even
      // when every usable source belongs to one operator.
      const withoutGate = { ...base, policy: { ...base.policy, minIndependentGroups: undefined } };
      const result = runScenario(withoutGate);
      for (const step of result.steps) {
        expect(step.detected).not.toContain('INSUFFICIENT_INDEPENDENCE');
      }
    });
  });
});
