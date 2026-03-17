# 价格查询页面布局重构 Spec

## Why
当前价格查询页面存在用户体验问题：用户在选择完交易对、预言机、区块链和时间范围后，需要向下滚动才能看到查询结果。这种"选择-滚动-查看"的流程不够直观，影响用户使用效率。

## What Changes
- **重构页面布局**：采用左右分栏或上下分区布局，让选择器和查询结果能够同时可见
- **优化空间利用**：压缩选择器区域高度，为结果展示留出更多空间
- **保持功能完整**：保留所有现有功能（对比模式、基准线、数据导出等）
- **保持样式风格**：维持现有的配色、字体、按钮样式等视觉风格
- **响应式适配**：确保在不同屏幕尺寸下都有良好的展示效果

## Impact
- Affected specs: 价格查询页面用户体验
- Affected code: 
  - `src/app/[locale]/price-query/page.tsx` - 主页面布局
  - `src/app/[locale]/price-query/components/Selectors.tsx` - 选择器组件
  - `src/app/[locale]/price-query/components/StatsGrid.tsx` - 统计网格
  - `src/app/[locale]/price-query/components/PriceResultsTable.tsx` - 结果表格
  - `src/app/[locale]/price-query/components/PriceChart.tsx` - 价格图表

## ADDED Requirements
### Requirement: 优化布局结构
The system SHALL provide a layout that allows users to see query results without scrolling after making selections.

#### Scenario: 桌面端布局
- **WHEN** 用户在桌面端访问价格查询页面
- **THEN** 选择器区域和结果区域应该合理分布，减少不必要的滚动

#### Scenario: 响应式适配
- **WHEN** 用户在移动端访问价格查询页面
- **THEN** 布局应该自适应，保持良好的可用性

## MODIFIED Requirements
### Requirement: 选择器组件优化
The Selectors component SHALL be more compact while maintaining all functionality.

- 压缩选择器区域的高度
- 优化按钮和选项的排列方式
- 保持全选/取消全选功能
- 保持对比模式和基准线选项

### Requirement: 结果展示优化
The query results SHALL be visible with minimal scrolling.

- 统计卡片应该在选择器下方立即可见
- 数据表格应该有合适的高度，避免过度占用空间
- 图表区域应该与表格协调布局

## REMOVED Requirements
无
