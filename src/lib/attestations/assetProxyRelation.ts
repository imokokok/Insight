/**
 * @fileoverview Asset-proxy relationship resolution for the v4 oracle safety
 * attestation.
 *
 * v3 can prove "this price/verdict held at time T" but cannot express "this
 * symbol is a wrapper of some other asset, issued against it". That matters for
 * assets like WBTC: a receipt that books WBTC as an independent asset hides the
 * custodian leg entirely, so a holder cannot tell from the signed bytes what
 * the symbol is actually a claim on.
 *
 * This module supplies the four values v4 signs (see
 * {@link ./oracleSafetyAttestationV4}). It is pure and synchronous: given the
 * SAME canonical CAIP-19 source asset id, it always returns the SAME record, so
 * the attestation's UID stays reproducible.
 *
 * Missing-data policy (deliberate, and encoded in the signed bytes):
 *   - ASSESSED        → a reviewed registry entry exists; relation, underlying
 *                       id and nominal ratio are all populated.
 *   - NOT_APPLICABLE  → the asset IS the underlying: the CAIP-19 reference is a
 *                       `slip44` native-coin reference. Only this structurally
 *                       provable case may claim "no proxy".
 *   - UNKNOWN         → everything else. Relation, underlying id are empty and
 *                       the nominal ratio is 0. 0 is NEVER a 1:1 claim.
 *
 * The rule that matters: absence of registry data must never be silently read
 * as "1:1" or as "no relationship". It is signed as UNKNOWN so the verifier can
 * see it and decide.
 */

import { parseCaip19 } from './caip19';

/** Bitcoin mainnet as a CAIP-19 native-asset id (CAIP-2 bip122 genesis hash +
 *  SLIP-44 coin type 0). Used as the underlying identity for wrapped-BTC
 *  assets: BTC itself is not an EVM token, so it needs a chain-scoped id. */
export const BITCOIN_MAINNET_ASSET_ID = 'bip122:000000000019d6689c085ae165831e93/slip44:0';

export type AssetProxyStatus = 'ASSESSED' | 'UNKNOWN' | 'NOT_APPLICABLE';

/** Relation kinds are the reviewed registry's own vocabulary (mirrors the
 *  `wrapped-btc` / `wrapped-eth` types in `src/lib/wrapped-assets/config.ts`).
 *  LSTs are deliberately NOT included: they are staked derivatives whose rate
 *  is not a proxy claim, so they stay UNKNOWN until reviewed separately. */
export type AssetProxyRelationKind = 'wrapped-btc' | 'wrapped-eth';

export interface AssetProxyRelationData {
  status: AssetProxyStatus;
  /** Empty string when status is UNKNOWN or NOT_APPLICABLE. */
  relation: AssetProxyRelationKind | '';
  /** Canonical id of the underlying asset; empty unless ASSESSED. */
  underlyingAssetId: string;
  /** Nominal redemption ratio in bps (10000 = nominal 1:1). 0 means "not
   *  assessed / not applicable" and must NEVER be interpreted as 1:1. */
  nominalRatioBps: number;
}

interface AssetProxyRegistryEntry {
  symbol: string;
  relation: AssetProxyRelationKind;
  underlyingAssetId: string;
  nominalRatioBps: number;
  /** Canonical token contracts per chain id. An entry is only ASSESSED on a
   *  chain where the token address is known. */
  tokenAddresses: Record<number, string>;
}

/**
 * Reviewed proxy relationships. WBTC is the first real entry; adding another
 * asset is a reviewed change to the signed vocabulary, not a runtime guess.
 * Addresses are the canonical mainnet deployments (WBTC mainnet is also the
 * address used by `multichainEvmLendingProtocols`, Arbitrum WBTC likewise).
 */
