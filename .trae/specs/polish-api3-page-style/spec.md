# API3 预言机页面样式优化规格

## Why

API3 页面作为第一方预言机的展示页面，目前存在以下问题：
1. 统计卡片区域使用 `border-l` 分隔，与 Dune 扁平化设计风格不够统一
2. 部分组件（如 LegacyRiskScoreCard）仍使用圆角设计，与整体扁平风格冲突
3. 页面视觉层次可以进一步优化，提升数据可读性
4. 颜色使用可以更克制，减少视觉干扰

## What Changes

### 视觉风格优化
- **统计卡片区域**: 改为网格卡片布局，移除 `border-l` 分隔线，使用独立卡片
- **风险评分卡片**: 统一使用 `RiskScoreCard` 组件，移除圆角
- **颜色系统**: 减少彩色背景使用，更多使用灰色系
- **间距优化**: 统一使用 4px 基数的间距系统

### 组件改进
- **DashboardCard**: 保持现有扁平风格，优化悬停效果
- **StatCard**: 改为独立网格卡片，图标背景更克制
- **数据展示**: 统一使用 `bg-gray-50` 作为次级背景

### 布局优化
- **标签导航**: 保持粘性定位，优化底部边框样式
- **内容区域**: 优化网格间距，使用 `gap-4` 或 `gap-6`
- **响应式**: 确保移动端显示效果

## Impact

- **受影响文件**:
  - `src/app/[locale]/api3/page.tsx` - 主页面布局
  - `src/components/oracle/panels/API3RiskAssessmentPanel.tsx` - 风险评估面板
  - `src/components/oracle/common/DashboardCard.tsx` - 卡片组件（如有需要）

- **设计风格**: 与 Dune Analytics 风格保持一致

## ADDED Requirements

### Requirement: 统计卡片网格布局

页面 SHALL 使用网格布局展示统计卡片，而非水平分隔线设计。

#### Scenario: 桌面端显示
- **WHEN** 用户在桌面端访问页面
- **THEN** 统计卡片以 4 列网格展示，每张卡片独立带边框

#### Scenario: 移动端显示
- **WHEN** 用户在移动端访问页面
- **THEN** 统计卡片以 2 列或 1 列网格自适应展示

### Requirement: 扁平化风险评分卡片

风险评估面板 SHALL 使用统一的无圆角评分卡片。

#### Scenario: 风险评分展示
- **WHEN** 展示风险评分
- **THEN** 使用 `RiskScoreCard` 组件，无圆角，简洁边框

### Requirement: 克制颜色使用

页面 SHALL 减少彩色背景的使用，更多使用灰色系。

#### Scenario: 图标背景
- **WHEN** 展示统计图标
- **THEN** 使用 `bg-gray-100` 或 `bg-blue-50`（仅主色调）

## MODIFIED Requirements

### Requirement: 页面布局

修改统计卡片区域的布局方式。

**原设计**:
- 使用 `border-l` 分隔统计项
- 图标使用彩色背景

**新设计**:
- 使用网格卡片布局
- 图标使用灰色背景
- 保持 `hover:border-gray-300` 悬停效果

## REMOVED Requirements

无移除需求。
