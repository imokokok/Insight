# Base Perp Guard — scenario research and phased plan (2026-11-02)

Status: research + v1 shipped in this repository. Follow-up phases are planned, not committed.

## Why perps, and why Base

Perpetual futures are the largest on-chain trading category. The decision input of every perp
action is a price, and 2026 incidents show that price input — not contract logic — is the
recurring failure point:

- **Drift ($285M)**: attacker-created token, wash-traded low-liquidity pool as a price anchor,
  self-deployed oracle whitelisted as collateral feed. A single-source, non-independent feed was
  trusted. Cross-source coverage/independence checks are exactly the control that fails closed here.
- **Ostium ($23.75M)**: compromised oracle signer key submitted future-dated authorized reports.
  Feed-health and source-integrity monitoring is the relevant control.
- **HyperLiquid JELLY / HYPE wick**: structural mark-price aggregation flaws. **Out of scope** —
  adding external oracle sources does not fix a venue's internal mark aggregation, and Insight
  does not claim to.

## Base perp landscape

| Venue              | Model                                                                                                                                                    | Status for Insight                                                                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Synthetix Perps V3 | Fully on-chain perps on Base; Pyth off-chain pull oracle (SIP-285) as primary price; USDC margin; NFT accounts; gradual MEV-resistant liquidations       | **v1 target.** ~$50B+ cumulative volume on Optimism+Base; 2026 market set grew from 3 to 10 crypto perps (BTC, ETH, SOL, ZEC, XRP, DOGE, XMR, PEPE, FARTCOIN, PUMP) plus an RWA/commodities roadmap |
| Coinbase perps     | Closed consumer product in the Coinbase app                                                                                                              | Not agent-callable; not a target                                                                                                                                                                    |
| Aloe II            | Defunct                                                                                                                                                  | Not a target                                                                                                                                                                                        |
| Hyperliquid        | Off-chain venue, already covered by the existing `insight.venue.hyperliquid-perp-ioc.v1` adapter (BTC/ETH/HYPE order preflight + execution verification) | Existing capability; do not duplicate                                                                                                                                                               |

Synthetix Perps V3 is the right first profile because it is fully on-chain (composable by
agents), its primary oracle (Pyth) is one of Insight's 13 integrated providers — so the
cross-source comparison evaluates the same feed family the venue consumes — and Base is the
chain with the strongest Insight traction (most x402 settlements).

## Product fit and boundaries

Base Perp Guard v1 is a **read-only decision-input integrity gate** for opening a Synthetix
Perps V3 position on Base:

- Underlying-asset oracle integrity via the existing cross-source pre-trade check.
- Margin (USDC) peg integrity via the same check.
- Leverage band check on caller-declared post-action notional and margin, against a
  conservative reviewed per-market cap (source: `reviewed-profile`).

It does **not** evaluate the venue's mark-price aggregation, funding, or liquidation engine, and
it never signs, broadcasts, or authorizes an order. Long-tail markets (ZEC, XMR, FARTCOIN,
PUMP) are deliberately excluded from the reviewed set until cross-source coverage on Base is
adequate — exclusion is the source-independence control working as intended.

## Phases

1. **v1 (shipped with this document)**: `GET /api/v1/safety/base-perp-guard`, assessment-only,
   x402-metered, MCP tool `base_perp_guard`, docs, skill. No exact-call mode.
2. **v2 (shipped 2026-11-02)**: exact-call binding + EIP-712 decision attestation for direct
   Synthetix V3 `commitOrder` calls, following the lending-guard attestation pattern. Address
   provenance below.
3. **v3**: liquidity evidence layer for the underlying (spot/TWAP/in-range liquidity, following
   the Monad Uniswap V3 execution-market precedent), fed in as context without entering oracle
   consensus.
4. **v4**: extend the oracle-config defect-hunting pipeline to perp market configuration
   (Immunefi / governance-forum disclosure path, per the established disclosure policy).

## v2 address provenance (first-hand)

- Source: the official `@synthetixio/v3-contracts` npm package, deployment `8453-andromeda`
  (`cannon.json` timestamp 2025-05-21, omnibus package `synthetix-omnibus` preset `andromeda`
  resolved live from the Cannon registry on OP Mainnet at
  `0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba`, tag `latest`, variant `8453-andromeda`).
- `PerpsMarketProxy` = `0x0A2AF931eFFd34b81ebcc57E3d3c9B1E1dE1C9Ce`;
  `PerpsAccountProxy` = `0xcb68b813210aFa0373F076239Ad4803f8809e8cf`;
  `CoreProxy` = `0x32C222A9A159782aFD7529c87FA34b96CA72C696`.
- Cross-checked against live Base chain reads: `getMarkets()` on the PerpsMarketProxy returns
  108 markets including the reviewed ids ETH `100`, BTC `200`, SOL `400`, DOGE `800`,
  PEPE `1200`, XRP `7100`, matching the published `perpsMarkets.json`.
- Order function: `commitOrder(AsyncOrder.OrderCommitmentRequest)` with components
  `marketId uint128, accountId uint128, sizeDelta int128, settlementStrategyId uint128,
acceptablePrice uint256, trackingCode bytes32, referrer address`. The earlier
  `submitOffchainDelayedOrder` flow does not exist on the Andromeda PerpsMarketProxy ABI.

## Buyer and distribution

Primary buyer: trading agents and bots, via the existing x402 pay-per-call rail and MCP
catalog — the same distribution that produced most existing settlements on Base. Secondary:
liquidators/treasury operators reviewing leverage risk. Not a target: selling the venue's own
risk team on third-party mark-price assessment.
