import { evaluateProtocolBufferRule } from '../protocolBufferPolicy';

const protocolSafety = {
  protocolId: 'aave-v3',
  protocolName: 'Aave V3',
  criticalDeviationPct: 4,
  bufferConsumedPct: 0,
  liquidationThreshold: 80,
  maxLtv: 75,
};

describe('protocol buffer policy', () => {
  it('does not apply a lending buffer gate to swaps', () => {
    const result = evaluateProtocolBufferRule({
      protocolSafety: { ...protocolSafety, bufferConsumedPct: 100 },
      action: 'swap',
      asset: 'ETH',
      maxDeviationPct: 4,
      historicalState: { maxDeviationZscore24h: 2, deviationVelocity3h: 1 },
    });
    expect(result).toEqual({ verdict: null, factors: [], warnings: [], actions: [] });
  });

  it('blocks only sustained borrow-buffer exhaustion and offers recovery actions', () => {
    const result = evaluateProtocolBufferRule({
      protocolSafety: { ...protocolSafety, bufferConsumedPct: 95 },
      action: 'borrow',
      asset: 'ETH',
      maxDeviationPct: 4,
      historicalState: { maxDeviationZscore24h: 1, deviationVelocity3h: 0 },
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.factors.map((factor) => factor.rule)).toEqual([
      'protocol_buffer_consumed',
      'protocol_buffer_frozen',
    ]);
    expect(result.actions.map((action) => action.type)).toEqual([
      'freeze_borrow',
      'wait_convergence',
      'add_collateral',
    ]);
  });

  it('does not freeze a one-tick 95% spike without sustained evidence', () => {
    const result = evaluateProtocolBufferRule({
      protocolSafety: { ...protocolSafety, bufferConsumedPct: 95 },
      action: 'borrow',
      asset: 'ETH',
      maxDeviationPct: 4,
      historicalState: { maxDeviationZscore24h: 0.99, deviationVelocity3h: 0 },
    });
    expect(result.verdict).toBe('DANGER');
    expect(result.factors).toHaveLength(1);
  });
});
