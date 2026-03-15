# 跨预言机比较页面 Dune 风格重构 Spec

## Why
当前跨预言机比较页面使用了大量的卡片样式（DashboardCard、MetricCard），视觉层次过于复杂，信息密度较低。参考 Dune Analytics 的扁平化设计模式，可以减少视觉噪音，提升数据的可读性和专业感，同时保持现有的所有功能。

## What Changes

### 设计模式变更
- **减少卡片使用**: 将嵌套的多层卡片结构改为扁平化的分区布局
- **简化视觉层次**: 使用更简洁的分隔线、背景色块替代阴影和圆角卡片
- **提升信息密度**: 在保持清晰度的前提下，展示更多数据
- **统一表格样式**: 采用 Dune 风格的数据表格，简洁、专业

### 保留的功能
- 价格比较图表（柱状图、折线图）
- 雷达图性能对比
- 偏差分析和警报
- 预言机选择器
- 交易对选择
- 自动刷新设置
- 数据导出功能
- 响应式布局

### 具体改动

#### 1. 头部区域
- 移除卡片包裹，使用简洁的标题栏+操作区布局
- 标题和副标题左对齐，操作按钮右对齐

#### 2. 统计指标区域
- 将多个 MetricCard 改为扁平化的统计网格
- 使用简洁的数字+标签形式，减少边框和阴影

#### 3. 控制面板区域
- 交易对选择、预言机选择、偏差阈值设置改为内联式布局
- 减少卡片嵌套，使用背景色区分不同功能区

#### 4. 图表区域
- 图表容器使用简洁的边框或无边框设计
- 标题直接显示在图表上方，不使用卡片标题

#### 5. 表格区域
- 采用 Dune 风格的简洁表格
- 减少表头背景色，使用细边框分隔
- 行悬停效果更 subtle

#### 6. 警报区域
- 偏差警报改为内联通知样式，不使用卡片包裹

## Impact
- Affected specs: 跨预言机比较功能
- Affected code:
  - 修改: `src/components/oracle/charts/CrossOracleComparison/index.tsx`
  - 修改: `src/components/oracle/common/DashboardCard.tsx` (可能需要添加新的变体)

## ADDED Requirements

### Requirement: Dune 风格扁平化设计
系统 SHALL 将跨预言机比较页面的设计改为 Dune Analytics 风格的扁平化设计。

#### Scenario: 统计指标展示
- **WHEN** 用户查看统计指标区域
- **THEN** 系统显示扁平化的统计数据，不使用卡片包裹，使用简洁的数字+标签形式

#### Scenario: 控制面板布局
- **WHEN** 用户查看控制面板
- **THEN** 系统显示内联式的控制选项，减少卡片嵌套层级

#### Scenario: 数据表格展示
- **WHEN** 用户查看数据表格
- **THEN** 系统显示 Dune 风格的简洁表格，减少视觉噪音

#### Scenario: 图表展示
- **WHEN** 用户查看图表
- **THEN** 系统显示简洁的图表容器，不使用厚重的卡片包裹

#### Scenario: 警报通知
- **WHEN** 系统需要显示偏差警报
- **THEN** 系统显示内联通知样式，不使用卡片包裹

## MODIFIED Requirements

### Requirement: CrossOracleComparison 组件样式
**修改内容**: 
- 移除 DashboardCard 和 MetricCard 的大量使用
- 改为扁平化的分区布局
- 保留所有现有功能和交互
- 保持响应式设计

### Requirement: DashboardCard 组件
**修改内容**: 考虑添加新的变体或样式选项以支持 Dune 风格设计
