# Hyperliquid Perp Guard — research and design (2026-11-03)

Status: shipped as `feat/hyperliquid-perp-guard` (Track A2 of the 2026-11-03 next-phase
roadmap). This document records the design decisions made before implementation so the
next guard family (or a v2) can reuse them.

## Goal

Extend the perp guard family from Base (Synthetix Perps V3) to the venue that carries
most perp volume agents actually want: Hyperliquid L1. The guard delivers the same
contract as the Base perp guard — a read-only ALLOW / CAUTION / BLOCK decision over
caller-declared post-action USD values, plus a portable, exact-binding decision
attestation — without custody, signing, or submission.

## Key design decisions

1. **Oracle consensus runs on canonical mainnet feeds, disclosed.** Hyperliquid is not
   an EVM chain in the evidence-blockchain registry, so the underlying (BTC/ETH) and
   USDC margin checks use chainId 1 cross-oracle consensus. Consensus prices are
   chain-agnostic for these majors; the result discloses that basis rather than
   pretending Hyperliquid was the consensus source.
2. **The venue's own oracle becomes a checked counterparty, not a trusted input.** The
   guard reads the Hyperliquid market state (mark, oracle price, book, live max
   leverage) through the existing dex evidence layer and compares the venue oracle
   price with Insight's cross-oracle consensus: divergence ≥ 1% escalates to CAUTION,
   ≥ 5% BLOCKs. The exchange's mark/oracle divergence has its own reviewed bands
   (≥ 100 bps CAUTION, ≥ 1000 bps BLOCK). Venue unavailability is disclosed and never
   changes the verdict, matching the established degradation pattern.
3. **Leverage binds to the lower of the reviewed profile and the live venue limit.**
   Static reviewed caps (BTC 40x, ETH 25x) are capped by the freshly observed
   `maxLeverage`; when governance lowers the live limit the guard follows and says so
   (`maxLeverageSource: reviewed-profile-capped-by-live-venue`). The 90%-of-cap
   CAUTION band and conservative-max-size math mirror the Base guard.
4. **HYPE is out of the reviewed set.** The cross-oracle corpus does not yet carry
   sufficient independent coverage for HYPE on a canonical feed; it fails closed with
   "not in the reviewed market set" instead of shipping a weaker consensus basis.
5. **Exact binding targets the unsigned exchange envelope, not calldata.** Hyperliquid
   orders are not EVM transactions, so the Base EIP-712 `calldataHash` binding has no
   subject. The binding instead commits to the exact unsigned IOC envelope produced by
   the reviewed preflight: one order, IOC-only, `reduceOnly: false`, grouping `na`,
   builder fee within the venue cap, expiry inside the reviewed 5–120 s window. The
   `intentHash` is keccak256 over the canonical envelope JSON; the signer's fresh nonce
   is deliberately excluded so the user's local signing flow is unaffected.
6. **Notional consistency, enforced.** The envelope's implied notional (size × price)
   must stay within 10% of the assessed declared size, otherwise the binding fails
   closed and the caller must re-assess. BLOCK verdicts can never be bound.
7. **The attestation domain is Insight's (EVM chainId 1), the subject is non-EVM.**
   `HyperliquidPerpGuardDecision` signs `decisionHash`, `intentHash`, `coin`,
   `assetIndex`, `size`, `isBuy`, `builderFeeTenths`, verdict, and validity window with
   the same attester key registry as the Base guard. The asset index is carried
   verbatim from the same fresh market read (Hyperliquid can reindex markets; it is
   not validated against a static table but is committed to, so any change breaks the
   binding). Verification re-binds the envelope and re-checks every field, expiry,
   uid, signature, and attester trust. Insight signing is evidence only; the user's
   authorization (PriorSeal) still has to bind the same `decisionHash` to the same
   envelope.
8. **REST-first x402, MCP fail-closed on HyperCore.** The REST route
   `/api/v1/safety/hyperliquid-perp-guard` is paid through the merchant-configured
   x402 rail like other assessment routes. The two MCP tools
   (`hyperliquid_perp_guard`, `hyperliquid_perp_guard_exact_call`) are venue-bound and
   therefore declare the `hypercore` payment scope, which stays fail-closed for
   keyless MCP payment until the HyperCore verify/settle lifecycle lands — API-key
   callers are unaffected. Metering: C3 for both tools; REST `/safety/` is already C3.

## Non-goals

- No order signing, nonce management, or submission; the envelope must be signed in
  the user's wallet process exactly as bound.
- No reduce-only (position-closing) review — the guard covers opening actions.
- No resting/limit orders beyond IOC; no batch orders; no vault deposits.
- No new oracle-chain mapping for Hyperliquid; the consensus basis stays disclosed.

## Verification

- 20 new unit tests (assessment policy, venue escalation bands, live-cap clamping,
  binding rejections, attestation round-trip, tamper detection, expiry).
- Full suite green (3189 tests), tsc/eslint/prettier clean, MCP catalog regenerated,
  OpenAPI paths added (`assessHyperliquidPerpGuard`,
  `createHyperliquidPerpGuardExactDecision`, verifier).
