# 翻译文件拆分检查清单

## 阶段一：基础设施搭建

- [x] 目录结构已创建
  - [x] `src/i18n/messages/en/` 存在
  - [x] `src/i18n/messages/zh-CN/` 存在
  - [x] `src/i18n/messages/en/oracles/` 存在
  - [x] `src/i18n/messages/en/components/` 存在
  - [x] `src/i18n/messages/en/features/` 存在

- [x] 配置文件已创建
  - [x] `src/i18n/config.ts` 存在且配置正确
  - [x] `src/i18n/types.ts` 存在且类型定义完整
  - [x] `src/i18n/index.ts` 存在且导出正确

- [x] 动态加载机制已实现
  - [x] `src/i18n/request.ts` 支持按需加载
  - [x] `src/lib/i18n/provider.tsx` 支持消息合并
  - [x] 翻译键缺失时有 fallback 处理

## 阶段二：核心模块迁移

- [x] common.json 已迁移
  - [x] `messages/en/common.json` 存在
  - [x] `messages/zh-CN/common.json` 存在
  - [x] 所有 `t('common.*')` 引用正常

- [x] navigation.json 已迁移
  - [x] `messages/en/navigation.json` 存在
  - [x] `messages/zh-CN/navigation.json` 存在
  - [x] navbar, footer, blockchain 已合并

- [x] home.json 已迁移
  - [x] `messages/en/home.json` 存在
  - [x] `messages/zh-CN/home.json` 存在

- [x] ui.json 已迁移
  - [x] `messages/en/ui.json` 存在
  - [x] `messages/zh-CN/ui.json` 存在
  - [x] emptyState, loading, error 已合并

## 阶段三：功能页面迁移

- [x] marketOverview.json 已迁移
  - [x] `messages/en/marketOverview.json` 存在
  - [x] `messages/zh-CN/marketOverview.json` 存在

- [x] priceQuery.json 已迁移
  - [x] `messages/en/priceQuery.json` 存在
  - [x] `messages/zh-CN/priceQuery.json` 存在
  - [x] 多处 priceQuery 定义已统一

- [x] crossOracle.json 已迁移
  - [x] `messages/en/crossOracle.json` 存在
  - [x] `messages/zh-CN/crossOracle.json` 存在
  - [x] crossOracle 和 crossOracleComparison 已合并

- [x] crossChain.json 已迁移
  - [x] `messages/en/crossChain.json` 存在
  - [x] `messages/zh-CN/crossChain.json` 存在

## 阶段四：预言机详情页迁移

- [x] Chainlink 翻译已迁移
  - [x] `messages/en/oracles/chainlink.json` 存在
  - [x] `messages/zh-CN/oracles/chainlink.json` 存在

- [x] Pyth 翻译已迁移
  - [x] `messages/en/oracles/pyth.json` 存在
  - [x] `messages/zh-CN/oracles/pyth.json` 存在
  - [x] pythNetwork 和 pyth 已合并

- [x] API3 翻译已迁移
  - [x] `messages/en/oracles/api3.json` 存在
  - [x] `messages/zh-CN/oracles/api3.json` 存在

- [x] Band 翻译已迁移
  - [x] `messages/en/oracles/band.json` 存在
  - [x] `messages/zh-CN/oracles/band.json` 存在
  - [x] bandProtocol 和 band 已合并

- [x] 其他预言机翻译已迁移
  - [x] Tellor: `messages/en/oracles/tellor.json` 存在
  - [x] UMA: `messages/en/oracles/uma.json` 存在
  - [x] DIA: `messages/en/oracles/dia.json` 存在
  - [x] RedStone: `messages/en/oracles/redstone.json` 存在
  - [x] Chronicle: `messages/en/oracles/chronicle.json` 存在
  - [x] WINkLink: `messages/en/oracles/winklink.json` 存在
  - [x] 所有中文版本存在

## 阶段五：组件和功能模块迁移

- [x] 组件翻译已迁移
  - [x] `messages/en/components/charts.json` 存在
  - [x] `messages/en/components/alerts.json` 存在
  - [x] `messages/en/components/export.json` 存在
  - [x] `messages/en/components/favorites.json` 存在
  - [x] `messages/en/components/search.json` 存在
  - [x] 所有中文版本存在

- [x] 功能模块翻译已迁移
  - [x] `messages/en/features/settings.json` 存在
  - [x] `messages/en/features/auth.json` 存在
  - [x] `messages/en/features/methodology.json` 存在
  - [x] 所有中文版本存在

## 阶段六：验证和清理

- [x] 完整性验证通过
  - [x] 所有翻译键已迁移，无遗漏
  - [x] 中英文键值对数量一致
  - [x] 无重复定义

- [x] 功能测试通过
  - [x] 所有页面翻译正常显示
  - [x] 语言切换功能正常
  - [x] 控制台无 i18n 相关错误

- [x] 旧文件已清理
  - [x] 旧 `en.json` 已备份
  - [x] 旧 `zh-CN.json` 已备份
  - [x] 旧文件已从代码库移除

## 最终检查

- [x] 项目构建成功
- [x] TypeScript 类型检查通过
- [x] ESLint 检查通过
- [x] 所有测试通过

## 迁移统计

| 项目 | 数量 |
|------|------|
| 总文件数 | 52 个 |
| 英文文件 | 26 个 |
| 中文文件 | 26 个 |
| 核心模块 | 4 个 (common, navigation, home, ui) |
| 功能页面 | 4 个 (marketOverview, priceQuery, crossOracle, crossChain) |
| 预言机页面 | 10 个 (chainlink, pyth, api3, band, tellor, uma, dia, redstone, chronicle, winklink) |
| 组件模块 | 5 个 (charts, alerts, export, favorites, search) |
| 功能模块 | 3 个 (settings, auth, methodology) |
