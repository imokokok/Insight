# Tasks

- [ ] Task 1: 修改UMA Tab配置
  - [ ] SubTask 1.1: 更新oracles.tsx中的UMA tabs配置，移除network，调整顺序
  - [ ] SubTask 1.2: 添加staking tab配置
  - [ ] SubTask 1.3: 更新i18n翻译键值

- [ ] Task 2: 创建StakingPanel组件
  - [ ] SubTask 2.1: 创建StakingPanel基础结构和样式
  - [ ] SubTask 2.2: 实现质押统计概览卡片（总质押量、质押率、APY）
  - [ ] SubTask 2.3: 实现质押收益计算器
  - [ ] SubTask 2.4: 实现质押历史趋势图表
  - [ ] SubTask 2.5: 添加质押教程和风险提示

- [ ] Task 3: 增强Validators Tab
  - [ ] SubTask 3.1: 创建UMADashboardPanel组件
  - [ ] SubTask 3.2: 将Network健康指标整合到Validators tab顶部
  - [ ] SubTask 3.3: 迁移StakingCalculator到StakingPanel

- [ ] Task 4: 增强Ecosystem Tab
  - [ ] SubTask 4.1: 创建Optimistic Oracle用例展示组件
  - [ ] SubTask 4.2: 实现价格请求类型分布图表
  - [ ] SubTask 4.3: 添加使用UMA的协议列表
  - [ ] SubTask 4.4: 添加成功案例展示

- [ ] Task 5: 更新OraclePageTemplate
  - [ ] SubTask 5.1: 添加staking tab的渲染逻辑
  - [ ] SubTask 5.2: 移除network tab的渲染逻辑
  - [ ] SubTask 5.3: 更新validators tab的渲染逻辑

- [ ] Task 6: 更新TabNavigation组件（如需要）
  - [ ] SubTask 6.1: 添加staking tab的图标和标签
  - [ ] SubTask 6.2: 移除network tab的图标和标签

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1
- Task 5 depends on Task 2, Task 3, Task 4
- Task 6 depends on Task 1
