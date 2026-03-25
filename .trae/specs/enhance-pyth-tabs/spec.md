# Pyth 页面 Tab 功能优化 Spec

## Why
当前 Pyth 预言机页面的各个 Tab 功能展示过于简陋，主要依赖卡片式布局，缺乏数据深度和 Chainlink 页面那种简洁专业的数据展示风格。需要优化每个 Tab 的功能显示，以数据展示为核心，减少不必要的卡片样式，参考 Chainlink 页面的设计模式。

## What Changes
- **Market Tab**: 优化布局，减少卡片嵌套，采用更简洁的数据展示方式
- **Network Tab**: 简化核心指标展示，优化图表和性能指标布局
- **Publishers Tab**: 将卡片网格改为数据表格，增加排序和筛选功能
- **Validators Tab**: 优化表格展示，增加更多数据维度
- **Price Feeds Tab**: 从卡片分类改为数据表格展示，增加分类筛选
- **Risk Tab**: 参考 Chainlink Risk View，增加风险指标、基准对比、历史事件时间线

## Impact
- Affected files:
  - `src/app/[locale]/pyth/components/PythMarketView.tsx`
  - `src/app/[locale]/pyth/components/PythNetworkView.tsx`
  - `src/app/[locale]/pyth/components/PythPublishersView.tsx`
  - `src/app/[locale]/pyth/components/PythValidatorsView.tsx`
  - `src/app/[locale]/pyth/components/PythPriceFeedsView.tsx`
  - `src/app/[locale]/pyth/components/PythRiskView.tsx`
  - `src/app/[locale]/pyth/types.ts` (可能需要扩展类型)

## ADDED Requirements

### Requirement: Market Tab 优化
The system SHALL provide a cleaner market data display following Chainlink's design pattern.

#### Scenario: Market view displays price chart and stats
- **WHEN** user views Market tab
- **THEN** display price chart on left (2/3 width) and compact stats on right (1/3 width)
- **AND** stats should be displayed in simple rows without card wrappers
- **AND** include quick stats, network status, and data sources sections

### Requirement: Network Tab 优化
The system SHALL display network metrics in a clean, card-minimal layout.

#### Scenario: Network view shows core metrics
- **WHEN** user views Network tab
- **THEN** display 4 core metrics in a simple grid without card backgrounds
- **AND** show hourly activity chart and performance metrics side by side
- **AND** use progress bars for performance indicators

### Requirement: Publishers Tab 表格化
The system SHALL display publishers in a data table with filtering and sorting.

#### Scenario: Publishers view with table display
- **WHEN** user views Publishers tab
- **THEN** display publishers in a sortable data table
- **AND** provide search input for filtering by name
- **AND** show summary stats in inline format (not cards)
- **AND** include stake bar visualization in table

### Requirement: Validators Tab 优化
The system SHALL display validators in an enhanced table layout.

#### Scenario: Validators view with improved table
- **WHEN** user views Validators tab
- **THEN** display validators in a full-featured table
- **AND** show status with color-coded badges
- **AND** include uptime and rewards data

### Requirement: Price Feeds Tab 表格化
The system SHALL display price feeds in a categorized data table.

#### Scenario: Price feeds view with category filter
- **WHEN** user views Price Feeds tab
- **THEN** display feeds in a data table with columns: name, category, status, update frequency
- **AND** provide category filter tabs (All, Crypto, Forex, Commodities, Equities)
- **AND** show summary stats in inline format

### Requirement: Risk Tab 增强
The system SHALL provide comprehensive risk analysis similar to Chainlink.

#### Scenario: Risk view with multi-section analysis
- **WHEN** user views Risk tab
- **THEN** display risk metrics with progress bars
- **AND** show industry benchmark comparison with radar chart
- **AND** include historical risk events timeline
- **AND** provide risk factor analysis with expandable details

## MODIFIED Requirements

### Requirement: Component Styling
All tab components SHALL follow the minimal card design pattern.

#### Scenario: Consistent styling across tabs
- **WHEN** rendering any tab content
- **THEN** use minimal borders (border-gray-200)
- **AND** prefer inline layouts over card grids
- **AND** use Lucide icons consistently
- **AND** maintain space-y-8 section spacing

## REMOVED Requirements

### Requirement: Card-heavy layouts
**Reason**: Chainlink design uses minimal cards, preferring clean text and inline layouts
**Migration**: Replace card grids with inline stats and data tables
