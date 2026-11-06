import { encodeFunctionData, encodeFunctionResult, toFunctionSelector } from 'viem';

import { readContract } from '@/lib/protocols/importer/rpcClient';

import {
  decodeMonadLendingExactCall,
  isMonadEulerProtocolId,
  MonadLendingProtocolIdSchema,
  type MonadLendingExactTransaction,
} from '../monadLendingAction';
import { assessMonadLendingGuard, MonadLendingGuardInputSchema } from '../monadLendingGuard';
import {
  AAVE_V3_MONAD_ASSETS,
  defaultMonadEulerDescriptor,
  MONAD_EULER_REVIEWED_DESCRIPTOR as DESCRIPTOR,
} from '../monadLendingProtocols';
import { EULER_V2_EVAULT_VIEW_ABI, EULER_V2_FACTORY_ABI } from '../multichainEvmLendingGuard';

jest.mock('@/lib/protocols/importer/rpcClient', () => ({ readContract: jest.fn() }));

const ERC20_SYMBOL_ABI = [
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

const EULER_EVAULT_ABI = [
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'borrow',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },
] as const;
const EULER_EVC_ABI = [
  {
    type: 'function',
    name: 'batch',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'items',
        type: 'tuple[]',
        components: [
          { name: 'targetContract', type: 'address' },
          { name: 'onBehalfOfAccount', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'enableCollateral',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'collateral', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'enableController',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'controller', type: 'address' },
    ],
    outputs: [],
  },
] as const;

/** TEST-ONLY synthetic addresses; real values come only from the descriptor. */
const synthetic = (digit: number) => `0x${String(digit).repeat(40)}` as `0x${string}`;
const sender = synthetic(1);
const USDC = AAVE_V3_MONAD_ASSETS.USDC as `0x${string}`;
const ORACLE = synthetic(9);

const passingOracle = () =>
  jest.fn().mockResolvedValue({
    verdict: 'PASS',
    maxDeviationPct: 0.1,
    staleDataRisk: false,
    participantCount: 4,
  }) as never;

const EULER_SUPPLY_INPUT = {
  protocolId: 'euler-v2-monad' as const,
  action: 'supply' as const,
  collateralSymbol: 'USDC',
  loanSymbol: 'USDC',
  collateralValueUsd: 10_000,
  debtValueUsd: 0,
  marketAddress: DESCRIPTOR.vaults[0].address,
};
const EULER_BORROW_INPUT = {
  protocolId: 'euler-v2-monad' as const,
  action: 'borrow' as const,
  collateralSymbol: 'USDC',
  loanSymbol: 'USDC',
  collateralValueUsd: 10_000,
  debtValueUsd: 4_000,
  marketAddress: DESCRIPTOR.vaults[0].address,
  collateralVaultAddress: DESCRIPTOR.vaults[1].address,
};

type RpcOverrides = {
  isProxy?: boolean;
  asset?: `0x${string}`;
  evc?: `0x${string}`;
  symbol?: string;
  borrowLtv?: bigint;
  liquidationLtv?: bigint;
  oracle?: `0x${string}`;
};

/** Deterministic eth_call mock keyed by the four-byte selector. */
function mockRpc(overrides: RpcOverrides = {}) {
  const cfg = {
    isProxy: true,
    asset: USDC,
    evc: DESCRIPTOR.evc,
    symbol: 'USDC',
    borrowLtv: 8000n,
    liquidationLtv: 8500n,
    oracle: ORACLE,
    ...overrides,
  };
  (readContract as jest.Mock).mockImplementation(
    async (_chainId: number, _to: `0x${string}`, data: `0x${string}`) => {
      switch (data.slice(0, 10).toLowerCase()) {
        case toFunctionSelector('isProxy(address)').toLowerCase():
          return encodeFunctionResult({
            abi: EULER_V2_FACTORY_ABI,
            functionName: 'isProxy',
            result: cfg.isProxy,
          });
        case toFunctionSelector('asset()').toLowerCase():
          return encodeFunctionResult({
            abi: EULER_V2_EVAULT_VIEW_ABI,
            functionName: 'asset',
            result: cfg.asset,
          });
        case toFunctionSelector('EVC()').toLowerCase():
          return encodeFunctionResult({
            abi: EULER_V2_EVAULT_VIEW_ABI,
            functionName: 'EVC',
            result: cfg.evc,
          });
        case toFunctionSelector('oracle()').toLowerCase():
          return encodeFunctionResult({
            abi: EULER_V2_EVAULT_VIEW_ABI,
            functionName: 'oracle',
            result: cfg.oracle,
          });
        case toFunctionSelector('LTVFull(address)').toLowerCase():
          return encodeFunctionResult({
            abi: EULER_V2_EVAULT_VIEW_ABI,
            functionName: 'LTVFull',
            result: [cfg.borrowLtv, cfg.liquidationLtv, cfg.liquidationLtv, 0n, 0n],
          });
        case toFunctionSelector('symbol()').toLowerCase():
          return encodeFunctionResult({
            abi: ERC20_SYMBOL_ABI,
            functionName: 'symbol',
            result: cfg.symbol,
          });
        default:
          throw new Error(`unexpected selector ${data.slice(0, 10)}`);
      }
    }
  );
}

