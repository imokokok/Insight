# Insight 数据源集成盘点 — 2026-11-28

## 范围与结论

本次静态盘点覆盖 oracle 适配器、链上 RPC 与 REST 传输、feed 发现和同步、市场参考采集、Supabase/Turso/D1 价格存储。追加了生产 Supabase feed-registry 只读盘点，以及对每个当前活动 oracle provider/chain 组合各选一个代表 feed 的在线读取；这不是对全部 2,157 条 active feed 的逐条验证。带计费的 coverage API probe 未执行：工作区没有可用的 `INSIGHT_API_KEY`，也没有创建新凭据。

检查到 13 个 oracle provider 都在工厂注册。发现并修复五类问题：DIA 响应 body 不受超时保护；WINkLink 缺少链上更新时间时会被本机取数时间伪装成新报价；Supra DORA REST proof 只被本地解码，却可能默认算作 quorum 投票；Supra 历史数据路径使用了 SDK 旧 pair-index 表且把官方 `{ data: [...] }` 响应当数组处理；RedStone 普通行情读取和发现/批量快照使用了不一致的 provider 参数。Supra 普通 DORA 报价现在仅供展示、不进入 quorum；Monad Push 合约路径保持单独处理。Supra 最新价和历史请求现在都能取消，历史数据从官方目录中的精确交易对读取。RedStone 普通行情统一使用 `provider=redstone` 后，当前在线请求仍返回 HTTP 502，记录为未解决的上游/网络可用性问题，不宣称已恢复。

测试覆盖结果：oracle、market-reference、Supabase、Turso/D1、价格与共识 API、feed sync/cron 路由共 78 个 suite / 812 个测试通过。完整 TypeScript `tsc --noEmit` 通过（build info 写到临时目录）。

## Oracle provider 逐项清单

| Provider  | 接入路径与边界                                                                                 | 本次核查                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chainlink | EVM feeds 走 `RpcClientWithFallback` 和 feed cadence/heartbeat 目录；Solana 有原生链上服务。   | RPC endpoint 逐个超时并切换；价格时间来自 feed round。链和 feed 覆盖取决于配置，不以 provider 注册代替可用性。                                                                                                                                                                                                                                                                                                      |
| Pyth      | EVM、Solana、HyperEVM 与 Monad 专用链上路径。                                                  | 专用服务验证 feed 标识、链与时间；Monad AUSD 等特殊覆盖受源 freshness 和 quorum 政策约束。                                                                                                                                                                                                                                                                                                                          |
| Stork     | 一般 EVM、Monad 和其他已配置 EVM 链。                                                          | 链上读取有 feed 配置；Monad/协议级晋级仍按项目审查记录保持 shadow，不能把不同 operator 自动当作独立底层市场源。                                                                                                                                                                                                                                                                                                     |
| Chronicle | 当前包含 Monad 专用链上路径。                                                                  | 观察可用不等于独立性已确认；按现行审查记录保持 shadow。                                                                                                                                                                                                                                                                                                                                                             |
| API3      | EVM dAPI 路径，使用链上数据与更新时间。                                                        | 有 dAPI 解析和时间信号；各链 dAPI 地址、链 RPC 配置仍需部署环境匹配。                                                                                                                                                                                                                                                                                                                                               |
| RedStone  | 通用 EVM 客户端与 Monad 专用链上服务。                                                         | 配置化 feed 和 RPC 路径；按来源/链条件判定有效性。                                                                                                                                                                                                                                                                                                                                                                  |
| DIA       | DIA REST 价格、网络/供应数据接口。                                                             | 修复请求超时在收到 headers 后被提前清除的问题；现在 JSON body 完成前仍可取消。符号报价 fallback 可能有歧义，决策路径优先使用精确资产映射。                                                                                                                                                                                                                                                                          |
| WINkLink  | TRON 合约 `latestAnswer`、`decimals`、`latestTimestamp`。                                      | 缺失更新时间时保留可显示价格和抓取时间，但 `dataAge` 标为不可用、freshness 为 0、明确 `countsTowardOracleQuorum: false`。                                                                                                                                                                                                                                                                                           |
| Supra     | 通用 DORA REST proof；Monad 使用 Supra Push 合约 `getSvalue`；历史 candles 走单独的 REST API。 | 通用 REST proof 官方流程要求 Pull 合约验证签名。原适配器只做 ABI 解码；现将此未验证报价排除 quorum。Monad on-chain 路径读取 round、毫秒时间并校验 freshness，仍按现有 shadow 策略。历史行情现在使用 feed registry 的官方交易对名，解析官方 `{ data: [...] }` envelope；缺少当前官方目录匹配或 `SUPRA_DORA_HISTORY_API_KEY` 时明确返回无数据，不再猜旧 index 或错误 pair。REST body 超时与外部取消都会终止底层请求。 |
| TWAP      | 多链 DEX pool `eth_call`，经 Curve/Uniswap 类池状态推导价格。                                  | 属派生价格；source-group policy 已排除其满足独立源数量。池身份、流动性和观察窗口决定单个市场可用性。                                                                                                                                                                                                                                                                                                                |
| Reflector | Stellar 合约/SDK 读取。                                                                        | 价格与更新时间按源字段检查；需已配置 Stellar RPC/网络。                                                                                                                                                                                                                                                                                                                                                             |
| Flare     | Flare FTSO REST 与 RPC 回退读取。                                                              | 有明确 stale 门限；REST 与 RPC 配置、请求上限属于运行环境检查项。                                                                                                                                                                                                                                                                                                                                                   |
| Band      | Band V3 feed REST 接口。                                                                       | feed 更新时间会进入 age；feed 更新间隔由具体 signal 配置决定，不能用一个统一过期阈值假定所有 Band feed 都失效。                                                                                                                                                                                                                                                                                                     |

