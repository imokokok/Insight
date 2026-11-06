/**
 * P1-1a · ERC-4626 vault reduction tests.
 *
 * All chain reads go through an injected mock `VaultRpcReader`; no test touches
 * a real network or any RPC credential. The four standard methods are reduced
 * end-to-end through the EXISTING `assessBaseLendingGuard` evaluation chain,
 * and the original direct core-call path is regression-tested separately.
 */

import {
  encodeAbiParameters,
  encodeFunctionData,
  encodeFunctionResult,
  keccak256,
  parseAbi,
  toFunctionSelector,
} from 'viem';

import {
  MORPHO_BLUE_BASE,
  decodeBaseLendingExactCall,
  type BaseLendingExactTransaction,
} from '../baseLendingAction';
import {
  BaseLendingGuardInputSchema,
  VaultGuardRejectionError,
  assessBaseLendingGuard,
  assessBaseLendingVaultGuard,
} from '../baseLendingGuard';
import {
  getReviewedMorphoBlueMarkets,
  type ReviewedMorphoBlueMarket,
} from '../baseLendingProtocols';
import { decodeErc4626VaultCall } from '../erc4626VaultDecoder';
import {
  createRpcBackedVaultReader,
  resolveVaultMarket,
  type VaultRpcReader,
} from '../vaultMarketMapping';

const ACCOUNT = '0x1111111111111111111111111111111111111111' as const;
const RECEIVER = '0x2222222222222222222222222222222222222222' as const;
const OWNER = '0x3333333333333333333333333333333333333333' as const;
const VAULT = '0xaaaa000000000000000000000000000000000001' as const;
const LOAN_ASSET = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as const; // Base USDC
const OTHER_ASSET = '0x4200000000000000000000000000000000000006' as const; // Base WETH
const ORACLE = '0x0000000000000000000000000000000000000001' as const;
const IRM = '0x0000000000000000000000000000000000000002' as const;
const REVIEWED_MARKET_ID = `0x${'ab'.repeat(32)}` as const;
const OTHER_MARKET_ID = `0x${'cd'.repeat(32)}` as const;

const ERC4626_ABI = parseAbi([
  'function deposit(uint256 assets, address receiver) returns (uint256)',
  'function mint(uint256 shares, address receiver) returns (uint256)',
  'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
  'function withdraw(uint256 assets, address receiver, address owner) returns (uint256)',
]);
const MULTICALL_ABI = parseAbi(['function multicall(bytes[] data) returns (bytes[])']);
const PERMIT_ABI = parseAbi([
  'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
]);

const CALLDATA = {
  deposit: encodeFunctionData({
    abi: ERC4626_ABI,
    functionName: 'deposit',
    args: [1_000_000n, RECEIVER],
  }),
  mint: encodeFunctionData({
    abi: ERC4626_ABI,
    functionName: 'mint',
    args: [500_000n, RECEIVER],
  }),
  redeem: encodeFunctionData({
    abi: ERC4626_ABI,
    functionName: 'redeem',
    args: [250_000n, RECEIVER, OWNER],
  }),
  withdraw: encodeFunctionData({
    abi: ERC4626_ABI,
    functionName: 'withdraw',
    args: [750_000n, RECEIVER, OWNER],
  }),
} as const;

const REVIEWED_MARKETS: ReviewedMorphoBlueMarket[] = [
  { marketId: REVIEWED_MARKET_ID, loanAsset: LOAN_ASSET },
];

function exactTransaction(
  data: string,
  overrides: Partial<BaseLendingExactTransaction> = {}
): BaseLendingExactTransaction {
  return {
    chainId: 8453,
    from: ACCOUNT,
    to: VAULT,
    data,
    nonce: '7',
    value: '0',
    ...overrides,
  } as BaseLendingExactTransaction;
}

