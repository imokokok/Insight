# Moonwell（Base）预言机配置风险清单

- 日期：2026-10-21
- 扫描区块：Base 52,908,134（2026-10-21T18:00:15Z）
- 工具：`scripts/oracle-hunt-moonwell-base.mjs`（被动只读，零交易、零状态修改）
- 数据源：Alchemy Base RPC（链上直读）+ DexScreener（DEX 流动性）
- 原始数据：`/tmp/oracle-hunt-moonwell-base.json`

## 执行摘要

对 Moonwell Base 市场 21 个 mToken 全量执行四项检查（①协议实际引用 feed ②feed 健康度 ③操纵成本杠杆 ④币对/精度合理性）。**未发现可提交 Immunefi 的活漏洞**。发现 6 组结构性观察（见下），其中两组具公开发表价值。同时链上确认了 MAMO 事故后协议硬化已落地：MAMO 市场被三重冻结（cf=0、cap=1 wei、存入枯竭至 $11K）。

本清单同时验证了狩猎流水线本身的正确性：扫描正确识别了 MAMO 市场的冻结状态、wrsETH 的铸币暂停、以及事故 feed 的代理替换。

## 全量数据

| 市场    | CF    | mint 暂停 | Supply cap      | 存入价值 | DEX 最深池 | 杠杆  | Feed          | Feed 描述       | 最新轮龄 | 心跳    |
| ------- | ----- | --------- | --------------- | -------- | ---------- | ----- | ------------- | --------------- | -------- | ------- |
| WETH    | 0.84  | 否        | $241.2M         | $4.31M   | $158.8M    | 1.5×  | `0x57DA741a…` | ETH / USD       | 10min    | 720s    |
| USDC    | 0.88  | 否        | $200.0M         | $7.79M   | $38.1M     | 5.2×  | `0xb7967D18…` | USDC / USD      | 308min   | 86,406s |
| cbBTC   | 0.85  | 否        | $126.9M         | $5.40M   | $18.2M     | 7.0×  | `0xfEA70a74…` | BTC / USD       | 5min     | 1,230s  |
| wstETH  | 0.81  | 否        | $45.1M          | $2.03M   | $3.9M      | 11.4× | `0xa5A5892b…` | 复合（desc 无） | 实时     | 实时    |
| EURC    | 0.88  | 否        | $24.6M          | $0.35M   | $1.4M      | 17.2× | `0x945ab389…` | EURC / USD      | 215min   | 86,406s |
| weETH   | 0.78  | 否        | $15.0M          | $0.16M   | $1.9M      | 7.8×  | `0xe44b816F…` | 复合（desc 无） | 实时     | 实时    |
| cbETH   | 0.81  | 否        | $11.5M          | $1.97M   | $1.9M      | 6.2×  | `0xB0Ba0C5D…` | 复合（desc 无） | 实时     | 实时    |
| LBTC    | 0.80  | 否        | $8.1M           | $3.69M   | $4.6M      | 1.8×  | `0xb9059D6A…` | 复合（desc 无） | 实时     | 实时    |
| VVV     | 0.50  | 否        | $4.6M           | $0.12M   | $18.1M     | 0.3×  | `0x0208810d…` | VVV / USD       | 5min     | 1,412s  |
| AERO    | 0.60  | 否        | 1 wei（冻结）   | $2.45M   | $38.1M     | —     | `0x3623c921…` | AERO / USD      | 29min    | 1,320s  |
| cbXRP   | 0.74  | 否        | $6.9M           | $2.14M   | $0.71M     | 9.7×  | `0xE5C91119…` | XRP / USD       | 23min    | 2,042s  |
| VIRTUAL | 0.55  | 否        | $3.2M           | $0.97M   | $4.3M      | 0.7×  | `0xC19B9FF5…` | VIRTUAL / USD   | 28min    | 1,470s  |
| MORPHO  | 0.40  | 否        | $0.96M          | $0.29M   | $1.9M      | 0.5×  | `0x769E8D34…` | MORPHO / USD    | 16min    | 510s    |
| WELL    | 0.45  | 否        | 1 wei（冻结）   | $0.28M   | $1.3M      | —     | `0x605F1443…` | WELL / USD      | 3min     | 60s     |
| rETH    | 0.78  | 否        | 1 wei（冻结）   | $1.43M   | $0.07M     | —     | `0x98819cC6…` | 复合（desc 无） | 实时     | 实时    |
| tBTC    | 0.64  | 否        | 1 wei（冻结）   | $0.02M   | $1.0M      | —     | `0xd46e01f8…` | TBTC / USD      | 80min    | 6,692s  |
| DAI     | 0.50  | 否        | 1 wei（冻结）   | $0.02M   | $0.06M     | —     | `0x0eaB3B9a…` | DAI / USD       | 211min   | 86,420s |
| USDS    | 0.80  | 否        | 1 wei（冻结）   | $0.01M   | $0.01M     | —     | `0xF655eeDe…` | USDS / USD      | 210min   | 86,420s |
| USDbC   | 0.63  | 否        | 1 USDbC（冻结） | $0.01M   | $10.0M     | —     | `0xb7967D18…` | USDC / USD      | 308min   | 86,406s |
| wrsETH  | 0.42  | **是**    | $27             | $0.05M   | $0.02M     | —     | `0xccc994a4…` | 复合（desc 无） | 实时     | 实时    |
| MAMO    | **0** | 否        | 1 wei（冻结）   | $0.01M   | $0.40M     | —     | `0xDBD37C27…` | MAMO / USD      | 166min   | 20,620s |

