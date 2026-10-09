# SQL 文件清单与使用顺序

本清单覆盖仓库中受 Git 管理的全部 77 个 `.sql` 文件：74 个 Supabase 迁移、1 个本地重置种子文件、2 个只读运维查询。目录中的 `node_modules/`、`.worktrees/`、备份和临时文件不是本仓库的 SQL 源文件。

## 使用规则

- `supabase/migrations/` 是**历史变更记录**；当前文件使用四位版本号，最近追加到 `0079`（序号中存在历史空缺）。既有迁移可能已应用到数据库，也被测试和文档按原路径引用；不要重命名、移动、批量格式化或修改旧迁移。需要修正当前数据库时追加新迁移。
- `supabase/seed.sql` 在 `supabase/config.toml` 的 `[db.seed]` 中启用，但当前仅有注释。基础 feed 注册位于迁移内；本地重置不会导入生产数据。
- `scripts/*.sql` 是独立的运维查询，**不会**由迁移或 seed 自动执行。通过已授权的数据库连接按各自运行手册执行；它们均为只读。
- 文件编号表示应用顺序，不表示生产数据库已经应用到该编号。发布前检查目标数据库的迁移记录、备份和 [生产发布手册](production-readiness.md)。此清单不授权对线上数据库执行任何操作。

## 迁移清单

下表中的文件均位于 `supabase/migrations/`。说明概括该迁移的主要作用，不把历史定义误当作当前最终 schema。

