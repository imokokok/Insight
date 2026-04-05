# 组件复用优化 Spec

## Why

代码库中存在大量重复或高度相似的组件实现，导致维护成本增加、代码一致性问题，以及潜在的功能不一致。通过识别和合并这些重复组件，可以减少代码冗余、提高可维护性，并确保功能一致性。

## What Changes

- 识别并合并重复的 SparklineChart 组件（3个重复）
- 识别并合并重复的 DataFreshnessIndicator 组件（3个重复）
- 统一 Hero 组件的实现模式（10个类似实现）
- 统一 RiskView 组件的实现模式（多个类似实现）
- 统一 MarketView 组件的实现模式（多个类似实现）
- 清理不必要的重新导出文件

## Impact

- Affected specs: oracle 页面组件、UI 组件库
- Affected code:
  - `src/components/ui/` - UI 基础组件
  - `src/components/oracle/` - Oracle 相关组件
  - `src/components/charts/` - 图表组件
  - `src/app/[locale]/*/components/` - 各 oracle 页面组件

## ADDED Requirements

### Requirement: 统一 SparklineChart 组件

系统 SHALL 提供单一的 SparklineChart 组件，替代现有的三个重复实现。

#### Scenario: 合并 SparklineChart

- **WHEN** 开发者需要使用迷你折线图
- **THEN** 应该只从 `src/components/ui/SparklineChart.tsx` 导入
- **AND** 该组件应该支持所有现有功能（动画、填充、趋势颜色等）

### Requirement: 统一 DataFreshnessIndicator 组件

系统 SHALL 提供单一的 DataFreshnessIndicator 组件，整合现有三个实现的功能。

#### Scenario: 合并 DataFreshnessIndicator

- **WHEN** 开发者需要显示数据新鲜度
- **THEN** 应该只从 `src/components/ui/DataFreshnessIndicator.tsx` 导入
- **AND** 该组件应该支持紧凑模式、面板模式等不同展示形式

### Requirement: 创建可复用的 OracleHero 基础组件

系统 SHALL 提供一个通用的 OracleHero 基础组件，各 oracle 页面可以通过配置来定制。

#### Scenario: 使用 OracleHero 基础组件

- **WHEN** 创建新的 oracle 页面 Hero 组件
- **THEN** 应该能够通过配置 themeColor、stats、logo 等属性来定制
- **AND** 不需要重复编写相同的布局和样式代码

### Requirement: 创建可复用的 OracleRiskView 基础组件

系统 SHALL 提供一个通用的 OracleRiskView 基础组件，包含风险指标统计、行业基准对比、历史风险事件时间线等通用功能。

#### Scenario: 使用 OracleRiskView 基础组件

- **WHEN** 创建新的 oracle 页面 RiskView 组件
- **THEN** 应该能够通过配置来定制特定的风险因素和指标
- **AND** 复用通用的辅助函数和 UI 组件

### Requirement: 创建可复用的 OracleMarketView 基础组件

系统 SHALL 提供一个通用的 OracleMarketView 基础组件，包含价格图表、快速统计、网络状态、数据来源等通用功能。

#### Scenario: 使用 OracleMarketView 基础组件

- **WHEN** 创建新的 oracle 页面 MarketView 组件
- **THEN** 应该能够通过配置来定制特定的统计数据和网络状态
- **AND** 复用通用的布局和样式

## MODIFIED Requirements

### Requirement: 清理重复的组件文件

删除或重构以下重复文件：

- `src/components/charts/SparklineChart.tsx` - 删除，使用 `src/components/ui/SparklineChart.tsx`
- `src/components/oracle/charts/SparklineChart.tsx` - 删除，使用 `src/components/ui/SparklineChart.tsx`
- `src/components/oracle/shared/DataFreshnessIndicator.tsx` - 删除，使用 `src/components/ui/DataFreshnessIndicator.tsx`
- `src/components/oracle/panels/DataFreshnessIndicator.tsx` - 删除，使用 `src/components/ui/DataFreshnessIndicator.tsx`
- `src/components/oracle/shared/OracleErrorBoundary.tsx` - 删除，使用 `src/components/error-boundary/OracleErrorBoundary.tsx`

## REMOVED Requirements

无移除的需求。

---

## 详细分析

### 1. SparklineChart 组件重复分析

| 文件路径                                          | 功能特点                                   |
| ------------------------------------------------- | ------------------------------------------ |
| `src/components/ui/SparklineChart.tsx`            | 最完整，支持动画、填充、趋势颜色、CSS 变量 |
| `src/components/oracle/charts/SparklineChart.tsx` | 较简单，使用 useId，无动画                 |
| `src/components/charts/SparklineChart.tsx`        | 中等功能，支持动画和填充                   |

**推荐**: 保留 `src/components/ui/SparklineChart.tsx`，删除其他两个。

### 2. DataFreshnessIndicator 组件重复分析

| 文件路径                                                  | 功能特点                                         |
| --------------------------------------------------------- | ------------------------------------------------ |
| `src/components/ui/DataFreshnessIndicator.tsx`            | 最完整，支持连接状态、自动刷新、倒计时、紧凑模式 |
| `src/components/oracle/shared/DataFreshnessIndicator.tsx` | 简单实现，仅支持状态显示                         |
| `src/components/oracle/panels/DataFreshnessIndicator.tsx` | 面板式实现，显示延迟                             |

**推荐**: 保留 `src/components/ui/DataFreshnessIndicator.tsx`，删除其他两个。面板式实现可以通过配置 `compact` 属性或创建变体来实现。

### 3. Hero 组件模式分析

所有 Hero 组件都使用以下共享组件：

- `EnhancedCoreStats` - 核心统计指标
- `CompactMetricsRow` - 紧凑指标行
- `MiniPriceChart` - 迷你价格图表
- `UnifiedInfoSection` - 统一信息区
- `ActionButtons` - 操作按钮
- `LiveStatusBar` - 实时状态栏
- `OptimizedImage` - 优化图片

**重复代码模式**:

- 价格走势数据生成
- 健康度评分计算
- 网络统计数据结构
- 布局结构（左右分栏）

**推荐**: 创建 `OracleHeroBase` 组件，接受配置对象来定制。

### 4. RiskView 组件模式分析

**重复代码模式**:

- `getRiskColor()` - 获取风险颜色
- `getRiskBgColor()` - 获取风险背景颜色
- `getTrendIcon()` - 获取趋势图标
- 雷达图配置
- 时间线事件展示
- 风险因素展开/折叠逻辑

**推荐**: 创建 `OracleRiskViewBase` 组件，包含通用功能。

### 5. MarketView 组件模式分析

**重复代码模式**:

- 统计数据展示（stats 数组）
- 网络状态展示（networkStatus 数组）
- 数据来源展示
- 交易对信息展示
- 布局结构（价格图表 + 统计区域）

**推荐**: 创建 `OracleMarketViewBase` 组件，包含通用功能。
