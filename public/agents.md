# agents.md — Insight for autonomous agents

Insight returns a **pre-trade risk verdict** for one proposed onchain action: is the price data the action relies on trustworthy? Multi-provider oracle consensus (13 providers, 40+ chains), manipulation-risk scoring, and feed health, condensed into a single `PASS / CAUTION / DANGER / BLOCK` verdict, optionally bound to a verifiable EIP-712 (EVM) or Ed25519 (Solana) attestation.

Advisory only. Insight never signs, broadcasts, or enforces — the calling agent owns every decision (`insightDoesNotEnforce: true` on every response).

## Start here

| File                                                                            | What it is                                                                      |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [`/.well-known/x402.json`](https://www.oracleinsight.xyz/.well-known/x402.json) | Discovery manifest: every paid resource, input schema, prices (source of truth) |
| [`/llms.txt`](https://www.oracleinsight.xyz/llms.txt)                           | Full resource catalog with one-line usage notes                                 |
| [`/skill.md`](https://www.oracleinsight.xyz/skill.md)                           | Complete integration manual (reviewed profiles, evidence grading, skills)       |
| [`/openapi.json`](https://www.oracleinsight.xyz/openapi.json)                   | OpenAPI 3.1 contract                                                            |
| [`/auth.md`](https://www.oracleinsight.xyz/auth.md)                             | Trust layer: how to verify attestations, dual-track auth, boundaries            |

## Fastest first call (no signup, no API key)

```http
GET https://www.oracleinsight.xyz/api/v1/safety/pre-trade?asset=ETH&chainId=1&action=swap&tradeAmountUsd=1000
```

The response is `402 Payment Required` with a quote. Pay with an x402 v2 client (EVM `exact` or SVM `exact`, USDC), retry with the payment header, and receive the verdict JSON. MCP hosts: `POST /api/mcp` (`initialize`, `tools/list`, `ping` are free; `tools/call` is paid per call) or `npx -y --package=oracle-insight-mcp insight-mcp`.

## Pricing

Per-call, USDC: $0.002–$0.040 per call by metering class (C1–C4). The flagship pre-trade risk verdict is C3 / $0.02. A `BLOCK` verdict is a complete check and is charged; partial-data responses are downgraded to `unavailable` and never charged. Verifying an existing attestation is always free.

## Verify a verdict (free, offline)

Paid responses carry a signed attestation (`attestationUid`). Re-verify it without credentials:

- `POST https://www.oracleinsight.xyz/api/v1/safety/attestation/verify` — server re-derives the EIP-712 domain and validates the signature
- `GET https://www.oracleinsight.xyz/api/v1/safety/attestation/verify` — attester identity and schema versions
