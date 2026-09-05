/**
 * End-to-end test of the verifiable execution trust loop with REAL cryptography.
 *
 * No underlying logic is mocked: the pre-trade signer, the receipt signer, the
 * pre-trade verifier and the pair verifier all run against real EIP-712 keys.
 * The only injected dependency is the RPC client, because we cannot stand up a
 * real settlement on-chain.
 *
 * The loop under test:
 *   sign v3 pre-trade SOURCE gate (USDC, $1) + DESTINATION gate (WETH, $2500)
 *     → issueExecutionReceipt with BOTH originals  (VERIFIED binding)
 *     → verifyExecutionReceipt                         (signature + window)
 *     → verifyExecutionPair(sourceGate, receipt)       (closed loop)
 *
 * Before the quotedPrice inversion was fixed, the VERIFIED quote was the inverse
 * of the executedPrice convention, so this would have produced DEVIATED (or worse)
 * on every faithful fill. The FAITHFUL assertion here pins the fix.
 *
 * The attester key is loaded via the real getAttesterAccount. jest shares the
 * attesterAccount module cache across files in a worker, and sibling suites can
 * cache it as null (they delete ATTESTATION_SIGNER_PRIVATE_KEY). The
 * beforeEach resetModules + env-set pattern (proven in preTradeBinding.test.ts)
 * guarantees a fresh attesterAccount instance bound to the test key.
 */

import { verifyExecutionReceipt } from '@/lib/attestations/executionReceipt';
import type { AttestationInputV2 } from '@/lib/attestations/oracleSafetyAttestationV3';
import { signAttestationV3 } from '@/lib/attestations/oracleSafetyAttestationV3';
import type { ProviderObservationEntry } from '@/lib/attestations/providerObservationsHash';
import type {
  RpcClientWithFallback,
  RpcTransactionReceipt,
} from '@/lib/oracles/utils/rpcClientWithFallback';

import { verifyExecutionPair as verifyExecutionPairOffline } from '../../../../verifier/src';
import { TRANSFER_TOPIC } from '../events';
import { issueExecutionReceipt } from '../executionReceiptService';
import { verifyExecutionPair } from '../verifyExecutionPair';

// Anvil account 0 — well-known throwaway key.
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const USDC = 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const WETH = 'eip155:1/erc20:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const TAKER = '0x1111111111111111111111111111111111111111';
const ROUTER = '0x2222222222222222222222222222222222222222';
const SRC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const DST = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const NOW_S = Math.floor(Date.now() / 1000);
/** Pre-trade gate signed 30s ago: inside its 600s validity window AND before
 *  the execution it authorises (executedAt = NOW_S + 12). Using live time keeps
 *  the receipt from being correctly reported EXPIRED by verifyExecutionReceipt.
 *  (An earlier draft used a fixed 2023 timestamp, which made every receipt
 *  expire instantly against the 2026 clock — a test-data bug, not a production
 *  one.) */
const GATE_TS_S = NOW_S - 30;
const TX = ('0x' + 'ab'.repeat(32)) as `0x${string}`;

/** Realistically-shaped provider observations (the shape pre-trade produces).
 *  Malformed entries (missing the required bigint fields) would make
 *  computeProviderObservationsHash throw "Cannot convert undefined to a BigInt"
 *  inside encodeAbiParameters — that path is exercised here with VALID data so
 *  the signing path is proven end-to-end, not just the empty-list shortcut. */
const VALID_OBSERVATIONS: ProviderObservationEntry[] = [
  {
    provider: 'chainlink',
    feedId: '0xfeed0001',
    value: 1_00000000n,
    timestamp: BigInt(GATE_TS_S),
    dataAgeSeconds: 4n,
    included: true,
    exclusionReason: '',
  },
  {
    provider: 'api3',
    feedId: '0xfeed0002',
    value: 1_00000000n,
    timestamp: BigInt(GATE_TS_S),
    dataAgeSeconds: 6n,
    included: true,
    exclusionReason: '',
  },
  {
    provider: 'redstone',
    feedId: '0xfeed0003',
    value: 1_00000000n,
    timestamp: BigInt(GATE_TS_S),
    dataAgeSeconds: 5n,
    included: true,
    exclusionReason: '',
  },
];

