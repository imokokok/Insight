## Proposed entry — Infrastructure / Oracle safety

- [Insight Pre-Trade Safety](https://github.com/imokokok/Insight/tree/main/skills/insight-pre-trade-safety) — MCP-native oracle-manipulation and price-integrity assessment for a proposed onchain action, returning cross-source agreement, freshness, a risk verdict, and optionally verifiable attestation before a wallet signature.

PR note: Insight is assessment-only. It does not custody assets, sign for users,
or execute a transaction. The skill supports Solana settlement where the host
has a configured compatible x402 client, while the exact Base Aave V3 direct
call profile remains a separate, explicitly constrained integration.
