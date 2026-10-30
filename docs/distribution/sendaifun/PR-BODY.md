## Summary

Adds `insight-pre-trade-safety`, an Oracle-category skill for Agents that need
to assess the price inputs of a proposed onchain trade before signing.

The skill returns a `PASS`, `WARN`, or `BLOCK` safety verdict with cross-source
agreement, freshness and manipulation-risk evidence. It does not hold keys,
sign, submit a transaction, or give financial advice.

## Scope

- Remote MCP discovery is free (`initialize`, `tools/list`, `ping`).
- An assessment call is metered using the host's API-key or x402 configuration.
- A `BLOCK` result explicitly stops the proposed action.
- The package contains no credentials, executable wallet logic, or private key.

## Validation

- Skill frontmatter and install instructions are included.
- The package includes a Node 22+ no-money MCP connection check.
- No external wallet, payment, or transaction action occurs during installation.
