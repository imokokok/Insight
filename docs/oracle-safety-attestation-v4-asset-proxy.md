# Oracle safety attestation v4 — signed asset-proxy relationship

Status: additive schema version (opt-in via `schemaVersion: 4`). v1–v3 remain
untouched and keep verifying.

## Why v4

v1–v3 prove that a price/verdict held at time T for an asset identified by a
CAIP-19 id. None of them can say **what that symbol is a claim on**. For a
wrapped asset such as WBTC, the receipt books a token as an independent asset and
carries no field naming the Bitcoin it is redeemable against — so a holder
cannot see the custodian/wrapper leg in the signed bytes at all.

v4 adds that relationship as four independent, signed scalars. It is not free
text and not unsigned metadata: the fields are part of the EIP-712 typehash, so
they are covered by both the UID and the signature.

## Field definitions

v4 signs **31 fields** = v3's 27 fields (same names, types, order) + four
appended fields describing the **source** (evaluated) asset. The evaluation
scope is unchanged: `SOURCE_ASSET_ONLY`.

| #   | Field                             | EIP-712 type | Meaning                                                      |
| --- | --------------------------------- | ------------ | ------------------------------------------------------------ |
| 1   | `sourceAssetProxyStatus`          | `string`     | `ASSESSED` \| `UNKNOWN` \| `NOT_APPLICABLE`                  |
| 2   | `sourceAssetProxyRelation`        | `string`     | `wrapped-btc` \| `wrapped-eth` \| `''`                       |
| 3   | `sourceAssetUnderlyingId`         | `string`     | Canonical id of the underlying asset; `''` unless `ASSESSED` |
| 4   | `sourceAssetProxyNominalRatioBps` | `uint256`    | `10000` = nominal 1:1. `0` = not assessed / not applicable   |

`sourceAssetProxyNominalRatioBps` is a **nominal redemption ratio**, not a
verified reserve ratio. `10000` says "the wrapper claims 1:1", not "reserves were
audited". Solvency is out of scope.

The first reviewed registry entry is WBTC:

```json
{
  "sourceAssetProxyStatus": "ASSESSED",
  "sourceAssetProxyRelation": "wrapped-btc",
  "sourceAssetUnderlyingId": "bip122:000000000019d6689c085ae165831e93/slip44:0",
  "sourceAssetProxyNominalRatioBps": 10000
}
```

`bip122:000000000019d6689c085ae165831e93` is Bitcoin mainnet's CAIP-2 chain id
(the genesis block hash); `/slip44:0` is BTC's SLIP-44 coin type. BTC is not an
EVM token, so it needs a chain-scoped native-asset id instead of an `erc20:` id.
WBTC is matched by its canonical contract address on Ethereum mainnet
(`0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599`) and Arbitrum
(`0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f`). The registry lives in
`src/lib/attestations/assetProxyRelation.ts`; adding an entry is a reviewed
change to the signed vocabulary, not a runtime guess.

## Version determination

Routing is **explicit numeric**, never field-presence sniffing:

| `schemaVersion` | `primaryType`             | Domain `version` | Signed fields |
| --------------- | ------------------------- | ---------------- | ------------- |
| 1               | `OracleSafetyCheck`       | `1`              | 11            |
| 2               | `OracleSafetyCheck`       | `2`              | 26            |
| 3               | `OracleSafetyCheck`       | `3`              | 27            |
| 3               | `OracleSafetyRecheck`     | `3`              | 29            |
| **4**           | **`OracleSafetyCheck`**   | **`4`**          | **31**        |
| **4**           | **`OracleSafetyRecheck`** | **`4`**          | **33**        |

`verifyAttestationBySchema` (and the standalone `verifier/` package) select the
domain+types by `schemaVersion`, and use `primaryType` only to split a recheck
from a plain check. A receipt whose `schemaVersion` is 3 is verified with v3
domain/types even if it happens to contain proxy-shaped fields, and a v4 receipt
is rejected under the v4 domain if any of its 31 fields is missing or mistyped.
Domain separation (`version: '4'`) is what actually prevents cross-version replay
— the v3 field prefix is only a diffing convenience.

## Missing-data policy

**Decision: sign an explicit `UNKNOWN` and make it verifier-visible; do not
refuse to issue.**

- `ASSESSED` — a reviewed registry entry exists for the signed CAIP-19 id (or,
  for an unlisted chain deployment, the raw symbol matches a reviewed entry).