注：cap 列「1 wei」为 Moonwell 以最小 cap 冻结新增供应的治理惯例（现有余额不受影响，仅不能再铸）；WELL/AERO 等仍有正常喂价与借还，仅新增存入被卡。

## 观察（按公开发表价值排序）

### A. MAMO 事故处置全景（高——可写进下一篇复盘/论坛帖）

MAMO 市场被**三重冻结**：collateral factor = 0（不可作抵押）、supply cap = 1 wei（不可新增存入）、存入余额从事故前约 $2M+ 枯竭至 $11.5K。同时 feed 已换代理：oracle 注册表现指向 `0xDBD37C27…`，事故时代的 `0xeF7541b3…` 仍在线且与现 feed 数据逐轮一致（同价、同时间戳）。治理对该市场的处置比公开报道的更彻底。

### B. 稳定币 feed 心跳 = 24 小时（中——结构风险，适合论坛预警帖）

USDC / EURC / DAI / USDS / USDbC 五个稳定币 feed 心跳均为 ~86,400s（24h），扫描时刻 USDC 最新轮龄 308 分钟。这是 Chainlink 稳定币 feed 的标准配置（depeg 由 deviation 触发器兜底），但意味着**脱锚事件最长可滞后 24 小时才反映到借贷估值**——USDC 2023-03 脱锚期间各协议的处置差异是现成论证素材。EURC 杠杆 17.2×（cap $24.6M ÷ DEX 池 $1.4M）叠加该心跳，是本清单中配置组合最紧的一条。缓解因素：脱锚是公开事件，治理可手动暂停，且 EURC 的 Chainlink feed 有 deviation 触发。

### C. LST/LRT 复合喂价结构（中——分析洞察，适合推文/报告章节）

六个 LST/LRT/BTC 变体资产（cbETH、wstETH、rETH、weETH、wrsETH、LBTC）的 feed 描述符全部 revert、decimals=18——是 Moonwell 自建复合适配器：`LST 兑换率 × ETH（或 BTC）/USD`。结构含义：**操纵面是两个乘数**（与 MAMO 事故的「汇率 × 价格」双乘数同构），但两个乘数分别来自质押合约汇率与 CEX 聚合价格，均不读该 token 自身的 DEX 池。因此下述杠杆 flag 在此组全部被喂价构造缓解。