| 编号 | 文件                                                                                                                     | 作用                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| 0001 | [`0001_extensions.sql`](../../supabase/migrations/0001_extensions.sql)                                                   | 扩展与 schema 初始化                       |
| 0002 | [`0002_tables.sql`](../../supabase/migrations/0002_tables.sql)                                                           | 初始表、序列、默认值和外键                 |
| 0003 | [`0003_indexes.sql`](../../supabase/migrations/0003_indexes.sql)                                                         | 初始索引                                   |
| 0004 | [`0004_functions.sql`](../../supabase/migrations/0004_functions.sql)                                                     | 初始数据库函数                             |
| 0005 | [`0005_triggers.sql`](../../supabase/migrations/0005_triggers.sql)                                                       | 初始触发器                                 |
| 0006 | [`0006_rls.sql`](../../supabase/migrations/0006_rls.sql)                                                                 | 初始 RLS、策略和授权；后续迁移收紧部分权限 |
| 0007 | [`0007_cron_and_seed.sql`](../../supabase/migrations/0007_cron_and_seed.sql)                                             | 初始定时任务和配置数据                     |
| 0008 | [`0008_billing.sql`](../../supabase/migrations/0008_billing.sql)                                                         | 订阅、计费表和初始策略                     |
| 0009 | [`0009_api_key_quota_increment.sql`](../../supabase/migrations/0009_api_key_quota_increment.sql)                         | API key 配额原子递增函数                   |
| 0010 | [`0010_processed_webhook_events.sql`](../../supabase/migrations/0010_processed_webhook_events.sql)                       | 支付 webhook 事件去重表                    |
| 0011 | [`0011_get_daily_endpoint_usage.sql`](../../supabase/migrations/0011_get_daily_endpoint_usage.sql)                       | 每日 endpoint 用量查询函数                 |
| 0012 | [`0012_optimize_recalculate_reputations.sql`](../../supabase/migrations/0012_optimize_recalculate_reputations.sql)       | 声誉批量重算优化                           |
| 0013 | [`0013_revoke_anon_rpc_and_fixes.sql`](../../supabase/migrations/0013_revoke_anon_rpc_and_fixes.sql)                     | 撤销公开 RPC 权限及声誉计算修正            |
| 0014 | [`0014_billing_cron_optimizations.sql`](../../supabase/migrations/0014_billing_cron_optimizations.sql)                   | 账单定时任务的索引和批量 RPC               |
| 0015 | [`0015_crypto_billing.sql`](../../supabase/migrations/0015_crypto_billing.sql)                                           | 加密货币发票计费结构                       |
| 0016 | [`0016_hourly_snapshots_chain_id.sql`](../../supabase/migrations/0016_hourly_snapshots_chain_id.sql)                     | 小时快照加入 chain-aware 唯一性            |
| 0017 | [`0017_rename_hourly_snapshot_constraint.sql`](../../supabase/migrations/0017_rename_hourly_snapshot_constraint.sql)     | 小时快照约束改为稳定名称                   |
| 0018 | [`0018_pre_trade_safety.sql`](../../supabase/migrations/0018_pre_trade_safety.sql)                                       | 交易前安全检查审计表                       |
| 0019 | [`0019_pre_trade_protocol_safety.sql`](../../supabase/migrations/0019_pre_trade_protocol_safety.sql)                     | 交易前协议风险字段                         |
| 0020 | [`0020_pre_trade_outcome.sql`](../../supabase/migrations/0020_pre_trade_outcome.sql)                                     | 交易后结果标签字段                         |
| 0021 | [`0021_pre_trade_ml_score.sql`](../../supabase/migrations/0021_pre_trade_ml_score.sql)                                   | ML 影子评分字段                            |
| 0022 | [`0022_remove_pyth_provider.sql`](../../supabase/migrations/0022_remove_pyth_provider.sql)                               | 移除 Pyth provider 数据                    |
| 0023 | [`0023_price_snapshots_and_retention.sql`](../../supabase/migrations/0023_price_snapshots_and_retention.sql)             | 细粒度价格快照与保留策略                   |
| 0024 | [`0024_price_snapshots_unique_constraint.sql`](../../supabase/migrations/0024_price_snapshots_unique_constraint.sql)     | 价格快照唯一约束                           |
| 0025 | [`0025_feed_deactivation_observability.sql`](../../supabase/migrations/0025_feed_deactivation_observability.sql)         | Feed 停用时间与观测字段                    |
| 0026 | [`0026_attestation_provenance.sql`](../../supabase/migrations/0026_attestation_provenance.sql)                           | 交易前签名证明来源字段                     |
| 0027 | [`0027_raul_tested_feeds.sql`](../../supabase/migrations/0027_raul_tested_feeds.sql)                                     | Raul 测试资产的 feed 注册                  |
| 0028 | [`0028_seed_new_feed_integrations.sql`](../../supabase/migrations/0028_seed_new_feed_integrations.sql)                   | 新预言机集成 feed 注册                     |
| 0029 | [`0029_twap_icp_feed.sql`](../../supabase/migrations/0029_twap_icp_feed.sql)                                             | ICP TWAP feed 注册                         |
| 0030 | [`0030_icp_remove_offmarket_twap.sql`](../../supabase/migrations/0030_icp_remove_offmarket_twap.sql)                     | 移除偏离市场的 ICP TWAP feed               |
| 0031 | [`0031_dia_canary_feeds.sql`](../../supabase/migrations/0031_dia_canary_feeds.sql)                                       | DIA canary feed 注册                       |
| 0032 | [`0032_oracle_feed_cadence.sql`](../../supabase/migrations/0032_oracle_feed_cadence.sql)                                 | Feed 观测更新频率字段                      |
| 0033 | [`0033_chainlink_tbtc_feed.sql`](../../supabase/migrations/0033_chainlink_tbtc_feed.sql)                                 | Chainlink tBTC feed 注册                   |
| 0034 | [`0034_feed_health_snapshots.sql`](../../supabase/migrations/0034_feed_health_snapshots.sql)                             | Feed 健康度时间序列                        |
| 0035 | [`0035_feed_health_trust_score.sql`](../../supabase/migrations/0035_feed_health_trust_score.sql)                         | Feed 健康度信任分字段                      |
| 0036 | [`0036_oracle_watch_checks.sql`](../../supabase/migrations/0036_oracle_watch_checks.sql)                                 | Oracle Watch 单次检查审计                  |
| 0037 | [`0037_execution_receipts.sql`](../../supabase/migrations/0037_execution_receipts.sql)                                   | Execution Receipt 审计记录                 |
| 0038 | [`0038_market_reference_snapshots.sql`](../../supabase/migrations/0038_market_reference_snapshots.sql)                   | 外部市场参考价快照                         |
| 0039 | [`0039_credit_wallet.sql`](../../supabase/migrations/0039_credit_wallet.sql)                                             | 信用钱包、账本和消耗函数                   |
| 0040 | [`0040_billing_fixes.sql`](../../supabase/migrations/0040_billing_fixes.sql)                                             | 账期信用发放等修正                         |
| 0041 | [`0041_billing_v2.sql`](../../supabase/migrations/0041_billing_v2.sql)                                                   | 统一信用钱包计费模型                       |
| 0042 | [`0042_consume_credits_row_lock.sql`](../../supabase/migrations/0042_consume_credits_row_lock.sql)                       | 消耗信用时锁行，防并发超支                 |
| 0043 | [`0043_free_tier_compute_and_retention.sql`](../../supabase/migrations/0043_free_tier_compute_and_retention.sql)         | 免费层计算调度和快照保留调整               |
| 0044 | [`0044_set_based_feed_cadence.sql`](../../supabase/migrations/0044_set_based_feed_cadence.sql)                           | 集合式 feed 频率更新                       |
| 0045 | [`0045_reliable_github_dispatcher.sql`](../../supabase/migrations/0045_reliable_github_dispatcher.sql)                   | Supabase 定时调度 GitHub 任务              |
| 0046 | [`0046_execution_receipt_hardening.sql`](../../supabase/migrations/0046_execution_receipt_hardening.sql)                 | 保存完整的签名回执                         |
| 0047 | [`0047_billing_v3_scale_pricing.sql`](../../supabase/migrations/0047_billing_v3_scale_pricing.sql)                       | 扩展套餐阶梯和信用发放                     |
| 0048 | [`0048_bounded_oracle_watch_history.sql`](../../supabase/migrations/0048_bounded_oracle_watch_history.sql)               | 限界的 Oracle Watch 历史查询               |
| 0049 | [`0049_security_advisor_hardening.sql`](../../supabase/migrations/0049_security_advisor_hardening.sql)                   | Supabase Security Advisor 权限加固         |
| 0050 | [`0050_remove_retired_database_objects.sql`](../../supabase/migrations/0050_remove_retired_database_objects.sql)         | 删除退役的数据库对象                       |
| 0051 | [`0051_remove_retired_price_alerts.sql`](../../supabase/migrations/0051_remove_retired_price_alerts.sql)                 | 删除退役价格提醒结构                       |
| 0052 | [`0052_ml_data_flywheel_and_market_context.sql`](../../supabase/migrations/0052_ml_data_flywheel_and_market_context.sql) | ML 数据与市场上下文字段                    |
| 0053 | [`0053_cap_yearly_subscription_grants.sql`](../../supabase/migrations/0053_cap_yearly_subscription_grants.sql)           | 年度订阅信用发放上限                       |
| 0054 | [`0054_atomic_webhook_event_leases.sql`](../../supabase/migrations/0054_atomic_webhook_event_leases.sql)                 | Webhook 处理租约与原子并发控制             |
| 0055 | [`0055_workflow_quality_reviews.sql`](../../supabase/migrations/0055_workflow_quality_reviews.sql)                       | 工作流质量报告与人工复核结构               |
| 0056 | [`0056_coverage_slo.sql`](../../supabase/migrations/0056_coverage_slo.sql)                                               | 覆盖率 SLO 观测结构                        |
| 0057 | [`0057_coverage_slo_dispatcher.sql`](../../supabase/migrations/0057_coverage_slo_dispatcher.sql)                         | 覆盖率 SLO 定时任务调度                    |
| 0058 | [`0058_usdc_base_twap.sql`](../../supabase/migrations/0058_usdc_base_twap.sql)                                           | Base 链 USDC/WETH TWAP feed 注册           |
| 0059 | [`0059_remove_switchboard_provider.sql`](../../supabase/migrations/0059_remove_switchboard_provider.sql)                 | 停用 Switchboard provider                  |
| 0060 | [`0060_band_protocol_v3_feeds.sql`](../../supabase/migrations/0060_band_protocol_v3_feeds.sql)                           | Band Protocol v3 fallback feed 注册        |
| 0061 | [`0061_security_boundary_hardening.sql`](../../supabase/migrations/0061_security_boundary_hardening.sql)                 | 收紧浏览器角色写入边界                     |
| 0062 | [`0062_reduce_snapshot_read_io.sql`](../../supabase/migrations/0062_reduce_snapshot_read_io.sql)                         | 限界快照读取与训练游标                     |
| 0063 | [`0063_resource_efficiency.sql`](../../supabase/migrations/0063_resource_efficiency.sql)                                 | 资源效率和数据聚合优化                     |
| 0064 | [`0064_compressed_snapshot_history.sql`](../../supabase/migrations/0064_compressed_snapshot_history.sql)                 | 压缩归档表、历史视图与归档函数             |
| 0065 | [`0065_enable_snapshot_archive_maintenance.sql`](../../supabase/migrations/0065_enable_snapshot_archive_maintenance.sql) | 启用归档维护定时任务                       |
| 0066 | [`0066_preserve_archived_snapshot_writes.sql`](../../supabase/migrations/0066_preserve_archived_snapshot_writes.sql)     | 归档后保持热表写入语义                     |
| 0067 | [`0067_set_based_snapshot_archive_cleanup.sql`](../../supabase/migrations/0067_set_based_snapshot_archive_cleanup.sql)   | 集合式归档校验与清理                       |
| 0068 | [`0068_bounded_snapshot_history_pages.sql`](../../supabase/migrations/0068_bounded_snapshot_history_pages.sql)           | 限界的快照历史分页                         |
| 0069 | [`0069_normalize_archive_replay_timestamps.sql`](../../supabase/migrations/0069_normalize_archive_replay_timestamps.sql) | 归档重放时间戳标准化                       |
| 0070 | [`0070_verified_rpc_metadata_cache.sql`](../../supabase/migrations/0070_verified_rpc_metadata_cache.sql)                 | 已验证 RPC 元数据缓存                      |
| 0071 | [`0071_audit_rls_key_ownership.sql`](../../supabase/migrations/0071_audit_rls_key_ownership.sql)                         | 审计记录的 API key 所有权 RLS              |
| 0072 | [`0072_feed_cadence_live_window.sql`](../../supabase/migrations/0072_feed_cadence_live_window.sql)                       | Feed 频率只读取实时窗口                    |
| 0073 | [`0073_preserve_payable_invoices.sql`](../../supabase/migrations/0073_preserve_payable_invoices.sql)                     | 保留仍可付款的发票                         |
| 0074 | [`0074_aggregate_oracle_latency.sql`](../../supabase/migrations/0074_aggregate_oracle_latency.sql)                       | 数据库侧聚合预言机延迟统计                 |
| 0075 | [`0075_drop_unused_price_records_gin.sql`](../../supabase/migrations/0075_drop_unused_price_records_gin.sql)             | 删除未使用价格记录 GIN 索引                |
| 0077 | [`0077_x402_settlements.sql`](../../supabase/migrations/0077_x402_settlements.sql)                                       | x402 结算审计表                            |
| 0078 | [`0078_x402_settlements_network_caip2.sql`](../../supabase/migrations/0078_x402_settlements_network_caip2.sql)           | x402 v2 CAIP-2 网络 ID 约束修正            |
| 0079 | [`0079_x402_ops_lifecycle.sql`](../../supabase/migrations/0079_x402_ops_lifecycle.sql)                                   | x402 报价、付款、服务和结算运营事件        |
| 0080 | [`0080_mpp_payment_protocol.sql`](../../supabase/migrations/0080_mpp_payment_protocol.sql)                               | x402 与 MPP 付费协议审计标记               |