function supplyTransaction(overrides: Partial<MonadLendingExactTransaction> = {}) {
  return {
    chainId: 143 as const,
    from: sender,
    to: DESCRIPTOR.vaults[0].address,
    data: encodeFunctionData({
      abi: EULER_EVAULT_ABI,
      functionName: 'deposit',
      args: [1_000_000n, sender],
    }),
    nonce: '3',
    value: '0',
    ...overrides,
  } as MonadLendingExactTransaction;
}

function borrowBatchTransaction(controllerTarget: `0x${string}` = DESCRIPTOR.evc) {
  const collateralVault = DESCRIPTOR.vaults[1].address;
  const borrowVault = DESCRIPTOR.vaults[0].address;
  const zero = '0x0000000000000000000000000000000000000000' as const;
  return {
    chainId: 143 as const,
    from: sender,
    to: DESCRIPTOR.evc,
    data: encodeFunctionData({
      abi: EULER_EVC_ABI,
      functionName: 'batch',
      args: [
        [
          {
            targetContract: DESCRIPTOR.evc,
            onBehalfOfAccount: zero,
            value: 0n,
            data: encodeFunctionData({
              abi: EULER_EVC_ABI,
              functionName: 'enableCollateral',
              args: [sender, collateralVault],
            }),
          },
          {
            targetContract: collateralVault,
            onBehalfOfAccount: sender,
            value: 0n,
            data: encodeFunctionData({
              abi: EULER_EVAULT_ABI,
              functionName: 'deposit',
              args: [2_000_000n, sender],
            }),
          },
          {
            targetContract: controllerTarget,
            onBehalfOfAccount: zero,
            value: 0n,
            data: encodeFunctionData({
              abi: EULER_EVC_ABI,
              functionName: 'enableController',
              args: [sender, borrowVault],
            }),
          },
          {
            targetContract: borrowVault,
            onBehalfOfAccount: sender,
            value: 0n,
            data: encodeFunctionData({
              abi: EULER_EVAULT_ABI,
              functionName: 'borrow',
              args: [1_000_000n, sender],
            }),
          },
        ],
      ],
    }),
    nonce: '4',
    value: '0',
  } as MonadLendingExactTransaction;
}

