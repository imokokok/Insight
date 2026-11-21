# Stork MON/USD 严格仲裁转正审查记录（2026-11-20）

## 结论

把 Stork 的 **MON/USD**（chain 143 / Monad）从 shadow-only 提升为 strict quorum 参与者。
**只提升这一个 feed**；其余 37 个 Stork Monad feed 保持 shadow-only。

触发：2026-11-18T15:21:45Z 一笔真实外部付费（$0.02，Base，`/api/v1/safety/preflight`）查询
`MON / Monad / swap / $1000`，因 strict 参与者只有 2 家（Pyth + Chainlink）低于 v2 门槛 3 家而被 BLOCK。
链上已核验该笔付款（Base block 59124650，tx `0x08aaf8e0…d69e6b`）。

## 为什么是合法的第 3 家

### 门槛定义（代码实取）

- `src/lib/attestations/oracleSafetyAttestationV2.ts:59` — `V2_REQUIRED_PARTICIPANT_COUNT = 3`
- 同文件 `:62` — `V2_REQUIRED_NON_DERIVED_GROUPS = 2`
- `src/lib/attestations/sourceGroups.ts` — Raul 2026-08-19 签字的 operator 级映射，
  `stork → 'stork'`、`chainlink → 'chainlink'`、`pyth → 'pyth'` 各为独立非派生组。
  independence gate 在原有 Pyth+Chainlink 下已经满足（2 组）。

### 数据质量（实取，非推断）

来源：生产 `oracle_reputation`、`oracle_feeds`、`pre_trade_checks`（Supabase REST，2026-11-20 查询）。

| provider  | overall | avg deviation % | queries / failures | request-time age |
| --------- | ------- | --------------- | ------------------ | ---------------- |
| Pyth      | 100     | 0.0282          | 90 / 6             | 11s              |
| Chainlink | 83.41   | 0.1563          | 90 / 6             | 6s               |
| Stork     | 98.11   | 0.0286          | 90 / 6             | 3s               |
| Chronicle | 92.37   | 0.0365          | 60 / 5             | 149s             |

- Stork MON/USD feed 于 2026-11-02 入库，到审查日已 shadow 运行 18 天，`consecutive_failures = 0`，
  在 11-18 付费请求时刻 15:21:40Z 成功返回。
- 该请求中 Stork 报价 0.014899095，与严格共识 0.01490232 偏差 0.0216%，远低于
  `src/lib/analytics/consensusPrice.ts:255` 的 `OUTLIER_MIN_ABS_DEVIATION_PCT = 1.0`。
  DB 里 `isOutlier: true` 来自 `consensusPriceService.ts:545-552` 把 shadow provider 并进
  excludedProviders，是政策排除而非统计异常。
- 该请求唯一 contributing factor 为 `oracle_coverage`（2 < 3）；无价格分歧、无 stale、无 depeg。

### 来源独立性

Stork 官方文档（docs.stork.network，2026-11-20 查阅）说明其架构为：
独立 publisher（HFT / 中心化与去中心化交易所 / 预测市场）各自签名数据流 → Aggregator
用中位数等方式聚合再签名 → 链上合约验证签名与时效。operator 层与 Pyth、Chainlink 分离，
与已签字的 sourceGroups 映射一致。

**未做的部分**：没有拿到具名的 source-overlap 签字文档（仓内、工作区均未找到）。
因此本次改动只把 MON/USD 一个 feed 提升，保留完整证据链供 maintainer 在 PR 上做最终签字；
不合并、不部署。若审查认为底层 venue 重叠不可接受， revert 只需回退一个常量集合条目。

## 代码改动

1. `src/lib/oracles/constants/storkMonad.ts`
   新增 `STRICT_QUORUM_PROMOTION_CANDIDATES = new Set(['MON/USD'])`，附证据注释。
2. `src/lib/oracles/clients/storkMonad.ts`
   `countsTowardOracleQuorum` 由硬编码 false 改为按 feed alias 查白名单。
   批量取价路径复用 `getPrice`，自动继承同一策略。
3. `src/lib/oracles/services/feedSyncService.ts`
   注册表 metadata 的 `quorumStatus` 按白名单区分 `promotion-candidate-pending-source-overlap-signoff` / `shadow-only-pending-source-overlap-review`；不使用 "approved" 字样，因为签字尚未发生。
4. `src/lib/oracles/__tests__/storkMonad.test.ts`
   保留 BTC 仍为 shadow 的断言，新增 MON/USD 计入 strict quorum 的断言。

## 期望效果

下一次 MON / chain 143 的严格 pre-trade 将看到 Pyth + Chainlink + Stork 三家，
coverage gate 通过；是否 ALLOW/CAUTION 仍由其余规则（manip cost、决策输入、DEX 报价）决定，
本改动不绕过任何其它门禁。

## 验证

- `npx jest --runInBand src/lib/oracles/__tests__/storkMonad.test.ts` — 8/8 通过
- `npx jest --runInBand` 关联套件（feedSync / consensusPrice / v2Flow / oracleWatchService）— 76/76 通过
- `npx tsc --noEmit -p tsconfig.json` — 通过
