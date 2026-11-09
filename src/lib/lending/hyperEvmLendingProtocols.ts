/**
 * Reviewed HyperEVM (chain 999) lending deployment identities.
 *
 * Addresses come from HyperLend's official documentation
 * (docs.hyperlend.finance/developer-documentation/contract-addresses) and were
 * confirmed live on chain 999 on 2026-11-10: the Pool answers
 * `getReservesList` with the documented asset universe, and every reviewed
 * underlying below appeared in that live list with matching decimals.
 *
 * This is deliberately a small, source-controlled allow-list: a compatible ABI
 * alone must never put a target into a signed exact-call decision.
 */

export const HYPEREVM_CHAIN_ID = 999 as const;

export const HYPERLEND_CORE_POOL = '0x00A89d7a5A02160f20150EbEA7a2b5E4879A1A8b' as const;
export const HYPERLEND_CORE_POOL_ADDRESSES_PROVIDER =
  '0x72c98246a98bFe64022a3190e7710E157497170C' as const;
export const HYPERLEND_CORE_UI_POOL_DATA_PROVIDER =
  '0xfc05a3fbf47094f53a8f98fda5dd8abdd336b9d4' as const;

/**
 * Assets intentionally admitted to the direct HyperLend Core path. The guard
 * still reads reserve status and risk factors live for every decision. Native
 * HYPE wrapping, the WrappedTokenGateway, eMode, permits and delegated or
 * batched calls are outside this direct-call v1 scope.
 *
 * Long-tail and maturity assets are deliberately not registered: USOL and
 * USDH/USDHL/USR have no standard Chainlink USD proxy on 999, PT tokens are
 * Pendle maturity assets with exchange-rate pricing, and wstHYPE/beHYPE ride
 * exchange-rate oracles instead of USD price feeds. The oracle-safety layer
 * therefore cannot vouch for them, so they fail closed by exclusion.
 *
 * Live-verified 2026-11-10 via UiPoolDataProvider.getReservesData on chain
 * 999 (addresses and decimals below matched the reserve list exactly).
 */
export const HYPERLEND_CORE_ASSETS = {
  WHYPE: '0x5555555555555555555555555555555555555555',
  WSTHYPE: '0x94e8396e0869c9F2200760aF0621aFd240E1CF38',
  UBTC: '0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463',
  UETH: '0xBe6727B535545C67d5cAa73dEa54865B92CF7907',
  USDE: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
  SUSDE: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
  USDT0: '0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb',
  KHYPE: '0xfD739d4e423301CE9385c1fb8850539D657C296D',
  USDC: '0xb88339CB7199b77E23DB6E890353E22632Ba630f',
} as const;

const HYPERLEND_SYMBOL_ALIASES: Record<string, keyof typeof HYPERLEND_CORE_ASSETS> = {
  HYPE: 'WHYPE',
  WHYPE: 'WHYPE',
  WSTHYPE: 'WSTHYPE',
  BTC: 'UBTC',
  UBTC: 'UBTC',
  ETH: 'UETH',
  UETH: 'UETH',
  USDE: 'USDE',
  SUSDE: 'SUSDE',
  USDT: 'USDT0',
  USDT0: 'USDT0',
  KHYPE: 'KHYPE',
  USDC: 'USDC',
};

export function canonicalHyperLendSymbol(
  symbol: string
): keyof typeof HYPERLEND_CORE_ASSETS | null {
  return HYPERLEND_SYMBOL_ALIASES[symbol.trim().toUpperCase()] ?? null;
}

export function hyperLendUnderlyingForSymbol(symbol: string): `0x${string}` | null {
  const canonical = canonicalHyperLendSymbol(symbol);
  return canonical
    ? (HYPERLEND_CORE_ASSETS[canonical].toLowerCase() as `0x${string}`)
    : null;
}

/**
 * Symbol handed to the oracle-safety layer for an asset. Wrapped and
 * rebranded tokens map to the closest standard USD price feed that the
 * chain-999 Chainlink catalog serves (WHYPE -> HYPE, USDT0 -> USDT, UBTC/UETH
 * keep their own standard proxies). Symbols without any standard USD feed on
 * 999 (WSTHYPE, KHYPE, SUSDE) map to themselves and fail closed upstream
 * because the oracle layer has no feed to vouch for them.
 */
export function hyperLendOracleSymbol(symbol: string): string {
  const canonical = canonicalHyperLendSymbol(symbol);
  if (!canonical) return symbol.trim().toUpperCase();
  switch (canonical) {
    case 'WHYPE':
      return 'HYPE';
    case 'USDT0':
      return 'USDT';
    case 'WSTHYPE':
      return 'WSTHYPE';
    default:
      return canonical;
  }
}
