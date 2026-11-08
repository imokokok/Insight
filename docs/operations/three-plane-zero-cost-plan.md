# Supabase + Turso + Cloudflare 三线并行：零成本分工与实施计划

状态：目标架构（非探索方向）。全部账号按 **Free / Hobby** 档规划。
存储只有三样：**Supabase、Turso、Cloudflare D1（PriorSeal 侧）**。**R2 已取消，不引入**（用户决定），本文不保留任何 R2 待办。
约束：不 push、不 `--no-verify`、不 deploy、不改生产环境变量、不对生产库写入；
C1–C4 档位基数与地板数值、运行时判词字面量均不在本计划改动范围内。

## 0. 前提修正（先于分工表）

| 事实                                                                                                                                                                                                                                                  | 处理方式                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel 为 Hobby：Cron 每天最多 1 次、精度 ±59 分钟；当前 `crons.definitions=[]`；11/1–11/7 有 140 次生产部署并已出现 Fluid Compute 预警                                                                                                               | **Vercel 不进入分工表的任何“承接方”行**。只托管 Next.js 应用；后台任务、补偿任务、批处理一律不新增到 Vercel 函数                                                                                                                                         |
| Cloudflare 账号下只有 PriorSeal 的 5 个 Worker，没有 Insight 的采集/投影 Worker                                                                                                                                                                       | 迁移 0115/0118 描述的“Cloudflare 主时钟”在当前账号并未落地；现行权威时钟是 0121 的 Supabase `pg_cron` → GitHub `workflow_dispatch`。计划按“Cloudflare 无 Insight Worker”写                                                                               |
| Supabase `pg_cron` 现役 17 个 job：**13 个 dispatcher**（含第二探针）+ **4 个独立清理**（`nightly-retention-cleanup`、`price-records-cleanup`、`rate-limits-cleanup`、`api-keys-deactivation`）；0133 已把 18 个日清合并为 1 个，active 从 31 降到 17 | 搬定时器只省调度开销，价格明细一行不少。剩余启动竞争来自 dispatcher 的分钟分布，批次围绕**数据落点与读路径**，不围绕“把定时器搬家”                                                                                                                       |
| `snapshot_slots` 的 30 天压缩与小时投影**执行**已经在 GitHub Actions 投影器里，不在数据库内                                                                                                                                                           | 只把“触发”留在 `pg_cron`。本计划不把触发搬到边缘；理由与可选做法见 §5                                                                                                                                                                                    |
| Cloudflare R2 当前未开通（账号接口 10042），且**用户已决定取消 R2**                                                                                                                                                                                   | 不引入第四种存储。所有“冷存/外置”设想作废；存储压力只能在 Supabase 与 Turso 现有额度内解决                                                                                                                                                               |
| Cloudflare Free 硬边界：Cron 5 条/账号、10 ms CPU/次、100,000 请求/日；D1 10 万行写/日、5 GB                                                                                                                                                          | 边缘线只接“能用 5 条 cron + 10 ms CPU 完成”的轻活；15 分钟级采集不接                                                                                                                                                                                     |
| Turso Free：100 库、5 GB、5 亿行读/月、1,000 万行写/月                                                                                                                                                                                                | **已确认三线中最宽松**：账号下只有 `insight-imokokok` 一个库，库内用量=账号用量；96.1 MB / 5 GB ≈ 1.9%，按 30 天线性增长约 417 MB 仍不足 10%，写入 154–214 万行/月 ≈ 15–21%。平台 token 缺口对“存储与写入”已消除；**月度行读无实测**，只能按访问模式估计 |

**关于 10 ms 与 PriorSeal p50 21–26 ms 的矛盾**：现有 p50 很可能来自墙钟而非计费 CPU，不能据此认定档位，也不能据此认为 10 ms 的 Worker 一定够用。任何边缘方案都必须先用一次真实调用验证计费 CPU，再决定是否上线。

**cron 合并判据（新增）**：同频、同窗口、彼此无依赖的**清理类** job 应合并，减少 job 数与启动竞争；采集派发、快照探针等关键路径不合并（它们的失败语义和重试策略不同）。

## 1. 分工表

落点只有四个：**Supabase**（权威关系/事务/审计）、**Turso**（高频 append/控制面）、**Cloudflare**（D1 轻量与可选派发；**不接 R2**）、**GitHub Actions**（唯一能跑长任务的采集/投影计算面）。Vercel 仅作为应用托管，不承接任何后台负载。

### 1.1 Supabase

