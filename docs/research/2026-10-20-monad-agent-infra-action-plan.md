# Monad agent 基础设施：分发冲刺 + Validation Registry 适配行动方案

形成：2026-10-20(Asia/Shanghai)。范围：仅两条线——(1) Monad 分发冲刺、(2) 产品扩展(Validation Registry 适配 + skill 扩充)；Nitro 加速器本方案明确排除。依据：[agent 生态研究](./2026-10-19-monad-agent-ecosystem-research.md)、[API Hub 上架草稿](./2026-10-19-monad-api-hub-listing-draft.md)与当日复核。本文是行动底稿，外发内容需用户授权。

## 0. 当日事实核查（2026-10-20）

- PR #246（`skills/insight-pre-trade-safety/SKILL.md`）已合并（分支 feat/hub-skill-manifest 已删，合并时间 2026-10-19 18:40）。
- raw manifest 可达：`https://raw.githubusercontent.com/imokokok/Insight/main/skills/insight-pre-trade-safety/SKILL.md`（Portal 托管目录的收录前置格式已满足）。
- [Monad ERC-8004 指南](https://docs.monad.xyz/guides/erc-8004)复核：Identity Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` 与 Reputation Registry `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` 已上线；**Validation Registry 仍为 coming soon，无地址**。
- ERC-8004 全链 CREATE2 确定性部署（同地址）：Identity 全链地址一致已证实；Validation 的 canonical 地址本轮未从一手来源取到（erc-8004-contracts 仓库 README 抓取失败），列为 spike 第 0 步核实项，不得臆写。

## 1. 线 A：Monad 分发冲刺

### A1. Agent Hub skill 收录（已发球，等待期）

- 现状：格式前置已全部就绪（SKILL.md 已合并、raw URL 可达）。收录由 Monad 团队人工执行、无公开提交流程（10-19 结论，未复核）。
- 动作：**不重复提交**。10-19 已在 Discord #share-projects 发出上架询问；若 **10-22 后仍无回复**，在同一频道追加一条简短 follow-up（附 raw SKILL.md 链接），话术要点：
  - 一句话：已按 Portal 托管 skill 的现行格式（对齐 Morpho）在公开仓库发布 SKILL.md，链接如下，可否收录进 Agent Hub 的 skill 目录。
  - 一句话：目录条目、`/.well-known/x402` manifest 与 openapi.json 均已就绪，可随时补交。
- 纪律：不声称 Monad 背书；不使用「首个」表述（降格为「较早的 x402 收费 API 之一」）。

### A2. API Hub 上架（已发球，等待期）

- Discord + 官方联系表单均已发出（10-19）。等待期无动作；收到回复后按 [上架草稿](./2026-10-19-monad-api-hub-listing-draft.md) 的目录条目直接交付（含 feed.json schema 对齐）。
- 跟进上限：整个流程最多主动 ping 一次（与 A1 合并成一条消息即可，不双发）。

### A3. Agent Summer campaign（每周检查，不硬蹭）

- 机制：生态队主办、滚动进行（当前可见例：Dev.fun Poker Arena，$50K 奖池，入口在 [app.monad.xyz/agent](https://app.monad.xyz/agent)，报名与奖金均路由到主办队）。
- Insight 的定位不是参赛 agent，而是**参赛 agent 的安全依赖**：交易/投机类 campaign 的 agent 在下单前调 pre-trade check（$0.02/次），campaign 流量直接转化为 x402 结算。
- 动作：每周一浏览 campaign 列表（本方案发出日为周一，首个检查点 2026-10-26）；当出现 **trading / 赌博 / 预测市场** 主题 campaign 时，联系 host 提议把 pre-trade check 纳入比赛规范或安全加分项；非交易类 campaign（如 Poker Arena）不投精力。

### A4. 立即执行的小事（用户手动，5 分钟级）

- **BNB registrar 钱包补 gas**：当前仅 ~0.002 BNB，声誉锚定 cron 随时可能因 gas 失败；补 ~0.05 BNB（Monad 侧 102 MON 充裕，无需处理）。
- gh CLI 认证已过期（HTTP 401）：需要时再走 `gh auth login --web` 设备授权流程（会给出设备码 + https://github.com/login/device），本轮所有 GitHub 状态核查已改走公开页面完成，不阻塞。

## 2. 线 B：产品扩展

### B1. ERC-8004 Validation Registry 适配（spike 设计草案）

目标：把 Insight 的 EIP-712 attestation「离线可复验」升级为「链上 validation 记录」，Monad 上线 Validation Registry 当天即可写入，抢占「oracle 安全类 validator」卡位。

**角色选择**：Insight 只做 **validator**（第三方验证者），不做 requester。理由：Insight 的产品语义就是独立验证方；requester 角色与声誉锚定的 opt-in 隐私护栏冲突面更大。

**接口映射**（以 EIP-8004 规范文本为准，实现前逐字段核对）：

- 客户侧/Insight 侧发起 `validationRequest(agentId, validatorAddress, dataURI, signal)`：agentId = 付费 agent 的 8004 身份；dataURI 指向该次 pre-trade 检查的 attestation 验证页；signal 携带 verdict 类别。
- Insight 侧回写 `validationResponse(requestHash, response, responseURI, responseHash)`：response 取规范枚举值（completed/pass 类）；responseHash 由 attestation UID 衍生，保证与线下 EIP-712 验证同源。

**流程设计**：

1. agent 调 pre-trade check（x402 付费，含 `reputationOptIn=1` 时进入既有 opt-in 通道）。
2. 复用现有每日锚定队列（`erc8004-anchor-cron.yml`）扩展为**双写**：Reputation Registry（现状）+ Validation Registry（新增）；沿用既有护栏——agent 所有权校验、每日 payer+agent+自然日去重、最小化信号、异步批量。
3. gas 由 registrar 钱包承担；先在测试网实测单笔成本再评估是否全量开启。

**Spike 步骤**：

- 第 0 步：核实 Validation Registry canonical 地址与部署链清单（一手来源：EIP-8004 规范「Canonical Addresses」节、github.com/erc-8004 组织下 contracts/deployments 仓库）；确认 BNB 主网/测试网是否已部署——若 BNB 已上线则先在 BNB 演练，Monad 上线时零改动移植（注册表地址本就与 BNB 一致）。
- 第 1 步：BNB 测试网演练完整 validationRequest → validationResponse 流（独立私钥，与既有 ERC-8004 注册演练纪律一致）。
- 第 2 步：扩展锚定 cron 双写 + 单测（签名逻辑、队列去重、双链路由 eip155:143 预留）。
- 第 3 步：Monad 部署公告落地后，将 eip155:143 纳入路由并回归测试。

**风险**：规范 response 枚举/接口在最终版可能微调——严格按规范实现，不自造字段；Monad 未给地址前不向任何外部材料承诺「已支持 Validation Registry」，对外表述用「架构上已预留」。

### B2. skill 能力扩充（B1 之后的增量项，本轮不展开）

方向备忘：Oracle Watch 信誉分/历史数据作为 MCP 工具对外开放、BNB 侧 USD1 结算扩展（扩大付费 agent 覆盖）。均待 B1 spike 落地后按 traction 数据决定优先级。

## 3. 本周执行顺序

| 顺序 | 动作                                            | 归属         |
| ---- | ----------------------------------------------- | ------------ |
| 1    | A4：BNB registrar 补 gas（防锚定 cron 失败）    | 用户手动     |
| 2    | B1 第 0 步：核实 Validation 地址与 BNB 部署状态 | 可委托执行   |
| 3    | A1/A2：等待；10-22 无回复则发合并版 follow-up   | 用户授权后发 |
| 4    | B1 第 1-2 步：BNB 测试网演练 + cron 双写        | 可委托执行   |
| 5    | A3：每周一检查 campaign 列表（首个 10-26）      | 轻量例行     |

## Sources

- [Monad ERC-8004 guide](https://docs.monad.xyz/guides/erc-8004)（Identity/Reputation 地址、Validation coming soon）
- [PR #246](https://github.com/imokokok/Insight/pull/246)（SKILL.md 合并）
- [raw SKILL.md](https://raw.githubusercontent.com/imokokok/Insight/main/skills/insight-pre-trade-safety/SKILL.md)（可达性验证）
- [geterc8004.com](https://www.geterc8004.com/)（CREATE2 同地址机制、agent 注册规模 20k+）
- [app.monad.xyz/agent](https://app.monad.xyz/agent)（Agent Summer campaign 机制）
