# Chainlink 页面交互优化 Spec

## Why
当前 Chainlink 页面虽然功能完善，但在专业数据分析场景下，存在一些交互体验问题：时间范围选择器重复、图表工具栏过于复杂、缺少关键的专业分析功能、响应式设计不够优化等。这些优化将使平台更符合专业预言机数据分析平台的标准。

## What Changes
- 统一时间范围选择器，消除重复操作
- 简化图表工具栏，优化移动端体验
- 增强跨预言机比较的交互功能
- 优化数据刷新的视觉反馈
- 增加专业的价格偏离分析功能
- 优化响应式布局

## Impact
- Affected specs: Chainlink 页面的市场数据展示、跨预言机比较、图表交互
- Affected code:
  - `src/components/oracle/PageHeader.tsx`
  - `src/components/oracle/PriceChart.tsx`
  - `src/components/oracle/CrossOracleComparison.tsx`
  - `src/components/oracle/KPIDashboard.tsx`
  - `src/components/oracle/TabNavigation.tsx`

## ADDED Requirements

### Requirement: 统一时间范围选择器
系统 SHALL 在页面级别提供统一的时间范围选择器，避免重复操作。

#### Scenario: 时间范围全局同步
- **WHEN** 用户在 PageHeader 选择时间范围
- **THEN** 所有图表和面板自动同步该时间范围
- **AND** PriceChart 内部不再显示独立的时间范围选择器
- **AND** 时间范围选择器显示当前选中的时间范围标签

#### Scenario: 时间范围记忆
- **WHEN** 用户切换 Tab 或刷新页面
- **THEN** 系统保持用户选择的时间范围
- **AND** 通过 URL 参数或 localStorage 存储时间范围状态

### Requirement: 简化图表工具栏
系统 SHALL 简化价格图表的工具栏，提供更直观的交互方式。

#### Scenario: 工具栏折叠优化
- **WHEN** 用户查看价格图表
- **THEN** 默认显示核心功能按钮（时间范围、图表类型）
- **AND** 高级功能（异常检测、预测区间、对比）折叠到"更多"菜单中
- **AND** 移动端工具栏自动折叠为图标按钮

#### Scenario: 功能状态持久化
- **WHEN** 用户启用异常检测或预测区间功能
- **THEN** 系统记住用户的选择偏好
- **AND** 下次访问时自动恢复用户设置

### Requirement: 增强跨预言机比较交互
系统 SHALL 提供更专业的跨预言机比较交互功能。

#### Scenario: 价格偏离预警
- **WHEN** 跨预言机价格偏离超过阈值（默认 1%）
- **THEN** 系统显示预警提示
- **AND** 用户可以自定义偏离阈值
- **AND** 预警支持声音提醒（可选）

#### Scenario: 表格排序功能
- **WHEN** 用户点击跨预言机比较表格的列标题
- **THEN** 表格按该列排序（升序/降序切换）
- **AND** 排序状态通过箭头图标显示

#### Scenario: 快速对比模式
- **WHEN** 用户选择"快速对比"模式
- **THEN** 系统自动选择主流预言机（Chainlink、Pyth、Band Protocol）
- **AND** 显示简化的对比视图

### Requirement: 数据刷新视觉反馈
系统 SHALL 提供更明显的数据刷新视觉反馈。

#### Scenario: 图表刷新动画
- **WHEN** 数据刷新时
- **THEN** 图表显示淡入淡出的过渡动画
- **AND** 刷新按钮显示旋转动画
- **AND** 最后更新时间显示"刚刚更新"标签

#### Scenario: 实时数据指示器
- **WHEN** 用户查看实时数据
- **THEN** KPI 仪表板显示脉冲动画指示器
- **AND** 数据更新时卡片边框闪烁提示

### Requirement: 价格偏离历史分析
系统 SHALL 提供价格偏离历史分析功能。

#### Scenario: 偏离历史图表
- **WHEN** 用户查看跨预言机比较页面
- **THEN** 系统显示价格偏离历史趋势图
- **AND** 图表展示各预言机价格与平均值的偏离百分比
- **AND** 支持选择不同的基准（平均值、中位数、Chainlink 价格）

#### Scenario: 偏离统计面板
- **WHEN** 用户查看偏离分析
- **THEN** 系统显示偏离统计面板，包括：
  - 平均偏离百分比
  - 最大偏离值及发生时间
  - 偏离标准差
  - 偏离趋势（上升/下降/稳定）

### Requirement: 响应式布局优化
系统 SHALL 优化移动端响应式布局。

#### Scenario: KPI 仪表板响应式
- **WHEN** 用户在移动端查看页面
- **THEN** KPI 仪表板显示 2 列布局
- **AND** 可横向滑动查看所有指标
- **AND** 显示滑动指示器

#### Scenario: Tab 导航优化
- **WHEN** 用户在移动端查看 Tab 导航
- **THEN** 显示当前 Tab 的完整标签
- **AND** 未选中的 Tab 显示图标
- **AND** 支持左右滑动切换 Tab

### Requirement: 数据导出增强
系统 SHALL 提供更灵活的数据导出功能。

#### Scenario: 批量导出
- **WHEN** 用户点击导出按钮
- **THEN** 系统显示导出选项面板，包括：
  - 选择导出范围（当前视图、全部数据、自定义范围）
  - 选择导出格式（CSV、JSON、Excel）
  - 选择导出内容（价格数据、统计数据、图表截图）
- **AND** 支持一键导出所有数据

#### Scenario: 图表截图优化
- **WHEN** 用户导出图表截图
- **THEN** 截图包含图表标题、时间戳、数据来源标识
- **AND** 支持选择分辨率（标准、高清）

## MODIFIED Requirements

### Requirement: PageHeader 组件增强
原有的 PageHeader 组件需要增强，成为全局时间范围的唯一控制点。

**原有功能**：
- 显示页面标题和副标题
- 提供时间范围选择器
- 提供刷新和导出按钮

**新增功能**：
- 时间范围选择器成为全局控制
- 添加快速时间范围切换（今日、本周、本月）
- 刷新按钮显示最后更新时间

### Requirement: PriceChart 组件简化
原有的 PriceChart 组件需要简化，移除重复的时间范围选择器。

**原有功能**：
- 独立的时间范围选择器
- 多种图表类型切换
- 高级分析功能按钮

**修改功能**：
- 移除独立的时间范围选择器，使用全局时间范围
- 工具栏按钮折叠优化
- 高级功能移入"更多"菜单

### Requirement: CrossOracleComparison 组件增强
原有的跨预言机比较组件需要增强，提供更专业的分析功能。

**原有功能**：
- 多预言机价格对比
- 性能指标对比
- 雷达图展示

**新增功能**：
- 价格偏离预警
- 表格排序
- 快速对比模式
- 偏离历史分析

## REMOVED Requirements

### Requirement: PriceChart 独立时间范围选择器
**Reason**: 与 PageHeader 的时间范围选择器重复，造成用户困惑和操作冗余。
**Migration**: 使用 TimeRangeContext 统一管理时间范围状态，PriceChart 通过 context 获取时间范围。
