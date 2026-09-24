# VERITAS v5 remediation evidence

This directory builds the evidence promised after window two closed as
`NO_START / NO_GATE_ISSUED` on 2026-09-23.

The original remediation bundle was captured before activation. At that point,
policy v1 remained active and production-disabled, while policy v2 and
activation set v3 were immutable review inputs. After VERITAS's written
candidate position and the fresh WETH/USDC production rehearsal with a
price-gradeable receipt, promotion v17 explicitly moved the activation pointer
to set v3. The pre-activation bundle remains a historical snapshot; it must
not be read as the current activation state after promotion. A new joint-run
window still requires window-specific READY and fresh gates.

The evidence bundle separates three facts:

1. The candidate policy admits v5 with the exact signed semantic profile.
2. Production can issue and independently verify a current production-role v5
   receipt.
3. Before promotion, the VERITAS partner route remained fail-closed. The
   historical bundle proves that boundary; the later v17 promotion is a
   separate governance event.

For the fresh WETH/USDC rehearsal, capture and offline verification also require
both signed gates to say `PASS`, the settlement block time to fall inside both
gate windows, and the production receipt to sign `FAITHFUL` with a positive
executed price within 1 bps of the selected pool event. A `BLOCK` gate or an
`UNDETERMINED` receipt is retained as a failed attempt, never packaged as a
successful rehearsal.

The command below reproduces the pre-activation capture workflow only when a
pre-activation deployment is being examined. It is not a way to recreate the
historical bundle against the post-promotion current pointers. The original
online evidence was generated after the publication commit passed CI and the
production endpoints exposed the candidate content-addressed objects.
The generator creates a temporary Enterprise API key for the configured ops
owner, uses it only for the evidence run, revokes it in a `finally` block and
never writes the plaintext key to disk or stdout.

```bash
node --env-file=.env.local --import tsx \
  scripts/veritas-remediation/capture-live-evidence.mts \
  --output /private/tmp/insight-veritas-v5-remediation

node --import tsx \
  scripts/veritas-remediation/verify-evidence.mts \
  /private/tmp/insight-veritas-v5-remediation
```

The email-safe archive is produced only after verification. Executable source
is copied with a `.txt` suffix because Gmail blocks JavaScript-family source
even when it is nested in a zip.
