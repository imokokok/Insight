# Monad API Hub 上架申请草稿(仅草稿,未发送)

状态:DRAFT — 未发送(E5_DRAFT_ONLY)。发送前需用户明确授权。日期:2026-10-19。依据:[Monad agent 生态研究](./2026-10-19-monad-agent-ecosystem-research.md)。

## 上架材料现状(全部就绪)

| Hub 目录条目要求(llms.txt 口径) | Insight 现状                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| x402 URL 基址                   | `https://www.oracleinsight.xyz`(付费端点 `/api/v1/safety/pre-trade`)                    |
| Manifest(`/.well-known/x402`)   | 已上线,x402 v2,`accepts[]` 含 `eip155:143`(Monad,Circle 原生 USDC,facilitator 代付 gas) |
| skill.md                        | 已上线:https://www.oracleinsight.xyz/skill.md                                           |
| 价格口径                        | $0.02/次(pre-trade check);MCP 按工具分级计价                                            |
| 结算                            | USDC on eip155:143 via x402 v2(EIP-3009)                                                |
| ERC-8004 身份                   | Monad 主网 agentId 10414(Reputation Registry 每日锚定 cron 已运行)                      |

## 拟提交的目录条目(按 Hub 现行格式)

```text
## Insight
Pre-trade safety for trading agents: an oracle-manipulation-aware
PASS/WARN/BLOCK verdict for one trade, computed from multi-provider oracle
consensus, with a verifiable EIP-712 attestation. $0.02 per call.
- Categories: Finance, Data, Risk
- Status: active
- Payment: USDC on eip155:143 via x402 v2
### via Insight
- x402 URL: https://www.oracleinsight.xyz
- Call: GET /api/v1/safety/pre-trade?asset=USDC&chainId=1&action=swap&tradeAmountUsd=1000
- Manifest: https://www.oracleinsight.xyz/.well-known/x402
- Skill: https://www.oracleinsight.xyz/skill.md
- OpenAPI: https://www.oracleinsight.xyz/openapi.json
- Price: $0.02 per call
- Endpoints:
  - GET /api/v1/safety/pre-trade — pre-trade oracle-safety verdict with optional signed attestation ($0.02 per call)
  - POST /api/mcp — MCP tools/call access to the Insight tool catalog (priced per tool class)
```

## 英文外联信(Discord/Email 两用,发送时替换 [NAME])

Subject: Listing Insight (pre-trade oracle safety, x402) on the Monad API Hub

Hi [NAME],

I'm building Insight (oracleinsight.xyz) — a pre-trade oracle-safety API for trading agents. Agents pay per call in USDC via x402 v2, no signup, no API key, and Monad mainnet (eip155:143) is already one of our advertised settlement networks, alongside our live Monad ERC-8004 agent (#10414).

Looking at the API Hub catalog (135 services), analytics, search, contact data and RPC reads are covered — but there is no oracle-safety/risk service yet. The gap matters now that Ankr's per-call RPC layer is live: agents can read the chain before acting, but nothing on the Hub tells them whether the price they just read is trustworthy. Ankr's own launch post names "pre-trade checks" as the first agentic-finance use case.

What Insight returns for one trade: a cross-provider oracle consensus verdict (PASS/WARN/BLOCK), manipulation-risk score, max deviation, and an optional EIP-712 attestation any third party can re-verify offline. Agent-facing docs: https://www.oracleinsight.xyz/skill.md · discovery manifest: https://www.oracleinsight.xyz/.well-known/x402

Two questions:

1. What is the process to get a service listed on the API Hub (and the feed.json schema to conform to)? I can supply the catalog entry, manifest, and skill file today.
2. Is there anything the Foundation wants from providers beyond the x402 v2 manifest on eip155:143 (e.g., ERC-8004 registration, which we already have on Monad)?

Happy to run a live 402 flow on Monad if useful.

Best,
[你的署名]
Insight — oracleinsight.xyz · ERC-8004 agent #10414 (Monad) · x402 pay-per-call

## 发送纪律(对照既有规则)

- 首信不带附件;对方回复后再按需补目录条目或演示。
- 不声称 Monad Foundation 背书;Hub 免责条款明确「not endorsed/audited/verified」,对外表述用「已上架/可收录」而非「官方推荐」。
- 「首个 x402 收费 API」口径降格为「较早的 x402 收费 API 之一」(未获第三方证实)。
- 不承诺 SLA、覆盖率或延迟数字;覆盖为 15 分钟快照口径。
- 渠道优先级:Monad Developer Discord(官方 ERC-8004 文档给出)→ 官方 X/团队邮箱。发送动作由用户完成或明确授权后执行。
- 若 Monad 方提出 joint-run/集成演练,先读 /Users/imokokok/Documents/partnerships/ 下三份规则文件再回复。
