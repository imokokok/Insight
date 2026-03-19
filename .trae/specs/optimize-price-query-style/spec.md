# 价格查询页面样式优化规范

## Why

当前价格查询页面功能完善，但在视觉呈现上还有优化空间：

1. **信息密度可提升** - 当前 StatsGrid 等组件使用较多内边距和边框，可以更加紧凑
2. **视觉层次可优化** - 选择器、统计卡片、图表、表格之间的视觉区分可以更清晰
3. **交互反馈可增强** - 表格行选中、数据高亮等状态的视觉反馈可以更明显
4. **一致性待提升** - 部分组件的样式细节（如圆角、阴影、边框）可以更加统一

基于现有的 `bg-dune` 背景风格，进行适度的样式优化，不引入新的设计风格，而是精炼现有风格。

## What Changes

### 1. 统计卡片 (StatsGrid) 优化
- **紧凑化** - 减少内边距，提升信息密度
- **视觉层次** - 主指标与次指标的字体大小对比更明显
- **对比模式** - 优化对比差异的展示方式，减少视觉干扰
- **展开动画** - 优化展开/收起的过渡效果

### 2. 选择器区域 (Selectors) 优化
- **分组清晰** - 优化各选择器之间的视觉分组
- **选中状态** - 增强选中项的视觉反馈
- **高级选项** - 优化高级选项的展开动画和样式

### 3. 结果表格 (PriceResultsTable) 优化
- **行高优化** - 适度减小行高，提升信息密度
- **选中状态** - 优化行选中状态的视觉表现
- **偏差标记** - 优化高偏差数据的标记样式
- **分页器** - 简化分页器样式

### 4. 图表区域 (PriceChart) 优化
- **工具栏** - 优化指标控制区域的布局
- **图例** - 优化图例的交互和样式
- **空状态** - 优化无数据时的展示

### 5. 整体布局优化
- **间距统一** - 统一各区块之间的间距
- **响应式** - 优化移动端下的布局表现
- **加载状态** - 优化加载骨架屏的样式

## Impact

- 受影响文件：
  - `src/app/[locale]/price-query/components/StatsGrid.tsx` - 统计网格样式
  - `src/app/[locale]/price-query/components/StatItem.tsx` - 统计项组件
  - `src/app/[locale]/price-query/components/Selectors.tsx` - 选择器样式
  - `src/app/[locale]/price-query/components/PriceResultsTable.tsx` - 结果表格样式
  - `src/app/[locale]/price-query/components/PriceChart.tsx` - 图表区域样式
  - `src/app/[locale]/price-query/components/QueryResults.tsx` - 结果容器布局
  - `src/app/[locale]/price-query/components/QueryHeader.tsx` - 页面头部样式
  - `src/app/[locale]/price-query/page.tsx` - 页面整体布局

## ADDED Requirements

### Requirement: 统计卡片紧凑化
StatsGrid SHALL 提供更紧凑的统计展示

#### Scenario: 用户查看统计数据
- **WHEN** 用户查看价格统计
- **THEN** 统计卡片使用更小的内边距 (py-2 px-3)
- **AND** 主指标使用更大的字体 (text-xl)
- **AND** 标签使用更小的字体 (text-[10px])
- **AND** 对比差异使用更 subtle 的展示方式

### Requirement: 表格选中状态优化
PriceResultsTable SHALL 提供清晰的行选中视觉反馈

#### Scenario: 用户点击表格行
- **WHEN** 用户点击某一行
- **THEN** 该行使用左侧边框高亮 (border-l-2)
- **AND** 背景色变化更 subtle (bg-blue-50/30)
- **AND** 整行有平滑的过渡动画

### Requirement: 选择器视觉分组
Selectors SHALL 提供清晰的视觉分组

#### Scenario: 用户配置查询条件
- **WHEN** 用户查看选择器区域
- **THEN** 各选择器之间有清晰的分隔
- **AND** 选中项有明确的视觉反馈
- **AND** 高级选项展开有平滑动画

### Requirement: 间距和布局统一
所有组件 SHALL 使用统一的间距规范

#### Scenario: 用户浏览整个页面
- **WHEN** 用户在不同区块之间浏览
- **THEN** 区块间距统一 (gap-4 或 gap-6)
- **AND** 圆角统一 (rounded-lg)
- **AND** 阴影统一 (shadow-sm 或无边框风格)

## MODIFIED Requirements
无

## REMOVED Requirements
无
