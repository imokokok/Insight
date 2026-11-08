# Supabase + Turso + Cloudflare 三线并行：零成本分工与实施计划

状态：目标架构（非探索方向）。全部账号按 **Free / Hobby** 档规划。
约束：不 push、不 `--no-verify`、不 deploy、不改生产环境变量、不对生产库写入；
C1–C4 档位基数与地板数值、运行时判词字面量均不在本计划改动范围内。

## 0. 前提修正（先于分工表）

| 事实                                                                                                                                    | 处理方式                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel 为 Hobby：Cron 每天最多 1 次、精度 ±59 分钟；当前 `crons.definitions=[]`；11/1–11/7 有 140 次生产部署并已出现 Fluid Compute 预警 | **Vercel 不进入分工表的任何“承接方”行**。只托管 Next.js 应用；后台任务、补偿任务、批处理一律不新增到 Vercel 函数                                                           |
| Cloudflare 账号下只有 PriorSeal 的 5 个 Worker，没有 Insight 的采集/投影 Worker                                                         | 迁移 0115/0118 描述的“Cloudflare 主时钟”在当前账号并未落地；现行权威时钟是 0121 的 Supabase `pg_cron` → GitHub `workflow_dispatch`。计划按“Cloudflare 无 Insight Worker”写 |
| Supabase `pg_cron` 30 个 job：13 个 dispatcher 只写账本 + `pg_net` 发 HTTP；17 个是库内清理                                             | 搬定时器只省调度开销，价格明细一行不少。批次围绕**数据落点与读路径**，不围绕“把定时器搬家”                                                                                 |
| `snapshot_slots` 的 30 天压缩与小时投影**执行**已经在 GitHub Actions 投影器里，不在数据库内                                             | 只把“触发”留在 `pg_cron`。本计划不把触发搬到边缘；理由与可选做法见 §5                                                                                                      |
| Cloudflare R2 当前未开通（账号接口 10042）                                                                                              | R2 只能出方案，不能建 bucket；分工表标注“待开通”                                                                                                                           |
| Cloudflare Free 硬边界：Cron 5 条/账号、10 ms CPU/次、100,000 请求/日；D1 10 万行写/日、5 GB                                            | 边缘线只接“能用 5 条 cron + 10 ms CPU 完成”的轻活；15 分钟级采集不接                                                                                                       |
| Turso Free：100 库、5 GB、5 亿行读/月、1,000 万行写/月                                                                                  | 当前 96.1 MB、9 天 10.7 MB/日、154–214 万行写/月，均在额度内；按 30 天线性增长约 417 MB，仍安全                                                                            |

**关于 10 ms 与 PriorSeal p50 21–26 ms 的矛盾**：现有 p50 很可能来自墙钟而非计费 CPU，不能据此认定档位，也不能据此认为 10 ms 的 Worker 一定够用。任何边缘方案都必须先用一次真实调用验证计费 CPU，再决定是否上线。

**cron 合并判据（新增）**：同频、同窗口、彼此无依赖的**清理类** job 应合并，减少 job 数与启动竞争；采集派发、快照探针等关键路径不合并（它们的失败语义和重试策略不同）。

## 1. 分工表

落点只有四个：**Supabase**（权威关系/事务/审计）、**Turso**（高频 append/控制面）、**Cloudflare**（边缘只读缓存、R2 对象、可选派发）、**GitHub Actions**（唯一能跑长任务的采集/投影计算面）。Vercel 仅作为应用托管，不承接任何后台负载。

### 1.1 Supabase

