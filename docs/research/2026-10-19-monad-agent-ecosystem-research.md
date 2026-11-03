# Monad agent 生态投入与 Insight 机会研究

形成:2026-10-19(Asia/Shanghai)。信息核查时点:2026-10-19;所有外部事实以当时公开来源为准,不证明现时状态。本文是研究底稿,不构成对外承诺。

## 1. Monad 对 agent 的整体投入(官方一手来源)

### 1.1 战略定位

- Monad Foundation 于 2026-06-29 加入 Linux Foundation 旗下 x402 Foundation,与 Coinbase、Visa、Mastercard、Cloudflare、Google、AWS 同为贡献方。官方论点:agent 结算要落在有真实流动性的经济体上("liquidity precedes payments"), Monad 自我定位为 agent 经济的结算层而非过路管道([Monad 官方博客](https://blog.monad.xyz/blog/monad-foundation-joins-x402-foundation),E2_VERIFIED)。
- 官方文档明确:Monad 运行官方 x402 facilitator,支持 ERC-8004(agent 身份/声誉/验证注册表)。**Validation Registry 在 Monad 上标注 coming soon**(Identity/Reputation 已上线)([docs.monad.xyz/guides/erc-8004](https://docs.monad.xyz/guides/erc-8004),E2_VERIFIED)。

### 1.2 产品与基础设施

- **Agent Hub**([app.monad.xyz/agents](https://app.monad.xyz/agents)):官方 agent 入口,含三块——
  - 托管 agent 平台目录:Clawdi(Phala Network,TEE 托管)、Purr-fect(Pieverse)、Starchild(WOOFi),并声明支持 Codex、Claude Code、Genspark、Manus;
  - dApp skill 目录:8 个 manifest(Uniswap、Morpho、Balancer、Kuru、Clober、Nad.fun、DevFun、Blinq.fi),skill 以 GitHub 仓库中的 SKILL.md 形式发布、经 portal 托管(例:[Morpho skill](https://raw.githubusercontent.com/morpho-org/morpho-skills/a4ba9e9f500b5d587dfc519aa7f5861f093a8c80/plugins/morpho-cli/skills/morpho-cli/SKILL.md));
  - **API Hub**([app.monad.xyz/agents/api-hub](https://app.monad.xyz/agents/api-hub)):x402 按次付费的链下 API 目录,**135 个服务在架**(Nansen、Ankr、Tavily、Serper、Apollo.io 等),提供 `feed.json`(机器可读目录)、`schema.json` 与 `llms.txt`(LLM 上下文摘要)。上架无公开自助表单,llms.txt 中亦未记载提交流程(E2_VERIFIED)。
- **Ankr x402 首发 Monad**(2026-10-15):agent 按次付费读链(RPC/MCP/TORPC 规范),其博客列出的四大场景为 pre-trade checks、execution confirmation、position monitoring、contract due diligence——但 Ankr 只提供原始链上读取,不含价格可信度判定([Ankr 博客](https://www.ankr.com/blog/ankr-launches-x402-payments-starting-with-monad/),E2_VERIFIED)。
- 官方免责条款:Hub 上服务「independent providers,not endorsed/audited/verified by the Monad Foundation」——对外沟通时不得把在架写成 Monad 背书。

### 1.3 资金与活动

| 项目                   | 内容                                                                | 来源与证据级                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nitro 加速器           | 总额 $7.5M、每队最高 $500K、3 个月(NY+远程),主打 execution-first    | [thevoiceofmoney](https://www.thevoiceofmoney.com/14094.html)、[Metaverse Post](https://www.mpost.io/el/monad-unveils-7-5m-nitro-accelerator-to-support-blockchains-ecosystem-projects/),E2_VERIFIED(条款细节未核) |
| Monad Momentum         | 官方增长计划,滚动申请,按 wave 评审                                  | [官方申请表](https://tally.so/r/gDapdl),E2_VERIFIED                                                                                                                                                                |
| Metropolis 全球黑客松  | $250K+ 奖池、4 赛道含 AI & agents;提交 2026-10-13 截止,评审至 10-27 | [官方站](https://hackathon.monad.xyz/),E2_VERIFIED                                                                                                                                                                 |
| Moltiverse 黑客松      | 与 Nad.fun 合办、$200K,纯 AI agent 主题(agent-to-agent commerce 等) | [Monad 官方博客](https://blog.monad.xyz/blog/home-for-builders),E2_VERIFIED                                                                                                                                        |
| Agent Summer campaigns | 生态队主办、滚动进行(例:Dev.fun Poker Arena,$50K 奖池)              | [app.monad.xyz/agent](https://app.monad.xyz/agent),E2_VERIFIED                                                                                                                                                     |

### 1.4 缺口判断

1. **API Hub 135 个服务中无预言机安全/风险判定类 API**。最接近的是 Nansen(链上分析),但两者不重叠:Nansen 回答「发生了什么」,Insight 回答「这个价格现在能不能信」。
2. Ankr 已补「读链」层,其博客点名的 pre-trade checks 场景缺少真正的判定供给方。
3. ERC-8004 声誉数据在 Monad 上已有(8004scan 等浏览器可查),但「声誉→可信度评分→交易前决策」的产品化层空缺(Monad 黑客松项目 AgentCredit 验证了需求存在,仅停留在原型)。
4. Validation Registry coming soon:签名验证类基础设施存在官方卡位窗口。

## 2. Insight 已具备的对位资产(截至 2026-10-19)

- x402 v2 收费 API 已在生产,402 challenge 同时广告 eip155:143(Monad,Circle 原生 USDC)等 6 条链;无 API key、无订阅,与 Hub 语义完全一致(`public/.well-known/x402`、`public/skill.md`)。
- Monad 主网 ERC-8004 agent 已注册(agentId 10414,注册表地址与 BNB 一致);声誉锚定每日 cron 双链路由(eip155:143→Monad)。
- Monad 51 条 Chainlink USD feeds 已入库并 15 分钟自动采样。
- elizaOS 插件默认网络已含 eip155:143(`integrations/elizaos-plugin-insight/src/settings.ts`)。
- 注意:`/monad` 公共健康页已于 2026-10-19 移除(commit bc1bb711),对外材料不得再引用该 URL,覆盖数据口径改为 API/MCP。

## 3. 机会点(按优先级)

1. **上架 Monad API Hub**(最高优先):材料全部现成,只缺收录动作。见 [上架申请草稿](./2026-10-19-monad-api-hub-listing-draft.md)。
2. **ERC-8004 声誉/验证层产品化**:把已有 EIP-712 attestation + 每日锚定 cron 扩展为「Monad agent 信任评分/验证服务」,对位官方 coming soon 的 Validation Registry。前期可先在 8004scan/agentscan 覆盖面内观察 Monad agent 声誉数据形态。
3. **托管平台分发**:Clawdi(Phala)/Pieverse/WOOFi 三家托管平台是在 Monad 上跑 agent 的现成渠道;Insight 的 elizaOS 插件是接入抓手。未记录任何一方联系,需先核对方接入方式再外联。
4. **资金路径**:Nitro(execution-first 画像契合:单人、已有独立收入、Monad 上首个 x402 收费 API)与 Momentum(增长期适用)。见 [申请材料草稿](./2026-10-19-monad-funding-applications-draft.md)。
5. **活动节奏**:Metropolis 评审中(10-27 出结果)已无法参赛;Moltiverse/Blitz 模式的 agent 黑客松是常态,可作下一次参赛或 API 赞助方窗口。

## 4. 信息缺口(如实声明)

- API Hub 上架流程无公开记载,需经 Monad Developer Discord([discord.gg/monaddev](https://discord.gg/monaddev),官方 ERC-8004 文档给出的渠道)或官方团队渠道确认。
- API Hub 当前调用量/收入数据未公开;135 服务为 2026-10-19 快照。
- Nitro 的股权/代币条款、申请入口未核实;Momentum wave 3 时间表未核实。
- 「Monad 上首个 x402 收费 API」为项目内部判断,未获第三方口径证实,对外使用需降格为「Monad 上较早的 x402 收费 API 之一」。

## Sources

- [Monad Foundation joins the x402 Foundation](https://blog.monad.xyz/blog/monad-foundation-joins-x402-foundation)
- [ERC-8004 on Monad](https://docs.monad.xyz/guides/erc-8004)
- [Monad Agent Hub](https://app.monad.xyz/agents) / [API Hub](https://app.monad.xyz/agents/api-hub) / [llms.txt](https://app.monad.xyz/agents/api-hub/llms.txt)
- [Ankr Launches x402 Payments, Starting With Monad](https://www.ankr.com/blog/ankr-launches-x402-payments-starting-with-monad/)
- [Nitro 报道](https://www.thevoiceofmoney.com/14094.html) / [Monad Momentum 申请表](https://tally.so/r/gDapdl)
- [Monad Hackathon | Metropolis](https://hackathon.monad.xyz/) / [Monad: The Home For Builders](https://blog.monad.xyz/blog/home-for-builders)
- [8004.org](https://www.8004.org/build) / [Morpho skill 样例](https://raw.githubusercontent.com/morpho-org/morpho-skills/a4ba9e9f500b5d587dfc519aa7f5861f093a8c80/plugins/morpho-cli/skills/morpho-cli/SKILL.md)