主要实现入口为 `src/lib/oracles/factory.ts`、`src/lib/oracles/clients/` 与 `src/lib/oracles/services/`。特定链的覆盖由专门服务实现，并不意味着 provider 支持的每条链都有该 provider 的 feed。

## 其他外部市场参考源

| 来源                       | 使用场景                 | 约束                                                              |
| -------------------------- | ------------------------ | ----------------------------------------------------------------- |
| Alpaca                     | 股票行情辅助参考         | 需要 API key/secret；面向客户使用须有对应权利。                   |
| Chainlink                  | 市场参考对照             | 通过 collector 采样，不在请求热路径访问 CEX。                     |
| RedStone                   | 市场参考对照             | 受 feed/报价身份和商业使用权约束。                                |
| DexScreener                | Solana DEX 代币批量参考  | 有 pair 更新时间/新鲜度检查；覆盖是池价，不等于中心化交易所现货。 |
| GeckoTerminal              | Solana DEX 批量参考      | 同属池价参考；unsupported token 显式缺失。                        |
| Jupiter                    | Solana 聚合流动性参考    | 聚合报价不能被解释成独立交易所。                                  |
| Solana DEX source combiner | 聚合上述 Solana 市场参考 | 一次批量抓取后做跨源参考；不用于替代 oracle 价格证明。            |

采集端由 `src/lib/marketReference/collector.ts` 编排，读取端由 `src/lib/marketReference/client.ts` 从 Supabase RPC 或 Turso rollup 读取。读取端对超过 3 小时的 rollup fail closed，并要求 customer-eligible venue rights。项目已有权利登记不足的来源不会被自动当作客户证据；未经许可不得启用相关采集/客户输出。

## 发现、存储与投影链路

| 层                        | 作用                                                                       | 运行边界                                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Feed discovery / sync     | 从 provider 目录和已审查数据源收集 feed 元数据，校验后写入 feed registry。 | 目录发现不是 source approval；chain/asset、heartbeat、身份和权利需单独审核。刷新失败应保留有界的 last-known-good，而不是无限保留已撤销 feed。 |
| Supabase                  | 管理数据、feed registry、运行记录和主要持久化 API。                        | 服务端 service-role 环境变量必须在部署侧正确配置；本次未查询生产数据库。                                                                      |
| Turso                     | 价格记录、market-reference ops 或只读镜像/投影，依 mode 控制。             | 模式可为 legacy/shadow/primary 等；认证、schema、投影 watermark 和 fallback 行为需在各环境逐一确认。                                          |
| Cloudflare D1             | 可选价格记录缓存/读写切换路径。                                            | `d1-shadow`/`d1` 等由 Worker 绑定读取；不是市场参考或 oracle 真相源。D1 不可用时行为受 fallback mode 控制。                                   |
| Supabase→Turso projectors | 将价格事件压缩/投影到长期或操作存储。                                      | 保留期、ACK/quarantine 和回放由脚本及 cron 状态决定；静态测试不能证明生产队列已清空。                                                         |

