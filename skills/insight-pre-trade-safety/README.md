# Insight Pre-Trade Safety Check

This installable Agent Skill makes one thing easy: before an Agent proposes a
swap, buy, sell, borrow, lend, liquidation, or repayment, it can obtain an
oracle-manipulation-aware safety decision from Insight.

## Tool mapping

Every Skill in this directory resolves onto one of Insight's **four canonical
MCP product tools**. The canonical tool names are stable through 2027-01-06;
the deprecated alias names (e.g. `check_trade_safety`, `prepare_swap`) are
equivalent until that same date.

| What you want to do                 | Canonical MCP tool    | `op` selector          | Deprecated alias (until 2027-01-06) |
| ----------------------------------- | --------------------- | ---------------------- | ----------------------------------- |
| Pre-trade oracle safety gate        | `trade_guard`         | `check_safety`         | `check_trade_safety`                |
| Prepare an exact swap call          | `trade_guard`         | `prepare_swap`         | `prepare_swap`                      |
| Prepare a perpetual order           | `trade_guard`         | `prepare_perp_order`   | `prepare_perp_order`                |
| Verify a signed execution receipt   | `trade_proof`         | `verify_evidence`      | `verify_evidence`                   |
| Continuous oracle health monitoring | `oracle_watch_window` | `snapshot` / `history` | `oracle_watch`                      |

**Base/Monad Aave V3 lending direct calls** — use the dedicated
[`insight-lending-guard`](../insight-lending-guard/README.md) Skill which wraps
`trade_guard op: check_safety` with lending-specific parameter defaults.
**Base Synthetix Perps V3** — use
[`insight-base-perp-guard`](../insight-base-perp-guard/README.md) (same canonical
tool, different guard family).

## Quick install

1. Add the remote server in [`mcp.json`](mcp.json) to an MCP-compatible host.
   The template sends `x-insight-entry-source: skill`, an optional bounded
   label used only for aggregate conversion analysis.
2. Run `node examples/connection-check.mts` using Node 22+ to confirm free
   `initialize` and `tools/list` discovery.
3. Add an API key in the host's secret manager **or** configure an x402 client
   in your own server-side runtime. Never put a credential or private key in
   this package, an Agent prompt, or browser code.
4. Ask the Agent one of the prompts in
   [`references/action-prompts.md`](references/action-prompts.md).

## Minimal TypeScript example

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Pre-trade safety gate via the canonical product tool.
// Insight runs streamable HTTP at https://www.oracleinsight.xyz/api/mcp
// (or http://localhost:3001/api/mcp for local dev).
async function checkTradeSafety() {
  const transport = new StreamableHTTPClientTransport('https://www.oracleinsight.xyz/api/mcp', {
    headers: {
      'X-API-Key': process.env.INSIGHT_API_KEY ?? '',
    },
  });
  const client = new Client({ name: 'my-agent', version: '1.0.0' });
  await client.connect(transport);

  const result = await client.callTool({
    name: 'trade_guard',
    arguments: {
      op: 'check_safety',
      action: 'swap',
      symbol: 'ETH',
      chain_id: 8453,
      amount: '1000',
      venue: 'uniswap_v3',
    },
  });
  console.log(result.content); // PASS / CAUTION / DANGER / BLOCK + reasons
  // result.content[].text carries the advisory verdict + boundary note.
}

checkTradeSafety().catch(console.error);
```

Using the deprecated alias (equivalent, sunset 2027-01-06):

```typescript
// Same call, different spelling
await client.callTool({
  name: 'check_trade_safety',
  arguments: { action: 'swap', symbol: 'ETH', chain_id: 8453, amount: '1000' },
});
```

## What it does and does not do

It returns evidence about the price inputs an action would rely on. A `BLOCK`
is a complete safety answer: stop and show the reason. `PASS` or `WARN` is risk
information, not permission to trade. Insight does not custody funds, sign,
broadcast, select a route, or guarantee an outcome.

**Boundary**: Every response from Insight carries `meta.insightDoesNotEnforce: true`.
Insight never signs or broadcasts transactions, never gates or blocks execution,
never proves a price is correct. Applications and agents own the decision to
act on any verdict.

For the authorization and execution-evidence leg, use PriorSeal's
[`Guarded Action` integration](https://github.com/imokokok/PriorSeal/blob/main/docs/integrations/guarded-action.md).

## Distribution status

This is source and release-package material for the official MCP registry,
GitHub-based Agent Skill directories, and compatible remote MCP hosts. A
directory's acceptance or a wallet/payment host's approval is always separate;
see [`docs/distribution`](../../docs/distribution/README.md).
