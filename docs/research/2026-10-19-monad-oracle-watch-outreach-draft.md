# Monad Oracle Watch — 白标外联草稿（仅草稿，未发送）

状态：DRAFT — 未发送。发送前需用户明确授权（与既有外联纪律一致）。
日期：2026-10-19。起草依据：[商业化研究报告](./2026-10-19-commercialization-strategy-research.md) §3.7（Monad 行）与本周实施的 Monad 覆盖（README「Supported Networks」）。

## 定位一句话

Insight 是独立预言机透明度与风险判定服务（非数据供给方）。Monad 主网预言机市场正在形成（Chainlink 自 2025-11-24 起 109 条 feed，官方 RDD 口径），lending/perp 协议在 Monad 上线时会做出「信哪个价」的决策——Insight 提供事前压测（pre-trade verdict）与事中监控（Oracle Watch），并把判定结果作为签名证据交付。

## 目标画像（按优先级）

1. **Monad 上的 lending 协议**（含即将部署的主流 fork 与原生协议）：定价层刚选定，风险岗通常是 1-2 人，无独立预言机风控预算。
2. **金库策展方 / 风控服务商**（在 Monad 扩张者）：需要「 feed 健康度」白标信号补足自己的参数框架。
3. **Monad 生态 DEX/perp**：新上市资产薄流动性，正是操纵高发区（见事故语料）。

## 英文外联信（Email/DM 两用，发送时按对象替换 [NAME]/[PROTOCOL]）

Subject: Independent oracle-risk layer for [PROTOCOL] on Monad

Hi [NAME],

[PROTOCOL]'s Monad deployment will trust oracle prices for every borrow and liquidation. Chainlink now publishes ~109 USD feeds on Monad mainnet (since Nov 2025), and new-chain feeds have thinner history than mature chains — which is exactly when a second, independent read is worth having.

Insight (oracleinsight.xyz) is oracle transparency and risk infrastructure, already live with:

- **Pre-Trade Safety Check** — a cross-source pre-trade verdict (PASS / CAUTION / DANGER / BLOCK) with manipulation-risk scoring and a signed EIP-712 receipt, sized as a recommended max position. Priced per call (x402, USDC) — no retainer, no integration sprint.
- **Oracle Watch** — continuous between-action monitoring (proceed / proceed_with_caution / halt) with webhook-ready recommendations, covering freshness, deviation across sources, and feed health per chain.
- **Monad coverage** — we now monitor Monad mainnet (chain 143) Chainlink feeds; public health page: https://www.oracleinsight.xyz/monad
- **Independent verification** — every verdict is a signed receipt any third party can re-verify offline (open-source verifier), not a screenshot from a dashboard.

For [PROTOCOL] specifically, a white-label Oracle Watch would give your risk page or governance forum a live, independently re-verifiable oracle-health view — branded as yours, priced by usage (from $50/mo equivalent in per-call volume for light tiers).

Context you may care about: 2026 has already seen price-manipulation incidents (Moonwell $8.7M, Nostra $3.5M, Venus bad debt) where the contracts worked but the price inputs were wrong — all caught by third parties only after the fact.

Would a 20-minute walkthrough of the Monad coverage and a sample signed verdict for one of your listed assets be useful?

Best,
[你的署名]
Insight — oracleinsight.xyz · ERC-8004 agent #375779 (BNB Chain) · x402 pay-per-call

## 发送纪律（对照既有规则）

- 不批量群发；每一封先在该协议的治理论坛/文档确认其现有 oracle 配置（用了哪家、哪些资产），把第一段的「109 条 feed」替换为对方案资产的具体观察，可显著提高回复率。
- 附件要求：无。首封信不带附件；对方回复后再发 2 页 PDF（可用研究文档改写）。
- 不承诺 SLA、不承诺数据覆盖深度以外的任何数字（覆盖是快照级 15 分钟口径，如实陈述）。
- 若对方要求联合运行（joint-run），先读 /Users/imokokok/Documents/partnerships/ 下三份规则文件再回复，并保留原始证据。

## 中文提示（给自己）

- 三个候选名（Monad 生态内）需在发送前 24h 内核实其主网状态与文档，避免引用过期信息；本草稿刻意不点名，以免档案过期。
- 首信不要提「白标定价 $50/mo」之外的数字；quorum/v3 gate 定价按 safety check 单次价目另谈。
- 发送动作本身需要你手动完成或明确授权我执行；我不会代发。
