import {
  isMonadEulerProtocolId,
  MonadLendingProtocolIdSchema,
  decodeMonadLendingExactCall,
  type MonadLendingExactTransaction,
} from '../monadLendingAction';
import { assessMonadLendingGuard, MonadLendingGuardInputSchema } from '../monadLendingGuard';
import {
  defaultMonadEulerDescriptor,
  MONAD_EULER_UNVERIFIED_DESCRIPTOR,
  type MonadEulerDeploymentDescriptor,
} from '../monadLendingProtocols';

const EULER_INPUT = {
  protocolId: 'euler-v2-monad' as const,
  action: 'supply' as const,
  collateralSymbol: 'USDC',
  loanSymbol: 'USDC',
  collateralValueUsd: 10_000,
  debtValueUsd: 0,
};

const passingOracle = () =>
  jest.fn().mockResolvedValue({
    verdict: 'PASS',
    maxDeviationPct: 0.1,
    staleDataRisk: false,
    participantCount: 4,
  }) as never;

/** TEST-ONLY synthetic placeholder, NEVER a real deployment address. */
const synthetic = (digit: number) => `0x${String(digit).repeat(40)}` as `0x${string}`;

describe('P1-1b Monad Euler reviewed admission (UNVERIFIED)', () => {
  it('registers euler-v2-monad in the reviewed protocol id set', () => {
    expect(MonadLendingProtocolIdSchema.safeParse('euler-v2-monad').success).toBe(true);
    expect(isMonadEulerProtocolId('euler-v2-monad')).toBe(true);
    expect(MonadLendingGuardInputSchema.safeParse(EULER_INPUT).success).toBe(true);
  });

  it('ships an UNVERIFIED descriptor with no fabricated addresses', () => {
    const descriptor = defaultMonadEulerDescriptor();
    expect(descriptor).toBe(MONAD_EULER_UNVERIFIED_DESCRIPTOR);
    expect(descriptor.status).toBe('UNVERIFIED');
    expect(descriptor.chainId).toBe(143);
    expect(descriptor.eVaultFactory).toBeNull();
    expect(descriptor.evc).toBeNull();
    expect(descriptor.vaults).toHaveLength(0);
    expect(descriptor.sourceRef).toBeNull();
    expect(descriptor.note).toMatch(/未找到，需人工 review 后登记/);
  });

  it('evaluator fails closed (BLOCK) for the UNVERIFIED descriptor', async () => {
    const result = await assessMonadLendingGuard(EULER_INPUT, {
      checkOracle: passingOracle(),
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.protocolId).toBe('euler-v2-monad');
    expect(result.market.parameterSource).toBe('unavailable');
    expect(result.reasons.join(' ')).toMatch(/UNVERIFIED/);
    expect(result.reasons.join(' ')).toMatch(/未找到，需人工 review 后登记/);
  });

  it('refuses to decode any exact call for Euler', () => {
    const transaction: MonadLendingExactTransaction = {
      chainId: 143,
      from: synthetic(1),
      to: synthetic(2),
      data: '0x12345678',
      nonce: '1',
      value: '0',
    };
    expect(() =>
      decodeMonadLendingExactCall(transaction, {
        protocolId: 'euler-v2-monad',
        action: 'supply',
      })
    ).toThrow(/UNVERIFIED/);
  });

  it('an injected VERIFIED descriptor without a live resolver still fails closed', async () => {
    // TEST-ONLY synthetic descriptor: proves the injection seam, not a real deployment.
    const descriptor: MonadEulerDeploymentDescriptor = {
      status: 'VERIFIED',
      chainId: 143,
      eVaultFactory: synthetic(1),
      evc: synthetic(2),
      vaults: [{ address: synthetic(3), assetSymbol: 'USDC' }],
      sourceRef: 'TEST-ONLY synthetic descriptor (not a real deployment)',
      note: 'mechanism test',
    };
    const result = await assessMonadLendingGuard(EULER_INPUT, {
      checkOracle: passingOracle(),
      resolveMonadEulerDescriptor: () => descriptor,
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/live risk resolver is not registered/);
  });

  it('a human-reviewed descriptor + registered live resolver can pass (injectable)', async () => {
    // TEST-ONLY synthetic descriptor + resolver: this is the registration path
    // a human would fill with first-hand verified constants, not a real deployment.
    const descriptor: MonadEulerDeploymentDescriptor = {
      status: 'VERIFIED',
      chainId: 143,
      eVaultFactory: synthetic(1),
      evc: synthetic(2),
      vaults: [{ address: synthetic(3), assetSymbol: 'USDC' }],
      sourceRef: 'TEST-ONLY synthetic descriptor (not a real deployment)',
      note: 'mechanism test',
    };
    const result = await assessMonadLendingGuard(EULER_INPUT, {
      checkOracle: passingOracle(),
      resolveMonadEulerDescriptor: () => descriptor,
      resolveMonadEulerRisk: async () => ({
        maxLtv: 0.8,
        liquidationLtv: 0.85,
        source: 'aave-live',
      }),
    });
    expect(result.verdict).toBe('ALLOW');
  });

  it('a VERIFIED descriptor missing required source metadata is rejected', async () => {
    const descriptor: MonadEulerDeploymentDescriptor = {
      status: 'VERIFIED',
      chainId: 143,
      eVaultFactory: synthetic(1),
      evc: synthetic(2),
      vaults: [{ address: synthetic(3), assetSymbol: 'USDC' }],
      sourceRef: null,
      note: 'missing first-hand source',
    };
    const result = await assessMonadLendingGuard(EULER_INPUT, {
      checkOracle: passingOracle(),
      resolveMonadEulerDescriptor: () => descriptor,
      resolveMonadEulerRisk: async () => ({
        maxLtv: 0.8,
        liquidationLtv: 0.85,
        source: 'aave-live',
      }),
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/UNVERIFIED/);
  });
});
