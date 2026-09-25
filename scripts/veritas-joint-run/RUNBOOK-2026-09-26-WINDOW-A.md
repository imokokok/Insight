# VERITAS window A operator card — 2026-09-26

Window A is Insight's selection from VERITAS's 2026-09-25 proposal. It is not a
confirmed live window until the selection is delivered and VERITAS responds
with this window's fresh checks, cutoffs and `VERITAS_READY`.

## Before the window

1. Confirm the production serving commit and protected Quality Gate deployment.
   Re-run the full WETH/USDC production path on that commit if it has changed:
   fresh signed source and destination gates, then a rule-selected pool event
   and a production-role v5 Execution Receipt. The rehearsal does not start a
   joint-run attempt or authorize either chain broadcast.
2. Check current activation set v3, VERITAS policy v2, v5 issuer metadata,
   current signing key and receipt verification. Reject a changed mapping or
   unreachable issuer. Preserve the original gates, issuance response,
   selected event witness, transaction receipt and verification responses.
3. Recheck the Bitcoin funding output, confirmations and fee level; Ethereum
   balance, latest/pending nonce, base fee, read and send endpoints; and both
   chains' current state. Compare VERITAS's independent fresh readings.
4. Keep the existing email thread open. Receive a complete window-specific
   `VERITAS_READY`. Its cutoffs must be reissued for this window. Prior READY,
   gates, retry requests and cutoffs are invalid.

## Window and attempts

- `2026-09-26 02:00–03:00 UTC` = `10:00–11:00 Asia/Shanghai`.
- Exact runId: `insight-veritas-2026-09-18`; attempts 3 through 7, maximum five
  fresh pairs, approximately eleven minutes apart.
- Minute 44 (02:44 UTC): last gate request. Minute 47: no new Bitcoin
  broadcast. Minute 55: conclude attempts. Minute 60: publish records.
- Attempt 3 requires the window to be open and its valid `VERITAS_READY` to
  have arrived. Attempts 4–7 each require an explicit matching
  `VERITAS_RETRY_REQUEST`. Planned cycle times are not authorization.
- Never pre-sign or reuse gates. A signature starts the 600-second clock.

For a valid first attempt, record the actual READY arrival time and run:

```sh
node --import tsx scripts/veritas-joint-run/prepare-live-gate-pair.mts \
  --attempt 3 \
  --authorization VERITAS_READY \
  --authorization-received-at ACTUAL_ISO_8601_TIME \
  --confirm-run-id insight-veritas-2026-09-18
```

The operator checks the active v5 production issuer and activation set before
signing a gate, then validates both signed WETH/USDC envelopes and renders the
agreed plain-text handoff. It refuses before 02:00 UTC, at or after 02:44 UTC,
or with the wrong runId, attempt, authorization type or stale retry request.
Paste only the generated full message into the authoritative thread. For a
retry, change `--attempt` to the requested number, use
`VERITAS_RETRY_REQUEST`, and record that request's actual receipt time.

After each handoff, await VERITAS's stage message. Verify Bitcoin leaf,
OP_RETURN and canonical confirmation, then the Ethereum ordering commitment
in block E, and select only the first qualifying later event. Issue the v5
selected-event receipt through the checked production issuer and return its
complete envelope plus the unsigned event witness. Publish every abort and
txid under the existing agreement. F12 remains open unless Bitcoin
confirmation, Ethereum ordering, settlement selection, a verified receipt and
the final package all complete.
