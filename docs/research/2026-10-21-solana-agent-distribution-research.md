# Solana Agent 分发渠道调研（2026-10-21）

目的：把 Insight（pre-trade safety API + MCP）与 PriorSeal 分发给 Solana AI agent 开发者。背景：Solana 侧商业化账本为 0（x402 `solana:5eykt…` 结算 0 笔、连 quote_issued 都是 0；PriorSeal 0x fee 中继 0 条；链上 BfVX9j… 仅自资助与自测 swap）——支付/结算链路已就绪，瓶颈纯在分发。

## A. MCP 公共注册表

| 渠道                                                  | 提交方式                                                          | 收录状态（已核实）                                                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 官方 MCP Registry（registry.modelcontextprotocol.io） | `mcp-publisher publish`（GitHub OIDC）                            | ✅ 已收录且 active：`io.github.imokokok/insight-oracle` v0.3.0（10-11）、`io.github.imokokok/priorseal` v0.1.1（10-18）— API 直查确认 |
| mcp.so                                                | 表单 mcp.so/submit                                                | ❌ 未收录；本机网络（含 ClashX）无法连接，浏览器代理提交待用户                                                                        |
| mcpservers.org                                        | 表单 mcpservers.org/submit（免费，$39 加急）                      | ❌ 未收录；同上网络不可达                                                                                                             |
| Smithery                                              | `smithery mcp publish "https://…/mcp" -n @org/x`（支持远程 HTTP） | ❌ 未收录；需要 Smithery 账号 token → 用户操作                                                                                        |
| Glama                                                 | 自动抓取 GitHub + 官方 Registry                                   | ❌ 未收录（站内搜索 0 结果；随官方 Registry 索引应跟进）                                                                              |
| PulseMCP                                              | 表单 pulsemcp.com/submit                                          | 未核实收录；提交页 Cloudflare 403，需浏览器                                                                                           |

## B. Solana 生态目录

- **sendaifun/skills**（最重要）：Solana agent skills 市场，含 Oracles 类目（pyth、switchboard）与 Security 类目；经 CONTRIBUTING.md 提 PR（fork 分支 `feat/<skill-name>`，SKILL.md + `.claude-plugin/marketplace.json` + README 表行），被 agskills.dev 索引，支持 Claude Code marketplace 安装。Insight 未收录。
- **solana-foundation/awesome-solana-ai**：官方 curated list（AI Coding Skills 的 Infrastructure 节已含 pyth-pro、switchboard 等 oracle 类条目），社区 PR。
- **sendaifun/awesome-solana-mcp-servers**：存在，收 PR。
- GOAT：工具型 SDK（被集成方），无独立 integrations 提交入口证据。

## C. x402 生态对 Solana 的覆盖

- x402 v2 规范含 `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` 标识（x402-foundation/x402 specs）。
- Bazaar 官方 FAQ 网络支持以 Base 为主（docs.x402.org/extensions/bazaar）；Solana 资源需要 Solana 系 facilitator：PayAI（docs.payai.network/x402/facilitators/bazaar，自带 Bazaar discovery）、Ogena Labs（solana+base）。
- **x402scan**：注册 = SIWX 签名 POST `/api/x402/registry/register-origin` 或表单 /resources/register；要求 `/openapi.json` + `x-payment-info`。10-11 曾通过官方表单提交，但 10-21 复查站内搜索未见 oracleinsight——需浏览器核验，缺失则用钱包 SIWX 签名重新注册（用户操作）。
- 本机与 x402scan API 直连不通（HTTP 000），核验只能走用户浏览器。

## D. 社区分发渠道

- **Superteam Earn**：以参与者身份 Apply/Submit project，或付费 Create New Listing 发 bounty；有 skill.md 接口（superteam.fun/skill.md）。适合 bounty/用例展示，非自助上架。
- **Jupiter**：jup.ag/ecosystem 无法抓取（存疑）；@jup-ag/platform-list 收社区 PR（工具类）。
- Solana Stack Exchange / 官方 Discord：问答与展示，无正式提交入口。
- Colosseum×Solana Agent Hackathon（$100k）与 Solana Radar（Superteam local track，经 Earn 报名）：赛会型入口，见 F。

## E. 已提交事项现状核实（2026-10-21）

1. PR naruto11eth/cryptoskills#1：**OPEN 未合并**（gh API 确认，"Add Insight — oracle safety & pre-trade risk skill"）。
2. cryptoskills.dev：全站 97 个 skill 枚举无 insight 条目——与 PR 未合并一致，无需重复提交，等合并即可。

## F. 其他发现

- Colosseum×Solana Agent Hackathon（$100k 奖池）与 Solana Radar：可作发布会/用例沉淀场景。
- agskills.dev：索引 sendaifun/skills，提交 skills 仓库即被覆盖。
- LobeHub MCP 市场：自动索引 GitHub，可关注是否已抓取。
- x402scan 附带 Poncho 商店页（tryponcho.com/m/origin）。

## 行动清单（按边际收益/操作成本排序）

| #   | 行动                                                         | 执行方                  | 状态                 |
| --- | ------------------------------------------------------------ | ----------------------- | -------------------- |
| 1   | sendaifun/skills 提 Insight skill PR（Oracles 类目，3 文件） | agent                   | 网络中断时进行中     |
| 2   | awesome-solana-ai PR（Infrastructure 节插入条目）            | agent                   | 内容就绪，待网络恢复 |
| 3   | awesome-solana-mcp-servers PR                                | agent                   | 待网络恢复           |
| 4   | x402scan 浏览器核验收录；缺失则 SIWX 钱包签名重注册          | 用户                    | 待办                 |
| 5   | mcp.so + mcpservers.org + PulseMCP 表单提交                  | 用户（浏览器+全局代理） | 网络层不可达         |
| 6   | Smithery publish（需账号 token）                             | 用户                    | 待办                 |
| 7   | cryptoskills PR#1 催办（第二次触达，在等待 1 周以上后才做）  | agent/用户              | 暂不动作             |

## 关键结论

- 官方 MCP Registry 双产品已收录是最大存量资产，Glama 会跟随索引。
- Solana 侧最大缺口：sendaifun/skills（Oracles 类目精确触达）与 Solana 系 x402 facilitator discovery（PayAI Bazaar）——后者是把付费→收录→流量飞轮从 Base 复制到 Solana 的钥匙。
- 本机网络对 mcp.so / mcpservers.org / x402scan / PulseMCP 均不可达（代理下 TLS/403），凡表单类均需用户浏览器操作；GitHub API 当日也不稳（TLS 超时），PR 类动作需在网络窗口内完成。