function transferLog(token: `0x${string}`, from: string, to: string, value: bigint) {
  const padAddr = (a: string) => '0x' + a.slice(2).padStart(64, '0');
  const padUint = (v: bigint) => '0x' + v.toString(16).padStart(64, '0');
  return {
    address: token,
    topics: [TRANSFER_TOPIC, padAddr(from) as `0x${string}`, padAddr(to) as `0x${string}`],
    data: padUint(value) as `0x${string}`,
  };
}

function swapReceipt(srcValue: bigint, dstValue: bigint, status: '0x1' | '0x0' = '0x1') {
  return {
    transactionHash: TX,
    transactionIndex: '0x0',
    blockHash: '0xblock',
    blockNumber: '0x10',
    from: TAKER,
    to: '0xdead' as `0x${string}`,
    cumulativeGasUsed: '0x1',
    gasUsed: '0x5208',
    effectiveGasPrice: '0x3b9aca00',
    status,
    type: '0x2',
    contractAddress: null,
    logs: [
      transferLog(SRC as `0x${string}`, TAKER, ROUTER, srcValue),
      transferLog(DST as `0x${string}`, ROUTER, TAKER, dstValue),
    ],
  } as RpcTransactionReceipt;
}

function fakeClient(receipt: RpcTransactionReceipt | null) {
  return {
    getTransactionReceipt: jest.fn(async () => receipt),
    getTransactionByHash: jest.fn(async () => null),
    getBlockByNumber: jest.fn(async () => ({
      timestamp: '0x' + (NOW_S + 12).toString(16),
    })),
    ethCall: jest.fn(async (_k: string, _e: string[], token: `0x${string}`) => {
      const d = token.toLowerCase() === SRC ? 6 : 18;
      return ('0x' + d.toString(16).padStart(64, '0')) as `0x${string}`;
    }),
  } as unknown as RpcClientWithFallback;
}

function preTradeInput(overrides: Partial<AttestationInputV2> = {}): AttestationInputV2 {
  return {
    verdict: 'PASS',
    sourceAssetId: USDC,
    destinationAssetId: WETH,
    subjectChainId: 1,
    action: 'swap',
    tradeAmountUsd: 50_000,
    consensusPrice: 1.0,
    maxDeviationPct: 0.2,
    manipulationRiskScore: 0.01,
    participantCount: 4,
    crossProviderAgreement: 0.99,
    maxStablecoinDepegPct: 0.01,
    maxDataAgeSeconds: 12,
    recommendedMaxPositionUsd: 100_000,
    contributingFactors: [],
    providerObservations: VALID_OBSERVATIONS,
    checkedAtMs: GATE_TS_S * 1000,
    ...overrides,
  };
}

