# Solana execution evidence

Insight exposes unsigned measurements, signed execution evidence, and signed pre-sign simulation evidence for Solana mainnet-beta. All three endpoints use the standard authenticated, rate-limited, credit-metered API middleware.

## Collect transaction balance changes

`POST /api/v1/execution/solana/collect` reads a confirmed transaction and returns unsigned wallet balance measurements. It supports native SOL (`solana:0/slip44:501`) and SPL or Token-2022 assets (`solana:0/spl:<mint-address>`). Token balances are summed across token accounts owned by the supplied `taker` wallet. The resulting scope is the net wallet-owned balance delta across the entire transaction; it does not attribute movements to a particular swap instruction or venue.

```http
POST /api/v1/execution/solana/collect
X-API-Key: ins_...
Content-Type: application/json

{
  "signature": "<base58-transaction-signature>",
  "sourceAssetId": "solana:0/slip44:501",
  "destinationAssetId": "solana:0/spl:<destination-mint>",
  "taker": "<base58-wallet-public-key>"
}
```

Successful HTTP responses use the usual API envelope. Inspect `data.collection.ok` for the result and `data.signed`, which is always `false` for this endpoint. Native SOL reports the taker's pre/post lamports, net delta, and delta after subtracting the network fee only if the taker paid it. Rent, tips, and unrelated instructions remain included. Therefore a SOL leg never produces an attributed execution price. SPL token rows must expose a recognized Token Program or Token-2022 program ID; program IDs are included in the returned facts. Token-2022 transfer-fee extensions are reported as observed wallet balance deltas, not gross transfer amounts.

## Issue a signed execution receipt

`POST /api/v1/execution/solana/receipt` accepts the same body as `/collect`. It returns an Ed25519-signed `insight.solana-execution-receipt.v1` envelope, the public signer key, and a SHA-256 context commitment over the complete canonical signed envelope. The signed scope and the facts' `fillScope` identify the wallet-level measurement. The signature authenticates Insight's observation statement; it does not make RPC data cryptographically trustless or prove venue-specific execution semantics.

Configure `INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED` as a dedicated 32-byte Ed25519 seed encoded as 64 hex characters. Keep this key independent from the EVM receipt signer. Consumers must pin the public key through a trusted channel; the key returned beside an evidence item is not, by itself, a trust anchor.

## Simulate before signing

`POST /api/v1/execution/solana/simulate` accepts a fully serialized base64 legacy, v0, or v1 transaction and an `expectedMessageHash`. The server checks mainnet-beta, requires every signature slot to be zero, simulates with confirmed commitment and signature verification disabled, compares the exact wire message hash, then signs an `insight.solana-simulation-receipt.v1` envelope. The receipt includes the simulation slot, logs (bounded), units, fee and result. Simulation does not guarantee that the eventual transaction will land or see the same account state.

The PriorSeal SDK's `hashSolanaTransactionMessage()` computes the same SHA-256 message hash from its normalized compiled message. Pass that as `expectedMessageHash`. Add the returned commitment to a PriorSeal intent as a context commitment, with `namespace` `insight.solana-simulation-receipt.v1`, `algorithm` `sha256`, and the returned digest. The commitment binds the whole signed Insight receipt to the authorization; it does not prove that simulation state will remain unchanged.

## Offline verification

Save the returned `receipt` JSON and verify its signature, schema, payload and independently pinned public key without an RPC call:

```sh
npm run verify:solana-evidence -- ./solana-receipt.json <trusted-ed25519-public-key-base58>
```

For `/collect`, no signer is involved. For signed endpoints, missing or invalid signer configuration returns HTTP 503. `EXECUTION_RPC_0` accepts a comma-separated list of Solana mainnet-beta endpoints; each endpoint is checked against the mainnet genesis hash.

For prior authorization bound to the complete Solana transaction message, use the Solana transaction profile in [PriorSeal](https://github.com/imokokok/PriorSeal/blob/main/docs/integrations/solana.md). Arbitrary Solana program semantics are not decoded by either endpoint.
