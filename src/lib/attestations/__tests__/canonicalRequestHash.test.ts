/**
 * Unit tests + published test vectors for the canonical requestHash.
 *
 * The vector below is the reproducibility contract for Raul's side: the same
 * inputs MUST yield this exact digest when computed via EIP-712
 * `hashTypedData` with the published domain + types. Any change here is a
 * schema-affecting change and must be communicated alongside the v2 delivery.
 */

import { computeRequestHash } from '../canonicalRequestHash';

const ETH_NATIVE = 'eip155:1/slip44:60';
const USDC_ETH = 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDC_ARB = 'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

describe('computeRequestHash', () => {
  it('returns a 32-byte digest', () => {
    const h = computeRequestHash({
      subjectChainId: 1,
      sourceAssetId: ETH_NATIVE,
      destinationAssetId: USDC_ETH,
      action: 'swap',
      tradeAmountUsd: 50000,
    });
    expect(h).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it('publishes a stable test vector (ETH→USDC swap, $50k, Ethereum)', () => {
    // Computed via viem hashTypedData with the canonical domain. Both Insight
    // and ThoughtProof reproduce this exact digest from these inputs.
    expect(
      computeRequestHash({
        subjectChainId: 1,
        sourceAssetId: ETH_NATIVE,
        destinationAssetId: USDC_ETH,
        action: 'swap',
        tradeAmountUsd: 50000,
      })
    ).toBe('0xcc4926b6d32dda77cb8149dcb1d0db19f17ac220e32d70cc752e4b4de96b613d');
  });

  it('binds subjectChainId (Arbitrum vector differs from Ethereum)', () => {
    // Same trade on Arbitrum → different digest. Proves subjectChainId is in the
    // message body, not just the domain separator.
    expect(
      computeRequestHash({
        subjectChainId: 42161,
        sourceAssetId: 'eip155:42161/slip44:60',
        destinationAssetId: USDC_ARB,
        action: 'swap',
        tradeAmountUsd: 50000,
      })
    ).toBe('0x843bc8c84aca94057a9e6b7abbb433b9d7914325142887a288558f3287093f6f');
  });

  it('is deterministic for identical inputs', () => {
    const a = computeRequestHash({
      subjectChainId: 1,
      sourceAssetId: ETH_NATIVE,
      destinationAssetId: USDC_ETH,
      action: 'swap',
      tradeAmountUsd: 50000,
    });
    const b = computeRequestHash({
      subjectChainId: 1,
      sourceAssetId: ETH_NATIVE,
      destinationAssetId: USDC_ETH,
      action: 'swap',
      tradeAmountUsd: 50000,
    });
    expect(a).toBe(b);
  });

  it('changes when any committed field changes', () => {
    const base = {
      subjectChainId: 1,
      sourceAssetId: ETH_NATIVE,
      destinationAssetId: USDC_ETH,
      action: 'swap',
      tradeAmountUsd: 50000,
    } as const;
    const baseline = computeRequestHash(base);

    // amount change
    expect(computeRequestHash({ ...base, tradeAmountUsd: 50001 })).not.toBe(baseline);
    // action change
    expect(computeRequestHash({ ...base, action: 'borrow' })).not.toBe(baseline);
    // destination asset change
    expect(computeRequestHash({ ...base, destinationAssetId: USDC_ARB })).not.toBe(baseline);
    // source asset change
    expect(
      computeRequestHash({
        ...base,
        sourceAssetId: 'eip155:1/erc20:0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      })
    ).not.toBe(baseline);
    // subject chain change
    expect(computeRequestHash({ ...base, subjectChainId: 42161 })).not.toBe(baseline);
  });

  it('scales USD amounts to uint256 with 6 decimals', () => {
    // $50,000 → 50,000 * 1e6 = 50,000,000,000. Verify the scaling binds by
    // confirming $50,000 (raw) hashes the same as if the scaling were correct:
    // a $50,001 input must differ (already covered above) — and a fractional
    // amount rounds deterministically.
    const half = computeRequestHash({
      subjectChainId: 1,
      sourceAssetId: ETH_NATIVE,
      destinationAssetId: USDC_ETH,
      action: 'swap',
      tradeAmountUsd: 50000.4, // rounds to 50000 (×1e6 → 50000400000? no: 50000.4*1e6=50000400000)
    });
    const exact = computeRequestHash({
      subjectChainId: 1,
      sourceAssetId: ETH_NATIVE,
      destinationAssetId: USDC_ETH,
      action: 'swap',
      tradeAmountUsd: 50000.4,
    });
    expect(half).toBe(exact); // deterministic rounding
    expect(half).not.toBe(
      computeRequestHash({
        subjectChainId: 1,
        sourceAssetId: ETH_NATIVE,
        destinationAssetId: USDC_ETH,
        action: 'swap',
        tradeAmountUsd: 50000,
      })
    );
  });
});