| 库/表/任务                                          | 写入方                                                 | 读取方                             | 更新频率                       | 保留期          | 失败回退                                                          | 为什么在这一侧（判据）                                                                                                               |
| --------------------------------------------------- | ------------------------------------------------------ | ---------------------------------- | ------------------------------ | --------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `oracle_feeds` + feed registry                      | 每周 discovery、后台管理                               | 采集器（经 Turso 镜像）、目录 API  | 每周/人工                      | 无上限          | Turso `feed_registry_snapshots` 最近一次 last-known-good（≤24 h） | 关系型权威 + RLS + 人工管理；不能因为边缘故障丢失管理意图                                                                            |
| `price_records`（本批迁移目标）                     | 快照采集器（每小时批量）、少量 opt-in 写入             | 价格 API 热路径、导出、signals     | 每小时批量                     | 24 h TTL        | 开关回 `supabase` 继续读写；Turso 失败时回落 Supabase             | 现为 Supabase I/O 剩余最大项：9 个索引（含 2 个 GIN）+ 每 30 分钟清理。搬到 Turso 删掉 Postgres 写放大。判据是“I/O/行”，不是“表大小” |
| `hourly_price_snapshots`                            | GitHub Actions 投影器 → `project_turso_price_slot` RPC | 历史 API、日报、UI                 | 每小时（由 15 分钟 slot 投影） | 120 天          | 回读 Turso `price_snapshots` 原始 slot 重投影；receipt 幂等       | 业务投影 + RPC + JSONB + receipt 审计；6756 行/日、120 天约 334 MB，是容量主源但**不是 I/O 主源**，先做保留期决策再谈外置            |
| `price_snapshots`（Supabase 旧 15 分钟历史）        | 仅 Turso 主模式之前的存量；切换后不再新增              | 归档、历史回放                     | 冻结                           | 120 天          | 无新增，读到存量为止                                              | 历史连续性；到期后归档并停止读取，属于“技术上能搬但没必要”                                                                           |
| `snapshot_archives`                                 | `archive_snapshot_day`（库内，日更）                   | 历史视图/导出（SQL 内 JSONB 展开） | 每天                           | 120 天          | 归档事务失败则源行保留（同事务）                                  | **可外置 R2**，但 Supabase 必须保留索引表与暂存重放表；读取方要改为应用层冷读。详见 §3.3                                             |
| `market_reference_snapshots`                        | `snapshot-collect.yml` 的 market-reference 作业        | 行情参考 API、coverage             | 15 分钟批次内，受采样门控      | 120 天          | 返回上一有效快照并标注年龄                                        | 关系型 join + 权利门控 + JSONB 元数据；当前不是最大写入方，暂不搬                                                                    |
| `dex_market_swap_events`                            | `monad-dex-market.yml`（每 10 分钟）                   | `get_dex_market_volume_window` RPC | 每 10 分钟                     | 35 天           | 返回上一窗口并标注不完整                                          | 追加写 + SQL 聚合；候选批次 3，先量行数再决定搬 Turso 还是缩保留期                                                                   |
| `feed_health_snapshots`                             | feed 健康评估（采集器/API）                            | 可信度趋势、SLA                    | 每日/批次                      | 90 天           | 返回最近一次健康状态                                              | 与 `oracle_feeds` 关系 join；候选批次 3                                                                                              |
| `oracle_watch_checks`                               | API 检查 + 每小时采集                                  | 审计、导出、计费凭证               | 按调用/每小时                  | 180 天          | 保留上次结果并标注                                                | 签名审计、RLS、与 entitlement/计费耦合；**不该搬**                                                                                   |
| `oracle_watch_windows`                              | `oracle-watch-collect.yml`                             | 窗口交付、审计                     | 每小时                         | 180 天          | 保留上次结果                                                      | 同上；行很小，搬走收益可忽略                                                                                                         |
| `turso_price_slot_receipts`                         | 投影器 RPC                                             | 补偿探针、完整性审计               | 每 15 分钟 slot                | 随 slot（量小） | 无 receipt 则触发补偿                                             | 跨库投影完整性的锚；必须与小时投影同事务，**不能搬**                                                                                 |
| `cron_dispatch_runs`                                | dispatcher                                             | 运维看板                           | 每次派发                       | 30 天           | 无                                                                | 派发账本；搬走只会多一个跨库失败点                                                                                                   |
| 计费/额度/API key/`execution_receipts`              | API、billing worker                                    | API、后台                          | 实时                           | 90–180 天       | 事务回滚                                                          | `FOR UPDATE`、序列、RLS、签名审计；**技术上搬不了**                                                                                  |
| `coverage_slo_samples`、`manip_cost_pool_snapshots` | 采集/评估                                              | 运维看板                           | 15 分钟/日                     | 90/365 天       | 无                                                                | 观测数据，量小；暂留                                                                                                                 |

