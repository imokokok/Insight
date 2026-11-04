# Agent distribution funnel

The purpose of the first funnel is not to maximize anonymous tool calls. It is
to show whether an embedded Agent surface reaches a user who completes one
useful decision and can carry that decision into a bounded action workflow.

## Events

| Event                            | Meaning                                                      | Required fields                                         | Never record                                       |
| -------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------- | -------------------------------------------------- |
| `skill_install_seen`             | A package install or marketplace page was opened.            | `surface`, `skill_version`, `entry_source`              | wallet address, prompt body, API key               |
| `mcp_discovery_completed`        | `initialize` and `tools/list` completed.                     | `surface`, `mcp_version`, `entry_source`                | identity, tool arguments                           |
| `risk_check_requested`           | One safety decision request entered validation.              | `tool`, `chain_id`, `entry_source`                      | raw address, complete transaction, payment payload |
| `risk_check_delivered`           | A complete decision was returned.                            | `tool`, `verdict_class`, `payment_mode`, `entry_source` | receipt contents, payer identity                   |
| `guarded_action_handoff`         | An attested Base lending decision was exported to PriorSeal. | `profile`, `verdict_class`, `entry_source`              | authorization signature, tx hash                   |
| `receipt_verification_completed` | An evidence consumer verified a receipt.                     | `profile`, `verification_result`, `entry_source`        | receipt body, consumer identity                    |

`entry_source` is a fixed, server-side allowlist: `direct`, `docs`, `bazaar`,
`mcp`, `sdk`, `skill`, `wallet_mcp`, `sendaifun`, `solana_directory`, or
`unknown`. It is never a user-controlled free-form string. Aggregate counts by
day and source. Retain no per-user cross-surface identifier unless the user
separately consents to a documented account relationship. The existing x402
audit path records the delivered paid-decision source; installation and free
MCP discovery should remain aggregate deployment analytics until a separately
reviewed retention policy selects a durable event sink.

## First decision metrics

1. discovery completion / install seen;
2. delivered risk check / discovery completion;
3. attested Base Aave exact-call decision / delivered Base lending check;
4. Guarded Action handoff / attested decision; and
5. independently verified receipt / Guarded Action handoff.

Before enabling any additional collection, map it to an existing audit or
analytics sink, publish the retention period, and test that untrusted headers
cannot set a value outside this allowlist. This document intentionally does not
invent a new tracking endpoint or collect wallet identities.
