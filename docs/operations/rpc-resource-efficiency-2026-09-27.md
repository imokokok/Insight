# Insight 后续资源优化：已验证的 RPC 收益

日期：2026-09-27，北京时间。基线代码：`dfaa86ce548c138ad522c6be55ddafe2b0f3c610`。

本次实施跨采集进程的有期限元数据复用、确定性 RPC 错误停止无效 fallback、完整响应体超时保护，以及低开销资源观测。不新增付费服务。小时表的写入、明细、健康更新、签名、来源验证和现有调度语义保持原样。

## 实际实现

- GitHub 采集每批预加载一次私有元数据缓存，最多读取 1,000 条近期记录；缺失、截断、格式异常、权限错误或服务不可用只会导致重新读取合约，不会生成默认的可信记录。
- 缓存键为 provider、chain ID、实际合约地址；有效期一小时。只持久化真实合约读取且通过 ABI/运行时校验的元数据，不使用 feed 注册表中的默认 decimals。价格、oracle 更新时间、round 和现有安全特征仍来自实时读取。
- Chainlink 使用实时 roundId 的 phase 校验缓存。phase 改变时，立即重读 decimals、description 和 version，再解析价格。此行为依据 [Chainlink 官方代理 roundId 定义](https://docs.chain.link/data-feeds/historical-data)，并有 decimals 从 8 变为 18 的升级回归测试。
- 只保存刷新过的元数据，每批最多 100 条；数据库拒绝过期或未来时间的记录，较旧刷新不能覆盖较新记录。缓存数据在实际刷新时清理七天前的旧地址，不增加新的调度任务。
- 私有表和保存函数只授权 service_role。普通 API 请求不做逐 feed 缓存查询或追加数据库写入；现有进程内元数据也有一小时期限。
- 无效请求、参数、方法和确定性 EVM revert 不再逐端点重试。节点内部错误、限流、缺少状态等仍允许 fallback；不会把合约 revert 当作端点故障。
- RPC 超时现在覆盖响应体读取。超时与调用者取消以控制器状态区分，超时仍可以切换备用节点。
- 每轮采集汇总 provider/chain/method、metadata/read、实际 attempts、successes、failures、timeouts 和累计调用耗时。日志没有 RPC URL、密钥、calldata 或响应正文；计数维度和缓存内存有上限。

## 已测收益与限制

两个独立 Node 进程分别读取生产中同样的四个 feeds：Chainlink 的 Ethereum BTC/ETH，以及 API3 的 Ethereum BTC/USD、ETH/USD。探针不写价格快照、feed 健康或业务账本，只保存验证后的元数据。

| 指标                    |   冷进程 | 复用进程 |
| ----------------------- | -------: | -------: |
| Chainlink 实际 RPC 调用 |        8 |        2 |
| API3 实际 RPC 调用      |        4 |        2 |
| 合计实际 RPC 调用       |       12 |        4 |
| 元数据 RPC 调用         |        8 |        0 |
| 实时价格 RPC 调用       |        4 |        4 |
| 元数据保存行数          |        4 |        0 |
| 探针耗时（含预加载）    | 6,961 ms | 7,268 ms |

样本内上游调用减少 66.7%；四条价格、decimals、oracle 时间戳及各自 round/confidence 一致。生产缓存四条记录占用 32 KiB，service_role 有读写权限，anon/authenticated 均无读写权限。原始脱敏证据见 [生产样本](evidence/rpc-metadata-2026-09-27.json)。

这个样本证明调用和配额收益，**没有证明端到端耗时下降**。复用轮次多一次数据库预加载，跨区域网络等待会影响结果；不能将元数据请求减少直接折算为整体延迟、磁盘 I/O 或账单同幅下降。

一小时 TTL 下，理想的四个 15 分钟轮次中，同一 Chainlink feed 从 16 次调用变为约 7 次，约减少 56.25%；API3 从 8 次变为约 5 次，约减少 37.5%。这只是无额外重试、无升级、连续命中时的路径推算，实际比例由采集日志核实。

## 观测和复现

只读数据库观测文件为 `scripts/resource-baseline.sql`。通过已登录的 Supabase CLI 执行：

```sh
supabase db query --linked --file scripts/resource-baseline.sql --output json > /private/tmp/insight-resource-window.json
```

记录数据库大小、表写入/更新/删除、死元组、临时文件和相关查询统计。query ID 按字符串保存，避免 bigint 精度损失。比较起止差值，不重置全库统计；单独区分顶层和函数内部统计，不重复相加。普通负载至少覆盖一天，并纳入真实训练、日报和维护周期，才能判断整体资源收益。

生产样本探针为 `scripts/profile-rpc-metadata.mts`，必须使用原有私有环境文件并提供冷/热模式和输出路径。探针限定四个 feeds，并验证目标是 Insight 项目；不输出凭证。

## 验证与发布

- 2,217 项应用测试通过；已有一个 live suite 保持跳过。
- 30 项可靠性测试通过，含真实 PostgreSQL 兼容 SQL 的元数据权限、数据约束、旧写保护与迁移重放测试。
- 183 项 SDK 测试通过；lint、格式、应用/脚本类型检查、未使用代码检查、RWA 离线检查通过。
- 本机生产 webpack 构建和首页 JavaScript 预算通过。默认 Turbopack 本机 worker 端口受限；远程 CI 仍使用原有默认构建流程。
- 七项 Chromium 端到端烟测通过。
- 0070 是兼容性新增迁移；未应用时，采集仅记录一次可选缓存不可用并回退原始合约读取。

## 本次不实施的方案

小时表完成小时派生可减少重复写入，但当前 mutable 小时重试、保留第一次观察的明细重试、仅写小时表的备用入口、明细写入单独失败，以及依赖小时表的安全基线/健康检查尚不能直接等价替换。本次不以改变这些行为交换推算的 75% 小时写入降幅。

不实施全供应商 JSON-RPC batch。它不自动减少真实方法调用或计费单位，还增加整批失败和慢响应影响。先消除可验证的重复元数据与无效重试，后续按新日志评估特定链上的 Multicall。
