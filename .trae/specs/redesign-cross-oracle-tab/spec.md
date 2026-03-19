# 跨预言机对比功能 Tab 化重设计规范

## Why
当前 `CrossOracleComparison` 组件在七个预言机页面中作为 `cross-oracle` tab 的内容，但存在以下问题：
1. **视觉上像独立页面** - 有自己的标题栏、导出按钮、刷新按钮，不像 tab 内的功能
2. **内容过长** - 所有图表和表格垂直堆叠，用户需要大量滚动才能看完
3. **信息密度过高** - 在一个 tab 内展示了太多内容，缺乏层次结构
4. **与页面风格不统一** - 其他 tab 使用简洁的卡片布局，而跨预言机对比使用复杂的 DashboardCard 堆叠

需要重新设计，使其符合 tab 内功能的定位，与其他 tab 风格统一，同时保留所有功能。

## What Changes

### 1. 移除独立页面元素
- **移除** 标题栏（标题和副标题）- tab 本身已经有标识
- **移除** 导出报告按钮 - 移到更隐蔽的位置或简化
- **移除** 刷新按钮 - 使用页面统一的刷新机制
- **移除** 最后更新时间显示 - 使用数据新鲜度指示器替代

### 2. 采用紧凑布局
- **核心指标卡片** - 从 8 个缩减为 4 个最关键的指标
- **可折叠区域** - 使用可折叠面板组织内容，默认折叠次要信息
- **网格布局** - 使用 2-3 列网格替代单列长列表
- **选项卡内选项卡** - 在 cross-oracle tab 内使用子选项卡组织不同视图

### 3. 子选项卡设计
在 cross-oracle tab 内添加二级导航：
- **概览** - 核心价格对比、关键指标、简单图表
- **图表** - 所有可视化图表（雷达图、趋势图、偏差图等）
- **数据** - 详细表格（价格表、偏差表、性能表）
- **设置** - 预言机选择、阈值设置、自动刷新

### 4. 默认展示简化
- **默认只显示 3-4 个关键预言机** - 减少视觉混乱
- **默认折叠详细表格** - 用户需要时展开
- **图表使用更紧凑的尺寸** - 高度从 280-320px 缩减到 200-240px

### 5. 视觉风格统一
- **使用与其他 tab 相同的卡片样式** - 统一边框、阴影、间距
- **使用相同的图标风格** - 与其他 tab 的图标保持一致
- **使用相同的颜色系统** - 遵循页面主题色

## Impact
- 受影响文件：
  - `src/components/oracle/charts/CrossOracleComparison/index.tsx` - 主组件重构
  - `src/components/oracle/charts/CrossOracleComparison/ComparisonControls.tsx` - 控制面板简化
  - `src/components/oracle/charts/CrossOracleComparison/ComparisonCharts.tsx` - 图表布局调整
  - `src/components/oracle/charts/CrossOracleComparison/CompactView.tsx` - 新增紧凑视图组件
  - `src/components/oracle/charts/CrossOracleComparison/TabContent.tsx` - 新增子选项卡内容组件

## ADDED Requirements

### Requirement: 子选项卡导航
CrossOracleComparison 组件 SHALL 在 tab 内提供子选项卡导航

#### Scenario: 用户切换子选项卡
- **WHEN** 用户点击"概览"/"图表"/"数据"/"设置"子选项卡
- **THEN** 内容区域显示对应的内容
- **AND** 子选项卡状态保持（刷新页面后恢复）

### Requirement: 紧凑核心指标
CrossOracleComparison 组件 SHALL 只显示最关键的 4 个指标

#### Scenario: 用户查看概览页
- **WHEN** 用户打开 cross-oracle tab
- **THEN** 显示 4 个核心指标卡片：一致性评分、平均价格、价格范围、最大偏差
- **AND** 其他指标在"数据"子选项卡中查看

### Requirement: 可折叠面板
CrossOracleComparison 组件 SHALL 使用可折叠面板组织内容

#### Scenario: 用户展开/折叠面板
- **WHEN** 用户点击面板标题
- **THEN** 面板内容展开或折叠
- **AND** 面板状态保存在本地存储中

### Requirement: 默认预言机数量限制
CrossOracleComparison 组件 SHALL 默认只选择 4 个预言机

#### Scenario: 用户首次打开 tab
- **WHEN** 用户首次打开 cross-oracle tab
- **THEN** 默认选中 Chainlink、Pyth、Band Protocol、API3
- **AND** 用户可以在设置中添加更多预言机（最多 5 个）

## MODIFIED Requirements

### Requirement: 移除独立页面元素
CrossOracleComparison 组件 SHALL 移除独立页面的视觉元素

#### Scenario: 用户查看 cross-oracle tab
- **WHEN** 用户打开 cross-oracle tab
- **THEN** 不显示大标题和副标题
- **AND** 不显示独立的导出按钮（移到设置中）
- **AND** 不显示独立的刷新按钮（使用页面级刷新）

### Requirement: 图表尺寸优化
CrossOracleComparison 组件 SHALL 使用更紧凑的图表尺寸

#### Scenario: 用户查看图表
- **WHEN** 用户查看任何图表
- **THEN** 图表高度不超过 240px
- **AND** 图表使用更简洁的图例和标签

## REMOVED Requirements
无移除功能，所有现有功能保留，只是重新组织布局