- `NOT_APPLICABLE` — the asset **is** the underlying: the CAIP-19 reference is a
  `slip44` native-coin reference. Only this structurally provable case may claim
  "no proxy relationship". A missing registry entry is never `NOT_APPLICABLE`.
- `UNKNOWN` — everything else. Relation and underlying id are empty; the ratio
  is `0`.

`UNKNOWN` is signed into the bytes, echoed by the verifier as
`assetProxy.status`, and accompanied by the non-fatal warning
`asset_proxy_unknown`. `0` is never interpreted as 1:1; only
`ASSESSED + 10000` is.

Why not refuse issuance: refusing would make every unlisted ERC-20 (most of the
market, including USDC) un-attestable — a breaking regression — while an explicit
UNKNOWN inside the signed bytes is strictly stronger evidence than an unsigned
gap. The verifier still fails closed on a self-contradicting record: a
correctly-signed message that says `ASSESSED` but ships an empty underlying id
(or says `UNKNOWN` with a 10000 ratio) is rejected with
`asset_proxy_inconsistent`.

## Signature coverage

The four fields are appended to `V4_TYPES.OracleSafetyCheck`. Both UID and
signature are `hashTypedData(domain, types, message)` over all 31 fields, so:

- editing any proxy field after signing → `uid_mismatch`;
- a re-signed message with semantically impossible fields → `asset_proxy_inconsistent`;
- a v3 receipt cannot be replayed under the v4 domain because the domain
  `version` differs.

`V4_TYPES` is derived from `V3_TYPES` by spreading the v3 tuple and appending,
and `verifier/src/schemas.ts` derives its own `V4_TYPES` the same way, so the
shared 27-field prefix cannot drift between producer and verifier (enforced by
`verifierParity.test.ts`).

## End-to-end WBTC sample (before → after)

Same evidence, same throwaway signer, `WBTC → USDC`, chain 1, `PASS`.
Generated with `signAttestationV3` and `signAttestationV4` and verified through
`verifyAttestationBySchema`.

```json
{
  "case": "WBTC -> USDC, chain 1, PASS",
  "before": {
    "schemaVersion": 3,
    "uid": "0x5757532a05823b4681c453a4cca8a8e5a6dbab3eb7843998b9f5e5013b83ba65",
    "proxyFieldsPresent": []
  },
  "after": {
    "schemaVersion": 4,
    "uid": "0x97598a50121123ef2e479516e71c96733381fadbd62faf055096853e7e6e9585",
    "addedFields": {
      "sourceAssetProxyStatus": "ASSESSED",
      "sourceAssetProxyRelation": "wrapped-btc",
      "sourceAssetUnderlyingId": "bip122:000000000019d6689c085ae165831e93/slip44:0",
      "sourceAssetProxyNominalRatioBps": 10000
    }
  },
  "verification": {
    "v3": { "valid": true, "schemaVersion": 3 },
    "v4": {
      "valid": true,
      "schemaVersion": 4,
      "assetProxy": {
        "status": "ASSESSED",
        "relation": "wrapped-btc",
        "underlyingAssetId": "bip122:000000000019d6689c085ae165831e93/slip44:0",
        "nominalRatioBps": 10000
      }
    }
  }
}
```

UIDs are run-specific because `checkedAt` is part of the signed message. The
v4 `uid` differs from v3's even for identical evidence — expected, since
`schemaVersion` and the four new fields are signed.

## Historical receipts

v1, v2 and v3 (and their rechecks) are verified by the same router with their
own domain/types. `oracleSafetyAttestationV4.test.ts` signs one receipt of each
version and asserts all three still verify (`valid: true`), with `assetProxy`
absent because it is a v4-only concept. `verifierParity.test.ts` keeps
v1/v2/v3/recheck layouts byte-identical between the app and the standalone
package.

## Scope / rollout

- Omitted `schemaVersion` resolves per surface, and the two surfaces differ:
  - REST `GET/POST /api/v1/safety/pre-trade`: omitting `schemaVersion` lands on
    **v1**. Existing callers keep their current signature and verification
    semantics; changing this default is a separate decision.
  - MCP agent tools pin **v3**.
- v4 must be requested explicitly with `schemaVersion: 4`; no existing signed
  literal, verdict literal, C1–C4 cardinalities, floors or `QUORUM_MIN` changed.
- `latestSchemaVersion` on the verify endpoint is now 4 ("can verify", not
  "default").
- The v3-only 1800s joint-run validity exception is not extended to v4; v4
  keeps the standard 600s window.
