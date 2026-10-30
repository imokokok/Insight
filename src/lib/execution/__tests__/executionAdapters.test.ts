import {
  createDefaultExecutionAdapterRegistry,
  createPreparedExecution,
  ExecutionAdapterRegistry,
  type ExecutionAdapter,
} from '../adapters';

describe('execution adapter core', () => {
  const observedAt = '2026-10-31T00:00:00.000Z';

  it('keeps a blocked action payload-free and an executable action explicitly user-controlled', () => {
    expect(
      createPreparedExecution({
        schema: 'insight.prepared-execution.v1',
        adapterId: 'insight.test.block.v1',
        state: 'BLOCK',
        authorization: 'user-controlled',
        intent: { algorithm: 'sha256', digest: `0x${'a'.repeat(64)}` },
        observedAt,
        expiresAt: null,
        evidence: [{ kind: 'test', observedAt, source: 'fixture' }],
        caveats: ['Do not submit.'],
        payload: null,
        native: { result: 'blocked' },
      })
    ).toMatchObject({ state: 'BLOCK', payload: null, authorization: 'user-controlled' });

    expect(() =>
      createPreparedExecution({
        schema: 'insight.prepared-execution.v1',
        adapterId: 'insight.test.invalid.v1',
        state: 'READY',
        authorization: 'user-controlled',
        intent: { algorithm: 'sha256', digest: `0x${'b'.repeat(64)}` },
        observedAt,
        expiresAt: null,
        evidence: [],
        caveats: [],
        payload: null,
        native: null,
      })
    ).toThrow('payload does not match');
  });

  it('routes through a registered adapter without changing its native result', async () => {
    const adapter: ExecutionAdapter<{ amount: number }, { amount: number }> = {
      id: 'insight.test.adapter.v1',
      family: 'evm',
      supportsObservation: false,
      async preflight(request) {
        return createPreparedExecution({
          schema: 'insight.prepared-execution.v1',
          adapterId: this.id,
          state: 'READY',
          authorization: 'user-controlled',
          intent: { algorithm: 'keccak256', digest: `0x${'c'.repeat(64)}` },
          observedAt,
          expiresAt: null,
          evidence: [],
          caveats: [],
          payload: {
            kind: 'evm-transaction',
            chainId: 8453,
            transaction: { to: `0x${'1'.repeat(40)}`, data: '0x', value: '0x0' },
          },
          native: request,
        });
      },
    };
    const registry = new ExecutionAdapterRegistry().register(adapter);

    await expect(
      registry.preflight<{ amount: number }, { amount: number }>(adapter.id, { amount: 7 })
    ).resolves.toMatchObject({ adapterId: adapter.id, native: { amount: 7 } });
    expect(() => registry.get('unknown.adapter.v1')).toThrow('Unsupported execution adapter');
  });

  it('exposes EVM, Solana, and venue implementations through one registry', () => {
    const adapters = createDefaultExecutionAdapterRegistry().list();
    expect(adapters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ family: 'evm' }),
        expect.objectContaining({ family: 'solana' }),
        expect.objectContaining({ family: 'venue', supportsObservation: true }),
      ])
    );
  });
});
