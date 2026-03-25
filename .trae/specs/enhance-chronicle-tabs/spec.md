# Chronicle 预言机 Tab 功能优化规范

## Why

Chronicle 预言机页面各个 tab 的功能展示过于简陋，主要依赖卡片式布局，缺乏数据深度展示。参考 Chainlink 页面的设计，需要：
1. 减少卡片样式使用，采用更简洁的内联布局
2. 以数据展示为核心，增加有用的信息维度
3. 优化视觉层次，提升专业感
4. 增加数据表格展示，提升信息密度

## What Changes

### Market Tab (市场概览)
- **移除**: 过多的卡片容器，改为简洁的内联布局
- **新增**: 核心交易对信息展示区域
- **优化**: 统计数据改为行内展示，减少视觉层级
- **保持**: 价格趋势图表作为核心展示

### Network Tab (网络状态)
- **移除**: 四个独立的状态卡片
- **新增**: 简洁的统计行展示核心指标
- **优化**: 每小时活动图表改为更简洁的样式
- **新增**: 网络性能指标进度条
- **新增**: 网络统计摘要区域

### Validators Tab (验证者)
- **移除**: 顶部统计卡片
- **新增**: 简洁的统计概览行
- **新增**: 数据表格展示验证者列表
- **新增**: 区域分布进度条
- **新增**: 验证者概览统计

### MakerDAO Tab (MakerDAO 集成)
- **移除**: 关键指标卡片
- **新增**: 简洁的统计行展示 TVL、DAI 供应量等
- **新增**: 支持资产数据表格
- **新增**: 资产分类筛选功能
- **新增**: 集成信息说明区域

### Scuttlebutt Tab (安全验证)
- **移除**: 独立的安全概览卡片
- **新增**: 简洁的三列安全指标展示
- **优化**: 安全特性改为更紧凑的网格布局
- **新增**: 历史事件表格展示

### Risk Tab (风险分析)
- **移除**: 整体风险评分大卡片
- **新增**: 简洁的风险评分展示
- **优化**: 四个维度分数改为内联展示
- **新增**: 风险因素列表
- **优化**: Scuttlebutt 集成信息简化

## Impact

- **Affected Components**:
  - `ChronicleMarketView.tsx`
  - `ChronicleNetworkView.tsx`
  - `ChronicleValidatorsView.tsx`
  - `ChronicleMakerDAOView.tsx`
  - `ChronicleScuttlebuttView.tsx`
  - `ChronicleRiskView.tsx`

- **Design Reference**:
  - `ChainlinkMarketView.tsx`
  - `ChainlinkNetworkView.tsx`
  - `ChainlinkDataFeedsView.tsx`
  - `ChainlinkNodesView.tsx`

## ADDED Requirements

### Requirement: 简洁的数据展示布局
The system SHALL use inline layouts instead of card-heavy designs for data presentation.

#### Scenario: Market Tab
- **WHEN** user views the Market tab
- **THEN** see price chart on left, stats inline on right without card containers
- **AND** see trading pair info in a clean row layout below

#### Scenario: Network Tab
- **WHEN** user views the Network tab
- **THEN** see core metrics in a clean 4-column inline layout
- **AND** see hourly activity chart without card wrapper
- **AND** see performance metrics with progress bars

#### Scenario: Validators Tab
- **WHEN** user views the Validators tab
- **THEN** see validator stats in a horizontal row with separators
- **AND** see validators in a data table with sorting
- **AND** see region distribution with progress bars

### Requirement: 数据表格组件
The system SHALL use data tables for list-based data instead of card grids.

#### Scenario: Validators List
- **WHEN** user views validators
- **THEN** see a sortable table with columns: Name, Reputation, Uptime, Response Time, Staked, Status

#### Scenario: MakerDAO Assets
- **WHEN** user views MakerDAO tab
- **THEN** see a sortable table with columns: Asset, Type, Price, Collateral Ratio, Stability Fee, Debt Ceiling

#### Scenario: Historical Events
- **WHEN** user views Scuttlebutt tab
- **THEN** see a table with event history including severity, description, timestamp

### Requirement: 分类筛选功能
The system SHALL provide category filtering for asset lists.

#### Scenario: MakerDAO Asset Filtering
- **WHEN** user views supported assets
- **THEN** see filter tabs: All, Stablecoin, Crypto, RWA
- **AND** clicking a filter updates the table

### Requirement: 进度条指标展示
The system SHALL use progress bars for percentage-based metrics.

#### Scenario: Network Performance
- **WHEN** user views network performance
- **THEN** see success rate, availability, latency as progress bars with labels

#### Scenario: Region Distribution
- **WHEN** user views region distribution
- **THEN** see each region as a progress bar showing percentage

### Requirement: 图标增强
The system SHALL use Lucide icons to enhance data visualization.

#### Scenario: Stats Display
- **WHEN** displaying statistics
- **THEN** each stat has a relevant icon (Activity, Server, Clock, Shield, etc.)

## MODIFIED Requirements

### Requirement: 视觉层次优化
The existing card-based layouts SHALL be replaced with cleaner inline layouts.

#### Scenario: Remove Card Wrappers
- **GIVEN** current implementation uses `bg-white border border-gray-200 rounded-lg p-4` for most containers
- **WHEN** refactoring
- **THEN** use minimal containers with `space-y-8` for sections
- **AND** use `border-t border-gray-200` as section separators
- **AND** use `border-b border-gray-100` for list item separators

### Requirement: 间距系统
The spacing SHALL follow Chainlink page's 32px (space-y-8) section spacing.

#### Scenario: Section Spacing
- **GIVEN** a tab with multiple sections
- **WHEN** rendering
- **THEN** use `space-y-8` between major sections
- **AND** use `gap-6` for grid layouts
- **AND** use `py-3` or `py-4` for list item padding

## REMOVED Requirements

None - this is a pure enhancement task.

## Design Principles

1. **数据优先**: 减少装饰性元素，让数据本身成为焦点
2. **内联布局**: 使用行内展示替代卡片堆叠
3. **表格优先**: 列表数据使用表格而非卡片网格
4. **进度可视化**: 百分比数据使用进度条展示
5. **图标增强**: 使用 Lucide 图标提升可读性
6. **专业简洁**: 保持金融数据平台的专业感