### 1.2 Turso

| 库/表/任务                                                                          | 写入方                      | 读取方                  | 更新频率     | 保留期                               | 失败回退                                           | 为什么在这一侧（判据）                                                               |
| ----------------------------------------------------------------------------------- | --------------------------- | ----------------------- | ------------ | ------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `snapshot_slots`                                                                    | GitHub Actions 采集器       | 投影器、补偿            | 15 分钟      | 原始 slot 30 天；ACK 后 payload 压缩 | Supabase 小时投影仍在；slot 丢失由下一个 slot 覆盖 | 不可变 outbox + 租约；写便宜、读按 slot                                              |
| `price_snapshots`（Turso 原始流）                                                   | 采集器                      | 投影器、历史兜底        | 15 分钟      | 30 天                                | Supabase 小时投影                                  | 高频 append 的正确落点；54% 占用来自未压缩 payload，按 §5 调压缩窗口                 |
| `price_latest`                                                                      | 采集器                      | 价格 API 兜底、历史合并 | 每 slot 覆盖 | 永久覆盖                             | 回读 `price_snapshots`                             | 热读模型，避免扫事件流                                                               |
| `snapshot_ingest_leases`                                                            | 采集器                      | 采集器/补偿             | 每 slot      | 短期                                 | 租约过期后可重取                                   | 跨 runner 互斥；放 Supabase 会把并发协调变成网络事务                                 |
| `feed_registry_snapshots`                                                           | 采集器发布                  | 采集器                  | 每日/变更    | 24 h 信任窗                          | 回读 Supabase `oracle_feeds`                       | 让 Supabase 故障不阻断原始采集                                                       |
| `price_maintenance`                                                                 | 投影器                      | 投影器                  | 每日         | 永久                                 | 下一次运行重试                                     | 维护水位；与 raw 表同库                                                              |
| `settlement_market_watch`、`settlement_window_candles`、`settlement_evidence_packs` | GitHub Actions 结算采集     | 证据交付 API            | 每小时       | 按市场生命周期                       | 保留上次证据包                                     | 已有 Turso 控制面；签名包可后续外置 R2 原文                                          |
| **`price_records`（本批新增）**                                                     | 采集器（Turso 主模式/双写） | 价格 API、导出、signals | 每小时批量   | 24 h TTL                             | 开关关闭即回 Supabase；Turso 读失败回落 Supabase   | 与原始价格流同库，去掉 9 个 Postgres 索引的写放大；24 h TTL 用 `ttl_ms` 索引廉价清理 |

### 1.3 Cloudflare

| 库/表/任务                                     | 写入方                                              | 读取方                                                         | 更新频率              | 保留期                                                               | 失败回退                                                                                | 为什么在这一侧（判据）                                                                       |
| ---------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **R2：`snapshot_archives` 原文**（待开通）     | GitHub Actions `archive-upload`，先算 hash 再条件写 | `safetyOutcomeService`、导出 API、历史脚本（经 Supabase 索引） | 每 archive_day × 分组 | 索引删除后 30 天宽限                                                 | `SNAPSHOT_ARCHIVE_R2_READS=off` 回读 Supabase archive；读取失败报 `archive_unavailable` | 不可变、按 key 取、不参与实时 SQL 的冷原文；但读取路径要从 SQL 视图改为应用层，详见 §3       |
| **R2：x402 证据包/attestation 原文**（待开通） | GitHub Actions 结算作业，内容寻址                   | 证据交付 API（签名 URL）                                       | 每证据包              | 与 Turso `settlement_evidence_packs.payload_hash` 对账；孤儿 30 天删 | 对象缺失时回读 Turso 索引并报 `evidence_unavailable`                                    | 不可变、按 hash 取；库里只留 hash 与索引                                                     |
| **R2：PriorSeal evidence 原文**（待开通）      | PriorSeal 独立任务                                  | PriorSeal API                                                  | 每 artifact           | D1 索引 vs R2 逐 key 校验                                            | 同上                                                                                    | 与 Insight 共用 10 GB；12 个月合计见 §3.5                                                    |
| Worker Cron：应急派发（可选，未部署）          | 部署时配置                                          | GitHub `workflow_dispatch`                                     | 15 分钟 1 条          | —                                                                    | 保留 Supabase `pg_cron` 主时钟                                                          | 免费版仅 5 条 cron；只值得用于“控制面整体故障”的应急，不接采集                               |
| D1：`price_records` 备选（不采用）             | —                                                   | —                                                              | —                     | —                                                                    | —                                                                                       | 10 万行写/日够用，但会新增第二份价格缓存和跨库同步；Turso 已免费且已是价格主库，拒绝重复落点 |
| KV：边缘读缓存（不采用）                       | —                                                   | —                                                              | —                     | —                                                                    | —                                                                                       | 价格 API 是动态鉴权 + 多参数组合，KV 命中率无法预计；在 10 ms CPU 下也难证明净收益           |

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

