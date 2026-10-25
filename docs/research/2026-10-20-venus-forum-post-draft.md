# Venus Forum Post Draft — 2026-10-20

> 发帖位置：community.venus.io → General Discussion → Venus Discussion
> 状态：待用户粘贴发布

---

## 标题（Title 栏填这个）

```
[Community Analysis] When Every Oracle Agrees on the Wrong Price — Replaying the March 15 THE Market Incident as a Decision-Input Failure
```

## 分类（Category）

General Discussion → **Venus Discussion**（不要选 Proposals，不要留 Uncategorized）

---

## 正文（直接粘贴到编辑器，Discourse 原生支持 Markdown）

Hello Venus community,

I run **Insight** ([oracleinsight.xyz](https://oracleinsight.xyz)) — an independent oracle-transparency and risk-infrastructure project. I've read the official [THE Market Incident Post-Mortem](https://community.venus.io/t/the-market-incident-post-mortem/5712), the [Multi-chain Patch Fix](https://community.venus.io/t/multi-chain-patch-fix-for-the-market-donation-attack/5718), and the [Bad Debt Repayment proposal](https://community.venus.io/t/bnb-chain-the-market-bad-debt-repayment/5719), together with third-party on-chain analyses.

The post-mortem already explains the attack mechanics well. This post is complementary: we replayed the incident the way our monitoring system sees it — as a **decision-input failure** — and reconstructed what was visible on-chain, and when. We're sharing it here because the most useful lessons live in the details that did _not_ make the headlines.

###### TL;DR

- The March 15 incident was two failures stacked, not one: a **supply-cap bypass** (contract layer) _and_ an **oracle convergence on a manipulated price** (decision-input layer).
- The Resilient Oracle actually _rejected_ the manipulated spike for ~37 minutes. The failure was not that the oracle was blind — it's that sustained multi-venue buy pressure eventually made **every aggregated feed agree on the wrong price**.
- 254 liquidation bots competed across 8,048 transactions and still left **~$2.15M** in bad debt, because nominal collateral value ≠ realizable liquidation value.
- All three early-warning signals were on-chain and machine-readable: one for **months**, one for **37 minutes**, one for the entire borrowing window.

###### What happened, compressed

All times UTC, Mar 15, 2026. Figures from the official post-mortem and BlockSec's analysis.

| Time                | Event                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jun 2025 – Mar 2026 | Attacker accumulates ~12.2M THE on Venus — **84% of the 14.5M supply cap** — funded via Tornado Cash → Aave → $9.92M stables. Visible on-chain the entire time.              |
| ~11:55              | Attack contract donates ~36M THE directly to the vTHE contract, bypassing `mint` and its cap check. Exchange rate inflates **3.81×**.                                        |
| ~11:55–12:32        | Binance feed spikes toward ~$4 on thin liquidity. **BoundValidator reverts for ~37 minutes** — the oracle refuses the price.                                                 |
| ~12:32              | Sustained buy pressure drags the RedStone aggregation up; **both feeds converge at ~$0.51**. The oracle accepts. Protocol now values THE collateral at the manipulated rate. |
| 12:00–12:42         | Borrow→swap→donate loop drives supply to **53.2M THE — 367% of cap**. ~$14.9M borrowed against it.                                                                           |
| ~12:42 onward       | Buying stops; price collapses to ~$0.22 (below pre-attack $0.26). 254 bots, 8,048 liquidation txs, ~42M THE unwound — **~$2.15M bad debt remains**.                          |
| After               | Bad debt (~$2.2M incl. prior accumulated) covered from Treasury via VIP; multi-chain patch enforces cap checks on all balance increases, not just `mint`.                    |

###### Two failures, not one

**1. The contract layer: a cap that only counted one door.** Supply caps were enforced in `mintAllowed()`, but `getCashPrior()` reads the raw token balance. A direct transfer — never touching `mint` — inflated the exchange rate without any cap check. Worth underlining: this exact vector was flagged in the 2023-05 Code4rena audit and assessed as having no negative side effects. The post-mortem's own takeaway is right: any mechanism that circumvents a safety parameter is an attack vector, audit verdict notwithstanding. The patch fix addresses this the correct way — checking every balance increase, not just the mint path.

**2. The decision-input layer: when every oracle agrees on the wrong price.** This is the part we study. The Resilient Oracle (RedStone primary, Binance pivot) did _not_ fail by being naive — the BoundValidator rejected the diverging Binance feed for ~37 minutes. That's the system working. The failure came later: the attacker spread buy pressure across enough venues in the aggregation that both feeds converged at ~$0.51, and the validator accepted a price that no realizable orderbook could support.

The lesson is uncomfortable: **multi-source aggregation and deviation guards raise the cost of manipulation — they don't remove it.** If an attacker can sustain pressure across the venues you aggregate, consensus becomes the attack surface. Valuation of thin-liquidity collateral needs a fourth input alongside price feeds: **realizable depth** — how much of the collateral can actually be exited near the reported price. A market that can absorb $1M of selling cannot safely back $12M of borrowing power, no matter what the feed says.

###### Why liquidation didn't save it

The liquidation market worked exactly as designed — and it wasn't enough. 254 distinct liquidators competed across 8,048 transactions, repaying ~$12.0M of the ~$14.9M borrowed. The remaining ~$2.15M stayed bad because the seized collateral was THE, and THE's realizable depth was a fraction of its oracle-reported value. Liquidators don't rescue a protocol from a valuation error; they just convert it into whoever holds the token last. The gap between _reported_ collateral value and _realizable_ value was the bad debt, drawn out in full.

###### An honest replay: what an outside monitor would have flagged — and what it wouldn't

We replayed the public timeline against three decision-input checks. We state results and limits both, because post-mortems conducted only in hindsight flatter themselves:

1. **Concentration signal — fires for months.** One wallet holding 84% of a market's supply cap is queryable on-chain the whole time, in plain state, no special tooling required. This was the loudest and longest signal, and the cheapest one to monitor.
2. **Cross-feed divergence — fires for ~37 minutes.** Binance near $4 vs. the resilient feed near $0.5 is a screaming divergence. A monitor keyed on inter-feed spread flags this in real time; humans rarely react inside such a window. Its realistic value is triggering _automatic_ caution (e.g., suspending new borrowing against the asset), not prompting a person to act.
3. **Realizable-value gap — fires throughout.** $14.9M borrowed against collateral whose exit-depth was orders of magnitude thinner. This check runs at listing and parameter-update time, not just mid-attack.

What we **can't** claim: that alerts would have been heeded or acted on inside the window — we can't prove counterfactuals, and hindsight bias is real. What we _can_ claim: every one of these signals was public, machine-readable, and cheap to compute before any money left the protocol. The bottleneck was never data availability.

###### The pattern, and why this post is late on purpose

THE wasn't isolated. 2026 has already produced a series of price-input failures — Moonwell (~$8.7M), Nostra (~$3.5M), and Venus THE — where the contracts executed correctly and the _inputs_ were wrong. We deliberately publish replays after the dust fully settles (governance passed, patches shipped), because the complete loop — incident → post-mortem → patch → repayment — is what makes a case study worth teaching. Venus ran that loop visibly and transparently, including covering bad debt from the Treasury rather than leaving lenders holding it. That completeness is exactly why this incident will keep appearing in oracle-risk discussions, including ours.

###### About

Insight ([oracleinsight.xyz](https://oracleinsight.xyz)) is independent oracle data and risk infrastructure — we track oracle coverage, deviation behavior, and decision-input integrity across chains including BNB Chain. This replay was produced with our own tooling and public on-chain data; official figures cited here follow the [Venus post-mortem](https://community.venus.io/t/the-market-incident-post-mortem/5712) where they diverge from third-party estimates. If the full replay dataset (signal timelines, per-check outputs) is useful to the team or to anyone building on Venus, I'm happy to share it.

---

## 备用短标题（如果上面的超长被论坛标题限制卡住）

```
[Community Analysis] Replaying the March 15 THE Incident as a Decision-Input Failure
```

## 发布提醒

- 结尾承诺了 "happy to share the full replay dataset" —— 发布后若有人索要，需要真的准备数据，介意的话发布前删掉那句
- 发布后把帖子链接补录到 X thread / Paragraph 文章里形成互链
