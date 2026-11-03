# Monad 资金申请材料草稿 — Nitro 加速器 / Monad Momentum(仅草稿,未提交)

状态:DRAFT — 未提交(E5_DRAFT_ONLY)。提交动作需用户完成或明确授权。日期:2026-10-19。依据:[Monad agent 生态研究](./2026-10-19-monad-agent-ecosystem-research.md)。

## 共用事实底稿(申请口径,英文)

以下段落可复用于两类申请;数字均为已核实口径,不得扩大。

- Product: Insight (oracleinsight.xyz) — pre-trade oracle-safety and risk infrastructure for onchain AI agents. For one trade, Insight returns a cross-provider oracle consensus verdict (PASS/WARN/BLOCK), a manipulation-risk score, max deviation, and an optional EIP-712 attestation any third party can re-verify offline.
- Monetization: pay-per-call API, $0.02 per pre-trade check in USDC via x402 v2; settlement networks include Base, Polygon, Arbitrum One, Monad (eip155:143), BNB Chain, Solana. Pay-per-call billing verified end-to-end on-chain (63 settled transactions since 2026-10-06); no external funding to date; no token.
- Monad traction: among the first x402 paid APIs on Monad mainnet; ERC-8004 agent registered on Monad mainnet (agentId 10414); daily on-chain reputation anchoring cron live with dual-chain routing (eip155:143 → Monad); 51 Chainlink USD feeds on Monad monitored with 15-minute sampling; MCP endpoint for agent-native access.
- Team: solo founder YuTao Peng. Prior shipped products (PriorSeal — verifiable evidence space; a prediction-market application); Monad hackathon prize winner. 6 months professional frontend experience; ships production systems solo (payments, cron infra, ML pipeline).
- Why Monad: Monad Foundation's thesis that agent payments must settle into a real onchain economy is exactly the market Insight sells into — agents that hold balances and trade on Monad need a trustworthy-price check before acting. Insight is already wired into Monad's agent stack (x402 on eip155:143, ERC-8004 #10414, MCP).

## Nitro 加速器

已知口径(2026-10 报道):总额 $7.5M、最高 $500K/队、15 队、3 个月(NY+远程)、execution-first、面向已获融资或自筹且能快速执行的团队。**申请入口未核实——发送前先在 Nitro 官方渠道确认表单与条款(股权/代币/SAFE 结构未知,不预填)。**

拟答「What will you use the funding for」:

- Scale the pay-per-call API surface: multi-chain oracle coverage expansion (deepen Monad feed coverage alongside existing chains), higher-frequency sampling, and the Oracle Watch monitoring tier.
- Distribution into Monad's agent stack: API Hub listing, integrations with hosted agent platforms on Monad, and agent-platform SDKs (ElizaOS plugin already live).
- Productize the ERC-8004 reputation/validation layer: trust scoring and signed validation for Monad agents, positioning for the Validation Registry the Monad docs mark as coming soon.

拟答「Traction to date」(2026-10-19 从生产库 `x402_settlements` 实测,如实口径):

- Billing rail live since 2026-10-06 (~2 weeks): 63 settled pay-per-call transactions, $1.22 USDC total (58 on Base, 1 Polygon, 1 Arbitrum, 3 Base Sepolia testnet). Early but real: users pay per call, settlement confirmed on-chain.
- Monad (eip155:143) settlements: **0 so far** — infrastructure is live (x402 advertised on eip155:143, ERC-8004 agent #10414 registered, 51 Chainlink feeds monitored) but no paid usage from Monad agents yet, which is exactly the distribution gap the Monad API Hub listing and this program would close.
- MRR: ~$1 (weeks-old product; do not inflate; frame as "monetization verified end-to-end, distribution is the bottleneck").

纪律:条款未核实前不签任何东西;报道口径($500K/队)不写入申请正文,以官方表单为准;不承诺未上线功能(Validation Registry 对位属规划,标明 roadmap)。

## Monad Momentum

已知口径:官方增长计划,滚动申请、按 wave 评审(Wave 2 截止 2025-12-31、结果 2026-01-13,当前 wave 需查表单);面向「data-driven、追求可持续性、要测试特定用户获取策略」的团队([官方申请表](https://tally.so/r/gDapdl))。

拟答「What user acquisition strategy do you want to test」:

- Channel: Monad API Hub as a distribution surface for the pre-trade safety API; measure paid-call conversion from Hub-listed discovery vs. direct/organic.
- Experiment: partner with one hosted agent platform on Monad (Clawdi / Pieverse / WOOFi Starchild) to make pre-trade checks a default step in their agent trade flow; metric = paid calls per active agent per week.
- Sustainability angle: usage-based pricing ($0.02/call) already matches revenue to agent activity; no free tier, unit economics positive per call.

纪律:申请表里与增长预算挂钩的数字需用户确认后再填;wave 3 时间以表单现行文本为准。

## 提交前检查单(用户动作)

1. 核实 Nitro 官方申请入口与条款;确认是否接受 solo founder 与现有独立收入结构。
2. ~~从后台拉真实 traction 数字~~ 已完成(2026-10-19 实测:63 笔/$1.22,Monad 0 笔,已写入上文)。
3. 确认 Momentum 当前 wave 与截止日期。
4. 两项申请均不互斥,但发送节奏建议:先完成 API Hub 上架沟通(成本低、见效快),再以「已上架」作为申请叙事加分项提交 Nitro。