| 对象                                                         | 原因                                                                                                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 计费/额度/订阅/发票/API key                                  | 需要 `FOR UPDATE`、序列、事务、RLS；跨库无法原子扣减                                                                       |
| `turso_price_slot_receipts` + `project_turso_price_slot` RPC | 小时投影与 receipt 必须同一事务；跨库会留下“投影成功但无 receipt”或反之                                                    |
| `snapshot_archives` + `archive_snapshot_day`                 | 归档写入与源表删除在同一事务；**entries 可以外置 R2，但索引与暂存重放表必须留库**，且纯 SQL 视图不能跨 R2。外置方案见 §3.3 |
| `oracle_watch_checks` 签名审计 / `execution_receipts`        | 签名、RLS、计费凭证要求同库可审计                                                                                          |
| Supabase Auth / RLS 策略                                     | 与数据库角色绑定，搬到 Turso 等于重写鉴权                                                                                  |
| Turso 的 slot 租约与 `price_latest`                          | 跨 runner 互斥与热读模型；搬到 Postgres 会把并发协调变成网络事务                                                           |

### 2.2 技术上能搬但不该搬

| 对象                         | 理由                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `hourly_price_snapshots`     | 它是业务投影和 receipt 审计的一部分；6756 行/日虽大，但按 334 MB/120 天计算仍在 500 MB 内可管理，优先调保留期 |
| `oracle_feeds`               | 管理权威 + RLS；采集中断时 Turso 镜像已能兜底 24 h                                                            |
| `oracle_watch_windows`       | 行很小，搬走只增加跨库复杂度                                                                                  |
| `coverage_slo_samples`       | 观测数据，无业务事务需求，但量小、收益不可验证                                                                |
| `market_reference_snapshots` | 权利门控与 join 仍在 Supabase；只有实测证明它是写放大主源才搬                                                 |

### 2.3 判据

- **技术能搬但收益不可验证** → 不做。例如把 `oracle_watch_windows` 搬 Turso，省不下可测量的 I/O，只多一个失败点。
- **技术搬不了** → 不设计跨库事务补丁；改为在同一库内做保留期/索引/批量优化。
- 任何“更合理”的说法都不算指标；每批必须有 `n_tup_ins/n_tup_del`、表大小、行数或路径调用数之一。

## 3. R2：Insight 侧契合度排序与具体方案

统一约束（所有 R2 行适用）：R2 只做「按 key 取一个对象」，**不做频繁列目录、不做范围扫描、不做热读**；免费 10 GB、Class A 100 万次/月、Class B 1,000 万次/月；**当前未开通（10042）**，只能出方案。跨系统没有共同事务，顺序固定为「算 hash → 幂等写对象 → 提交索引」；未经 hash 验证的对象绝不暴露给读取接口。

### 3.1 先纠正一个会影响方案的事实

`archive_snapshot_day` 每天把 `price_snapshots` / `hourly_price_snapshots` 中**早于 7 天、晚于 120 天**的行按 (day, provider, symbol, chain) 打包进 `snapshot_archives`，并在同一事务里删除源行。因此：

