# 消除颜色硬编码规范

## Why
项目中存在大量颜色硬编码，分散在各个组件和样式文件中。这导致：
1. 维护困难 - 修改主题颜色需要修改多处
2. 不一致性 - 相同语义的颜色可能使用不同色值
3. 难以实现主题切换 - 硬编码颜色无法适配深色模式
4. 代码可读性差 - 无法直观理解颜色的语义含义

## What Changes
- **识别并提取**所有分散的颜色硬编码到统一的颜色配置
- **重构组件**使用集中式颜色配置替代硬编码
- **更新 CSS 变量**确保与颜色配置文件同步
- **保持向后兼容**确保现有功能不受影响

## Impact
- Affected specs: 颜色系统、主题配置、组件样式
- Affected code: 
  - `src/app/globals.css` - CSS 变量和样式类
  - `src/lib/config/colors.ts` - 颜色配置文件
  - `src/components/oracle/**/*.tsx` - 预言机相关组件
  - `src/app/**/*.tsx` - 页面组件
  - `src/lib/constants/index.ts` - 区块链颜色常量

## ADDED Requirements

### Requirement: 统一颜色配置系统
The system SHALL provide a centralized color configuration system that eliminates all hardcoded colors.

#### Scenario: 颜色硬编码识别
- **GIVEN** 项目代码库
- **WHEN** 扫描所有 TypeScript/TSX 和 CSS 文件
- **THEN** 识别出所有硬编码颜色值

#### Scenario: 颜色提取到配置
- **GIVEN** 识别出的硬编码颜色
- **WHEN** 分析颜色语义和用途
- **THEN** 将颜色归类并添加到 `src/lib/config/colors.ts`

#### Scenario: 组件重构
- **GIVEN** 使用硬编码颜色的组件
- **WHEN** 重构组件代码
- **THEN** 使用颜色配置替代硬编码值

## MODIFIED Requirements

### Requirement: 现有颜色配置扩展
扩展 `src/lib/config/colors.ts` 以包含所有需要的颜色值。

**新增颜色类别：**
1. **UI 组件颜色** - 按钮、输入框、卡片等
2. **图表专用颜色** - 网格线、轴线、提示框等
3. **导出颜色** - 图表导出时的颜色配置
4. **动画颜色** - 脉冲、渐变等动画效果

### Requirement: CSS 变量同步
更新 `src/app/globals.css` 使用颜色配置中的值。

**变更内容：**
- 使用 CSS 变量引用颜色配置
- 移除样式类中的硬编码颜色
- 确保深色模式颜色一致性

## REMOVED Requirements
无移除需求。

## 颜色硬编码清单

### 1. 组件文件中的硬编码颜色

| 文件 | 行号 | 硬编码值 | 建议替换 |
|------|------|----------|----------|
| AnomalyAlert.tsx | 77-86 | 预言机品牌色 | chartColors.oracle |
| PerformanceGauge.tsx | 313 | #9CA3AF | semanticColors.neutral.DEFAULT |
| PublisherContributionPanel.tsx | 40-45 | 颜色序列 | chartColors.sequence |
| DataSourceCoverage.tsx | 181 | boxShadow | shadowColors.soft |
| PriceDeviationRisk.tsx | 147,150 | #374151, #e5e7eb | semanticColors.neutral.text, baseColors.gray[200] |
| PriceDeviationHistoryChart.tsx | 多行 | 图表颜色 | chartColors.recharts |
| ConcentrationRisk.tsx | 153,163 | #9ca3af, #e5e7eb | chartColors.recharts.axis, baseColors.gray[200] |
| ChainComparison.tsx | 46-56, 多行 | 链颜色、图表颜色 | chainColors, chartColors.recharts |
| PriceDeviationHeatmap.tsx | 28-54, 多行 | 热力图颜色 | 新增 heatmapColors |
| NodeReputationPanel.tsx | 258,338,539 | #ffffff, boxShadow | baseColors.gray[50], shadowColors |
| cross-oracle/page.tsx | 585,770,1195,1218,1225 | #ffffff, rgba | semanticColors |
| ExportSection.tsx | 35,56,60,65 | #ffffff, #111827, #6b7280 | exportColors |

### 2. 常量文件中的硬编码颜色

| 文件 | 行号 | 硬编码值 | 建议替换 |
|------|------|----------|----------|
| lib/constants/index.ts | 62-83 | 区块链颜色 | chainColors |

### 3. CSS 文件中的硬编码颜色

| 文件 | 行号 | 硬编码值 | 建议替换 |
|------|------|----------|----------|
| globals.css | 26-53, 82-83, 127-292 | 多处 | CSS 变量 |

### 4. 工具文件中的硬编码颜色

| 文件 | 行号 | 硬编码值 | 建议替换 |
|------|------|----------|----------|
| utils/chartExport.ts | 338,548 | rgba, #808080 | exportColors |
| lib/services/marketData/priceCalculations.ts | 221 | #C0C0C0 | semanticColors.neutral |
