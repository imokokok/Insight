# Insight — Oracle Transparency & Risk Intelligence

Insight helps DeFi applications, operators, developers, and AI agents inspect oracle prices and the risks of relying on them. It compares data from **10 oracle providers across 40+ blockchain networks**, evaluates deviation, freshness, source independence, and protocol impact, and can issue signed evidence of its assessments.

```text
Oracle observations → Cross-source comparison → Risk assessment → Verifiable evidence
```

**Pre-Trade Safety Check** assesses a proposed action. **Oracle Watch** monitors changing conditions between actions. The REST API, MCP server, [Guard SDK](sdk/README.md), and [independent verifier](verifier/README.md) make these capabilities available to applications and agents. Insight also works independently of [PriorSeal](https://github.com/imokokok/PriorSeal); see the [product positioning guide](docs/product-positioning.md) for the combined assessment, authorization, execution, and review workflow.

> Insight is **not a real-time oracle tracker**. Price snapshots and feed health are collected every 15 minutes, reputation scores are recalculated hourly, and data is aggregated into daily reports. Check each assessment's freshness and validity window before using it.

## Start here

| Goal                                               | Where to go                                                                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Assess a trade from an application or agent        | [Guard SDK](sdk/README.md#non-intervening-assessment-and-verification) or [API reference](https://www.oracleinsight.xyz/docs/api) |
| Verify a signed receipt with your own trusted keys | [Independent verifier](verifier/README.md) or [browser demo](https://www.oracleinsight.xyz/verify)                                |
| Explore the product                                | [Website](https://www.oracleinsight.xyz) or [AI/MCP hub](https://www.oracleinsight.xyz/ai)                                        |
| Run the website and API locally                    | [Local development](#local-development)                                                                                           |

## What Insight provides

### Pre-Trade Safety Check

Before a swap, borrow, lend, liquidation, or repayment, an application can request a cross-oracle assessment. The response combines price agreement, deviation, freshness, stablecoin peg status, reputation, and relevant protocol risk into a **PASS, CAUTION, DANGER, or BLOCK** verdict with a recommended maximum position size. Agents should not execute when the verdict is DANGER or BLOCK.

The verdict comes from deterministic rules; experimental ML scores provide additional context but do not drive it. Lending checks can freeze new borrowing when sustained oracle dispersion consumes the protocol's liquidation buffer. Successfully returned judgments are audit-logged before issuance; an audit-storage failure prevents a successful response.

When signing is configured, the check can include an EIP-712 attestation. A signature proves who issued the signed fields and whether they changed. It does **not** prove that the underlying prices were correct or that an agent obeyed the verdict. See the [verifier's supported schemas](verifier/README.md#supported-schemas) for version-specific verification requirements.

### Oracle Watch

Oracle Watch gives a running strategy a cross-oracle **NORMAL, CAUTION, or DANGER** signal and a `proceed`, `proceed_with_caution`, or `halt` recommendation. Applications can poll it between trades and pause on `halt`. It checks deviation, agreement, stale or outlying feeds, coverage, and independent source groups; it can also issue signed receipts when an attester key is configured.

Historical coverage is guaranteed for **ETH, BTC, USDC, and USDT on Ethereum, Arbitrum, and Base**. Other pairs can return a current signal without a historical curve; check `meta.historyGuaranteed` rather than treating an empty series as evidence of no incidents. Use the [AI/MCP hub](https://www.oracleinsight.xyz/ai#oracle-watch) or `GET /api/v1/oracle-watch?symbol=ETH&chain=ethereum` to explore the signal.

### Explore oracle and protocol risk

The web app also provides cross-oracle price comparison, feed health and reputation, position safety and liquidation analysis, Peg Risk for stablecoins and wrapped assets, and daily reports. Researchers can inspect source timestamps and export results; developers can use the corresponding API endpoints.

Integrated providers include Chainlink, API3, RedStone, DIA, WINkLink, Supra, Uniswap V3 TWAP, Reflector, Flare, and Band. Position safety supports selected Aave V3, Compound V3, Morpho Blue, Venus, and BENQI markets. Coverage varies by asset and chain, so confirm the available sources and protocol parameters for the position being assessed.

### SDK, API, MCP, and verifier

- **[Guard SDK](sdk/README.md)** — TypeScript integration for assessment, monitoring, and supported execution-price evidence. `assessSwap()` supports an assessment-only workflow; optional helpers can gate transaction submission and request execution receipts. The SDK uses the Insight API and its credit wallet.
- **[REST API](https://www.oracleinsight.xyz/docs/api)** — versioned `/api/v1/` endpoints for prices, risk, safety checks, and Oracle Watch. Metered calls use an `X-API-Key`; public receipt-verification endpoints do not require one. The [API reference](https://www.oracleinsight.xyz/docs/api) has request and response details.
- **MCP server** — exposes the same services to compatible agents through stdio, HTTP, or the app's `/api/mcp` endpoint. See the [AI/MCP hub](https://www.oracleinsight.xyz/ai) for client configuration and tools.
- **[Independent verifier](verifier/README.md)** — verifies receipt signatures and signed fields locally without depending on the Insight API. Consumers must independently establish trust in the attester key or key registry; successful signature verification is not an endorsement of a trade or verdict.

REST, MCP, and SDK calls draw from the same API-key credit wallet. Plans add credit capacity rather than separate feature tiers. See [current pricing](https://www.oracleinsight.xyz/pricing) for plans and per-call costs.

## Local development

Requires Node.js 22 or later. From the repository root:

```bash
npm install
npm run dev
```

See [`.env.local.example`](.env.local.example) and [`src/lib/config/serverEnv.ts`](src/lib/config/serverEnv.ts) for environment configuration. Development can run with safe defaults for missing secrets; production requires Supabase credentials, `CSRF_SECRET`, and `JWT_SECRET`. Signed pre-trade attestations require `ATTESTATION_SIGNER_PRIVATE_KEY`.

To run the MCP server separately:

```bash
npm run mcp:stdio   # local stdio transport
npm run mcp:http    # HTTP transport at http://127.0.0.1:3001/mcp
```

The application is built with Next.js, React, TypeScript, Tailwind CSS, and Supabase. App routes and API handlers live in `src/app/`; core oracle, risk, attestation, and billing logic lives in `src/lib/`; MCP code lives in `src/mcp/`. Database migrations are under `supabase/`.

## Documentation

| Topic                                        | Details                                                                                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product scope and PriorSeal relationship     | [Product positioning](docs/product-positioning.md) and [Guard SDK](sdk/README.md)                                                                                                                 |
| Receipt schemas and independent verification | [Verifier README](verifier/README.md) and [registry release policy](docs/oracle-registry-release-policy.md)                                                                                       |
| Partner protocol and release isolation       | [Mainline partner isolation](docs/mainline-partner-isolation.md) and [protocol README](protocol/mainline/README.md)                                                                               |
| Operations and data collection               | [Production readiness](docs/operations/production-readiness.md), [cron dispatcher](docs/operations/cron-dispatcher.md), and [integration reliability](docs/operations/integration-reliability.md) |
| Database changes                             | [SQL inventory and execution order](docs/operations/sql-inventory.md)                                                                                                                             |
| Experimental RWA work                        | [RWA v1](docs/rwa-v1.md), [RWA v2](docs/rwa-v2.md), and [instrument registry](docs/rwa-instrument-registry.md)                                                                                    |

RWA/tokenized-equity adaptations remain opt-in research; no production RWA signer or authorization policy is activated. The optional [Robinhood Stock Token issuer context](docs/rwa-robinhood.md) is read-only and does not count as an independent oracle source.

## License

See [LICENSE](LICENSE).
