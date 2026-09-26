# VERITAS selected-event receipt pricing

The pinned selection rule remains `anchored-settlement-selection-rule-v2.json`.
For the event it selects, send `txHash` and its global `logIndex` as
`selectedSwapLogIndex` to the production Execution Receipt issue endpoint. The
issuer checks that the log belongs to that transaction, comes from the pinned
Ethereum Uniswap V3 USDC/WETH 0.05% pool, is a WETH-to-USDC Swap, and meets the
rule's 0.1 WETH minimum. It derives `executedPrice` from that log's signed
`amount0` and `amount1`, rounded at scale 8. It rejects an absent or mismatched
log; it does not substitute another event or sum the taker's other transfers.

Both signed pre-trade gate originals are required. Their source and destination
`consensusPrice` values determine the quote as source divided by destination.
The signed `quoteBasis` is `ORACLE_CONSENSUS` and `quoteBlockNumber` is `0`:
there is no single pool block from which this two-gate cross-rate was read.
`priceStateAgeAtExecSeconds` is `0` because the gates do not establish a single
pool-state observation time. Each gate's signed `checkedAt` and `validUntil`
still bound settlement independently. `quoteVenueIndependent` remains false
for this rehearsal because the source consensus includes a TWAP from this pool.

The signed v5 receipt contains `txHash`, `executedPrice`, both gate UIDs and the
gate-set commitment. Its existing layout does **not** contain `logIndex`. The
issuance response separately returns `selectedEvent` with the index, pool and
raw amounts. Preserve that response, the pinned rule, and the selected raw log
beside the signed receipt so a reader can independently identify the event and
recompute the price. Do not claim that v5 cryptographically signs the log index.
The rule and Bitcoin/Ethereum commitment preimages do not change.

The 2026-09-25 rehearsal receipts remain immutable historical records. The
original Attempt 1 `DEVIATED` result measured the taker's whole multi-swap
transaction; its selected log 14 was inside the 50 bps band. A newly issued
receipt for that log is a distinct historical receipt and is expired as a live
attestation even if its signed price verdict is `FAITHFUL`.