- `hourly_price_snapshots` 的**热表实际只有最近 7 天**；7–120 天的冷数据在 `snapshot_archives` 的 `kind='hourly'` 分组里。
- 如果实测看到 `hourly_price_snapshots` 本身有约 334 MB / 120 天，则说明归档 job 没有跑成功或被跳过（它会在活跃查询 ≥3 或采集派发中时主动跳过）。**先验证 110 MB archive 与 334 MB 表是否同时存在；两者不应同时为真。**
- 所以“`snapshot_archives` 外置”和“`hourly_price_snapshots` 冷段外置”在当前实现里是**同一个冷存**的两个视图。真正要外置的是 `snapshot_archives` 的 entries，而不是再给 hourly 建第二套冷存。

### 3.2 契合度排序（按代码证据）

| 排名 | 对象                                                | 判定                                                  | 代码证据                                                                                                       | 改动面                                                                                                         |
| ---- | --------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1    | `snapshot_archives`（110 MB，JSONB+TOAST）          | 适合，但**不是纯存储搬家**：读取路径目前在 SQL 视图里 | `0064` 建 `snapshot_archives` 与 `jsonb_populate_recordset` 视图；`archive_snapshot_day` 同事务写归档 + 删源行 | 新增索引表 + outbox；两个视图改为热表 + 应用层冷读；导出 API 改签名 URL/流式读取。预计改动 4 个读取方，见 §3.4 |
| 2    | `hourly_price_snapshots` 冷段（若确实存在 334 MB）  | 与外置 archive 重复；应合并到同一冷存                 | `archive_snapshot_day` 的 7 天 cutoff；`maintain_snapshot_archives`                                            | 不新建第二套；先修复归档 job，再按排名 1 做。只有确认归档 disabled 时才做 30/90 天分层                         |
| 3    | x402 结算 / attestation / evidence pack 原始 bundle | 适合：不可变、按 hash 取、不参与实时 SQL              | `settlement_evidence_packs` 已在 Turso，含 `payload_hash`                                                      | GitHub Actions 写 R2 + Turso 留索引；读取用签名 URL                                                            |
| 4    | `snapshot_slots.canonical_payload`                  | **不适合**                                            | 83 KB/槽、热写入、投影器每 15 分钟读取                                                                         | 保留 Turso；R2 延迟与按次操作会让采集变慢                                                                      |

### 3.3 `snapshot_archives` 外置的具体设计

**索引表（Supabase，新建）**

```sql
CREATE TABLE public.snapshot_archive_objects (
  kind text NOT NULL CHECK (kind IN ('price','hourly')),
  archive_day date NOT NULL,
  provider text NOT NULL,
  symbol text NOT NULL,
  chain_id integer NOT NULL,
  r2_key text NOT NULL UNIQUE,
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes bigint NOT NULL,
  row_count integer NOT NULL,
  source_checksum text NOT NULL,
  status text NOT NULL CHECK (status IN ('object_written','source_deleted')),
  written_at timestamptz NOT NULL,
  PRIMARY KEY (kind, archive_day, provider, symbol, chain_id)
);
```

`entries` 原文不再进 Supabase；索引行只保留 key/hash/size/row_count/日期。

**对象格式与 key**

- 对象体 = 当前 `entries` 的 JSON 数组（保留原始行类型字段），gzip 后上传（`Content-Encoding: gzip`）。
- key = `insight/archives/{kind}/{YYYY-MM-DD}/{provider}/{symbol}/{chainId}-{sha256}.json.gz`。按日期与分组分前缀，读取时由索引直接给 key，**不需要 list**。
- 条件写 `If-None-Match: *`；已存在且 hash 相同视为成功（幂等），hash 不同则报冲突，不覆盖。

**写入顺序（无共同事务的补偿）**

1. GitHub Actions `archive-upload` 作业按天读取待归档分组（先在 Supabase 里算出 `entries`、`sha256`、`row_count`）。
2. 写 R2 对象；成功后用服务角色插入 `snapshot_archive_objects(status='object_written')`。
3. 第二个事务校验 `sha256` 与 `row_count`，删除源表对应精确行，并把索引置为 `source_deleted`。
4. 任一步崩溃都可重试：对象已存在 → 条件写命中；索引已存在 → upsert；源行已删 → 删除数 0 视为成功。
5. **读取接口只认 `status='source_deleted'` 的索引行**，避免读到“对象已写但源行还在”的重复数据。

