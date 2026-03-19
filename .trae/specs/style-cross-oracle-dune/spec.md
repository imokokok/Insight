# 跨预言机对比功能 Dune 风格样式优化规范

## Why
当前跨预言机对比功能虽然已经完成了 Tab 化重设计，但视觉上仍然使用了传统的卡片样式（border + bg-white），与 Dune Analytics 的简洁、数据驱动的设计风格有差距。Dune 的设计风格特点是：
1. **无卡片边框** - 使用分隔线而非边框来区分区域
2. **数据优先** - 减少装饰性元素，突出数据本身
3. **简洁的配色** - 使用中性背景，让图表和数据成为视觉焦点
4. **紧凑的布局** - 减少内边距，提高信息密度

需要参照 Dune 的设计风格，去除卡片样式，使跨预言机对比功能更加专业和数据驱动。

## What Changes

### 1. 去除卡片边框和背景
- **移除** 所有 `border border-gray-200` 和 `bg-white` 样式
- **替换** 为简洁的分隔线（`border-b` 或 `border-t`）来区分区域
- **使用** 浅灰色背景（`bg-gray-50` 或 `bg-slate-50`）作为可选的区块背景

### 2. 优化指标展示
- **核心指标** - 使用大号字体展示数据，弱化标签
- **去除** 指标卡片的边框和背景
- **使用** 简洁的分隔线或间距来区分不同指标

### 3. 优化图表区域
- **图表容器** - 去除边框，使用全宽布局
- **图表标题** - 使用小字号、灰色文字
- **图表本身** - 保持简洁，突出数据线条

### 4. 优化表格样式
- **表格** - 去除边框，使用细分隔线
- **表头** - 使用浅灰色背景或底部边框
- **行** - 使用 hover 效果替代斑马纹

### 5. 优化控制元素
- **按钮** - 使用简洁的文本按钮或幽灵按钮
- **选择器** - 去除边框，使用下划线或背景色变化
- **标签** - 使用小字号、灰色文字

### 6. 整体配色调整
- **背景** - 使用 `#fafafa` 或 `#f8fafc` 作为页面背景
- **分隔线** - 使用 `#e5e7eb` 或更浅的颜色
- **文字** - 使用深灰色（`#111827`）作为主文字，浅灰色（`#6b7280`）作为辅助文字

## Impact
- 受影响文件：
  - `src/components/oracle/charts/CrossOracleComparison/index.tsx` - 主容器样式
  - `src/components/oracle/charts/CrossOracleComparison/OverviewTab.tsx` - 概览视图样式
  - `src/components/oracle/charts/CrossOracleComparison/ChartsTab.tsx` - 图表视图样式
  - `src/components/oracle/charts/CrossOracleComparison/DataTab.tsx` - 数据视图样式
  - `src/components/oracle/charts/CrossOracleComparison/SettingsTab.tsx` - 设置视图样式
  - `src/components/oracle/charts/CrossOracleComparison/CollapsiblePanel.tsx` - 可折叠面板样式
  - `src/components/oracle/charts/CrossOracleComparison/CrossOracleSubTabs.tsx` - 子选项卡样式

## ADDED Requirements

### Requirement: Dune 风格样式
所有 CrossOracleComparison 组件 SHALL 使用 Dune 风格的无卡片设计

#### Scenario: 用户查看跨预言机对比
- **WHEN** 用户打开 cross-oracle tab
- **THEN** 不显示卡片边框和白色背景
- **AND** 使用分隔线和间距来组织内容
- **AND** 数据展示优先，装饰性元素最小化

### Requirement: 指标展示优化
核心指标 SHALL 使用简洁的无边框设计

#### Scenario: 用户查看概览页指标
- **WHEN** 用户查看核心指标
- **THEN** 指标使用大号字体
- **AND** 标签使用小字号灰色文字
- **AND** 不使用卡片边框和背景

### Requirement: 图表区域优化
图表容器 SHALL 使用全宽无边框设计

#### Scenario: 用户查看图表
- **WHEN** 用户查看任何图表
- **THEN** 图表容器没有边框
- **AND** 图表标题使用小字号灰色文字
- **AND** 图表本身占据完整宽度

### Requirement: 表格样式优化
表格 SHALL 使用简洁的无边框设计

#### Scenario: 用户查看表格
- **WHEN** 用户查看价格对比表格、偏差表格或性能表格
- **THEN** 表格没有外边框
- **AND** 使用细分隔线分隔行
- **AND** 表头使用浅灰色背景或底部边框

## MODIFIED Requirements
无

## REMOVED Requirements
无
