# Dune风格市场概览页面优化规格

## Why
当前市场概览页面虽然已优化，但仍存在以下问题：
1. 统计卡片设计过于厚重，与Dune等现代数据平台的扁平化设计风格不符
2. 数据显示不够简洁，视觉干扰较多
3. 功能区域的显示可以更紧凑、更直观
4. 需要更加强调数据本身而非容器

## What Changes
- **扁平化统计数据展示**：移除卡片式设计，采用Dune风格的简洁数据展示
- **优化功能区域布局**：更紧凑、更直观的功能切换区域
- **简化视觉层次**：减少边框、阴影等装饰元素
- **统一排版风格**：采用更现代的数据展示排版

## Impact
- Affected specs: 市场概览页面UI交互
- Affected code: 
  - `/src/app/market-overview/page.tsx`
  - `/src/app/market-overview/components/ChartRenderer.tsx`

## ADDED Requirements
### Requirement: Dune风格统计数据展示
The system SHALL display market statistics in a flat, minimal design inspired by Dune Analytics.

#### Scenario: 用户查看统计数据
- **WHEN** 用户查看页面顶部统计区域
- **THEN** 统计数据以扁平化方式展示，无卡片边框和阴影
- **AND** 数据标签使用小写灰色文字
- **AND** 数值使用大号字体，突出显示
- **AND** 变化趋势以简洁方式显示在数值旁边
- **AND** 各数据项之间使用简洁的分隔或间距区分

### Requirement: 优化功能切换区域
The system SHALL provide a more compact and intuitive feature switching area.

#### Scenario: 用户切换功能
- **WHEN** 用户查看图表类型切换器
- **THEN** 切换器采用更紧凑的设计
- **AND** 选中状态使用底部边框或背景色区分
- **AND** 整体风格与Dune等现代数据平台一致

## MODIFIED Requirements
### Requirement: 统计数据展示
**Current**: 使用圆角卡片、阴影、图标背景等设计
**Modified**: 
- 移除卡片边框和阴影
- 移除图标背景色块
- 采用简洁的左右或上下布局
- 标签使用小写、灰色、小字体
- 数值使用大字体、深色
- 变化趋势简洁显示

### Requirement: 图表切换器样式
**Current**: 圆角按钮组，带边框和阴影
**Modified**:
- 更简洁的切换器设计
- 选中状态使用底部边框指示
- 减少内边距，更紧凑
- 可选：使用下划线或背景色区分选中状态

## REMOVED Requirements
### Requirement: 卡片式统计展示
**Reason**: 与Dune扁平化设计风格不符
**Migration**: 改为简洁的扁平化数据展示
