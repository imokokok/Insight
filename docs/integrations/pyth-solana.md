# Pyth Core on Solana

Insight reads the reviewed Pyth-sponsored Solana mainnet feed catalogue
directly from Solana RPC. It does not use a trading route, a DEX quote, or an
unauthenticated Hermes response as the price source.

## Catalogue scope

At the catalogue verification date (2026-10-25), the implementation contains
all 64 feeds in Pyth's Solana sponsored section:

- 46 USD-denominated price feeds, which can participate in the normal
  USD-price discovery path when their chain and provider gates allow it.
- 18 `.RR` reference-rate feeds, which are retained as inspectable evidence
  but excluded by Insight's USD-feed predicate so a ratio cannot be presented
  as an absolute USD price.

The finite registry lives in
`src/lib/oracles/constants/pythSolana.ts`. A symbol is never converted into an
arbitrary Pyth lookup: only an ID in that committed registry is readable.

## Verification performed on every live read

For each feed, Insight derives the Pyth Core shard-0 PDA from the reviewed
feed ID and reads it with `getMultipleAccounts` at `confirmed` commitment. It
then rejects the observation unless all of these hold:

1. The RPC reports Solana mainnet-beta's exact genesis hash.
2. The account address is derived from the original Pyth Core Push Oracle
   program, and its migrated `PriceUpdateV2` account is owned by Pyth's Solana
   Receiver program.
3. Its Anchor discriminator, fully verified update flag, and embedded feed ID
   match the expected account and registry entry.
4. `publish_time` is within two sponsored heartbeat intervals, is not too far
   in the future, and `conf / price` is at most 20%.

The resulting `PriceData.verification` retains the PDA, feed ID, observation
slot, Pyth posted slot, publish timestamp, confidence interval, and SHA-256 of
the raw account bytes. This makes a price a reproducible chain observation,
not merely an application assertion.

## Product boundaries

Pyth supplies native price evidence. Existing Solana market references remain
separate observations used for divergence and liquidity-risk analysis; neither
source replaces the other. A Pyth-only query is intentionally a one-provider
result and still cannot satisfy the multi-source execution quorum by itself.

`sync-feeds` validates all 64 accounts in a single RPC batch and activates
only feeds that pass the same live checks. The stored row carries the PDA,
Pyth program, network identity, slots and account hash. A temporary stale or
unreachable feed is not activated; it is not silently replaced with a guessed
or cached value.

## Operations

The reader resolves RPCs in this order: `EXECUTION_RPC_0`, the configured
Alchemy Solana endpoint, then the public Solana mainnet endpoint. Production
should configure a reliable Solana RPC through `EXECUTION_RPC_0`; public RPCs
are a fallback, not a freshness guarantee. A failed RPC read is surfaced as
unavailable rather than using an unverified alternative.

Sources: [Pyth sponsored feeds](https://docs.pyth.network/pro/sponsored-feeds)
and [Pyth's Solana integration guidance](https://docs.pyth.network/pro/use-prices-on-blockchain/solana).
