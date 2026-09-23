# VERITAS v5 remediation evidence

This directory builds the evidence promised after window two closed as
`NO_START / NO_GATE_ISSUED` on 2026-09-23.

The candidate objects are deliberately published without changing the current
VERITAS activation. Policy v1 remains active and production-disabled. Policy v2
and activation set v3 are immutable review inputs. A later promotion may move
the activation pointer only after written bilateral acceptance.

The evidence bundle separates three facts:

1. The candidate policy admits v5 with the exact signed semantic profile.
2. Production can issue and independently verify a current production-role v5
   receipt.
3. The VERITAS partner route remains fail-closed until the candidate activation
   set is explicitly promoted.

Generate the final online evidence only after the publication commit has passed
CI and the production endpoints expose the candidate content-addressed objects.
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