function healthyReader(overrides: Partial<VaultRpcReader> = {}): VaultRpcReader {
  return {
    asset: jest.fn().mockResolvedValue(LOAN_ASSET),
    supplyQueue: jest.fn().mockResolvedValue([REVIEWED_MARKET_ID]),
    withdrawQueue: jest.fn().mockResolvedValue([REVIEWED_MARKET_ID]),
    marketLoanToken: jest.fn().mockResolvedValue(LOAN_ASSET),
    ...overrides,
  };
}

const oracle = (verdict: 'PASS' | 'CAUTION' | 'DANGER' | 'BLOCK') =>
  ({ verdict, maxDeviationPct: 0.2, staleDataRisk: false, participantCount: 4 }) as never;

function guardDependencies(reader: VaultRpcReader, overrides: Record<string, unknown> = {}) {
  return {
    reader,
    reviewedMarkets: REVIEWED_MARKETS,
    checkOracle: jest.fn().mockResolvedValue(oracle('PASS')),
    resolveMorphoMarket: jest.fn().mockResolvedValue({
      collateralSymbol: 'WETH',
      loanSymbol: 'USDC',
      lltv: 0.86,
      oracle: ORACLE,
    }),
    now: () => new Date('2026-11-05T00:00:00.000Z'),
    ...overrides,
  };
}

function vaultGuardInput(data: string) {
  return {
    transaction: exactTransaction(data),
    collateralSymbol: 'WETH',
    loanSymbol: 'USDC',
    collateralValueUsd: 10_000,
    debtValueUsd: 0,
  };
}

async function rejectionCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof VaultGuardRejectionError) return error.reasonCode;
    throw error;
  }
  throw new Error('expected a VaultGuardRejectionError but the promise resolved');
}

// ---------------------------------------------------------------------------
// 0 · default reviewed Morpho Blue Base registry (first-party 2026-11-06)
// ---------------------------------------------------------------------------

