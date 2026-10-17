# elizaos-plugin-oracle-insight

ElizaOS plugin for [Insight](https://www.oracleinsight.xyz/) — pre-trade decision-input integrity for onchain AI agents. Before your agent signs a trade, it can ask Insight whether the price it relies on is trustworthy: a multi-provider oracle consensus check with an oracle-manipulation-aware verdict (PASS/WARN/BLOCK), paid per call via x402 v2 in USDC, and backed by a verifiable EIP-712 attestation.

## What it adds to an agent

| Surface  | Name                         | What it does                                                                                                                                                                                              |
| -------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Action   | `INSIGHT_PRE_TRADE_CHECK`    | Runs `GET /api/v1/safety/pre-trade` for an asset pair + chain (+ optional trade size). Returns the verdict, reason codes, and warnings. Pays the 0.02 USDC fee via x402 when a payment key is configured. |
| Action   | `INSIGHT_VERIFY_ATTESTATION` | Verifies the returned EIP-712 attestation against Insight's published attester via the free `POST /api/v1/safety/attestation/verify` endpoint.                                                            |
| Provider | `insight`                    | Surfaces the session's recent check results into agent state so the planner can reason about them.                                                                                                        |

## Install

```bash
npm install elizaos-plugin-oracle-insight
```

Add the plugin to your character config:

```json
{
  "plugins": ["elizaos-plugin-oracle-insight"]
}
```

## Configuration

Runtime settings (or environment):

| Key                               | Required        | Meaning                                                                                                                                                       |
| --------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ORACLE_INSIGHT_BASE_URL`         | no              | Defaults to `https://www.oracleinsight.xyz`.                                                                                                                  |
| `ORACLE_INSIGHT_X402_PRIVATE_KEY` | for paid checks | The agent's payment key. Each check pays 0.02 USDC (+ network gas) from this key. Without it, a check surfaces the 402 with setup guidance instead of paying. |
| `ORACLE_INSIGHT_X402_NETWORKS`    | no              | Comma-separated CAIP-2 list the agent can pay from. Default: `eip155:8453,eip155:1,eip155:10,eip155:42161,eip155:137,eip155:143`.                             |

Payment-network notes:

- The key needs a USDC balance on at least one of the configured networks (and a little native gas).
- BNB Smart Chain (`eip155:56`) is deliberately not in the default set: Insight's BNB settlement uses the AEON facilitator mandate flow (no on-chain EIP-3009), which the stock `@x402/evm` client scheme does not sign. Pay from another supported network.
- Use a dedicated agent payment key with a bounded balance — the agent can move funds it holds. Do not point it at a treasury key.

## Usage

The model sees the actions and calls them when a user asks things like:

> "Check whether the ETH/USDC price is safe on base before I swap $50,000."

Or structured via options:

```json
{ "asset": "WETH/USDC", "chainId": 8453, "action": "swap", "tradeAmountUsd": 50000 }
```

The handler returns a compact verdict text (`PASS`/`WARN`/`BLOCK` + reason codes + warnings) and attaches the full machine result (`data`) for downstream tools.

## Verdict semantics

- `PASS` — decision input is sound: multi-provider quorum, operator independence, bounded quote age.
- `WARN` — usable but degraded; read the reason codes before proceeding.
- `BLOCK` — the price is not trustworthy right now (manipulation symptoms or insufficient consensus). Do not trade against it.

Every paid check returns an EIP-712 attestation (26 signed fields, 600 s validity window) that any third party can verify offline or via `INSIGHT_VERIFY_ATTESTATION`.

## Build

```bash
npm install
npm run build
```

The plugin targets `@elizaos/core >= 1.x` (peer dependency) and the x402 v2 spec used by Insight's paid tier.