describe('P1-1b Monad Euler reviewed registration (VERIFIED)', () => {
  it('registers euler-v2-monad in the reviewed protocol id set', () => {
    expect(MonadLendingProtocolIdSchema.safeParse('euler-v2-monad').success).toBe(true);
    expect(isMonadEulerProtocolId('euler-v2-monad')).toBe(true);
    expect(MonadLendingGuardInputSchema.safeParse(EULER_SUPPLY_INPUT).success).toBe(true);
    expect(MonadLendingGuardInputSchema.safeParse(EULER_BORROW_INPUT).success).toBe(true);
  });

  it('ships a VERIFIED descriptor built only from first-hand verified addresses', () => {
    const descriptor = defaultMonadEulerDescriptor();
    expect(descriptor).toBe(DESCRIPTOR);
    expect(descriptor.status).toBe('VERIFIED');
    expect(descriptor.chainId).toBe(143);
    expect(descriptor.eVaultFactory).toBe('0xba4dd672062de8feedb665dd4410658864483f1e');
    expect(descriptor.evc).toBe('0x7a9324e8f270413fa2e458f5831226d99c7477cd');
    expect(descriptor.vaults.map((vault) => vault.address)).toEqual([
      '0x06047833d9aac144f7f4e9b8234d2c7dda1a8baf',
      '0xa3b64e2674463c98cbd21807055d8c1e008b6e79',
      '0x1905eddf5943ef6c92ccf1469bd40fc2cb4a77b0',
      '0xcf450973dee1ee41cb708496bf73f34324180035',
    ]);
    expect(descriptor.sourceRef).toMatch(/euler-xyz\/euler-interfaces/);
    expect(descriptor.sourceRef).toMatch(/2026-11-06/);
    expect(descriptor.note).toMatch(/2026-11-06 已核实/);
    // A VERIFIED descriptor is not an ALLOW: the live resolver still gates it.
    expect(descriptor.note).toMatch(/live resolver/);
  });

  it('requires an explicit EVault address and, for borrow, a collateral vault', () => {
    const { marketAddress: _m, collateralVaultAddress: _c, ...underSpecified } = EULER_SUPPLY_INPUT;
    expect(MonadLendingGuardInputSchema.safeParse(underSpecified).success).toBe(false);
    const { collateralVaultAddress: _v, ...borrowWithoutCollateral } = EULER_BORROW_INPUT;
    expect(MonadLendingGuardInputSchema.safeParse(borrowWithoutCollateral).success).toBe(false);
  });

  it('fails closed (BLOCK) when the live risk resolver throws', async () => {
    const result = await assessMonadLendingGuard(EULER_SUPPLY_INPUT, {
      checkOracle: passingOracle(),
      resolveMonadEulerRisk: async () => {
        throw new Error('rpc down');
      },
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.protocolId).toBe('euler-v2-monad');
    expect(result.market.parameterSource).toBe('unavailable');
    expect(result.reasons.join(' ')).toMatch(/rpc down/);
    expect(result.reasons.join(' ')).toMatch(/fails closed/);
  });

  it('a descriptor missing required source metadata is still rejected before any chain read', async () => {
    const descriptor = { ...DESCRIPTOR, sourceRef: null };
    const result = await assessMonadLendingGuard(EULER_SUPPLY_INPUT, {
      checkOracle: passingOracle(),
      resolveMonadEulerDescriptor: () => descriptor,
      resolveMonadEulerRisk: jest.fn().mockRejectedValue(new Error('must not be reached')),
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/not a complete VERIFIED registration/);
  });
});

describe('resolveMonadEulerRisk against mocked chain reads', () => {
  it('admits an unlevered direct supply into a live-verified reviewed EVault', async () => {
    mockRpc();
    const result = await assessMonadLendingGuard(EULER_SUPPLY_INPUT, {
      checkOracle: passingOracle(),
    });
    expect(result.verdict).toBe('ALLOW');
    expect(result.market.parameterSource).toBe('euler-evault');
    expect(result.market.maxLtv).toBe(1);
    expect(readContract).toHaveBeenCalled();
    for (const call of (readContract as jest.Mock).mock.calls) {
      expect(call[0]).toBe(143);
    }
  });

  it('refuses a vault that is not a canonical factory proxy', async () => {
    mockRpc({ isProxy: false });
    const result = await assessMonadLendingGuard(EULER_SUPPLY_INPUT, {
      checkOracle: passingOracle(),
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/not a proxy/);
  });

  it('refuses a vault wired to an unexpected EVC deployment', async () => {
    mockRpc({ evc: synthetic(8) });
    const result = await assessMonadLendingGuard(EULER_SUPPLY_INPUT, {
      checkOracle: passingOracle(),
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/unexpected EVC/);
  });

  it('refuses a supply whose live asset symbol differs from the declared asset', async () => {
    mockRpc({ symbol: 'USDT0' });
    const result = await assessMonadLendingGuard(EULER_SUPPLY_INPUT, {
      checkOracle: passingOracle(),
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/does not match the declared supply asset/);
  });

  it('refuses an EVault outside the reviewed registry before any chain read', async () => {
    const result = await assessMonadLendingGuard(
      { ...EULER_SUPPLY_INPUT, marketAddress: synthetic(7) },
      { checkOracle: passingOracle() }
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/not in the reviewed registry/);
    expect(readContract).not.toHaveBeenCalled();
  });

  it('binds an EVC borrow to live LTVFull and oracle reads', async () => {
    mockRpc();
    const result = await assessMonadLendingGuard(EULER_BORROW_INPUT, {
      checkOracle: passingOracle(),
    });
    expect(result.verdict).toBe('ALLOW');
    expect(result.market.parameterSource).toBe('euler-evault');
    expect(result.market.maxLtv).toBe(0.8);
    expect(result.market.liquidationLtv).toBe(0.85);
    expect(result.market.oracleAddress).toBe(ORACLE);
  });

  it('refuses a borrow EVault that returns invalid collateral LTV controls', async () => {
    mockRpc({ borrowLtv: 0n });
    const result = await assessMonadLendingGuard(EULER_BORROW_INPUT, {
      checkOracle: passingOracle(),
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/invalid collateral LTV/);
  });

  it('refuses a borrow EVault that returns a zero oracle', async () => {
    mockRpc({ oracle: '0x0000000000000000000000000000000000000000' });
    const result = await assessMonadLendingGuard(EULER_BORROW_INPUT, {
      checkOracle: passingOracle(),
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.join(' ')).toMatch(/zero oracle/);
  });
});

describe('Monad Euler exact-call decode', () => {
  it('binds a direct deposit to the reviewed EVault and sender', () => {
    const transaction = supplyTransaction();
    expect(
      decodeMonadLendingExactCall(transaction, {
        protocolId: 'euler-v2-monad',
        action: 'supply',
        collateralSymbol: 'USDC',
        loanSymbol: 'USDC',
        marketAddress: DESCRIPTOR.vaults[0].address,
      })
    ).toMatchObject({
      protocolId: 'euler-v2-monad',
      action: 'supply',
      target: DESCRIPTOR.vaults[0].address,
      account: sender,
      receiver: sender,
      amount: '1000000',
    });
  });

  it('rejects non-canonical or non-positive supply calldata', () => {
    const tampered = supplyTransaction({ data: `${supplyTransaction().data}${'00'.repeat(32)}` });
    expect(() =>
      decodeMonadLendingExactCall(tampered, {
        protocolId: 'euler-v2-monad',
        action: 'supply',
        marketAddress: DESCRIPTOR.vaults[0].address,
      })
    ).toThrow(/canonical ABI encoding/);
    expect(() =>
      decodeMonadLendingExactCall(supplyTransaction({ to: DESCRIPTOR.vaults[3].address }), {
        protocolId: 'euler-v2-monad',
        action: 'supply',
        marketAddress: DESCRIPTOR.vaults[0].address,
      })
    ).toThrow(/does not match the reviewed EVault address/);
    expect(() =>
      decodeMonadLendingExactCall(supplyTransaction({ to: synthetic(7) }), {
        protocolId: 'euler-v2-monad',
        action: 'supply',
        marketAddress: synthetic(7),
      })
    ).toThrow(/not in the reviewed Monad registry/);
  });

  it('binds the four-step EVC collateral-deposit-and-borrow batch in exact order', () => {
    const transaction = borrowBatchTransaction();
    expect(
      decodeMonadLendingExactCall(transaction, {
        protocolId: 'euler-v2-monad',
        action: 'borrow',
        collateralSymbol: 'USDC',
        loanSymbol: 'USDC',
        marketAddress: DESCRIPTOR.vaults[0].address,
        collateralVaultAddress: DESCRIPTOR.vaults[1].address,
      })
    ).toMatchObject({
      target: DESCRIPTOR.evc,
      account: sender,
      receiver: sender,
      amount: '1000000',
    });
  });

  it('rejects a batch that deviates from the reviewed order or registry', () => {
    // enableController wired to the wrong controller (collateral vault).
    const wrongController = borrowBatchTransaction(DESCRIPTOR.vaults[1].address);
    expect(() =>
      decodeMonadLendingExactCall(wrongController, {
        protocolId: 'euler-v2-monad',
        action: 'borrow',
        marketAddress: DESCRIPTOR.vaults[0].address,
        collateralVaultAddress: DESCRIPTOR.vaults[1].address,
      })
    ).toThrow(/collateral-and-borrow order/);
    // Unregistered borrow vault.
    expect(() =>
      decodeMonadLendingExactCall(borrowBatchTransaction(), {
        protocolId: 'euler-v2-monad',
        action: 'borrow',
        marketAddress: synthetic(6),
        collateralVaultAddress: DESCRIPTOR.vaults[1].address,
      })
    ).toThrow(/not in the reviewed Monad registry/);
  });

  it('refuses a non-zero-value Euler call and an unregistered decode target', () => {
    expect(() =>
      decodeMonadLendingExactCall(supplyTransaction({ value: '1' }), {
        protocolId: 'euler-v2-monad',
        action: 'supply',
        marketAddress: DESCRIPTOR.vaults[0].address,
      })
    ).toThrow(/zero-value/);
  });

  it('refuses to decode anything when the descriptor is not VERIFIED', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('../monadLendingProtocols', () => {
        const actual = jest.requireActual('../monadLendingProtocols');
        return {
          ...actual,
          defaultMonadEulerDescriptor: () => ({
            ...actual.MONAD_EULER_REVIEWED_DESCRIPTOR,
            status: 'UNVERIFIED',
          }),
        };
      });
      const { decodeMonadLendingExactCall: decodeWithUnverifiedDescriptor } =
        await import('../monadLendingAction');
      expect(() =>
        decodeWithUnverifiedDescriptor(supplyTransaction(), {
          protocolId: 'euler-v2-monad',
          action: 'supply',
          marketAddress: DESCRIPTOR.vaults[0].address,
        })
      ).toThrow(/VERIFIED deployment descriptor/);
    });
  });
});