## 非迁移 SQL

| 文件                                                                   | 用途和执行条件                                                                                                                                                                               |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`supabase/seed.sql`](../../supabase/seed.sql)                         | 本地 `db reset` 的 seed 入口；当前没有可执行语句。                                                                                                                                           |
| [`scripts/credit-reconcile.sql`](../../scripts/credit-reconcile.sql)   | 在可读取钱包与账本的授权连接上，使用只读、可重复读事务核对余额、账本链及非法余额；参见[集成可靠性手册](integration-reliability.md)。输出统计，不修复数据。                                   |
| [`scripts/resource-baseline.sql`](../../scripts/resource-baseline.sql) | 对 `pg_stat_database`、`extensions.pg_stat_statements` 和指定表采样；要求目标库有相应扩展及读取权限。统计值需在相同负载窗口比较；参见[资源效率记录](rpc-resource-efficiency-2026-09-27.md)。 |

## 发布和维护注意点

- `0007`、`0027`–`0031`、`0033`、`0058`、`0060` 含配置或 feed 数据变更；不要把 `seed.sql` 的空内容解读为全仓库无数据迁移。
- `0055` 的头部要求先应用迁移再部署新的审计写入端；`0064` 的头部要求读取端先使用历史视图；`0065` 的头部要求归档感知的应用及 cron/ML 读取端部署后再启用归档。发布时遵守这些阶段条件。
- `0034`、`0035`、`0039` 缺少文件末尾换行。这只是历史文件的文本一致性问题；为避免更改已应用迁移的字节内容，留待有明确历史迁移重写需求时再处理。
- 本地 SQL 测试入口是 `npm run test:reliability`，覆盖账单对账、安全边界、覆盖率、快照历史及最新的延迟聚合等逻辑。它不等同于在目标 Supabase 环境执行完整迁移或通过 Security Advisor。

## 后续管理方式

1. 保持迁移目录扁平且只追加：每个独立的数据库变更使用描述性名称，把发布前置条件写在文件头部。不要按业务主题移动历史文件；按本清单检索即可。
2. 创建新迁移前，先核对本地文件与目标库的迁移记录。现有四位版本号是本项目历史约定；[Supabase 当前 CLI 文档](https://supabase.com/docs/reference/cli/supabase-migration-list)使用时间戳命名，并按版本比较本地与远端。先确认目标库接受的版本序列，再使用 CLI 生成后续文件；不要自行重编号旧文件或直接混用命名方案。
3. 每次数据库发布都先在隔离环境完整重放迁移并运行 SQL 测试，再按[生产发布手册](production-readiness.md)检查备份、阶段条件及安全顾问结果。运维查询继续留在 `scripts/`，不并入自动迁移。
4. 只有完整重放明显拖慢开发、且有经过演练的基线迁移方案时，才考虑压缩历史。[Supabase 的 squash](https://supabase.com/docs/reference/cli/supabase-migration-list)生成的是 schema-only 结果，会省略 INSERT/UPDATE/DELETE 等数据变更及定时任务；本项目有多处 feed 注册和 cron 变更，不能直接用它替换现有 74 个文件。
