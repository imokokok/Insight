# 翻译文件拆分任务列表

## 阶段一：基础设施搭建

- [x] Task 1.1: 创建新的目录结构
  - [x] 创建 `src/i18n/messages/en/` 目录
  - [x] 创建 `src/i18n/messages/zh-CN/` 目录
  - [x] 创建子目录 `oracles/`, `components/`, `features/`

- [x] Task 1.2: 创建 i18n 配置文件
  - [x] 创建 `src/i18n/config.ts` 集中管理配置
  - [x] 创建 `src/i18n/types.ts` 类型定义文件
  - [x] 创建 `src/i18n/index.ts` 统一导出

- [x] Task 1.3: 实现动态加载机制
  - [x] 修改 `src/i18n/request.ts` 支持按需加载
  - [x] 更新 `src/lib/i18n/provider.tsx` 支持动态消息合并
  - [x] 添加翻译键缺失的 fallback 处理

## 阶段二：核心模块迁移

- [x] Task 2.1: 迁移通用翻译模块
  - [x] 从 en.json 提取 `common` 到 `messages/en/common.json`
  - [x] 从 zh-CN.json 提取 `common` 到 `messages/zh-CN/common.json`
  - [x] 验证所有 `t('common.*')` 引用正常

- [x] Task 2.2: 迁移导航模块
  - [x] 提取 `navbar` + `footer` + `blockchain` 到 `messages/en/navigation.json`
  - [x] 合并重复定义，统一命名空间为 `navigation`
  - [x] 创建中文版本

- [x] Task 2.3: 迁移首页模块
  - [x] 提取 `home` 命名空间到 `messages/en/home.json`
  - [x] 创建中文版本

- [x] Task 2.4: 迁移空状态和加载状态
  - [x] 提取 `emptyState` + `loading` + `error` 到 `messages/en/ui.json`
  - [x] 创建中文版本

## 阶段三：功能页面迁移

- [x] Task 3.1: 迁移市场概览页面
  - [x] 提取 `marketOverview` 到 `messages/en/marketOverview.json`
  - [x] 合并 `marketDataPanel` 相关内容
  - [x] 创建中文版本

- [x] Task 3.2: 迁移价格查询页面
  - [x] 合并多处 `priceQuery` 定义到统一的 `messages/en/priceQuery.json`
  - [x] 整合 `priceDeviation`, `priceChart` 相关内容
  - [x] 创建中文版本

- [x] Task 3.3: 迁移跨预言机分析页面
  - [x] 合并 `crossOracle` + `crossOracleComparison` 到 `messages/en/crossOracle.json`
  - [x] 整合 `comparison` 相关内容
  - [x] 创建中文版本

- [x] Task 3.4: 迁移跨链对比页面
  - [x] 提取 `crossChain` + `crossChainPanel` 到 `messages/en/crossChain.json`
  - [x] 整合 `crossChainPriceConsistency`, `bandCrossChainPriceConsistency`
  - [x] 创建中文版本

## 阶段四：预言机详情页迁移

- [x] Task 4.1: 迁移 Chainlink 翻译
  - [x] 提取 `chainlink` 到 `messages/en/oracles/chainlink.json`
  - [x] 创建中文版本

- [x] Task 4.2: 迁移 Pyth Network 翻译
  - [x] 提取 `pythNetwork` + `pyth` 到 `messages/en/oracles/pyth.json`
  - [x] 统一命名空间为 `oracles.pyth`
  - [x] 创建中文版本

- [x] Task 4.3: 迁移 API3 翻译
  - [x] 提取 `api3` 到 `messages/en/oracles/api3.json`
  - [x] 整合 `dapiCoverage`, `airnodeDeployment`
  - [x] 创建中文版本

- [x] Task 4.4: 迁移 Band Protocol 翻译
  - [x] 提取 `bandProtocol` + `band` 到 `messages/en/oracles/band.json`
  - [x] 统一命名空间为 `oracles.band`
  - [x] 创建中文版本

- [x] Task 4.5: 迁移其他预言机翻译
  - [x] Tellor: `tellor` → `messages/en/oracles/tellor.json`
  - [x] UMA: `uma` → `messages/en/oracles/uma.json`
  - [x] DIA: `dia` → `messages/en/oracles/dia.json`
  - [x] RedStone: `redstone` + `redStoneMetrics` → `messages/en/oracles/redstone.json`
  - [x] Chronicle: `chronicle` → `messages/en/oracles/chronicle.json`
  - [x] WINkLink: `winklink` → `messages/en/oracles/winklink.json`
  - [x] 创建所有中文版本

## 阶段五：组件和功能模块迁移

- [x] Task 5.1: 迁移图表组件翻译
  - [x] 提取 `charts` + 相关图表命名空间到 `messages/en/components/charts.json`
  - [x] 创建中文版本

- [x] Task 5.2: 迁移提醒组件翻译
  - [x] 提取 `alerts` + `anomalyAlert` + `confidenceAlert` + `volatilityAlert` 到 `messages/en/components/alerts.json`
  - [x] 创建中文版本

- [x] Task 5.3: 迁移导出组件翻译
  - [x] 提取 `unifiedExport` + 相关导出命名空间到 `messages/en/components/export.json`
  - [x] 创建中文版本

- [x] Task 5.4: 迁移收藏和搜索组件
  - [x] 提取 `favorites` 到 `messages/en/components/favorites.json`
  - [x] 提取 `search` 到 `messages/en/components/search.json`
  - [x] 创建中文版本

- [x] Task 5.5: 迁移功能模块
  - [x] 提取 `settings` 到 `messages/en/features/settings.json`
  - [x] 提取 `auth` 到 `messages/en/features/auth.json`
  - [x] 提取 `methodology` 到 `messages/en/features/methodology.json`
  - [x] 创建中文版本

## 阶段六：验证和清理

- [x] Task 6.1: 完整性验证
  - [x] 运行脚本检查所有翻译键是否已迁移
  - [x] 对比新旧文件，确保无遗漏
  - [x] 验证中英文键值对数量一致

- [x] Task 6.2: 功能测试
  - [x] 测试所有页面翻译正常显示
  - [x] 测试语言切换功能
  - [x] 测试动态加载无错误

- [x] Task 6.3: 清理旧文件
  - [x] 备份旧的 `en.json` 和 `zh-CN.json`
  - [x] 删除旧文件
  - [x] 更新相关文档

## 任务依赖关系

```
阶段一 (基础设施)
    ↓
阶段二 (核心模块) → 阶段三 (功能页面) → 阶段四 (预言机页面) → 阶段五 (组件模块)
    ↓
阶段六 (验证清理)
```

- 阶段二、三、四、五可以并行执行
- 阶段六必须在所有迁移完成后执行