export const ASSET_PROXY_REGISTRY: readonly AssetProxyRegistryEntry[] = [
  {
    symbol: 'WBTC',
    relation: 'wrapped-btc',
    underlyingAssetId: BITCOIN_MAINNET_ASSET_ID,
    nominalRatioBps: 10_000,
    tokenAddresses: {
      1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      42161: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    },
  },
];

const UNKNOWN_RELATION: AssetProxyRelationData = {
  status: 'UNKNOWN',
  relation: '',
  underlyingAssetId: '',
  nominalRatioBps: 0,
};

const NOT_APPLICABLE_RELATION: AssetProxyRelationData = {
  status: 'NOT_APPLICABLE',
  relation: '',
  underlyingAssetId: '',
  nominalRatioBps: 0,
};

function assessedFrom(entry: AssetProxyRegistryEntry): AssetProxyRelationData {
  return {
    status: 'ASSESSED',
    relation: entry.relation,
    underlyingAssetId: entry.underlyingAssetId,
    nominalRatioBps: entry.nominalRatioBps,
  };
}

/**
 * Resolve the proxy relationship of the EVALUATED (source) asset.
 *
 * `sourceAssetId` is the canonical CAIP-19 id already signed by v2/v3/v4, so
 * resolution is anchored to a contract whenever the registry knows that chain's
 * deployment. `sourceSymbol` is a narrow fallback for an ERC-20 whose address is
 * absent from the registry entry (e.g. WBTC on a chain with no reviewed
 * deployment): the symbol must still match a reviewed registry entry. It is
 * never consulted for `unresolved:` markers — those stay UNKNOWN because the id
 * anchors no contract at all.
 */
export function resolveAssetProxyRelation(
  sourceAssetId: string,
  sourceSymbol?: string
): AssetProxyRelationData {
  let parsed;
  try {
    parsed = parseCaip19(sourceAssetId);
  } catch {
    return UNKNOWN_RELATION;
  }

  // An `unresolved:<symbol>@<chain>` marker is not a canonical asset id, so the
  // relation cannot be anchored to a contract. Stay UNKNOWN.
  if (!parsed) return UNKNOWN_RELATION;

  // Native gas tokens ARE the underlying asset — the only provable
  // "no proxy relationship" case.
  if (parsed.assetNamespace === 'slip44') return NOT_APPLICABLE_RELATION;

  if (parsed.assetNamespace === 'erc20') {
    const address = parsed.assetReference.toLowerCase();
    const byAddress = ASSET_PROXY_REGISTRY.find(
      (entry) => entry.tokenAddresses[parsed.chainReference]?.toLowerCase() === address
    );
    if (byAddress) return assessedFrom(byAddress);
  }

  const normalizedSymbol = sourceSymbol?.trim().toUpperCase();
  if (normalizedSymbol) {
    const bySymbol = ASSET_PROXY_REGISTRY.find((entry) => entry.symbol === normalizedSymbol);
    if (bySymbol) return assessedFrom(bySymbol);
  }

  return UNKNOWN_RELATION;
}

/**
 * Self-consistency of the four signed proxy fields. The verifier cannot check
 * the registry without leaving the signed bytes, but it CAN reject a signed
 * record that contradicts its own status:
 *   - ASSESSED must carry a relation, an underlying id and a positive ratio;
 *   - UNKNOWN / NOT_APPLICABLE must carry no claim at all (empty + 0).
 * A record that claims one status and carries another's values is malformed.
 */
export function isAssetProxyDataConsistent(data: AssetProxyRelationData): boolean {
  if (data.status === 'ASSESSED') {
    return (
      data.relation !== '' &&
      data.underlyingAssetId.length > 0 &&
      Number.isInteger(data.nominalRatioBps) &&
      data.nominalRatioBps > 0
    );
  }
  if (data.status === 'UNKNOWN' || data.status === 'NOT_APPLICABLE') {
    return data.relation === '' && data.underlyingAssetId === '' && data.nominalRatioBps === 0;
  }
  return false;
}
