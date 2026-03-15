# 扩展 Dune 风格扁平化设计到全项目 Spec

## Why
跨预言机比较页面已经成功应用了 Dune 风格的扁平化设计，减少了卡片样式使用，提升了信息密度和专业感。现在需要将这种设计语言扩展到项目的更多页面，保持整体设计的一致性和现代感。

## What Changes

### 设计模式扩展
- **全局扁平化**: 将 Dune 风格应用到所有主要页面
- **减少卡片使用**: 替换 bg-white + rounded-lg + shadow-sm 组合
- **统一分隔方式**: 使用 border-b border-gray-100/200 替代卡片边界
- **简化视觉层次**: 移除不必要的装饰性元素

### 目标页面和组件

#### 1. Market Overview 页面
- `page.tsx` - 主页面布局
- `components/OracleComparison.tsx` - 预言机比较组件
- `components/RiskDashboard.tsx` - 风险仪表盘
- `components/CorrelationMatrix.tsx` - 相关性矩阵
- `components/BenchmarkComparison.tsx` - 基准比较
- `components/AssetCategoryChart.tsx` - 资产类别图表
- `components/ChainBreakdownChart.tsx` - 链分布图表
- `components/ProtocolList.tsx` - 协议列表
- `components/AnomalyAlert.tsx` - 异常警报
- `components/PriceAlertConfig.tsx` - 价格警报配置
- `components/ExportConfig.tsx` - 导出配置
- `components/ScheduledExportConfig.tsx` - 定时导出配置

#### 2. Cross Chain 页面
- `page.tsx` - 主页面
- `components/StandardBoxPlot.tsx` - 箱线图
- `components/PriceSpreadHeatmap.tsx` - 价格差异热力图
- `components/CrossChainFilters.tsx` - 过滤器
- `components/CointegrationAnalysis.tsx` - 协整分析
- `components/InteractivePriceChart.tsx` - 交互式价格图表

#### 3. 各预言机详情页面
- `chainlink/page.tsx` - Chainlink 页面
- `pyth-network/page.tsx` - Pyth 页面
- `band-protocol/page.tsx` - Band Protocol 页面
- `api3/page.tsx` - API3 页面
- `redstone/page.tsx` - Redstone 页面
- `tellor/page.tsx` - Tellor 页面
- `winklink/page.tsx` - WINkLink 页面
- `chronicle/page.tsx` - Chronicle 页面
- `dia/page.tsx` - DIA 页面
- `uma/page.tsx` - UMA 页面

#### 4. 其他页面
- `price-query/page.tsx` - 价格查询页面
- `alerts/page.tsx` - 警报页面
- `favorites/page.tsx` - 收藏页面
- `settings/page.tsx` - 设置页面

#### 5. 首页组件
- `home-components/BentoMetricsGrid.tsx` - 指标网格
- `home-components/OracleMarketOverview.tsx` - 市场概览
- `home-components/FeatureCards.tsx` - 功能卡片
- `home-components/ArbitrageHeatmap.tsx` - 套利热力图
- `home-components/LivePriceTicker.tsx` - 实时价格滚动条

### 具体改动规则

#### 卡片样式替换
```
Before: bg-white rounded-lg border border-gray-200 shadow-sm p-4
After: py-4 border-b border-gray-100

Before: bg-white rounded-xl shadow-sm overflow-hidden
After: border-b border-gray-200 pb-4

Before: bg-gray-50/50 rounded-lg p-4
After: py-4
```

#### 标题样式简化
```
Before: text-lg font-semibold text-gray-900 mb-4
After: text-sm font-semibold text-gray-900 mb-3

Before: text-2xl font-bold text-gray-900
After: text-xl font-bold text-gray-900
```

#### 表格样式简化
```
Before: bg-gray-50 (表头背景)
After: 移除背景色，保留 border-b

Before: px-6 py-4 (单元格内边距)
After: px-3 py-2.5
```

#### 按钮样式简化
```
Before: px-4 py-2 rounded-lg
After: px-3 py-1.5 rounded-md text-sm
```

## Impact
- Affected specs: 全局 UI 设计系统
- Affected code: 20+ 页面文件，40+ 组件文件

## ADDED Requirements

### Requirement: 全局扁平化设计系统
系统 SHALL 在所有页面应用 Dune 风格的扁平化设计。

#### Scenario: Market Overview 页面
- **WHEN** 用户访问市场概览页面
- **THEN** 页面显示扁平化设计，无厚重卡片包裹

#### Scenario: Cross Chain 页面
- **WHEN** 用户访问跨链页面
- **THEN** 页面显示扁平化设计，使用边框分隔

#### Scenario: 预言机详情页面
- **WHEN** 用户访问任意预言机详情页面
- **THEN** 页面显示扁平化设计，保持与跨预言机比较页面一致

#### Scenario: 首页组件
- **WHEN** 用户访问首页
- **THEN** 所有组件显示扁平化设计

## MODIFIED Requirements

### Requirement: 卡片组件使用规范
**修改内容**: 
- 限制 DashboardCard 的使用场景
- 优先使用 FlatSection 和 FlatStatItem
- 表格和图表容器移除卡片包裹

### Requirement: 间距和排版规范
**修改内容**: 
- 统一使用较小的间距（py-4, px-3）
- 标题使用更小的字号（text-sm, text-xl）
- 标签使用大写和 tracking-wider
