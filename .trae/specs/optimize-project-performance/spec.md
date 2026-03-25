# 项目性能优化规范

## Why
Insight 项目作为一个区块链预言机数据分析平台，需要处理大量实时数据和复杂的图表渲染。随着功能增加，性能问题逐渐显现：
- 大数据表格渲染卡顿
- 图表组件不必要的重渲染
- 图标库全量导入导致包体积过大
- 部分组件缺少 memo 优化
- 图片资源未优化

## What Changes
- **优化大数据表格组件** - 为 DataTablePro 添加虚拟滚动支持
- **添加组件 memo 优化** - 为关键组件添加 React.memo
- **优化图标导入** - 将 lucide-react 全量导入改为按需导入
- **图片优化** - 添加 Next.js Image 组件和懒加载
- **代码分割** - 为重型组件添加动态导入
- **缓存优化** - 优化 React Query 缓存配置

## Impact
- 受影响组件: DataTablePro, PriceTable, AssetsTable, GlobalSearch, OracleMarketOverview 等
- 受影响文件: 20+ 个组件文件
- 预期性能提升: 首屏加载时间减少 20-30%，大数据表格滚动流畅度提升 50%+

## ADDED Requirements

### Requirement: 大数据表格虚拟滚动
The system SHALL 为 DataTablePro 组件提供虚拟滚动支持，以优化大数据量渲染性能。

#### Scenario: 大数据量渲染
- **GIVEN** 表格数据超过 100 行
- **WHEN** 用户滚动表格
- **THEN** 只渲染可视区域内的行，保持流畅滚动体验

### Requirement: 组件 Memo 优化
The system SHALL 为关键展示组件添加 React.memo，避免不必要的重渲染。

#### Scenario: 父组件状态更新
- **GIVEN** 父组件状态发生变化
- **WHEN** 子组件 props 未改变
- **THEN** 子组件不应重新渲染

### Requirement: 图标按需导入
The system SHALL 将 lucide-react 的全量导入改为按需导入，减少包体积。

#### Scenario: 构建分析
- **GIVEN** 运行构建分析
- **WHEN** 检查 lucide-react 的导入方式
- **THEN** 只导入实际使用的图标，而非整个库

### Requirement: 图片懒加载
The system SHALL 为图片资源添加懒加载，优化首屏加载时间。

#### Scenario: 页面加载
- **GIVEN** 页面包含多个图片
- **WHEN** 用户首次访问页面
- **THEN** 只加载可视区域内的图片

## MODIFIED Requirements

### Requirement: React Query 缓存优化
The system SHALL 优化 React Query 的缓存策略，减少不必要的数据请求。

#### Scenario: 数据获取
- **GIVEN** 用户频繁切换页面
- **WHEN** 返回已访问页面
- **THEN** 优先使用缓存数据，减少 API 请求

### Requirement: 动态导入重型组件
The system SHALL 为重型图表组件添加动态导入，实现代码分割。

#### Scenario: 首屏加载
- **GIVEN** 页面包含重型图表组件
- **WHEN** 用户访问页面
- **THEN** 首屏不加载图表代码，按需加载