主要入口包括 `src/lib/supabase/`、`src/lib/turso/price/`、`src/lib/cloudflare/priceRecords.ts`、`src/lib/marketReference/`、`src/lib/oracles/services/feedDiscovery/` 和 `src/lib/oracles/services/feedSyncService.ts`。

## 改动

1. `src/lib/oracles/diaUtils.ts`：校验 timeout 为正有限值；timeout 保持到完整 body 读取结束；清理外部 abort listener 和 timer。
2. `src/lib/oracles/services/winklinkRealDataService.ts`：源时间缺失时采用不可用 age sentinel、freshness 0，并退出 quorum；不再将本机取数时间作为源更新时间信号。
3. `src/lib/oracles/services/supraDataService.ts`：Supra 最新价 proof 请求使用可取消 fetch，并在价格行解析前做运行时字段校验；历史价使用目录中的精确交易对和官方历史响应结构，通过 `SUPRA_DORA_HISTORY_API_KEY` 读取并验证 OHLCV 字段。超时覆盖 headers 和 body，外部 abort 传入 retry 控制，消除 `Promise.race` 只结束等待、底层请求仍运行的问题。
4. `src/lib/oracles/clients/supra.ts`：尚未经 Pull 合约验证的 DORA REST proof 报价不计入 oracle quorum。
5. `src/lib/oracles/clients/redstone.ts`：普通实时行情请求与 feed discovery、批量快照使用相同的 `provider=redstone` 数据目录，避免同一 feed 在发现成功后走另一套 provider 参数。
6. 新增/更新上述路径的回归测试。

## 2026-11-28 生产与在线盘点

只读 Supabase 查询发现 `oracle_feeds` 有 4,617 行：2,157 active、2,460 inactive。排除 124 条 `twap-token` pool/token 辅助元数据后，有 38 个活动价格 provider/chain 组合，覆盖上表中的 13 个 Oracle provider。当前 active feed 中连续失败计数大于 0 的有 0 条；48 条 active 价格 feed 没有 `last_success_at`，另有 7 条 active RedStone chain-agnostic feed 的最后成功时间早于 30 天。`last_success_at` 是 feed-health/upsert 观测，不等同于实时 API 探针；这些条目仍须逐条验证，不能只凭 active 标记认定可投票。

本机通过命令级代理直连 provider 后，对 38 个 provider/chain 组合各请求一个代表 feed：37 个返回有限正价格及时间戳，1 个失败。按 `strict-300s.v4` 的 300 秒 freshness 门限计算，37 个有响应结果中有 14 个时间戳超过门限；这表示该次严格 coverage 证据不足，不等价于所有 provider 的 heartbeat 规则均判定其报价无效。

| Provider  | 活动 chain_id                                   | 样本结果 / 源报价年龄              | 备注                                                                                                                                                       |
| --------- | ----------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API3      | 1, 10, 137, 8453, 42161                         | 5/5 响应；5 个样本均 >300s         | 最大约 76,000s；仍低于代码 48 小时硬过期门限，但不满足 strict-300s coverage。                                                                              |
| Band      | 0                                               | 1/1；2s                            | 正常响应。                                                                                                                                                 |
| Chainlink | 0, 1, 10, 56, 137, 143, 999, 8453, 42161, 43114 | 10/10；链 1、999、43114 样本 >300s | 其余 7 个样本在 5 分钟内。                                                                                                                                 |
| Chronicle | 143                                             | 1/1；1,370s                        | 有响应，strict-300s 下过期。                                                                                                                               |
| DIA       | 0                                               | 1/1；54s                           | 正常响应。                                                                                                                                                 |
| Flare     | 14                                              | 1/1；3s                            | 正常响应。                                                                                                                                                 |
| Pyth      | 0, 143, 999                                     | 3/3；999 样本 831s                 | 其余样本在 5 分钟内。                                                                                                                                      |
| RedStone  | 0, 143                                          | 1/2                                | Monad 143 样本 1s；chain 0 的 `USDC/BRL` 返回 HTTP 502。改为与发现一致的 provider 参数后单条复测仍返回 502，当前无法确认是 RedStone 上游还是本机代理出口。 |
| Reflector | 0                                               | 1/1；175s                          | 正常响应。                                                                                                                                                 |
| Stork     | 56, 143, 999, 8453                              | 4/4；链 56、999、8453 样本 >300s   | 三条 strict-300s 新鲜度不足。                                                                                                                              |
| Supra     | 0, 143                                          | 2/2；1s、222s                      | 正常响应；普通 DORA REST 路径仍按前述策略排除 quorum。                                                                                                     |
| TWAP      | 1, 10, 56, 137, 8453, 42161                     | 6/6；0s                            | 可读取，但 TWAP 是派生源，不增加独立 source-group 数。                                                                                                     |
| WINkLink  | 0                                               | 1/1；49,734s                       | 本次样本有时间戳但超出 5 分钟门限；缺失时间戳仍会按代码退出 quorum。                                                                                       |

