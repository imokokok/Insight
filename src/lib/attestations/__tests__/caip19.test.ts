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
    ['ANKR', 1, '0x8290333ceF9e6D528dD5618Fb97a76f268f3EDD4'],
    ['AXS', 1, '0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b'],
    ['BAT', 1, '0x0D8775F648430679A709E98d2b0Cb6250d2887EF'],
    ['BONK', 1, '0x1151CB3d861920e07a38e03eEAd12C32178567F6'],
    ['BUSD', 1, '0x4Fabb145d64652a948d72533023f6E7A623C7C53'],
    ['CAKE', 1, '0x152649eA73beAb28c5b49B26eb48f7EAD6d4c898'],
    ['CBBTC', 1, '0xcbb7c0000ab88b473b1f5afD9ef808440eE33d29'],
    ['CVX', 1, '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B'],
    ['DYDX', 1, '0x92D6C1e31e14520e676a687F0a93788B716BEff5'],
    ['ENJ', 1, '0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c'],
    ['GALA', 1, '0x15D4c048F83bd7e37d49eA4C83a07267Ec4203dA'],
    ['GRT', 1, '0xc944E90C64B2c07662A292be6244BDf05Cda44a7'],
    ['INJ', 1, '0xe28B3b32b6C345a34ff64674609024ea28cea6F7'],
    ['KNC', 1, '0xdeFA4e8a7bcBA345F687a2f1456F5Edd9CE97202'],
    ['LUSD', 1, '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0'],
    ['MANA', 1, '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942'],
    ['MNT', 1, '0x3c3a81e81dc49A522A592e7622A7E711c06bf354'],
    ['NEAR', 1, '0x85F17Cf997934a597031b2E18a9aB6ebD4B9f6a4'],
    ['OCEAN', 1, '0x967da4048cD07aB37855c090af366E4Ce1B9f48f'],
    ['PAXG', 1, '0x45804880De22913dAFE09f4980848ECE6EcbAf78'],
    ['QNT', 1, '0x4a220E6096B25EADb88358cb44068A3248254675'],
    ['RPL', 1, '0xD33526068D116cE69F19A9ee46F0bd304F21A51f'],
    ['SAND', 1, '0x3845badAde8e6dFF049820680d1F14bD3903a5d0'],
    ['STORJ', 1, '0xB64ef51C888972c908CFacf59B47C1AfBC0Ab8aC'],
    ['TBTC', 1, '0x18084fbA666a33d37592fA2633fD49a74DD93a88'],
    ['TON', 1, '0x582d872A1B094FC48F5DE31D3B73F2D9bE47def1'],
    ['UMA', 1, '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828'],
    ['XRP', 1, '0x39fBBABf11738317a448031930706cd3e612e1B9'],
    ['YFI', 1, '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e'],
    ['ZRX', 1, '0xE41d2489571d322189246DaFA5ebDe1F4699F498'],
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
    ['PEPE', 1, 'eip155:1/erc20:0x6982508145454Ce325dDbE47a25d4ec3d2311933'],
    ['SHIB', 1, 'eip155:1/erc20:0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE'],
    ['XRP', 1, 'eip155:1/erc20:0x39fBBABf11738317a448031930706cd3e612e1B9'],
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