describe('default reviewed Morpho Blue Base registry', () => {
  it('ships the two verified Gauntlet USDC Prime markets with Base USDC as loan asset', () => {
    expect(getReviewedMorphoBlueMarkets()).toEqual([
      {
        marketId: '0x9103c3b4e834476c9a62ea009ba2c884ee42e94e6e314a26f04d312434191836',
        loanAsset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      },
      {
        marketId: '0x38c846197ac32a752a60c25d4536ebb0c3920c532e9a859c38c91efb7b8c2abb',
        loanAsset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// 1-4 · deposit / mint / redeem / withdraw: strict decode + successful reduce
// ---------------------------------------------------------------------------

const METHOD_CASES = [
  {
    method: 'deposit' as const,
    data: CALLDATA.deposit,
    assets: '1000000',
    shares: null,
    owner: null,
  },
  {
    method: 'mint' as const,
    data: CALLDATA.mint,
    assets: null,
    shares: '500000',
    owner: null,
  },
  {
    method: 'redeem' as const,
    data: CALLDATA.redeem,
    assets: null,
    shares: '250000',
    owner: OWNER.toLowerCase(),
  },
  {
    method: 'withdraw' as const,
    data: CALLDATA.withdraw,
    assets: '750000',
    shares: null,
    owner: OWNER.toLowerCase(),
  },
];

describe.each(METHOD_CASES)('ERC-4626 $method', (testCase) => {
  it('strictly decodes into a canonical VaultCall', () => {
    const decoded = decodeErc4626VaultCall(exactTransaction(testCase.data));
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.call.method).toBe(testCase.method);
    expect(decoded.call.vault).toBe(VAULT.toLowerCase());
    expect(decoded.call.assets).toBe(testCase.assets);
    expect(decoded.call.shares).toBe(testCase.shares);
    expect(decoded.call.receiver).toBe(RECEIVER.toLowerCase());
    expect(decoded.call.owner).toBe(testCase.owner);
    expect(decoded.call.calldataHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('reduces to a reviewed market and completes the existing guard assessment', async () => {
    const reader = healthyReader();
    const result = await assessBaseLendingVaultGuard(
      vaultGuardInput(testCase.data),
      guardDependencies(reader)
    );

    expect(result.verdict).toBe('ALLOW');
    expect(result.protocolId).toBe('morpho-blue-base');
    expect(result.action).toBe('supply');
    expect(result.market.marketId).toBe(REVIEWED_MARKET_ID);
    expect(result.market.parameterSource).toBe('morpho-market');
    expect(result.market.maxLtv).toBe(0.86);
    // The direct core-call path never sets this optional field.
    expect(result.vault).toBeDefined();
    expect(result.vault?.call.method).toBe(testCase.method);
    expect(result.vault?.resolution.reviewedMarketId).toBe(REVIEWED_MARKET_ID);
    expect(result.vault?.resolution.asset).toBe(LOAN_ASSET);
    expect(result.vault?.resolution.marketIds).toEqual([REVIEWED_MARKET_ID]);
    expect(result.vault?.resolution.evidence.length).toBeGreaterThan(0);
    // The existing Morpho guard evaluation chain was actually reused.
    expect(reader.marketLoanToken).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5 · unknown selector / multicall / permit / native value / non-canonical
// ---------------------------------------------------------------------------

describe('ERC-4626 decoder rejections', () => {
  const rejectedCalldata = [
    {
      name: 'unknown selector',
      data: `0xdeadbeef${'00'.repeat(32)}`,
      reasonCode: 'UNKNOWN_SELECTOR',
    },
    {
      name: 'multicall batch',
      data: encodeFunctionData({
        abi: MULTICALL_ABI,
        functionName: 'multicall',
        args: [['0x']],
      }),
      reasonCode: 'BATCH_CALL',
    },
    {
      name: 'multicall3 aggregator',
      data: `0x82ad56cb${'00'.repeat(32)}`,
      reasonCode: 'AGGREGATOR_CALL',
    },
    {
      name: 'EIP-2612 permit',
      data: encodeFunctionData({
        abi: PERMIT_ABI,
        functionName: 'permit',
        args: [ACCOUNT, VAULT, 1n, 2n, 27, `0x${'11'.repeat(32)}`, `0x${'22'.repeat(32)}`],
      }),
      reasonCode: 'PERMIT_FLOW',
    },
    {
      name: 'non-zero native value',
      data: CALLDATA.deposit,
      value: '1',
      reasonCode: 'NATIVE_VALUE',
    },
    {
      name: 'trailing bytes / non-canonical encoding',
      data: `${CALLDATA.deposit}${'00'.repeat(32)}`,
      reasonCode: 'NON_CANONICAL_ENCODING',
    },
    {
      name: 'odd-length (non-byte-aligned) hex',
      data: `${CALLDATA.deposit}a`,
      reasonCode: 'MALFORMED_CALLDATA',
    },
  ] as const;

  it.each(rejectedCalldata)('rejects $name with $reasonCode', (testCase) => {
    const decoded = decodeErc4626VaultCall(
      exactTransaction(testCase.data, 'value' in testCase ? { value: testCase.value } : {})
    );
    expect(decoded.ok).toBe(false);
    if (decoded.ok) return;
    expect(decoded.reasonCode).toBe(testCase.reasonCode);
    expect(decoded.reason.length).toBeGreaterThan(0);
  });

  it('refuses an unknown selector end-to-end before any chain read', async () => {
    const reader = healthyReader();
    const code = await rejectionCode(
      assessBaseLendingVaultGuard(
        vaultGuardInput(`0xdeadbeef${'00'.repeat(32)}`),
        guardDependencies(reader)
      )
    );
    expect(code).toBe('UNKNOWN_SELECTOR');
    expect(reader.asset).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 6-8 · fail-closed vault -> reviewed-market mapping
// ---------------------------------------------------------------------------

describe('vault market mapping is fail-closed', () => {
  it('6a · refuses when no reviewed markets are registered', async () => {
    const result = await resolveVaultMarket(VAULT, {
      reader: healthyReader(),
      reviewedMarkets: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasonCode).toBe('NO_REVIEWED_MARKET');
    expect(
      await rejectionCode(
        assessBaseLendingVaultGuard(
          vaultGuardInput(CALLDATA.deposit),
          guardDependencies(healthyReader(), { reviewedMarkets: [] })
        )
      )
    ).toBe('NO_REVIEWED_MARKET');
  });

  it('6b · refuses when the queue contains an un-reviewed market', async () => {
    const reader = healthyReader({
      supplyQueue: jest.fn().mockResolvedValue([REVIEWED_MARKET_ID, OTHER_MARKET_ID]),
      withdrawQueue: jest.fn().mockResolvedValue([]),
    });
    const result = await resolveVaultMarket(VAULT, {
      reader,
      reviewedMarkets: REVIEWED_MARKETS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasonCode).toBe('UNREVIEWED_MARKET_IN_QUEUE');
    expect(result.resolution.marketIds).toEqual([REVIEWED_MARKET_ID, OTHER_MARKET_ID]);
  });

  it('6c · refuses when the vault exposes no observable market queue', async () => {
    const result = await resolveVaultMarket(VAULT, {
      reader: healthyReader({
        supplyQueue: jest.fn().mockResolvedValue([]),
        withdrawQueue: jest.fn().mockResolvedValue([]),
      }),
      reviewedMarkets: REVIEWED_MARKETS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasonCode).toBe('NO_MARKET_QUEUE');
  });

  it('7a · refuses when asset() differs from the reviewed loan asset', async () => {
    const result = await resolveVaultMarket(VAULT, {
      reader: healthyReader(),
      reviewedMarkets: [{ marketId: REVIEWED_MARKET_ID, loanAsset: OTHER_ASSET }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasonCode).toBe('ASSET_MISMATCH');
    expect(result.resolution.asset).toBe(LOAN_ASSET);
  });

  it('7b · refuses when the on-chain idToMarketParams loanToken differs', async () => {
    const result = await resolveVaultMarket(VAULT, {
      reader: healthyReader({
        marketLoanToken: jest.fn().mockResolvedValue(OTHER_ASSET),
      }),
      reviewedMarkets: REVIEWED_MARKETS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasonCode).toBe('ASSET_MISMATCH');
    expect(result.resolution.evidence.join(' ')).toContain('loanToken');
  });

  it('7c · refuses to guess one market when a vault spans several reviewed markets', async () => {
    const result = await resolveVaultMarket(VAULT, {
      reader: healthyReader({
        supplyQueue: jest.fn().mockResolvedValue([REVIEWED_MARKET_ID, OTHER_MARKET_ID]),
        withdrawQueue: jest.fn().mockResolvedValue([]),
      }),
      reviewedMarkets: [
        { marketId: REVIEWED_MARKET_ID, loanAsset: LOAN_ASSET },
        { marketId: OTHER_MARKET_ID, loanAsset: LOAN_ASSET },
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasonCode).toBe('AMBIGUOUS_MARKET');
  });

  it('8a · fails closed when a chain read throws', async () => {
    const reader = healthyReader({
      asset: jest.fn().mockRejectedValue(new Error('rpc unavailable')),
    });
    const result = await resolveVaultMarket(VAULT, {
      reader,
      reviewedMarkets: REVIEWED_MARKETS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasonCode).toBe('RPC_ERROR');
    expect(result.reason).toContain('rpc unavailable');
    expect(
      await rejectionCode(
        assessBaseLendingVaultGuard(vaultGuardInput(CALLDATA.deposit), guardDependencies(reader))
      )
    ).toBe('RPC_ERROR');
  });

  it('8b · fails closed when a later market read throws', async () => {
    const result = await resolveVaultMarket(VAULT, {
      reader: healthyReader({
        marketLoanToken: jest.fn().mockRejectedValue(new Error('morpho revert')),
      }),
      reviewedMarkets: REVIEWED_MARKETS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasonCode).toBe('RPC_ERROR');
  });

  it('8c · fails closed when a chain read times out', async () => {
    const reader = healthyReader({
      asset: () => new Promise<`0x${string}`>(() => {}),
    });
    const result = await resolveVaultMarket(VAULT, {
      reader,
      reviewedMarkets: REVIEWED_MARKETS,
      timeoutMs: 20,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasonCode).toBe('RPC_TIMEOUT');
    expect(
      await rejectionCode(
        assessBaseLendingVaultGuard(
          vaultGuardInput(CALLDATA.deposit),
          guardDependencies(reader, { timeoutMs: 20 })
        )
      )
    ).toBe('RPC_TIMEOUT');
  });

  it('8d · a malformed queue entry is refused, never guessed', async () => {
    const result = await resolveVaultMarket(VAULT, {
      reader: healthyReader({
        supplyQueue: jest.fn().mockResolvedValue(['0x1234']),
        withdrawQueue: jest.fn().mockResolvedValue([]),
      }),
      reviewedMarkets: REVIEWED_MARKETS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reasonCode).toBe('RPC_ERROR');
  });
});

// ---------------------------------------------------------------------------
// 9 · original direct core-call path regression (must be unchanged)
// ---------------------------------------------------------------------------

const MORPHO_SUPPLY_ABI = [
  {
    type: 'function',
    name: 'supply',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [
      { name: 'assetsSupplied', type: 'uint256' },
      { name: 'sharesSupplied', type: 'uint256' },
    ],
  },
] as const;

describe('direct Morpho core-call regression', () => {
  const marketParams = {
    loanToken: LOAN_ASSET,
    collateralToken: OTHER_ASSET,
    oracle: ORACLE,
    irm: IRM,
    lltv: 860000000000000000n,
  };
  const marketId = keccak256(
    encodeAbiParameters(
      [
        { type: 'address' },
        { type: 'address' },
        { type: 'address' },
        { type: 'address' },
        { type: 'uint256' },
      ],
      [
        marketParams.loanToken,
        marketParams.collateralToken,
        marketParams.oracle,
        marketParams.irm,
        marketParams.lltv,
      ]
    )
  );
  const directData = encodeFunctionData({
    abi: MORPHO_SUPPLY_ABI,
    functionName: 'supply',
    args: [marketParams, 1_000_000n, 0n, ACCOUNT, '0x'],
  });

  it('9a · decodeBaseLendingExactCall still decodes a direct Morpho supply call', () => {
    const decoded = decodeBaseLendingExactCall(
      {
        chainId: 8453,
        from: ACCOUNT,
        to: MORPHO_BLUE_BASE,
        data: directData,
        nonce: '7',
        value: '0',
      },
      {
        protocolId: 'morpho-blue-base',
        action: 'supply',
        marketId,
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
      }
    );
    expect(decoded.action).toBe('supply');
    expect(decoded.target).toBe(MORPHO_BLUE_BASE);
    expect(decoded.marketId?.toLowerCase()).toBe(marketId.toLowerCase());
    expect(decoded.amount).toBe('1000000');
  });

  it('9b · a vault target is still refused by the direct decoder', () => {
    expect(() =>
      decodeBaseLendingExactCall(exactTransaction(CALLDATA.deposit), {
        protocolId: 'morpho-blue-base',
        action: 'supply',
        marketId,
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
      })
    ).toThrow(/canonical Morpho Blue Base contract/);
  });

  it('9c · assessBaseLendingGuard keeps its verdict shape and never sets vault', async () => {
    const result = await assessBaseLendingGuard(
      {
        protocolId: 'morpho-blue-base',
        action: 'borrow',
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
        collateralValueUsd: 10_000,
        debtValueUsd: 4_000,
        marketId,
      },
      {
        checkOracle: jest.fn().mockResolvedValue(oracle('PASS')),
        resolveMorphoMarket: jest.fn().mockResolvedValue({
          collateralSymbol: 'WETH',
          loanSymbol: 'USDC',
          lltv: 0.86,
          oracle: ORACLE,
        }),
      }
    );
    expect(result.verdict).toBe('ALLOW');
    expect(result.market.marketId).toBe(marketId);
    expect(result.vault).toBeUndefined();
    expect(result.next.execution).toBe('not_performed');
  });

  it('9d · Morpho still requires a declared marketId', () => {
    expect(
      BaseLendingGuardInputSchema.safeParse({
        protocolId: 'morpho-blue-base',
        action: 'supply',
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
        collateralValueUsd: 10_000,
        debtValueUsd: 0,
      }).success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Adapter over the repository's existing readContract (eth_call) — proves the
// production reader really works, not just the injected mock reader.
// ---------------------------------------------------------------------------

const VAULT_VIEW_ABI = parseAbi([
  'function asset() view returns (address)',
  'function supplyQueueLength() view returns (uint256)',
  'function supplyQueue(uint256) view returns (bytes32)',
  'function withdrawQueueLength() view returns (uint256)',
  'function withdrawQueue(uint256) view returns (bytes32)',
]);
const MORPHO_VIEW_ABI = parseAbi([
  'function idToMarketParams(bytes32 id) view returns ((address loanToken, address collateralToken, address oracle, address irm, uint256 lltv))',
]);

describe('RPC-backed VaultRpcReader adapter', () => {
  it('encodes/decodes eth_call reads through the repository readContract shape', async () => {
    const readContractFn = jest.fn(
      async (_chainId: number, _to: `0x${string}`, data: `0x${string}`): Promise<string> => {
        const selector = data.slice(0, 10).toLowerCase();
        switch (selector) {
          case toFunctionSelector('asset()').toLowerCase():
            return encodeFunctionResult({
              abi: VAULT_VIEW_ABI,
              functionName: 'asset',
              result: LOAN_ASSET,
            });
          case toFunctionSelector('supplyQueueLength()').toLowerCase():
            return encodeFunctionResult({
              abi: VAULT_VIEW_ABI,
              functionName: 'supplyQueueLength',
              result: 1n,
            });
          case toFunctionSelector('supplyQueue(uint256)').toLowerCase():
            return encodeFunctionResult({
              abi: VAULT_VIEW_ABI,
              functionName: 'supplyQueue',
              result: REVIEWED_MARKET_ID,
            });
          case toFunctionSelector('withdrawQueueLength()').toLowerCase():
            return encodeFunctionResult({
              abi: VAULT_VIEW_ABI,
              functionName: 'withdrawQueueLength',
              result: 1n,
            });
          case toFunctionSelector('withdrawQueue(uint256)').toLowerCase():
            return encodeFunctionResult({
              abi: VAULT_VIEW_ABI,
              functionName: 'withdrawQueue',
              result: REVIEWED_MARKET_ID,
            });
          case toFunctionSelector('idToMarketParams(bytes32)').toLowerCase():
            return encodeFunctionResult({
              abi: MORPHO_VIEW_ABI,
              functionName: 'idToMarketParams',
              result: {
                loanToken: LOAN_ASSET,
                collateralToken: OTHER_ASSET,
                oracle: ORACLE,
                irm: IRM,
                lltv: 860000000000000000n,
              },
            });
          default:
            throw new Error(`unexpected selector ${selector}`);
        }
      }
    );

    const reader = createRpcBackedVaultReader({ readContractFn });
    expect(await reader.asset(VAULT)).toBe(LOAN_ASSET);
    expect(await reader.supplyQueue(VAULT)).toEqual([REVIEWED_MARKET_ID]);
    expect(await reader.withdrawQueue(VAULT)).toEqual([REVIEWED_MARKET_ID]);
    expect(await reader.marketLoanToken(REVIEWED_MARKET_ID)).toBe(LOAN_ASSET);
    expect(readContractFn).toHaveBeenCalled();
    // Every eth_call targets an on-chain contract, never a credential/URL.
    for (const call of readContractFn.mock.calls) {
      expect(call[0]).toBe(8453);
      expect(call[1]).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
  });
});
