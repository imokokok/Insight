# UMA页面重构任务列表

- [x] Task 1: 创建UMA页面类型定义
  - [x] SubTask 1.1: 创建 `/src/app/[locale]/uma/types.ts`，定义UmaTabId、UMAStats、UMANetworkStats等类型
  - [x] SubTask 1.2: 确保类型与Chainlink页面类型保持一致风格

- [x] Task 2: 创建UMA数据获取Hook
  - [x] SubTask 2.1: 创建 `/src/app/[locale]/uma/hooks/useUmaPage.ts`
  - [x] SubTask 2.2: 集成UMAClient获取价格、历史数据、网络统计
  - [x] SubTask 2.3: 集成验证者数据、争议数据获取
  - [x] SubTask 2.4: 实现刷新和导出功能

- [x] Task 3: 创建UMA侧边栏组件
  - [x] SubTask 3.1: 创建 `/src/app/[locale]/uma/components/UmaSidebar.tsx`
  - [x] SubTask 3.2: 实现8个导航项（市场、网络、争议、验证者、质押、生态、跨预言机、风险）
  - [x] SubTask 3.3: 实现激活状态样式（红色左侧边框+背景）

- [x] Task 4: 创建UMA市场视图组件
  - [x] SubTask 4.1: 创建 `/src/app/[locale]/uma/components/UmaMarketView.tsx`
  - [x] SubTask 4.2: 实现价格图表区域（占2/3宽度）
  - [x] SubTask 4.3: 实现快速统计面板（市值、交易量、流通量、APR）
  - [x] SubTask 4.4: 实现网络状态概览

- [x] Task 5: 创建UMA争议视图组件
  - [x] SubTask 5.1: 创建 `/src/app/[locale]/uma/components/UmaDisputesView.tsx`
  - [x] SubTask 5.2: 实现争议统计概览卡片
  - [x] SubTask 5.3: 集成DisputeResolutionPanel
  - [x] SubTask 5.4: 显示最近争议列表

- [x] Task 6: 创建UMA验证者视图组件
  - [x] SubTask 6.1: 创建 `/src/app/[locale]/uma/components/UmaValidatorsView.tsx`
  - [x] SubTask 6.2: 实现验证者数据表格
  - [x] SubTask 6.3: 集成ValidatorAnalyticsPanel
  - [x] SubTask 6.4: 显示网络质押统计

- [x] Task 7: 创建UMA质押视图组件
  - [x] SubTask 7.1: 创建 `/src/app/[locale]/uma/components/UmaStakingView.tsx`
  - [x] SubTask 7.2: 实现质押计算器表单
  - [x] SubTask 7.3: 显示收益预估结果
  - [x] SubTask 7.4: 显示APR对比信息

- [x] Task 8: 创建UMA网络视图组件
  - [x] SubTask 8.1: 创建 `/src/app/[locale]/uma/components/UmaNetworkView.tsx`
  - [x] SubTask 8.2: 显示网络健康指标
  - [x] SubTask 8.3: 显示数据源状态

- [x] Task 9: 创建UMA生态和风险视图组件
  - [x] SubTask 9.1: 创建 `/src/app/[locale]/uma/components/UmaEcosystemView.tsx`
  - [x] SubTask 9.2: 创建 `/src/app/[locale]/uma/components/UmaRiskView.tsx`
  - [x] SubTask 9.3: 复用现有UMA生态和风险面板

- [x] Task 10: 创建组件索引文件
  - [x] SubTask 10.1: 创建 `/src/app/[locale]/uma/components/index.ts`
  - [x] SubTask 10.2: 导出所有视图组件

- [x] Task 11: 重构主页面
  - [x] SubTask 11.1: 重写 `/src/app/[locale]/uma/page.tsx`
  - [x] SubTask 11.2: 实现Hero区域（价格、统计、操作按钮）
  - [x] SubTask 11.3: 实现侧边栏+主内容区布局
  - [x] SubTask 11.4: 实现标签切换逻辑
  - [x] SubTask 11.5: 实现移动端响应式菜单

# Task Dependencies
- Task 2 依赖 Task 1（类型定义）
- Task 3-9 依赖 Task 1（类型定义）
- Task 10 依赖 Task 3-9（组件创建完成）
- Task 11 依赖 Task 2 和 Task 10（hook和组件准备就绪）