未对 2,157 条 active feed 逐条请求；Supabase `api_keys` 只存哈希，且本地没有可用于计费 API probe 的 `INSIGHT_API_KEY`，本次不生成额外 API key。`twap-token` 的 active 行是 pool/token 解析元数据，预期没有 `last_success_at`，不算独立价格源。market-reference 的 CEX/DEX 商业使用权和部分供应商密钥仍是单独部署/许可输入，未通过 Oracle 样本探针推定为可供客户使用。

Market-reference 的 Supabase 表中，CEX 最近记录停在 2026-10-16，Solana DEX 最近记录停在 2026-11-09；但生产 GitHub Actions 当前已将 Supabase egress retired，`TURSO_MARKET_REF_MODE=turso`。2026-11-28 07:30 UTC 的最新 `snapshot-collect.yml` 两个 job 均成功；market-reference collector 写入 Turso 11/11 行，运行日志报告 `eligibleExchanges=kraken,dexscreener,geckoterminal,jupiter`、覆盖 ETH/BTC/WBTC/USDC/USDT，最大跨市场价差 0.086%。这表明旧 Supabase 时间戳是退役存储的遗留数据，不代表生产采集停摆。

历史 DEX 样本为 DexScreener 0/5,518 成功、GeckoTerminal 3,916/5,518、Jupiter 3,946/5,518；错误主要是 Solana 池不存在的 `USDT/USD` 预期缺失，以及 DexScreener 价格缺少可验证的 `updatedAt`，被 freshness gate 按设计 fail-closed。最新运行也明确将 DexScreener `USDC/USD` 因无 `updatedAt` 排除，并将 `USDT/USD` 在三个 Solana 来源的缺失记为无池/无聚合路由；其余 eligible 来源仍完成了覆盖。CEX 历史记录标为 `research-quarantined` / `not-authorized`，不可用于客户数据交付；本次市场参考运行资格名单包含 Kraken，不据此推断其它交易所数据当前有客户授权。

## 剩余需线上/产品输入才能关闭的项目

- 无法仅从仓库确认生产环境所有 RPC URL、DIA/Alpaca 等 API 密钥、Supabase/Turso/D1 绑定是否齐全有效；需要按实际已启用链逐源执行只读的运行探针。
- 带计费的 coverage/API probes 未运行。部署健康检查成功不等于所有 provider/asset/chain 返回新鲜、合格报价。
- Supra 普通 DORA 当前安全地不计 quorum。若要恢复 quorum，需要用 Supra 官方 Pull 合约验证证明后再读取结果，或实现并审计与官方一致的本地证明验证。Supra 历史行情需要部署配置 `SUPRA_DORA_HISTORY_API_KEY`，且需要定时 feed sync 已保存其官方 pair name。
- CEX 商业使用权和数据供应商合同不在代码里可推导；依赖 `src/lib/dataRights/evidenceRights.ts` 的已审核登记。
- Stork/Chronicle 等 feed 级底层数据源重叠、各链可用覆盖、protocol activity heartbeat、RWA 第二独立源等缺口依既有覆盖审计继续保持待处理/ shadow。
- 用户所述“所有数据源全部正常”最终需要先确定目标部署环境、已启用链/资产，以及是否允许执行计费探针；本次不会把未执行的线上读数写成已通过。

## Supra 官方接口依据