### D. rETH「21.9× 杠杆」是流水线的假阳性样本（低——方法论价值）

rETH 存入 $1.43M ÷ 最深 DEX 池 $0.065M = 21.9×，为本扫描最高杠杆。但其 feed 不读 DEX——薄池拉盘无法推高 rETH 估值。**这正好校准了检查③的解读边界：杠杆 flag 必须先看 feed 数据源再定性**。MAMO 事故中 MAMO/USD feed 读的就是 DEX 池，所以 40.7× 成立；本清单里 rETH 的 21.9× 不成立。此对照本身是下一篇方法论文章的好素材。

### E. cbXRP：CEX 衍生 feed + 高杠杆组合（低）

cbXRP 杠杆 9.7×，feed 为 XRP/USD（CEX 聚合），DEX 池深度无关。风险仅存在于 Coinbase 上架/下架 XRP 或 CEX 报价异常的尾部场景，无需行动。

### F. wrsETH：已处置样本（低——记录）

mint 暂停 + cap $27 + CF 0.42。与 2025-11 wrsETH 喂价事故后的处置一致，目前无新增风险敞口。

## 四项检查结果汇总

1. **feed 地址引用**：21/21 市场均有注册 feed（`getFeed(string)`，key = underlying symbol）；映射核实无误——USDbC→USDC feed、WETH→ETH/USD、cbBTC→BTC/USD、cbXRP→XRP/USD 均为预期惯例。
2. **feed 健康度**：无 STALE（>24h）轮次；6 个复合 feed 实时更新；稳定币组 24h 心跳见观察 B。
3. **操纵杠杆**：8 个市场杠杆 >5×，其中 rETH/cbETH/wstETH/weETH（复合 feed，不读 DEX）与 cbXRP/EURC（CEX 衍生/偏差触发）均被喂价构造缓解；**USDC 5.2× 是唯一「真实 DEX 深度依赖」存疑条目**——但 USDC/USD feed 为 CEX 聚合，同样不读 Base DEX。结论：当前无市场处于 MAMO 式「可拉盘喂价」暴露。
4. **币对/精度**：全部 8 位（标准）或 18 位（复合）；无精度错配。

## Immunefi 提交判定

**无提交项**。四项检查未发现「可证明资金损失的活缺陷」。本清单的价值在于：流水线跑通 + 协议硬化被链上证实 + 结构风险（观察 B/C）有公开写作价值。治理论坛预警帖的素材取观察 A/B/C。

## 局限

- DEX 流动性取 DexScreener 快照（单一时点，最深池口径）。
- supply cap 为 1 wei 的市场按「治理冻结」解读，该惯例未从 Moonwell 源码逐行确认（0 = uncapped 是 Compound V2 传统，1 = 最小冻结是 Moonwell 治理实践，建议写稿前用 Moonwell 治理论坛 MIP 交叉验证）。
- 复合 feed 的内部构造（LST 汇率源）未逐个反编译，判断基于 desc revert + decimals=18 + 实时更新的组合特征。
- 心跳按「最新两轮时间差」估计，deviation 触发的轮次会使该值偏小。

## 复现

```bash
HTTPS_PROXY=http://127.0.0.1:7890 HTTP_PROXY=http://127.0.0.1:7890 \
  node --env-file=.env.local scripts/oracle-hunt-moonwell-base.mjs
```

只读调用清单：`Comptroller.getAllMarkets / markets / supplyCaps / mintGuardianPaused`、`Oracle.getUnderlyingPrice / getFeed(string)`、`mToken.underlying / symbol / totalSupply / exchangeRateStored`、`feed.decimals / description / latestRoundData / getRoundData`。地址：Comptroller `0xfBb21d03…`，Oracle `0xEC942bE8…`（实现合约 ABI 经 Sourcify full_match 验证）。
