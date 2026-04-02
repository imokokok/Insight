# Tasks

## Phase 1: 基础组件和类型定义

- [x] Task 1: 创建 Tab 切换组件
  - [x] SubTask 1.1: 创建 `src/app/[locale]/cross-oracle/components/TabContentSwitcher.tsx`，实现 Tab 导航和状态管理
  - [x] SubTask 1.2: 定义 Tab 类型和配置常量（priceComparison, dataQuality, riskAlert）
  - [x] SubTask 1.3: 实现 Tab 切换动画效果

## Phase 2: 重构 QueryResults 组件

- [x] Task 2: 重构 QueryResults 主组件
  - [x] SubTask 2.1: 添加 activeTab 状态管理
  - [x] SubTask 2.2: 集成 TabContentSwitcher 组件到卡片头部下方
  - [x] SubTask 2.3: 根据 activeTab 动态渲染对应的内容区域
  - [x] SubTask 2.4: 移除垂直堆叠的模块展示方式
  - [x] SubTask 2.5: 保留统一的卡片头部信息（交易对、预言机数量等）

## Phase 3: 优化各 Tab 内容组件

- [x] Task 3: 优化价格对比 Tab 内容
  - [x] SubTask 3.1: 精简 PriceComparisonTab 组件，移除冗余统计指标
  - [x] SubTask 3.2: 保留核心展示：价格表格、趋势图、关键指标（中位数、区间、偏差率）
  - [x] SubTask 3.3: 添加必要的图标（TrendingUp、BarChart 等）
  - [x] SubTask 3.4: 优化空状态和加载状态展示

- [x] Task 4: 优化数据质量 Tab 内容
  - [x] SubTask 4.1: 重构 QualityAnalysisTab 组件，整合质量评分展示
  - [x] SubTask 4.2: 优化一致性/新鲜度/完整性分析的可视化（进度条、仪表盘）
  - [x] SubTask 4.3: 添加质量相关图标（Shield、CheckCircle、Clock、Database）
  - [x] SubTask 4.4: 移除与价格对比 Tab 重复的信息
  - [x] SubTask 4.5: 优化改进建议的展示方式

- [x] Task 5: 创建风险预警 Tab 组件
  - [x] SubTask 5.1: 创建 `src/app/[locale]/cross-oracle/components/tabs/RiskAlertTab.tsx`
  - [x] SubTask 5.2: 集成 RiskAlertDashboard 的核心功能
  - [x] SubTask 5.3: 优化风险等级分布展示（卡片式布局）
  - [x] SubTask 5.4: 优化异常预言机列表展示
  - [x] SubTask 5.5: 添加风险相关图标（AlertTriangle、ShieldAlert、ShieldCheck）
  - [x] SubTask 5.6: 实现无异常时的安全状态展示

## Phase 4: 国际化和文案优化

- [x] Task 6: 更新国际化文案
  - [x] SubTask 6.1: 更新 `src/i18n/messages/zh-CN/crossOracle.json`，添加 Tab 相关文案
  - [x] SubTask 6.2: 更新 `src/i18n/messages/en/crossOracle.json`，添加 Tab 相关文案
  - [x] SubTask 6.3: 优化各 Tab 内的文案描述，使其更简洁清晰

## Phase 5: 验证和优化

- [x] Task 7: 功能验证和性能优化
  - [x] SubTask 7.1: 验证 Tab 切换功能正常
  - [x] SubTask 7.2: 验证各 Tab 内容展示正确
  - [x] SubTask 7.3: 验证图标显示正确
  - [x] SubTask 7.4: 检查并优化组件重新渲染性能
  - [x] SubTask 7.5: 运行 lint 检查

# Task Dependencies

- Task 2 依赖于 Task 1
- Task 3、Task 4、Task 5 可以并行开发，都依赖于 Task 2
- Task 6 依赖于 Task 3、Task 4、Task 5
- Task 7 依赖于 Task 6

# 可以并行的任务

- Task 3、Task 4、Task 5 可以并行开发
- SubTask 6.1 和 SubTask 6.2 可以并行
