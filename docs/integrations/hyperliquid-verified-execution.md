# Hyperliquid verified execution

Insight exposes Hyperliquid as a `venue` implementation of the shared
execution-adapter contract. It is not a separate trading product or page.
The same prepared-execution envelope used by EVM and Solana adapters carries
the preflight result, user-controlled signing boundary, evidence pointers and
portable `execution.commerce.v1` terms.

## Commercial sequence

1. Call `prepare_hyperliquid_perp_order` with the ordinary IOC limits and, if
   desired, an explicit `builderFee` policy.
2. The response includes an unsigned `approveBuilderFee` action for the
   Hyperliquid **main account** plus a separate unsigned IOC order. The order
   only includes its `builder` field when the fee was explicitly requested.
3. The user-controlled wallet signs and submits the approval (if needed),
   then signs and submits the exact short-lived order envelope. Insight has no
   wallet key, nonce allocation or submission authority.
4. Call `verify_hyperliquid_perp_execution` with the original expected order
   and fee policy. Insight returns an observed-fill fee estimate labelled
   `VENUE_RECONCILIATION_REQUIRED`; it is not a claim of builder payout.
5. Bind the same commercial terms to a PriorSeal authorization using the
   `execution.commerce.v1` context commitment when an independently
   verifiable authorization/execution receipt is required.

`feeTenthsOfBasisPoint: 10` represents one basis point. The perps adapter
refuses a rate or maximum above 100 tenths of a basis point (10 bps), refuses a
per-order rate above the disclosed maximum, and binds the exact builder field
into its preflight intent digest.

## Billing boundary

Existing Insight API-key plans, credits and x402 MCP calls meter the
preflight, observation and evidence services. Hyperliquid's builder fee is a
separate venue-native charge that is visible before signing. Neither service
payment nor a builder-fee approval gives Insight a right to submit or modify
an order.