| 库/表/任务                                          | 写入方                                                 | 读取方                             | 更新频率                       | 保留期                     | 失败回退                                                          | 为什么在这一侧（判据）                                                                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------ | ---------------------------------- | ------------------------------ | -------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oracle_feeds` + feed registry                      | 每周 discovery、后台管理                               | 采集器（经 Turso 镜像）、目录 API  | 每周/人工                      | 无上限                     | Turso `feed_registry_snapshots` 最近一次 last-known-good（≤24 h） | 关系型权威 + RLS + 人工管理；不能因为边缘故障丢失管理意图                                                                                                                          |
| `price_records`（本批迁移目标）                     | 快照采集器（每小时批量）、少量 opt-in 写入             | 价格 API 热路径、导出、signals     | 每小时批量                     | 24 h TTL                   | 开关回 `supabase` 继续读写；Turso 失败时回落 Supabase             | 现为 Supabase I/O 剩余最大项：9 个索引（含 2 个 GIN）+ 每 30 分钟清理。搬到 Turso 删掉 Postgres 写放大。判据是“I/O/行”，不是“表大小”                                               |
| `hourly_price_snapshots`                            | GitHub Actions 投影器 → `project_turso_price_slot` RPC | 历史 API、日报、UI                 | 每小时（由 15 分钟 slot 投影） | 120 天（7 天后转 archive） | 回读 Turso `price_snapshots` 原始 slot 重投影；receipt 幂等       | 业务投影 + RPC + JSONB + receipt 审计。**实测 2026-11-08：92,747 行 / 36 MB，只覆盖 2026-10-24 → 11-08（约 15 天）**；7 天以前已在 archive。不是容量主源，也不再做保留期以外的动作 |
| `price_snapshots`（Supabase 旧 15 分钟历史）        | 仅 Turso 主模式之前的存量；切换后不再新增              | 归档、历史回放                     | 冻结                           | 120 天                     | 无新增，读到存量为止                                              | 历史连续性；到期后归档并停止读取，属于“技术上能搬但没必要”                                                                                                                         |
| `snapshot_archives`                                 | `archive_snapshot_day`（库内，日更）                   | 历史视图/导出（SQL 内 JSONB 展开） | 每天                           | 120 天                     | 归档事务失败则源行保留（同事务）                                  | **唯一的冷存层，不外置**。实测 110 MB（heap 39 MB + 索引 6 MB + TOAST ≈ 71 MB）；hourly 107 天、price 84 天，区间内零缺口。R2 已取消，见 §3                                        |
| `market_reference_snapshots`                        | `snapshot-collect.yml` 的 market-reference 作业        | 行情参考 API、coverage             | 15 分钟批次内，受采样门控      | 120 天                     | 返回上一有效快照并标注年龄                                        | 关系型 join + 权利门控 + JSONB 元数据；当前不是最大写入方，暂不搬                                                                                                                  |
| `dex_market_swap_events`                            | `monad-dex-market.yml`（每 10 分钟）                   | `get_dex_market_volume_window` RPC | 每 10 分钟                     | 35 天                      | 返回上一窗口并标注不完整                                          | 追加写 + SQL 聚合；候选批次 3，先量行数再决定搬 Turso 还是缩保留期                                                                                                                 |
| `feed_health_snapshots`                             | feed 健康评估（采集器/API）                            | 可信度趋势、SLA                    | 每日/批次                      | 90 天                      | 返回最近一次健康状态                                              | 与 `oracle_feeds` 关系 join；候选批次 3                                                                                                                                            |
| `oracle_watch_checks`                               | API 检查 + 每小时采集                                  | 审计、导出、计费凭证               | 按调用/每小时                  | 180 天                     | 保留上次结果并标注                                                | 签名审计、RLS、与 entitlement/计费耦合；**不该搬**                                                                                                                                 |
| `oracle_watch_windows`                              | `oracle-watch-collect.yml`                             | 窗口交付、审计                     | 每小时                         | 180 天                     | 保留上次结果                                                      | 同上；行很小，搬走收益可忽略                                                                                                                                                       |
| `turso_price_slot_receipts`                         | 投影器 RPC                                             | 补偿探针、完整性审计               | 每 15 分钟 slot                | 随 slot（量小）            | 无 receipt 则触发补偿                                             | 跨库投影完整性的锚；必须与小时投影同事务，**不能搬**                                                                                                                               |
| `cron_dispatch_runs`                                | dispatcher                                             | 运维看板                           | 每次派发                       | 30 天                      | 无                                                                | 派发账本；搬走只会多一个跨库失败点                                                                                                                                                 |
| 计费/额度/API key/`execution_receipts`              | API、billing worker                                    | API、后台                          | 实时                           | 90–180 天                  | 事务回滚                                                          | `FOR UPDATE`、序列、RLS、签名审计；**技术上搬不了**                                                                                                                                |
| `coverage_slo_samples`、`manip_cost_pool_snapshots` | 采集/评估                                              | 运维看板                           | 15 分钟/日                     | 90/365 天                  | 无                                                                | 观测数据，量小；暂留                                                                                                                                                               |

### 1.2 Turso

| 库/表/任务                                                                          | 写入方                      | 读取方                  | 更新频率     | 保留期                               | 失败回退                                           | 为什么在这一侧（判据）                                                               |
| ----------------------------------------------------------------------------------- | --------------------------- | ----------------------- | ------------ | ------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `snapshot_slots`                                                                    | GitHub Actions 采集器       | 投影器、补偿            | 15 分钟      | 原始 slot 30 天；ACK 后 payload 压缩 | Supabase 小时投影仍在；slot 丢失由下一个 slot 覆盖 | 不可变 outbox + 租约；写便宜、读按 slot                                              |
| `price_snapshots`（Turso 原始流）                                                   | 采集器                      | 投影器、历史兜底        | 15 分钟      | 30 天                                | Supabase 小时投影                                  | 高频 append 的正确落点；54% 占用来自未压缩 payload，按 §5 调压缩窗口                 |
| `price_latest`                                                                      | 采集器                      | 价格 API 兜底、历史合并 | 每 slot 覆盖 | 永久覆盖                             | 回读 `price_snapshots`                             | 热读模型，避免扫事件流                                                               |
| `snapshot_ingest_leases`                                                            | 采集器                      | 采集器/补偿             | 每 slot      | 短期                                 | 租约过期后可重取                                   | 跨 runner 互斥；放 Supabase 会把并发协调变成网络事务                                 |
| `feed_registry_snapshots`                                                           | 采集器发布                  | 采集器                  | 每日/变更    | 24 h 信任窗                          | 回读 Supabase `oracle_feeds`                       | 让 Supabase 故障不阻断原始采集                                                       |
| `price_maintenance`                                                                 | 投影器                      | 投影器                  | 每日         | 永久                                 | 下一次运行重试                                     | 维护水位；与 raw 表同库                                                              |
| `settlement_market_watch`、`settlement_window_candles`、`settlement_evidence_packs` | GitHub Actions 结算采集     | 证据交付 API            | 每小时       | 按市场生命周期                       | 保留上次证据包                                     | 已有 Turso 控制面；签名包原文与索引同在 Turso，不再外置（R2 已取消）                 |
| **`price_records`（本批新增）**                                                     | 采集器（Turso 主模式/双写） | 价格 API、导出、signals | 每小时批量   | 24 h TTL                             | 开关关闭即回 Supabase；Turso 读失败回落 Supabase   | 与原始价格流同库，去掉 9 个 Postgres 索引的写放大；24 h TTL 用 `ttl_ms` 索引廉价清理 |

### 1.3 Cloudflare

| 库/表/任务                                                     | 写入方     | 读取方                     | 更新频率     | 保留期 | 失败回退                       | 为什么在这一侧（判据）                                                                                                           |
| -------------------------------------------------------------- | ---------- | -------------------------- | ------------ | ------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| ~~R2 系列（archive 原文 / x402 证据包 / PriorSeal evidence）~~ | **已取消** | —                          | —            | —      | —                              | **用户决定不引入 R2**；Insight 冷数据留在 Supabase `snapshot_archives`，证据包留在 Turso。此前的外置方案已整节删除，不再列为待办 |
| Worker Cron：应急派发（可选，未部署）                          | 部署时配置 | GitHub `workflow_dispatch` | 15 分钟 1 条 | —      | 保留 Supabase `pg_cron` 主时钟 | 免费版仅 5 条 cron；只值得用于“控制面整体故障”的应急，不接采集                                                                   |
| D1：`price_records` 备选（不采用）                             | —          | —                          | —            | —      | —                              | 10 万行写/日够用，但会新增第二份价格缓存和跨库同步；Turso 已免费且已是价格主库，拒绝重复落点                                     |
| KV：边缘读缓存（不采用）                                       | —          | —                          | —            | —      | —                              | 价格 API 是动态鉴权 + 多参数组合，KV 命中率无法预计；在 10 ms CPU 下也难证明净收益                                               |

### 1.4 GitHub Actions（计算面，不是存储）

| 任务                                                                                                                           | 作用                                                       | 当前触发                          | 是否可被边缘替代      | 说明                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------- | --------------------- | ---------------------------------------------------------------------- |
| `snapshot-collect.yml`                                                                                                         | 原始采集 + market reference + manip cost + settlement 门控 | Supabase `pg_cron` 每 15 分钟派发 | 否                    | 单次运行远超 10 ms CPU / 5 分钟边缘预算；GitHub 是唯一免费长任务执行面 |
| `turso-price-project.yml`                                                                                                      | slot → Supabase 小时投影、30 天清理/ACK payload 压缩       | Supabase `pg_cron` 每 15 分钟派发 | 否（可换触发，见 §5） | 执行已在外置，搬触发不减少写入                                         |
| `monad-dex-market.yml`                                                                                                         | DEX swap 事件                                              | 每 10 分钟                        | 否                    | 写入 Supabase，批次 3 评估落点                                         |
| `oracle-watch-collect.yml`                                                                                                     | watch 窗口                                                 | 每小时                            | 否                    | 审计表留 Supabase                                                      |
| `feed-cadence-cron.yml`、`coverage-slo.yml`、`daily-report-publish-cron.yml`、`reputation-cron.yml`、`safety-outcome-cron.yml` | 基线与报表                                                 | 每日/2 小时/15 分钟               | 否                    | 量小，保持现状                                                         |
| 补偿：`turso-snapshot/fallback`、`turso-projection-fallback`                                                                   | 未投影 slot 恢复                                           | 15 分钟探针                       | 否                    | receipt 命中即退出，边际成本低                                         |

**GitHub Actions 额度缺口**：公开仓库的标准 runner 不计费；若仓库为私有，Free 计划只有 2,000 分钟/月，而每 15 分钟一次的长任务会先打穿额度。必须先核实仓库可见性与当月分钟数，否则“GitHub 当主力”不成立。

## 2. 不该动的边界

### 2.1 技术上搬不了（或搬了会破坏正确性）

| 对象                                                         | 原因                                                                                     |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 计费/额度/订阅/发票/API key                                  | 需要 `FOR UPDATE`、序列、事务、RLS；跨库无法原子扣减                                     |
| `turso_price_slot_receipts` + `project_turso_price_slot` RPC | 小时投影与 receipt 必须同一事务；跨库会留下“投影成功但无 receipt”或反之                  |
| `snapshot_archives` + `archive_snapshot_day`                 | 归档写入与源表删除在同一事务；entries 是唯一的 7–120 天历史载体，不能外置（R2 已取消）。 |
| `oracle_watch_checks` 签名审计 / `execution_receipts`        | 签名、RLS、计费凭证要求同库可审计                                                        |
| Supabase Auth / RLS 策略                                     | 与数据库角色绑定，搬到 Turso 等于重写鉴权                                                |
| Turso 的 slot 租约与 `price_latest`                          | 跨 runner 互斥与热读模型；搬到 Postgres 会把并发协调变成网络事务                         |

### 2.2 技术上能搬但不该搬

| 对象                         | 理由                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `hourly_price_snapshots`     | 它是业务投影和 receipt 审计的一部分；实测现表仅 36 MB / 约 15 天，7 天以前已转 archive，不存在 334 MB 的容量问题 |
| `oracle_feeds`               | 管理权威 + RLS；采集中断时 Turso 镜像已能兜底 24 h                                                               |
| `oracle_watch_windows`       | 行很小，搬走只增加跨库复杂度                                                                                     |
| `coverage_slo_samples`       | 观测数据，无业务事务需求，但量小、收益不可验证                                                                   |
| `market_reference_snapshots` | 权利门控与 join 仍在 Supabase；只有实测证明它是写放大主源才搬                                                    |

### 2.3 判据

- **技术能搬但收益不可验证** → 不做。例如把 `oracle_watch_windows` 搬 Turso，省不下可测量的 I/O，只多一个失败点。
- **技术搬不了** → 不设计跨库事务补丁；改为在同一库内做保留期/索引/批量优化。
- 任何“更合理”的说法都不算指标；每批必须有 `n_tup_ins/n_tup_del`、表大小、行数或路径调用数之一。

## 3. 归档 job 实测与「Supabase 空间从哪来」（R2 已取消）

**R2 已取消，本节不再保留任何冷存/外置方案，也不作为待办。** 存储只有 Supabase、Turso、Cloudflare D1（PriorSeal 侧）。

### 3.1 机制（代码事实）

`archive_snapshot_day` 每天把**早于 7 天、晚于 120 天**的 `price_snapshots` / `hourly_price_snapshots` 行按 (day, provider, symbol, chain) 打包进 `snapshot_archives`，同事务校验 `checksum` 后按精确 ID 集删除源行；行数不一致则整体回滚。
`maintain_snapshot_archives` 每天 19:07 UTC 运行，**只归档「最老的一个未归档日」**。
**没有「有活跃写入就跳过」的逻辑**：`archive_snapshot_day` 只有 `pg_try_advisory_xact_lock(192736,64)`，抢不到锁直接抛异常，不会静默跳过；`maintain_snapshot_archives` 也没有跳过分支。

### 3.2 实测（2026-11-08，只读查询生产库）

| 项目                           | 实测                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| 整库                           | **438 MB / 500 MB**；`max_connections=60`                                                        |
| `snapshot_archives`            | **110 MB**（heap 39 MB + 索引 6 MB + TOAST ≈ 71 MB）                                             |
| ↳ `kind='hourly'`              | 107 个不同日期，**2026-07-09 → 2026-10-23**，392,557 条                                          |
| ↳ `kind='price'`               | 84 个不同日期，**2026-08-01 → 2026-10-23**，1,177,310 条                                         |
| 日期连续性                     | 两类各自区间内**零缺口**；archive 最大日 10-23 与现表最小日 10-24 **首尾相接**                   |
| `hourly_price_snapshots`       | 92,747 行 / **36 MB**（heap 11 MB + 索引 26 MB），2026-10-24 → 11-08                             |
| `price_snapshots`              | 158,695 行 / **75 MB**，2026-10-24 → 10-31 18:15（Turso 切换后冻结）                             |
| `snapshot-archive-maintenance` | 30 天内成功 7 次、失败 2 次（11-06、11-07），失败原因**全部是 `job startup timeout`**            |
| `snapshot-archive-cleanup`     | 30 天内成功 6 次、失败 3 次（同一超时）；archive 下界停在 07-09，120 天截止已是 07-11，仅差 2 天 |

失败样本全库一致（0133 合并清理 job **之前**统计）：`rate-limits-cleanup` 170 次、`github-dispatch-mark-stale` 130 次、`github-dispatch-snapshot-collect` 88 次，报错均为 `job startup timeout`。

### 3.3 结论：归档正常，数据无缺口

- **不属于「归档断了」**，也**不属于「只归档 price 没归档 hourly」**：两类都连续，且 hourly 覆盖 107 天、price 覆盖 84 天。
- **「hourly 约 334 MB / archive 只有 110 MB」的矛盾不成立**：334 MB 是推算值（6756 行/日 × 120 天），实测 hourly 现表只有 36 MB / 约 15 天。7 天以前的 hourly 已经在 archive 里。
- 真实问题是**吞吐与启动可靠性**，不是逻辑跳过：
  1. 归档速率恒为 1 天/次、1 次/天，没有追赶能力；每漏一次运行就永久多 1 天积压。诊断时积压 8 天（10-24 → 10-31），执行改造后见 §3.6。
  2. `job startup timeout` 是 `max_connections=60` 下 pg_cron 启动竞争的全库症状，会周期性再发生，因此积压会持续累积。0133 已把 18 个日清合并成 `nightly-retention-cleanup`（active 31 → 17），剩下的竞争主要来自 **13 个 dispatcher 挤在同样的五组分钟上**（`0,15,30,45` / `3,18,33,48` / `7,22,37,52` / `10,25,40,55` / `12,27,42,57`）。

### 3.4 Supabase 空间从哪来（结论）

1. **先靠归档把冻结存量搬走，不需要砍保留期**：`price_snapshots` 在 10-31 后已不再新增（Turso 已承接），随归档每天搬走 1 天，**8 天后行数归零**。实测每归档 1 天 archive 只增长 **约 2 MB**；且 `DELETE` 不释放文件空间，收益是**停止增长并复用空闲页**，不是整库数字立刻下降。
2. **hourly 现表是稳定值**：约 15 天 × 2.4 MB/天 ≈ 36 MB，不会再随 120 天窗口线性增长；archive 稳态是 **113 天**（120 天窗口减去 7 天热区），按当前密度约 115–120 MB，不会无限增长。
3. **余量**：整库 438 MB / 500 MB，当前余量约 **62 MB**。此前记录的 452 MB / 40.9 MB 余量已被归档消耗掉一部分，说明其它表也在缓慢增长，仍需盯。
4. **修 job 的最小动作（2026-11-08 已执行，见 §3.6）**：
   - 把 `maintain_snapshot_archives` 从「每次 1 天」改为「循环到积压清空（带上限与 `statement_timeout`）」；
   - 给 `snapshot-archive-maintenance` 增加 1 次补跑（例如 05:07 UTC），失败后当天还有第二次机会；
   - 把 13 个 dispatcher 的分钟分布拉开（现在 `0,15,30,45` / `3,18,33,48` / `7,22,37,52` / `10,25,40,55` / `12,27,42,57` 已经很密）；清理 job 合并在 0133 已完成，不再重复。

### 3.5 保留期：现在有一项可直接推进

| 项                                                      | 状态                                                            | 理由                                                                        |
| ------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `TURSO_PRICE_ACKED_PAYLOAD_RETENTION_DAYS` 30 → 7       | **已授权**：仓库变量已设 `7`；workflow 传参行已改，待推送后生效 | 只压缩已 ACK 的 slot payload，不删除业务历史；读取方审计见 §3.6             |
| `hourly_price_snapshots` / `snapshot_archives` 120 → 90 | **暂不动**                                                      | archive 稳态仅 113 天，砍到 90 天省不到 20 MB；且会提前删掉本该被归档的历史 |
| `feed_health_snapshots` 90 → 60                         | **暂不动**                                                      | 31 MB，收益不足以承担历史损失；等归档积压清空后再评估                       |
| `market_reference_snapshots` 120 → 90                   | **待评估**（与归档无关）                                        | 37 MB，可独立做，但需先确认读取方窗口                                       |

### 3.6 2026-11-08 执行记录（已落生产，未回滚）

迁移 `0134_archive_catchup_bound.sql` 已应用：

- `maintain_snapshot_archives(p_max_days, p_max_seconds)`：单次最多 **3 天 / 45 秒**，两天各跑一次 → 容量 6 天/日 对 到达 1 天/日，3 倍余量；零参数包装保留，cron 命令不变。
- 新增 `snapshot-archive-maintenance-early` @ **05:07 UTC**；原 `19:07 UTC` 保留。
- advisory lock 语义不变（抢不到锁仍抛异常）；同一天重复归档由 `ON CONFLICT` + 时间戳去重合并保证不产生重复行。

执行数字：

| 时点        | 整库   | price 行/天数 | hourly 行/天数 | archive 天数/大小 | 积压天数 |
| ----------- | ------ | ------------- | -------------- | ----------------- | -------- |
| 迁移前      | 438 MB | 158,695 / 8   | 93,074 / 16    | 107 / 110 MB      | 8        |
| 手工跑 1 天 | 440 MB | 140,540 / 7   | 87,573 / 15    | 108 / 112 MB      | 7        |

手工跑返回 `moved_price=18,155`、`moved_hourly=5,501`、`archive_rows=23,656`；重复 archive 行检查 = **0**。
剩余 7 天积压由 19:07 + 05:07 两次 3 天配额清空，最迟 **2026-11-09 19:07 UTC** 后归零；稳态 archive 约 **1 MB/日**，113 天上限约 115–120 MB。
**整库大小不会因此下降**：`DELETE` 只释放页内空间，`price_snapshots` 文件大小保持 75 MB，直到这些空闲页被新数据复用。

ACK payload 读取方审计（`30 → 7` 前置）：

- `listPendingTursoPriceSlots` / 投影 worker 只读**未 ACK** slot，不受影响。
- `captureTursoPriceSlot` 按 `slot_ms` 读 payload；对已压缩的旧 slot 会返回 `inputs: []`，但唯一调用方只用 `summary` / `slotMs` / `inputHash`，不使用 `inputs`。
- 仓库内没有其它 SQL/脚本读 `canonical_payload`；`input_hash`、`raw_digest`、`summary_json` 压缩后仍保留。
- 结论：**不存在回看超过 7 天 payload 的读取方**；唯一损失是 7 天后无法用 payload 做人工取证重放，30 天内仍可从 `price_snapshots` 原始行重放。

## 4. 实施批次

排序原则：先做“I/O 收益最大、可回滚、默认关闭”的；**再做归档 job 加固（唯一能腾出空间的确定性手段）**；容量类决策最后，且要人工批准。R2 已取消。

### 批次 1：`price_records` 读写切 Turso + ACK payload 压缩窗口可调（本批代码）

改造内容：

- 新增 Turso `price_records` 表（schema v7）与仓储层；采集器写入、API 读取、导出、signals 全部走开关。
- 开关 `TURSO_PRICE_RECORDS_MODE`：`supabase`（默认）/ `shadow`（双写、读 Supabase）/ `turso`（读写 Turso，失败回落 Supabase）。
- 开关 `TURSO_PRICE_RECORDS_FALLBACK_ON_MISS`：默认 `true`，切换后前 24 小时用 Supabase 补齐存量。
- 新增 `TURSO_PRICE_ACKED_PAYLOAD_RETENTION_DAYS`：默认 `30`（保持现状），可设 `7` 提前压缩已 ACK 的 slot payload；原始行仍按 `TURSO_PRICE_RAW_RETENTION_DAYS=30` 保留。

验收指标（可验证）：

1. 默认 `supabase`：现有测试全绿；生产行为不变（本批不部署，仅代码级验证）。
2. `shadow`：同一采集 tick 后，Turso 与 Supabase 的 `price_records` 行数增量相等；抽样 100 行字段一致。
3. `turso`：Supabase `pg_stat_user_tables.price_records` 的 `n_tup_ins + n_tup_del` 增量在 1 小时内为 0（清理 job 仍在跑但删 0 行）；Turso `price_records` 行数增量等于基线。
4. 导出对比：同一时间窗、同一 limit，`/api/v1/price-records/export` 与开关关闭时的记录集合哈希一致。
5. 压缩窗口：`TURSO_PRICE_ACKED_PAYLOAD_RETENTION_DAYS=7` 后，`snapshot_slots` 中 ACK 且 slot 早于 7 天的 `canonical_payload` 长度从约 83 KB 降到 `{"slotMs":...,"inputs":[]}`；`price_snapshots` 行数不受影响。

达不到时怎么说：Supabase Free 不暴露逐表 WAL/IO 字节，若 `pg_stat_user_tables` 也不可读，则只能验证“写入行数 0”，不能宣称 IO 字节下降；此时指标降级为行数 + 表大小，并明确写“IO 字节未验证”。

回滚：

- 读/写：把 `TURSO_PRICE_RECORDS_MODE` 改回 `supabase`，无需改 schema；`shadow` 期间 Supabase 一直有写入，切回无数据缺口。
- `turso` 期间若 Supabase 未双写，切回前最多缺一个采集周期的缓存行；`fallback_on_miss` 会继续从 Turso 读到 TTL 结束。
- 压缩窗口改回 `30` 不会恢复已压缩 payload（不可逆），但 hash/summary/审计字段仍在；这是唯一不可逆项，故默认保持 30。

### 批次 2：归档追赶（已执行）+ dispatcher 分钟重排（待做）

归档部分已于 2026-11-08 执行（`0134_archive_catchup_bound.sql`，见 §3.6），保留期一律不动。

待做：**13 个 dispatcher 的分钟重排**。清理 job 已由 0133 合并为 `nightly-retention-cleanup`（active 31 → 17），再合并清理没有收益；现在的竞争源是 dispatcher 挤在 `0,15,30,45` / `3,18,33,48` / `7,22,37,52` / `10,25,40,55` / `12,27,42,57` 这几组分钟上。

- 目标：同一分钟最多 2 个 dispatch job；避开 `05:07` / `19:07` 归档跑和 `07:00` 快照写入。
- 不合并 dispatcher：它们的 command 与 workflow 一一对应，合并会把“单次 dispatch 失败”放大成“多条线路一起失败”。

验收指标：

1. 积压天数（`(utc_today-7) - max(archive_day)`）在 3 天内从 8 降到 0，此后每日保持 0–1。
2. `snapshot-archive-maintenance` 的 `job startup timeout` 次数在 14 天内为 0；若仍出现，先看同分钟 dispatch 并发数，而不是继续合并 cleanup。
3. `price_snapshots` 的 `n_live_tup` 在 8 天内从 158,695 降到 0；**整库不再增长**（`DELETE` 不释放文件空间，整库大小不会向下回落）。
4. 15 分钟 slot 的创建率在同一窗口内恢复到应有数量；`job startup timeout` 与丢窗按同一次运行的时间戳对账。

回滚：dispatcher 恢复原 schedule 即可；归档函数回退见 `0134_archive_catchup_bound.sql` 末尾的 ROLLBACK 块（恢复单天函数、删除 2 参数版本、unschedule `-early`）。已归档数据不会自动回退。

保留期（`hourly`/archive 120→90、`feed_health` 90→60）**不放在本批**：等积压清零、且 `price_snapshots` 行数归零后再单独评估，见 §3.5。

### 批次 3：`dex_market_swap_events` 与 `feed_health_snapshots` 的落点/保留期

先量行数与写入字节，再二选一：

- 若 `dex_market_swap_events` 是写放大主源：搬 Turso（35 天 append），把 `get_dex_market_volume_window` 改为应用层聚合；开关 `TURSO_DEX_EVENTS_MODE` 默认 `supabase`。
- 若只是容量问题：35 → 14 天，保留 Supabase。

验收：Supabase 该表写入行数降为 0（或保留期生效后稳态行数下降）；同一窗口的聚合结果与旧 RPC 完全一致；导出/看板无回归。
回滚：开关回 `supabase`；保留期回原值。
无法给出指标的情况：若该表行数 <10 万且日增 <1 MB，搬走收益不可验证，直接不做，只保留现状。

### 批次 4：历史表退场（无 R2）

- `price_snapshots`（Supabase）在归档把存量搬空后停止读取并退场；指标：表行数 0、相关查询不再报错。这一步由批次 2 的归档加固自然完成，不需要单独搬数据。
- **不做任何 R2 外置**：archive 原文留在 Supabase，证据包留在 Turso。若将来 500 MB 再次吃紧，可选手段只剩「保留期调整」与「把更多写入移向 Turso」，两者都要人工批准。

## 5. `snapshot_slots` 压缩与小时投影的调度：具体做法与结论

**结论：不搬触发，只搬执行（执行已经在外置）。**

- 压缩：`pruneExpiredTursoPriceEvents` 在 `turso-price-project.yml` 中运行，每天最多一次，压缩 ACK 且早于 `rawRetentionDays` 的 payload，并删除同 cutoff 的 `price_snapshots`。这是 GitHub Actions 内执行，不是库内 job。
- 小时投影：`project_turso_price_slot` 由 GitHub Actions 投影器调用；`pg_cron` 只负责每 15 分钟发一次 `workflow_dispatch`。
- 因此“把调度从数据库内挪到外置”的净收益 = 0 行价格写入减少，只少了 2 次/小时的账本写入 + HTTP。按修正后的判断，**不做**。

如果仍要脱离 Supabase 时钟，零成本可行做法（不建议，且本批不实施）：

1. Cloudflare Worker 加 1 条 cron（`3,18,33,48 * * * *`），用 `scheduled()` 调 GitHub `workflow_dispatch`；占用 5 条免费 cron 中的 1 条，CPU 仅一次 fetch。
2. 保留现有 Turso lease 与 Supabase receipt：两条时钟同时触发时，后到者拿到 `already_captured` 或 receipt 命中，快速退出；不会重复读上游。
3. 在 Supabase 侧 `cron.unschedule('github-dispatch-turso-price-project')` 后才算切换；否则是双时钟。
4. 验收：连续 24 小时每 15 分钟都有 receipt；重复投影数 0；GitHub 运行数不高于现状。
5. 风险：免费账号只有 5 条 cron，一旦再需要别的边缘定时任务就会挤占；且没有证据表明 Supabase 时钟本身是 I/O 主源。所以默认不做。

## 6. 缺口清单

### 6.1 凭据

- ~~Turso 平台 token~~：**对“存储与写入”已不再是缺口**。账号下只有 `insight-imokokok` 一个库，库内用量=账号用量，可直接按 Free 5 GB / 1,000 万行写算占比。**月度行读仍无实测**（库不记录读计数），文档一律写“按访问模式估计”，不填数字。
- **Cloudflare Analytics 只读 token**：现有用量来自面板人工读数，无法自动核对 Workers/Cron/D1 边界。
- ~~R2 开通~~：已取消，不再是缺口。
- Supabase 只读指标访问：**已验证可用**（`aws-1-ap-south-1.pooler.supabase.com:5432` + `SUPABASE_DB_PASSWORD`，`default_transaction_read_only=on`）。`pg_stat_user_tables`、`cron.job_run_details`、表大小均可读。

### 6.2 实测数据

已完成（2026-11-08 只读实测，见 §3.2）：整库 438 MB、`snapshot_archives` 110 MB 构成、`hourly_price_snapshots` 36 MB / 92,747 行、`price_snapshots` 75 MB / 158,695 行、各表大小与归档 job 执行记录。

仍缺：

- `price_records` 每小时写入行数与 `n_tup_ins/n_tup_del` 增量（批次 1 的“X → 0”基线）。
- `market_reference_snapshots`（37 MB）、`dex_market_swap_events`（21 MB）、`feed_health_snapshots`（31 MB）的行数明细与日增速度。
- GitHub 仓库可见性与当月 Actions 分钟数（决定“GitHub 当主力”是否免费成立）。
- Supabase 两次 `io_stalled` 的逐表归因（Free 档可能没有 `pg_stat_statements`；拿不到就明确写“不可归因”）。
- **Turso 月度行读无实测**：只能按访问模式估计。

### 6.3 必须由人拍板

可直接推进（不涉及业务历史）：

- `TURSO_PRICE_ACKED_PAYLOAD_RETENTION_DAYS` 30 → 7：已授权；仓库变量已设 `7`，workflow 传参行已改但**尚未推送**，因此生产侧此刻仍按默认 30 运行。只压缩已 ACK 的 slot payload，ACK 后 7 天以上无法重放原文，只有 hash/summary。

等归档积压清零后再决定（当前先不动）：

- `hourly_price_snapshots` 120 → 90 天。
- `snapshot_archives` 120 → 90 天（archive 当前仅 107 天，砍到 90 天省不到 20 MB）。
- `feed_health_snapshots` 90 → 60 天（31 MB，收益不足以承担历史损失）。
- `market_reference_snapshots` 120 → 90 天（37 MB，与归档无关，可独立评估）。

其他：

- 是否升级 Supabase compute（付费；本计划不依赖）。
- `dex_market_swap_events` 搬 Turso 还是缩保留期。
- 仓库可见性/Actions 额度策略。

## 7. 若只花 5 美元/月升 Workers Paid，会多出什么

这一节只用于决策，零成本方案不依赖它。

| 能力         | Free      | Workers Paid（$5/月）                              | 能接什么                                            | 接不了什么                                 |
| ------------ | --------- | -------------------------------------------------- | --------------------------------------------------- | ------------------------------------------ |
| Cron Trigger | 5 条/账号 | 250 条/账号                                        | 把 13 个 dispatcher 分散到边缘，或每类任务独立 cron | 仍不能替代 GitHub 的 12 分钟采集           |
| CPU          | 10 ms/次  | 30 M CPU-ms/月；cron 单次默认 30 s、可配置到 5 min | 在 Worker 内做 D1 对账、轻量聚合、单次派发          | 完整采集器（Node/链上 SDK/多 RPC）仍超预算 |
| D1 行写      | 10 万/日  | 5,000 万/月（约 166 万/日）                        | `price_records` 这类小表可直接放 D1                 | 与 Turso 重复；不建议为此新增第二主库      |
| D1 行读      | 500 万/日 | 250 亿/月                                          | 边缘读模型/导出索引                                 | 不能替代 Turso 的原始流                    |
| 请求         | 10 万/日  | 无上限                                             | 边缘读缓存、证据签名 URL                            | 仍受回源与 Supabase 连接数限制             |

**判断**：$5 最值得买的是“250 条 cron + 5 分钟 CPU 的独立派发/补偿”，不是“把采集搬到边缘”。如果只买一项能力，优先用它把 Supabase 时钟依赖降为备份，而不是把 D1 变成第二个价格库。

## 8. 本批代码改动（对应批次 1）

| 项       | 内容                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------ |
| 开关     | `TURSO_PRICE_RECORDS_MODE=supabase`（默认）/`shadow`/`turso`                                           |
| 开关     | `TURSO_PRICE_RECORDS_FALLBACK_ON_MISS=true`（默认）                                                    |
| 开关     | `TURSO_PRICE_ACKED_PAYLOAD_RETENTION_DAYS=30`（默认，保持现状；建议 7）                                |
| schema   | Turso v7：`price_records` + `(provider,symbol,chain,timestamp_ms DESC)`、`ttl_ms`、`timestamp_ms` 索引 |
| 代码     | 采集器写入、`getPriceFromDatabase`、历史合并、两个导出路由、signals 路由均走开关                       |
| 默认关闭 | 不设置任何环境变量时，读写仍走 Supabase，行为与现状一致                                                |
| 回滚     | 环境变量改回 `supabase`；无 schema 回滚；压缩窗口不可逆（默认不动）                                    |

本批不部署、不写生产库、不改生产环境变量；所有验证都在内存 libSQL 与单元测试中完成。默认不设开关时，行为与现状一致。

实现状态（本批）：

| 项                              | 文件                                                            | 验证                                                                      |
| ------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Turso `price_records` 表 + 索引 | `src/lib/turso/price/schema.ts`                                 | 内存 libSQL 建表/索引，schema v7                                          |
| 读写仓储                        | `src/lib/turso/price/recordsRepository.ts`                      | 4 个用例：去重/跳过非法价、latest、chain NULL、过滤分页、TTL 删除         |
| API 读取封装                    | `src/lib/turso/price/recordsQuery.ts`                           | 失败返回 null，调用方决定是否回落                                         |
| 写入/读取开关                   | `src/lib/turso/price/client.ts`                                 | 默认 `supabase`；`shadow`/`turso` 校验；压缩窗口默认 30、可设 7、拒绝 >30 |
| 采集写入 + API 读取 + 历史      | `src/lib/oracles/utils/storage.ts`                              | 默认路径不变；Turso 失败写入回落 Supabase                                 |
| 三个读取路由                    | `price-records/export`、`v1/price-records/export`、`v1/signals` | 仅在 `turso` 模式走冷库，`shadow`/默认仍读 Supabase                       |
| ACK payload 提前压缩            | `src/lib/turso/price/slotRepository.ts`                         | 7 天窗口压缩 10/40 天 ACK、保留 3 天 payload                              |

验证结果：`jest` 4 个套件 39 个用例通过，`tsc --noEmit` 通过，ESLint 通过。**未执行**：生产 Turso 迁移、双写切换、任何部署——这些需要人工批准与生产凭据。
