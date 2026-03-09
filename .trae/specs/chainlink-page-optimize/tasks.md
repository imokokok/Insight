# Chainlink 页面色调优化 - 任务列表

## [x] 任务 1: 修改页面主色调
- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 将页面背景从 `bg-slate-950` 改为 `bg-gray-50`
  - 将卡片背景从 `bg-slate-800/50` 改为 `bg-white`
  - 将卡片边框从 `border-slate-700` 改为 `border-gray-200`
  - 将文字颜色从 `text-white` 改为 `text-gray-900`
  - 将次要文字从 `text-slate-400` 改为 `text-gray-600`
- **Acceptance Criteria**: 页面整体呈现浅色主题，与其他页面视觉一致

## [x] 任务 2: 移除侧边导航栏，改为标签页导航
- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 移除 `Sidebar` 组件及其相关状态
  - 移除 `DashboardHeader` 组件中的菜单按钮
  - 创建水平标签页导航组件（Tabs）
  - 标签页包含：市场数据、网络健康、节点分析、生态系统、风险评估
  - 点击标签页切换显示对应模块内容
- **Acceptance Criteria**: 页面使用标签页导航，无侧边栏，切换流畅

## [x] 任务 3: 更新统计卡片样式
- **Priority**: P0
- **Depends On**: 任务 1
- **Description**:
  - 更新 `StatCard` 组件配色
  - 图标背景从 `bg-slate-700/50` 改为 `bg-blue-50`
  - 图标颜色从 `text-slate-300` 改为 `text-blue-600`
  - 涨跌幅颜色保持 `text-emerald-500` / `text-red-500`
- **Acceptance Criteria**: 统计卡片样式与其他页面卡片一致

## [x] 任务 4: 更新 DashboardCard 组件
- **Priority**: P0
- **Depends On**: 任务 1
- **Description**:
  - 更新 `DashboardCard` 组件配色
  - 标题颜色从 `text-white` 改为 `text-gray-900`
  - 边框颜色从 `border-slate-700` 改为 `border-gray-200`
  - 移除 `backdrop-blur-sm` 效果（浅色主题不需要）
- **Acceptance Criteria**: 卡片组件在浅色主题下显示正常

## [x] 任务 5: 更新顶部操作栏样式
- **Priority**: P1
- **Depends On**: 任务 1
- **Description**:
  - 将顶部栏背景从 `bg-slate-900` 改为 `bg-white`
  - 将边框从 `border-slate-800` 改为 `border-gray-200`
  - 按钮样式改为浅色主题版本
  - 时间选择器按钮样式更新
- **Acceptance Criteria**: 顶部操作栏与页面整体风格一致

## [x] 任务 6: 更新子组件配色
- **Priority**: P1
- **Depends On**: 任务 1
- **Description**:
  - 更新 `MarketDataPanel` 组件配色
  - 更新 `NetworkHealthPanel` 组件配色
  - 更新 `NodeAnalyticsPanel` 组件配色
  - 更新 `EcosystemPanel` 组件配色
  - 更新 `RiskAssessmentPanel` 组件配色
  - 更新 `DataQualityPanel` 组件配色
  - 更新 `PriceChart` 组件配色
- **Acceptance Criteria**: 所有子组件在浅色主题下显示正常

## [x] 任务 7: 代码质量检查
- **Priority**: P1
- **Depends On**: 任务 1-6
- **Description**:
  - 运行 TypeScript 类型检查
  - 运行 ESLint 代码检查
  - 验证页面响应式布局
  - 验证所有交互功能正常
- **Acceptance Criteria**: 无类型错误，无 ESLint 警告，功能正常

# 任务依赖关系
- 任务 3-6 依赖于 任务 1
- 任务 7 依赖于 任务 1-6
