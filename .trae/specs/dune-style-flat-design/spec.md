# Dune风格扁平化设计规范

## Why
当前项目的非首页页面虽然已采用扁平化设计，但仍存在以下问题：
1. 页面背景为纯白色，视觉上显得空洞、缺乏层次感
2. 统计数据展示区域缺乏视觉分隔，信息密度感不足
3. 内容区域与背景融合度过高，缺乏Dune那种精致的数据平台感
4. 需要引入微妙的背景纹理和分隔线来增强视觉层次

参考Dune的设计模式：
- 使用极浅的灰色背景（#FAFAFA 或 #F8F9FA）替代纯白
- 采用细线分隔（1px border）而非卡片阴影来区分区域
- 统计数据区域使用紧凑的网格布局，带左侧分隔线
- 标签使用小写、灰色、小字体，数值使用大字体
- 整体风格简洁、专业、数据驱动

## What Changes
- **优化页面背景色**：从纯白改为极浅灰色，增加视觉层次感
- **统计数据区域扁平化**：采用Dune风格的紧凑网格布局
- **分隔线设计**：使用细线分隔（border）替代卡片阴影
- **标签样式统一**：小写、灰色、小字体标签
- **数值突出显示**：大字体、深色数值
- **内容区域优化**：调整间距和留白，提升信息密度

## Impact
- Affected pages: 
  - `/src/app/chainlink/page.tsx`
  - `/src/app/band-protocol/page.tsx`
  - `/src/app/pyth-network/page.tsx`
  - `/src/app/api3/page.tsx`
  - `/src/app/redstone/page.tsx`
  - `/src/app/tellor/page.tsx`
  - `/src/app/chronicle/page.tsx`
  - `/src/app/winklink/page.tsx`
  - `/src/app/cross-oracle/page.tsx`
  - `/src/app/cross-chain/page.tsx`
  - `/src/app/price-query/page.tsx`
  - `/src/app/favorites/page.tsx`
  - `/src/app/settings/page.tsx`
  - `/src/app/login/page.tsx`
- Affected components:
  - `StatCard` - 统计卡片组件
  - `DashboardCard` - 仪表板卡片组件
  - `PageHeader` - 页面头部组件
  - `TabNavigation` - 标签导航组件
  - `OraclePageTemplate` - 预言机页面模板

## ADDED Requirements

### Requirement: 页面背景色优化
The system SHALL use a subtle off-white background color instead of pure white for non-home pages.

#### Scenario: 用户访问非首页页面
- **WHEN** 用户访问任何非首页页面
- **THEN** 页面背景色使用 #FAFAFA 或 #F8F9FA 替代纯白
- **AND** 内容区域与背景形成微妙的层次对比

### Requirement: Dune风格统计数据展示
The system SHALL display statistics in a flat, compact grid layout inspired by Dune Analytics.

#### Scenario: 用户查看统计数据
- **WHEN** 用户查看页面顶部统计区域
- **THEN** 统计数据以紧凑网格方式展示
- **AND** 各数据项之间使用1px细线分隔（左侧分隔线）
- **AND** 标签使用小写、灰色（#6B7280）、小字体（10-11px）
- **AND** 数值使用大字体（18-24px）、深色（#111827）
- **AND** 变化趋势以简洁方式显示在数值旁边
- **AND** 移除卡片边框、阴影、圆角

### Requirement: 内容区域分隔
The system SHALL use subtle border separators instead of card shadows.

#### Scenario: 用户浏览页面内容
- **WHEN** 用户查看不同内容区块
- **THEN** 区块之间使用1px细线分隔（border-bottom 或 border-top）
- **AND** 分隔线颜色使用极浅灰色（#E5E7EB 或 #F3F4F6）
- **AND** 移除卡片的阴影和圆角效果

### Requirement: 页面头部扁平化
The system SHALL provide a flat, minimal page header design.

#### Scenario: 用户查看页面头部
- **THEN** 头部使用简洁的标题和副标题布局
- **AND** 操作按钮（刷新、导出等）使用简洁的边框样式
- **AND** 移除头部背景色和阴影
- **AND** 使用底部边框分隔头部与内容区域

## MODIFIED Requirements

### Requirement: 统计数据展示
**Current**: 使用圆角卡片、阴影、图标背景等设计
**Modified**:
- 页面背景改为 #FAFAFA
- 统计数据区域使用紧凑网格布局
- 数据项之间使用1px左侧分隔线（border-left）
- 第一个数据项无左侧分隔线
- 标签使用小写、灰色、小字体（text-xs uppercase tracking-wider）
- 数值使用大字体（text-lg 或 text-xl）、深色
- 变化趋势简洁显示，使用 +/- 符号
- 移除卡片边框、阴影、圆角
- 移除图标背景色块

### Requirement: 内容卡片样式
**Current**: 使用圆角、阴影、边框的卡片设计
**Modified**:
- 移除卡片阴影和圆角
- 使用1px细线边框（border-gray-200）
- 或使用底部边框分隔不同区块
- 背景色保持白色或透明

### Requirement: Tab导航样式
**Current**: 圆角按钮组，带边框和阴影
**Modified**:
- 使用简洁的文本链接样式
- 选中状态使用底部边框指示（border-b-2）
- 无背景色变化
- 更紧凑的间距

## REMOVED Requirements

### Requirement: 卡片阴影效果
**Reason**: 与Dune扁平化设计风格不符
**Migration**: 改为使用细线分隔

### Requirement: 图标背景色块
**Reason**: 过于厚重，不符合扁平化设计
**Migration**: 移除背景色块，直接使用简洁图标

### Requirement: 圆角设计
**Reason**: Dune风格使用直角设计更专业
**Migration**: 将圆角改为直角（rounded-none）