describe('verifiable execution trust loop (real crypto)', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.ATTESTATION_SIGNER_PRIVATE_KEY = TEST_PRIVATE_KEY;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.ATTESTATION_SIGNER_PRIVATE_KEY;
  });

  it('closes the loop as PRICE_CLOSED_FAITHFUL for a faithful fill within the band', async () => {
    // SOURCE = USDC ($1), DESTINATION = WETH ($2500) → VERIFIED quote
    // = sourceUSD/destUSD = 1/2500 = 0.0004 WETH per USDC.
    const source = await signAttestationV3(preTradeInput({ consensusPrice: 1.0 }));
    const destination = await signAttestationV3(
      preTradeInput({ sourceAssetId: WETH, destinationAssetId: USDC, consensusPrice: 2500 })
    );
    expect(source).not.toBeNull();
    expect(destination).not.toBeNull();

    // 1000 USDC -> 0.4 WETH ⇒ executedPrice 0.0004 = the certified 0.0004 ⇒ 0 bps.
    const result = await issueExecutionReceipt({
      preTradeUid: source!.uid as `0x${string}`,
      requestHash: source!.data.requestHash,
      sourceAssetId: USDC,
      destinationAssetId: WETH,
      subjectChainId: 1,
      settlementChainId: 1,
      participantCount: 4,
      sourceGroupCount: 3,
      preTradeSignedAt: GATE_TS_S,
      quotedPrice: 0, // ignored: VERIFIED binding derives it from the gates
      txHash: TX,
      taker: TAKER as `0x${string}`,
      preTradeAttestations: { source, destination },
      client: fakeClient(swapReceipt(1000n * 10n ** 6n, 4n * 10n ** 17n)),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.receipt.data.bindingMode).toBe('VERIFIED');
    expect(result.receipt.data.quotedPrice / 1e8).toBeCloseTo(0.0004, 8);
    expect(result.receipt.data.priceExecutionStatus).toBe('FAITHFUL');
    expect(result.receipt.data.priceDeltaBps).toBe(0);

    // The receipt is independently verifiable.
    const verify = await verifyExecutionReceipt(result.receipt);
    expect(verify.valid).toBe(true);
    expect(verify.executionStatus).toBe('FAITHFUL');

    // The closed loop: this receipt genuinely belongs to this pre-trade gate.
    // v3 receipts commit to BOTH gates of the quote (F1), so the destination
    // gate must be presented for the loop to close.
    const pair = await verifyExecutionPair(source!, result.receipt, destination!);
    expect(pair.pairedValid).toBe(true);
    expect(pair.closedLoopStatus).toBe('PRICE_CLOSED_FAITHFUL');
    expect(pair.binding.preTradeUidMatch).toBe(true);
    expect(pair.binding.requestHashMatch).toBe(true);
    expect(pair.binding.destinationPreTradeUidMatch).toBe(true);
    expect(pair.binding.preTradeUidsHashMatch).toBe(true);
    expect(pair.destinationPreTrade?.uid).toBe(destination!.uid);

    const offline = await verifyExecutionPairOffline(
      source! as never,
      result.receipt as never,
      destination! as never,
      {
        keyRegistry: {
          keys: [
            {
              key_id: 'test',
              public_key: result.receipt.attester,
              validFrom: '2020-01-01',
              validUntil: null,
              revoked: false,
              role: 'attester',
            },
          ],
        },
      }
    );
    expect(offline.pairedValid).toBe(true);
    expect(offline.closedLoopStatus).toBe('PRICE_CLOSED_FAITHFUL');
  });

  it('reports PRICE_CLOSED_DEVIATED when the fill drifts past the certified band', async () => {
    const source = await signAttestationV3(preTradeInput({ consensusPrice: 1.0 }));
    const destination = await signAttestationV3(
      preTradeInput({ sourceAssetId: WETH, destinationAssetId: USDC, consensusPrice: 2500 })
    );
    expect(source).not.toBeNull();
    expect(destination).not.toBeNull();

    // 1000 USDC -> 0.39 WETH ⇒ executedPrice 0.00039 vs certified 0.0004 ⇒ -2.5%.
    const result = await issueExecutionReceipt({
      preTradeUid: source!.uid as `0x${string}`,
      requestHash: source!.data.requestHash,
      sourceAssetId: USDC,
      destinationAssetId: WETH,
      subjectChainId: 1,
      settlementChainId: 1,
      participantCount: 4,
      sourceGroupCount: 3,
      preTradeSignedAt: GATE_TS_S,
      quotedPrice: 0,
      txHash: TX,
      taker: TAKER as `0x${string}`,
      preTradeAttestations: { source, destination },
      client: fakeClient(swapReceipt(1000n * 10n ** 6n, 39n * 10n ** 16n)),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.receipt.data.priceExecutionStatus).toBe('DEVIATED');
    expect(result.receipt.data.priceDeltaBps).toBe(-250);

    const pair = await verifyExecutionPair(source!, result.receipt, destination!);
    expect(pair.pairedValid).toBe(true);
    expect(pair.closedLoopStatus).toBe('PRICE_CLOSED_DEVIATED');
    expect(pair.binding.destinationPreTradeUidMatch).toBe(true);
    expect(pair.binding.preTradeUidsHashMatch).toBe(true);
  });
});
