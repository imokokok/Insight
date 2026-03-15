# Tasks

## 阶段一：后端基础集成

- [x] Task 1: 扩展 OracleProvider 枚举类型
  - [x] 在 `src/types/oracle/enums.ts` 中添加 DIA = 'dia'
  - [x] 在 `src/types/oracle/enums.ts` 中添加 TELLOR = 'tellor'

- [x] Task 2: 创建 DIA 预言机客户端
  - [x] 创建 `src/lib/oracles/dia.ts` 文件
  - [x] 实现 DIAClient 类继承 BaseOracleClient
  - [x] 实现 getPrice 方法
  - [x] 实现 getHistoricalPrices 方法
  - [x] 定义 DIA 支持的多链 (Ethereum, Arbitrum, Polygon, Avalanche, BNB Chain, Base)
  - [x] 实现 DIA 专属数据方法 (getDataTransparency, getCrossChainCoverage, getDataSourceVerification)

- [x] Task 3: 创建 Tellor 预言机客户端
  - [x] 创建 `src/lib/oracles/tellor.ts` 文件
  - [x] 实现 TellorClient 类继承 BaseOracleClient
  - [x] 实现 getPrice 方法
  - [x] 实现 getHistoricalPrices 方法
  - [x] 定义 Tellor 支持的多链 (Ethereum, Arbitrum, Optimism, Polygon, Base, Avalanche)
  - [x] 实现 Tellor 专属数据方法 (getPriceStream, getMarketDepth, getMultiChainAggregation)

- [x] Task 4: 更新工厂类注册新预言机
  - [x] 在 `src/lib/oracles/factory.ts` 中导入 DIAClient 和 TellorClient
  - [x] 在 createClient 方法中添加 DIA 和 TELLOR 的 case
  - [x] 在 getAllClients 方法中添加 DIA 和 TELLOR 到 providers 数组

- [x] Task 5: 更新预言机配置
  - [x] 在 `src/lib/config/oracles.tsx` 中导入 DIAClient 和 TellorClient
  - [x] 在 oracleConfigs 中添加 DIA 配置 (名称、符号、支持链、市场数据、网络数据、特性)
  - [x] 在 oracleConfigs 中添加 Tellor 配置 (名称、符号、支持链、市场数据、网络数据、特性)

- [x] Task 6: 更新模块导出
  - [x] 在 `src/lib/oracles/index.ts` 中导出 DIAClient
  - [x] 在 `src/lib/oracles/index.ts` 中导出 TellorClient

## 阶段二：前端 Hooks 开发

- [x] Task 7: 创建 DIA 数据 Hook
  - [x] 创建 `src/hooks/useDIAData.ts` 文件
  - [x] 实现 useDIAAllData hook，整合所有 DIA 数据获取
  - [x] 实现 useDIADataTransparency hook
  - [x] 实现 useDIACrossChainCoverage hook
  - [x] 实现 useDIADataSourceVerification hook

- [x] Task 8: 创建 Tellor 数据 Hook
  - [x] 创建 `src/hooks/useTellorData.ts` 文件
  - [x] 实现 useTellorAllData hook，整合所有 Tellor 数据获取
  - [x] 实现 useTellorPriceStream hook
  - [x] 实现 useTellorMarketDepth hook
  - [x] 实现 useTellorMultiChainAggregation hook

## 阶段三：DIA 专属组件开发

- [x] Task 9: 创建 DIA 数据透明度面板
  - [x] 创建 `src/components/oracle/panels/DIADataTransparencyPanel.tsx`
  - [x] 实现数据源透明度展示
  - [x] 实现数据验证信息展示

- [x] Task 10: 创建 DIA 跨链资产覆盖面板
  - [x] 创建 `src/components/oracle/panels/DIACrossChainCoveragePanel.tsx`
  - [x] 实现跨链资产列表展示
  - [x] 实现覆盖范围统计

- [x] Task 11: 创建 DIA 数据源验证面板
  - [x] 创建 `src/components/oracle/panels/DIADataSourceVerificationPanel.tsx`
  - [x] 实现数据源验证状态展示
  - [x] 实现验证历史记录

## 阶段四：Tellor 专属组件开发

- [x] Task 12: 创建 Tellor 实时价格流面板
  - [x] 创建 `src/components/oracle/panels/TellorPriceStreamPanel.tsx`
  - [x] 实现实时价格更新展示
  - [x] 实现价格变动趋势

- [x] Task 13: 创建 Tellor 市场深度分析面板
  - [x] 创建 `src/components/oracle/panels/TellorMarketDepthPanel.tsx`
  - [x] 实现买卖盘深度展示
  - [x] 实现流动性分析

- [x] Task 14: 创建 Tellor 多链聚合面板
  - [x] 创建 `src/components/oracle/panels/TellorMultiChainAggregationPanel.tsx`
  - [x] 实现多链价格聚合展示
  - [x] 实现链间价格差异分析

## 阶段五：前端页面开发

- [x] Task 15: 创建 DIA 专属页面
  - [x] 创建 `src/app/dia/page.tsx`
  - [x] 创建 `src/app/dia/DIAPageContent.tsx`
  - [x] 实现标签页导航 (market, network, transparency, coverage, verification)
  - [x] 集成 DIA 专属组件

- [x] Task 16: 创建 Tellor 专属页面
  - [x] 创建 `src/app/tellor/page.tsx`
  - [x] 创建 `src/app/tellor/TellorPageContent.tsx`
  - [x] 实现标签页导航 (market, network, price-stream, market-depth, multi-chain)
  - [x] 集成 Tellor 专属组件

## 阶段六：导航与路由集成

- [x] Task 17: 更新导航菜单
  - [x] 在主导航中添加 DIA 入口
  - [x] 在主导航中添加 Tellor 入口

# Task Dependencies
- 阶段二依赖于阶段一
- 阶段三依赖于阶段二
- 阶段四依赖于阶段二
- 阶段五依赖于阶段三和阶段四
- 阶段六依赖于阶段五