- [Pull Oracle 文档](https://docs.supra.com/oracles/data-feeds/pull-oracle)：证明需由 Pull 合约验证后取值。
- [REST API 文档](https://docs.supra.com/oracles/apis-real-time-and-historical-data/rest-api)：历史行情需要 API key，pair 使用交易对名称，响应包含 OHLC 的 `data` 字段。
- [Data Feeds Index](https://docs.supra.com/oracles/data-feeds/data-feeds-index)：目录给出当前交易对名称和 pair ID；历史请求不应再借用 SDK 内部旧 index 表。

## 2026-11-28 后续复核：发现同步与镜像刷新

在前述盘点后继续检查生产运行记录，发现 `feed-discovery.yml` 并行矩阵存在一个此前未识别的可靠性问题：2026-11-23 的一次 RedStone discovery job 表面成功，但日志显示读取 active-feed registry 分页时数量从 2,152 变为 2,153，随后 Turso authoritative mirror refresh 失败；该请求仍返回 HTTP 200，provider 汇总也没有把错误提升为工作流失败。并行 provider job 同时修改不同 feed 时，每个 job 又都读取并重建整份镜像，导致读取期间目录变化。

本次修复将镜像刷新从每个并行 provider job 移到 workflow 的单一 finalizer，待矩阵结束后执行一次 `refresh-registry`；finalizer 对刷新失败明确失败。对 discovery 返回错误的 provider，不再以部分目录执行 absent-feed pruning；discovery 有错误时返回 502/`success:false`，使 CI 可见失败。这样保留其它 provider 的成功写入，同时避免部分目录导致误停用或静默镜像落后。

RedStone runtime 请求此前使用无尾斜杠、无 `limit` 的 `/prices` URL。现按 RedStone 官方 HTTP API 示例改为 `/prices/?symbol=…&provider=redstone&limit=1`，限制响应为最新单条记录；新增配对符号 URL 回归测试。此前生产样本 `USDC/BRL` 曾返回 502，但当前执行环境无法完成 RedStone 主机的有效直连或代理探测，因此这次代码修正尚不能单独证明上游报价已恢复。合并部署后仍须观察一次真实 RedStone chain 0 报价请求。

最新只读生产统计仍为 2,157 条 active 价格 feed（另有 124 条 `twap-token` 辅助行），当前 `consecutive_failures > 0` 为 0；48 条 active feed 无 `last_success_at`：Pyth 24、RedStone chain 0 为 18、Stork chain 143 为 1、Supra chain 143 为 5。RedStone chain 0 的 25 条 active feed 中，18 条从未有成功观测、7 条最后成功早于 30 天；RedStone chain 143 最近成功时间为 2026-11-28 07:30 UTC。`last_success_at` 是同步健康观测，不等同于逐 feed 实时报价验证，特别是 curated registry feed 不一定在 discovery 时逐条单价探测。

Supra 历史接口仍受部署凭据阻塞：检查 GitHub repository secrets 与 `Production` environment 的 secret 名称时，都没有 `SUPRA_DORA_HISTORY_API_KEY`。普通 DORA REST 价格目前按安全策略排除 quorum；需先实现并验证 Pull 合约证明，不能因 REST API 能返回数值就恢复投票资格。

修复验证：RedStone 定向套件 81/81 通过；feed discovery pruning/失败传播定向套件 6/6 通过；`npm run build:cron` 成功重建 16 个 cron bundle（11.9 MiB）；`git diff --check` 通过。以上均为本地验证，生产 discovery finalizer 和 RedStone runtime 尚待合并部署后复验。

## 2026-11-28 线上 RedStone 重试复核

PR #760 的 merge SHA `20eff8d50117fa211d7b477d7fc78ede29832a00` 已部署到 GitHub Actions。全 provider discovery 中 12/13 provider jobs 成功，RedStone discovery 在读取 `oracle-gateway-1.a.redstone.finance/data-packages/latest/redstone-primary-prod` 时发生 Node `TypeError: fetch failed`；registry finalizer 成功。对 RedStone 单独重试后仍出现相同 fetch failure，第二次 registry finalizer 也成功。失败响应没有触发 feed pruning。

本机按项目网络规则先直连、再通过本地代理复查 RedStone DDL gateway 与 `api.redstone.finance/prices/`，均在 TLS 建连阶段失败（HTTP 状态为 000）。GitHub repository secrets 与 Production environment secret 名称均无 `REDSTONE_API_KEY` 或 RedStone gateway API key。RedStone 官方 SDK 当前生产 authenticated gateway 目录指向 `https://oracle-gateway.a.redstone.finance`；生产 authenticated gateway 凭据需要由 RedStone 提供，不能将该 URL 无凭据地假定为可替换的公开目录服务。单条价格 HTTP API 的官方请求格式见 [RedStone HTTP API](https://github.com/redstone-finance/redstone-api/blob/main/docs/HTTP_API.md)，生产 authenticated gateway 列表见 [RedStone SDK data-services-urls.ts](https://github.com/redstone-finance/redstone-oracles-monorepo/blob/main/packages/sdk/src/data-services-urls.ts)。

新增 RedStone discovery 最多 3 次短间隔重试：对网络异常、超时、HTTP 429 和 5xx 重试；对 4xx 立即失败。最终错误消息保留底层 cause 和系统错误码，便于区分 DNS、TLS 与连接重置。该韧性改动可吸收瞬时错误，但不能修复当前 runner 与 RedStone DDL 的持续网络不可达，也不会用无签名或推测数据填充行情。线上恢复仍需在重试版部署后验证；若持续失败，需要恢复 RedStone 官方 gateway/API 可达性或由供应商提供可用的认证 gateway 与凭据。

## 2026-11-28 最终生产复验与外部依赖

PR #762 已合并到 `main`（SHA `3cf3094e2cbd123fb4fb1a09bb476d456ef49b3f`），部署后触发 RedStone 单 provider discovery。旧 DDL host 在最多 3 次尝试后明确返回 `ENOTFOUND oracle-gateway-1.a.redstone.finance`；按实现再对 RedStone HTTP API 批量目录端点最多 3 次尝试后也返回 `ENOTFOUND api.redstone.finance`。该 workflow 的其余 12 个 provider job 成功，`Publish feed registry mirror` finalizer 成功；RedStone 错误时未执行 absent-feed pruning。

同一时间点 Supabase 只读复核：RedStone chain 0 有 25 条 active feed，其中 18 条从未成功、7 条最近成功时间超过 30 天，最新成功时间为 2026-10-03 05:20:44 UTC；chain 143 有 9 条 active feed，全部有成功观测，最新为 2026-11-28 07:30:27 UTC。代码现在会有界重试、保留底层 DNS/TLS 错误，并安全尝试官方 batch API fallback，但该执行环境无法解析两个公开 RedStone host；不能把旧缓存或其它 provider 的报价标记成 RedStone 报价。

| 项目                            | 当前状态                                                                                  | 关闭条件                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Feed registry 并发镜像刷新      | 已修复；每个 discovery workflow 由单个 finalizer 刷新，连续三次生产 run 的 finalizer 成功 | 持续观察定时运行                                                                                                         |
| 部分 discovery 失败时的 pruning | 已修复；provider discovery 报错时跳过 absent-feed pruning 并让 job 失败                   | 持续观察定时运行                                                                                                         |
| RedStone discovery 目录         | 未恢复；两个官方 HTTP hostname 均在 GitHub runner DNS 解析失败                            | 恢复 runner 到 RedStone DNS/HTTPS 的网络路径，或配置供应商提供的可用认证 gateway 与 API key；随后重跑 RedStone discovery |
| RedStone chain 0 feed 健康      | 仍待验证；18/25 无成功观测，7/25 超过 30 天                                               | RedStone 目录与价格读取恢复后运行 feed reactivation/单 feed 价格验证                                                     |
| Supra 历史数据                  | 仍待凭据；GitHub repository 和 Production environment 没有 `SUPRA_DORA_HISTORY_API_KEY`   | 配置 Supra 发放的 history API key，再验证 REST candles                                                                   |
| Supra DORA REST quorum          | 按安全设计保持排除                                                                        | 实现或使用经审计的 Pull 合约证明验证，并加入端到端验证后再评估晋级                                                       |

这里的 `ENOTFOUND` 出现在 GitHub Actions runner，不只是当前开发机的网络故障；开发机直接与命令级代理探测 RedStone host 也无法建立 TLS。完成后续两项供应商/运行环境输入前，不能声称所有 source 已全部恢复。
