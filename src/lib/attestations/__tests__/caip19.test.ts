/**
 * Unit tests + deterministic test vectors for the CAIP-19 resolution layer.
 *
 * These vectors are the reproducibility contract for the v2 attestation: both
 * Insight and ThoughtProof must derive the SAME CAIP-19 string for a given
 * (symbol, chainId). Any change to a vector here is a schema-affecting change
 * and must be communicated alongside the v2 test-vector set.
 */

import {
  buildErc20Id,
  buildNativeId,
  parseCaip19,
  resolveAssetPair,
  resolveCaip19,
} from '../caip19';

describe('caip19 builders', () => {
  it('builds an ERC-20 id with an EIP-55 checksummed address', () => {
    expect(buildErc20Id(1, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')).toBe(
      'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    );
    // Already-checksummed input is idempotent.
    expect(buildErc20Id(1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')).toBe(
      'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    );
  });

  it('builds a native gas-token id via SLIP-44', () => {
    expect(buildNativeId(1, 60)).toBe('eip155:1/slip44:60');
    expect(buildNativeId(56, 714)).toBe('eip155:56/slip44:714');
  });
});

describe('resolveCaip19 — native gas tokens (slip44)', () => {
  it.each([
    ['ETH', 1, 'eip155:1/slip44:60'],
    ['ETH', 42161, 'eip155:42161/slip44:60'],
    ['ETH', 10, 'eip155:10/slip44:60'],
    ['ETH', 8453, 'eip155:8453/slip44:60'],
    ['BNB', 56, 'eip155:56/slip44:714'],
    ['MATIC', 137, 'eip155:137/slip44:966'],
    ['POL', 137, 'eip155:137/slip44:966'],
    ['AVAX', 43114, 'eip155:43114/slip44:9005'],
  ])('resolveCaip19(%s, %i) → %s', (symbol, chainId, expected) => {
    const asset = resolveCaip19(symbol, chainId);
    expect(asset).not.toBeNull();
    expect(asset!.id).toBe(expected);
    expect(asset!.namespace).toBe('slip44');
    expect(asset!.tokenAddress).toBeNull();
    expect(asset!.coinType).not.toBeNull();
  });

  it('does NOT treat ETH as native on a non-ETH-gas chain (BNB Chain)', () => {
    // ETH on BSC is a bridged ERC-20 (or unknown), NOT slip44:60. The resolver
    // must not blindly mint a native id for ETH on every chain.
    const asset = resolveCaip19('ETH', 56);
    // Either resolves to a registered ERC-20 or null — never slip44:60.
    expect(asset?.namespace).not.toBe('slip44');
  });
});

describe('resolveCaip19 — ERC-20 tokens (checksummed)', () => {
  it.each([
    // Ethereum mainnet (canonical addresses from ETHEREUM_TOKEN_ADDRESSES)
    ['USDC', 1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
    ['USDT', 1, '0xdAC17F958D2ee523a2206206994597C13D831ec7'],
    ['DAI', 1, '0x6B175474E89094C44Da98b954EedeAC495271d0F'],
    ['WETH', 1, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
    ['LINK', 1, '0x514910771AF9Ca656af840dff83E8264EcF986CA'],
    // Arbitrum
    ['USDC', 42161, '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'],
    ['WETH', 42161, '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'],
    // Optimism
    ['WETH', 10, '0x4200000000000000000000000000000000000006'],
    // Base
    ['USDC', 8453, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'],
    // BNB Chain
    ['USDC', 56, '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'],
  ])('resolveCaip19(%s, %i) → erc20:%s', (symbol, chainId, address) => {
    const asset = resolveCaip19(symbol, chainId);
    expect(asset).not.toBeNull();
    expect(asset!.id).toBe(`eip155:${chainId}/erc20:${address}`);
    expect(asset!.namespace).toBe('erc20');
    expect(asset!.tokenAddress).toBe(address);
    expect(asset!.coinType).toBeNull();
  });

  it('checksums a lowercase registry address', () => {
    const asset = resolveCaip19('USDC', 1);
    // EIP-55 mixed-case — not all-lower, not all-upper.
    expect(asset!.tokenAddress).toMatch(/^0x[A-Za-z0-9]{40}$/);
    expect(asset!.tokenAddress).not.toBe(asset!.tokenAddress!.toLowerCase());
    expect(asset!.tokenAddress).not.toBe(asset!.tokenAddress!.toUpperCase());
  });
});

describe('resolveCaip19 — symbol aliasing (price symbol → on-chain token)', () => {
  it('aliases BTC → WBTC on EVM chains (BTC is not native on EVM)', () => {
    const asset = resolveCaip19('BTC', 1);
    expect(asset).not.toBeNull();
    expect(asset!.id).toBe('eip155:1/erc20:0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599');
    expect(asset!.resolvedSymbol).toBe('WBTC');
    expect(asset!.inputSymbol).toBe('BTC');
  });

  it('resolves WBTC directly (no alias needed)', () => {
    const asset = resolveCaip19('WBTC', 1);
    expect(asset!.id).toBe('eip155:1/erc20:0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599');
    expect(asset!.resolvedSymbol).toBe('WBTC');
  });

  it('is case-insensitive on input symbol', () => {
    expect(resolveCaip19('usdc', 1)!.id).toBe(resolveCaip19('USDC', 1)!.id);
    expect(resolveCaip19('btc', 1)!.resolvedSymbol).toBe('WBTC');
  });
});

describe('resolveCaip19 — unknown / unsupported inputs', () => {
  it.each([
    ['FOO', 1], // unknown symbol
    ['USDC', 999999], // unknown chain
    ['', 1], // empty symbol
    ['USDC', -1], // negative
  ])('returns null for (%s, %i)', (symbol, chainId) => {
    expect(resolveCaip19(symbol, chainId)).toBeNull();
  });
});

describe('resolveCaip19 — Solana (chainId 0)', () => {
  it('resolves native SOL as solana:0/slip44:501', () => {
    const asset = resolveCaip19('SOL', 0);
    expect(asset).not.toBeNull();
    expect(asset!.id).toBe('solana:0/slip44:501');
    expect(asset!.namespace).toBe('slip44');
    expect(asset!.chainNamespace).toBe('solana');
    expect(asset!.chainId).toBe(0);
    expect(asset!.tokenAddress).toBeNull();
    expect(asset!.coinType).toBe(501);
  });

  it.each([
    ['WIF', 'solana:0/spl:EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'],
    ['BONK', 'solana:0/spl:DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'],
    ['POPCAT', 'solana:0/spl:7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr'],
    ['USDC', 'solana:0/spl:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'],
    ['JUP', 'solana:0/spl:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'],
  ])('resolveCaip19(%s, 0) → %s', (symbol, expected) => {
    const asset = resolveCaip19(symbol, 0);
    expect(asset).not.toBeNull();
    expect(asset!.id).toBe(expected);
    expect(asset!.namespace).toBe('spl');
    expect(asset!.chainNamespace).toBe('solana');
    expect(asset!.chainId).toBe(0);
    expect(asset!.tokenAddress).not.toBeNull();
    expect(asset!.coinType).toBeNull();
  });

  it('does NOT resolve unknown symbols on Solana', () => {
    expect(resolveCaip19('FOO', 0)).toBeNull();
  });

  it('does NOT resolve SOL on EVM chains as Solana native', () => {
    // SOL on Ethereum is a wrapped ERC-20 (or unknown), not solana:0/slip44:501
    const asset = resolveCaip19('SOL', 1);
    expect(asset?.namespace).not.toBe('slip44');
    expect(asset?.chainNamespace).not.toBe('solana');
  });
});

describe('resolveAssetPair', () => {
  it('resolves both legs of an ETH→USDC swap on Ethereum', () => {
    const pair = resolveAssetPair('ETH', 1, 'USDC', 1);
    expect(pair.complete).toBe(true);
    expect(pair.source!.id).toBe('eip155:1/slip44:60');
    expect(pair.destination!.id).toBe('eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
  });

  it('resolves a WBTC→USDT swap on Arbitrum', () => {
    const pair = resolveAssetPair('WBTC', 42161, 'USDT', 42161);
    expect(pair.complete).toBe(true);
    expect(pair.source!.namespace).toBe('erc20');
    expect(pair.destination!.namespace).toBe('erc20');
  });

  it('defaults destinationChainId to sourceChainId', () => {
    const explicit = resolveAssetPair('ETH', 1, 'USDC', 1);
    const implicit = resolveAssetPair('ETH', 1, 'USDC');
    expect(implicit).toEqual(explicit);
  });

  it('marks incomplete when either leg is unknown', () => {
    const pair = resolveAssetPair('ETH', 1, 'NOPE', 1);
    expect(pair.complete).toBe(false);
    expect(pair.source).not.toBeNull();
    expect(pair.destination).toBeNull();
  });
});

describe('parseCaip19 (inverse)', () => {
  it('parses an ERC-20 id back into parts', () => {
    const parsed = parseCaip19('eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    expect(parsed).toEqual({
      chainNamespace: 'eip155',
      chainReference: 1,
      assetNamespace: 'erc20',
      assetReference: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    });
  });

  it('parses a slip44 id back into parts', () => {
    const parsed = parseCaip19('eip155:1/slip44:60');
    expect(parsed).toEqual({
      chainNamespace: 'eip155',
      chainReference: 1,
      assetNamespace: 'slip44',
      assetReference: '60',
    });
  });

  it('parses a Solana SPL id back into parts', () => {
    const parsed = parseCaip19('solana:0/spl:EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm');
    expect(parsed).toEqual({
      chainNamespace: 'solana',
      chainReference: 0,
      assetNamespace: 'spl',
      assetReference: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    });
  });

  it('parses a Solana native SOL id back into parts', () => {
    const parsed = parseCaip19('solana:0/slip44:501');
    expect(parsed).toEqual({
      chainNamespace: 'solana',
      chainReference: 0,
      assetNamespace: 'slip44',
      assetReference: '501',
    });
  });

  it.each([
    '',
    'not-a-caip19',
    'eip155:1/erc721:0xabc', // unsupported asset namespace
    'bitcoin:0/slip44:0', // unsupported chain namespace
  ])('returns null for malformed input %j', (input) => {
    expect(parseCaip19(input)).toBeNull();
  });
});

describe('determinism (test-vector reproducibility contract)', () => {
  // The same inputs MUST always produce the same id — no time, no DB, no
  // randomness. ThoughtProof will reproduce these exact strings.
  const VECTORS: Array<[string, number, string]> = [
    ['ETH', 1, 'eip155:1/slip44:60'],
    ['USDC', 1, 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
    ['USDC', 42161, 'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831'],
    ['BTC', 1, 'eip155:1/erc20:0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'],
    ['BNB', 56, 'eip155:56/slip44:714'],
    ['SOL', 0, 'solana:0/slip44:501'], // Solana native
    ['WIF', 0, 'solana:0/spl:EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'], // Solana SPL
    ['POPCAT', 0, 'solana:0/spl:7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr'], // Solana SPL
  ];

  it('produces stable ids across repeated calls', () => {
    for (const [symbol, chainId, expected] of VECTORS) {
      const a = resolveCaip19(symbol, chainId)!.id;
      const b = resolveCaip19(symbol, chainId)!.id;
      expect(a).toBe(expected);
      expect(b).toBe(expected);
    }
  });
});
