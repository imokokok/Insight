# Insight Pre-Trade Safety Check

This installable Agent Skill makes one thing easy: before an Agent proposes a
swap, buy, sell, borrow, lend, liquidation, or repayment, it can obtain an
oracle-manipulation-aware safety decision from Insight.

## Quick install

1. Add the remote server in [`mcp.json`](mcp.json) to an MCP-compatible host.
2. Run `node examples/connection-check.mts` using Node 22+ to confirm free
   `initialize` and `tools/list` discovery.
3. Add an API key in the host's secret manager **or** configure an x402 client
   in your own server-side runtime. Never put a credential or private key in
   this package, an Agent prompt, or browser code.
4. Ask the Agent one of the prompts in
   [`references/action-prompts.md`](references/action-prompts.md).

## What it does and does not do

It returns evidence about the price inputs an action would rely on. A `BLOCK`
is a complete safety answer: stop and show the reason. `PASS` or `WARN` is risk
information, not permission to trade. Insight does not custody funds, sign,
broadcast, select a route, or guarantee an outcome.

For an exact Base Aave V3 lending direct call, install the companion
[`insight-lending-guard`](../insight-lending-guard/README.md) Skill. For the
authorization and execution-evidence leg, use PriorSeal's
[`Guarded Action` integration](https://github.com/imokokok/PriorSeal/blob/main/docs/integrations/guarded-action.md).

## Distribution status

This is source and release-package material for the official MCP registry,
GitHub-based Agent Skill directories, and compatible remote MCP hosts. A
directory's acceptance or a wallet/payment host's approval is always separate;
see [`docs/distribution`](../../docs/distribution/README.md).