**重放路径（原文不在库里怎么办）**

当前没有独立的 PL/pgSQL “重放函数”；重放就是 `price_snapshot_history` / `hourly_snapshot_history` 视图里的：

```sql
CROSS JOIN LATERAL jsonb_populate_recordset(NULL::public.<source_table>, a.entries) s
```

调用方（实测）：

| 调用方                                         | 读什么                                                          | 是否必须与原文同库                            | 改法                                                                                          |
| ---------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/lib/api/services/safetyOutcomeService.ts` | `price_snapshot_history`、`hourly_snapshot_history`，按窗口取行 | **不需要**同库，只需要按时间窗拿到行          | 改为应用层：先查索引表得到 key 列表，再按 key 取 R2 对象，解压后与热表结果合并、去重          |
| `src/lib/supabase/snapshotArchives.ts`         | `snapshot_archive_exports`（分页导出 payload）                  | **不需要**同库                                | 改为索引分页 + 逐对象流式下载；或直接给签名 URL                                               |
| `scripts/snapshotHistoryPages.ts`              | `hourly_snapshot_history` 分页                                  | **不需要**同库                                | 改为“热表 + R2 对象”分页读取                                                                  |
| ML 训练 `ml/train.py`                          | 直接读 `hourly_price_snapshots`（8 周）                         | **需要可 SQL 查询**，但 8 周已跨过 7 天归档线 | 训练前先跑一个 `hydrate-cold-window` 作业：按需从 R2 取回指定日期到临时表/本地 DuckDB，再训练 |
| `oracleWatchBackfill`                          | `hourly_price_snapshots`（数月）                                | 一次性任务，可用应用层                        | 同上，改为冷读脚本，不要求库内重放                                                            |

结论：**重放函数必须与原文同库**这个前提不成立；成立的是“SQL 视图不能跨 R2”。所以方案是保留一个**暂存表** `snapshot_archive_replay(kind, archive_day, provider, symbol, chain_id, entries jsonb)`，需要库内重放时先把 R2 对象灌进暂存表，再对暂存表跑 `jsonb_populate_recordset`。这是一次读路径改造，不是把存储换个地方。

**读取退化与回退**

- 新开关 `SNAPSHOT_ARCHIVE_R2_READS=off`（默认 off）：off 时仍读 Supabase `snapshot_archives`，行为不变。
- R2 读取失败：返回 `archive_unavailable` 并标注缺失日期；不静默返回不完整窗口（尤其 safety/outcome 计算必须显式失败）。
- 外置后 Supabase 侧只保留索引，**不要立刻删 archive 表**；保留 30 天双读期，用 `checksum` 校验 R2 对象与库内 entries 一致后再切换。

### 3.4 R2 行明细（Insight + PriorSeal 合计）

| 对象                                                   | 写入方                                  | 读取方                                               | key 规则                                                                       | 孤儿收敛                                                                                                                      | 生命周期/版本                                                                         |
| ------------------------------------------------------ | --------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `snapshot_archives` 原文（Insight）                    | GitHub Actions `archive-upload`，条件写 | `safetyOutcomeService`、导出 API、历史脚本（经索引） | `insight/archives/{kind}/{day}/{provider}/{symbol}/{chainId}-{sha256}.json.gz` | 每日比对 `snapshot_archive_objects` 与 R2 前缀光标（**用索引逐 key HEAD，不 list**）；无索引对象 >7 天移 `_orphans/`，30 天删 | 不启用版本控制（内容寻址不覆盖）；中止未完成 multipart 1 天；索引删除后对象保留 30 天 |
| x402 证据包 / attestation 原文（Insight）              | GitHub Actions 结算作业                 | 证据交付 API（签名 URL）                             | `insight/evidence/{market}/{sha256}.json`                                      | 与 Turso `settlement_evidence_packs.payload_hash` 对账                                                                        | 同上                                                                                  |
| PriorSeal verification bundle / review manifest / 附件 | PriorSeal 独立任务                      | PriorSeal API                                        | `evidence/{project}/{environment}/sha256/{artifactHash}.json`                  | D1 索引 vs R2 逐 key 校验                                                                                                     | 同上                                                                                  |

### 3.5 12 个月容量判断（是否撞 10 GB）

| 项                                        | 12 个月估算        | 依据                                        |
| ----------------------------------------- | ------------------ | ------------------------------------------- |
| PriorSeal receipt bundle + evidence 原文  | 3.3 GB             | 用户给定                                    |
| Insight `snapshot_archives`（120 天滚动） | 约 0.11 GB（稳态） | 实测 110 MB，内容寻址 + gzip 后不会显著更大 |
| Insight 证据包                            | **未实测**         | 必须用“包数 × 单包大小”实测；不能拍脑袋     |
| 合计可用余量                              | 约 6.6 GB          | 10 − 3.3 − 0.11                             |

判断：12 个月不撞 10 GB 的条件是 Insight 证据包平均每天 < **18 MB**（6.6 GB / 365 天）。超过这个阈值就必须给证据包单独设生命周期（例如只保留最近 12 个月 + 已交付的 90 天），否则会与 PriorSeal 共享额度时撞线。Class A/B 不是瓶颈：归档按天打包，写入是每天数十次；读取由索引驱动，不做 list。

R2 **不是不可篡改存证**：不可篡改性仍由 canonical hash + 签名 + Merkle + 外部锚定承担，R2 只是原文载体。

## 4. 实施批次

排序原则：先做“I/O 收益最大、可回滚、默认关闭”的；容量类决策次之；跨库搬表再次；R2/边缘最后。

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

### 批次 2：保留期与 cron 合并（需人工批准，零代码或少量 SQL）

改造内容：

- `hourly_price_snapshots` 120 → 90 天；`snapshot_archives` 120 → 90 天；`market_reference_snapshots` 120 → 90 天；`feed_health_snapshots` 90 → 60 天（先量体积，不足 20 MB 则不动）。
- 合并 17 个库内清理：同频/同窗口/无依赖的放到 2–3 个夜间批处理函数；不合并 dispatcher、receipt 探针和采集派发。

验收指标：

1. `cron.job` 数量从 30 降到 ≤20；`cron.job_run_details` 中清理 job 的失败数 0，且不再出现同一分钟多个大 DELETE。
2. 7 天滚动增长：`hourly_price_snapshots` 的 `n_live_tup` 在 30 天后比改前低约 25%（810k → 608k 行的稳态口径）；Supabase 数据库不再持续逼近 500 MB。
3. 注意：`DELETE` 不会让文件立即变小；指标只能是 live tuples 与增长速度，不能承诺“库容立刻降 111 MB”。如需回收文件，需要 `VACUUM FULL`/重建，Free 档不可行，必须说明。

回滚：保留期改回原值即可；已删除的冷数据无法恢复（这是人工决策项，必须先确认 90 天历史足够）。

### 批次 3：`dex_market_swap_events` 与 `feed_health_snapshots` 的落点/保留期

先量行数与写入字节，再二选一：

- 若 `dex_market_swap_events` 是写放大主源：搬 Turso（35 天 append），把 `get_dex_market_volume_window` 改为应用层聚合；开关 `TURSO_DEX_EVENTS_MODE` 默认 `supabase`。
- 若只是容量问题：35 → 14 天，保留 Supabase。

验收：Supabase 该表写入行数降为 0（或保留期生效后稳态行数下降）；同一窗口的聚合结果与旧 RPC 完全一致；导出/看板无回归。
回滚：开关回 `supabase`；保留期回原值。
无法给出指标的情况：若该表行数 <10 万且日增 <1 MB，搬走收益不可验证，直接不做，只保留现状。

### 批次 4：历史表退场与 R2 证据原文（部分被账号阻断）

- `price_snapshots`（Supabase）在 Turso 主模式满 120 天后停止读取、归档后退场；指标：表行数 0、相关查询不再报错。
- **R2：`snapshot_archives` 原文外置（排名 1）**。前置条件是 R2 开通 + `snapshot_archive_objects` 索引表 + 读取方改造（§3.3）。分三步：
  1. 双写 30 天：archive 仍进 Supabase，同时写 R2 对象；每日用 `sha256` 比对，差异 0 才进入下一步。
  2. 读切换：`SNAPSHOT_ARCHIVE_R2_READS` 从 `off` 切到 `on`，四个读取方逐一验收（safetyOutcome、导出、历史脚本、ML/backfill）。
  3. 停止写 entries：Supabase 只留索引；archive 表保留 30 天回滚窗口后清理。
- 指标：索引行数 = R2 对象数；`snapshot_archives` 表大小从 110 MB → 索引大小（预计 <2 MB）；冷读 P95 延迟与同库查询对比（对象 <1 MB 时目标 ≤300 ms，达不到就说明读取路径要加本地缓存）；孤儿对象 7 天内收敛为 0。
- 回滚：`SNAPSHOT_ARCHIVE_R2_READS=off` 且 archive 表未删，仍可读；对象保留 30 天宽限。
- **被“R2 未开通”阻断**：本批只能出方案，不能建 bucket、不能验收。

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

- **Turso 平台 token**（读数据库用量、行读写、存储）：当前只有 DB URL/auth token，无法用平台 API 拉用量。
- **Cloudflare Analytics 只读 token**：现有用量来自面板人工读数，无法自动核对 Workers/Cron/D1/R2 边界。
- **R2 开通**：账号接口 10042；未开通前不能建 bucket、不能验证 Class A/B 与生命周期。
- Supabase 只读指标访问：若无法读 `pg_stat_user_tables`/`cron.job_run_details`，批次 1 的 IO 指标只能降级为行数。

### 6.2 实测数据

- `price_records` 当前行数、表大小、每小时写入行数（用于“X → 0”的 X）。
- `market_reference_snapshots`、`dex_market_swap_events`、`feed_health_snapshots`、`snapshot_archives` 的行数与表大小。
- `snapshot_archives` 中 price/hourly 两类各占多少（110 MB 的构成）。
- GitHub 仓库可见性与当月 Actions 分钟数（决定“GitHub 当主力”是否免费成立）。
- Supabase 两次 `io_stalled` 的逐表归因（Free 档可能没有 `pg_stat_statements`；拿不到就明确写“不可归因”）。
- Turso 平台侧 rows written/read 的实际计量口径（与客户端统计是否一致）。

### 6.3 必须由人拍板

- `hourly_price_snapshots` 120 → 90 天（稳态省约 84 MB，损失 30 天历史）。
- `snapshot_archives` 120 → 90 天（省约 27 MB）。
- `feed_health_snapshots` 90 → 60 天（先看体积）。
- `TURSO_PRICE_ACKED_PAYLOAD_RETENTION_DAYS` 30 → 7（稳态省约 180 MB，ACK 后 7 天以上无法重放原文，只有 hash/summary）。
- 是否升级 Supabase compute（付费；本计划不依赖）。
- 是否开通 R2（免费 10 GB，但需要账号操作与生命周期策略）。
- `dex_market_swap_events` 搬 Turso 还是缩保留期。
- 仓库可见性/Actions 额度策略。

## 7. 若只花 5 美元/月升 Workers Paid，会多出什么

这一节只用于决策，零成本方案不依赖它。

| 能力         | Free      | Workers Paid（$5/月）                              | 能接什么                                            | 接不了什么                                 |
| ------------ | --------- | -------------------------------------------------- | --------------------------------------------------- | ------------------------------------------ |
| Cron Trigger | 5 条/账号 | 250 条/账号                                        | 把 13 个 dispatcher 分散到边缘，或每类任务独立 cron | 仍不能替代 GitHub 的 12 分钟采集           |
| CPU          | 10 ms/次  | 30 M CPU-ms/月；cron 单次默认 30 s、可配置到 5 min | 在 Worker 内做签名 URL、R2 对账、轻量聚合、单次派发 | 完整采集器（Node/链上 SDK/多 RPC）仍超预算 |
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
