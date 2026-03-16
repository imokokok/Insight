# Tasks

- [x] Task 1: 创建标签页导航组件
  - [x] SubTask 1.1: 创建 TabNavigation 组件，支持概览/相关性/高级分析/图表四个标签
  - [x] SubTask 1.2: 实现标签切换状态管理
  - [x] SubTask 1.3: 添加标签切换动画效果

- [x] Task 2: 重构页面布局为标签页结构
  - [x] SubTask 2.1: 将现有组件按功能分组到不同标签页
  - [x] SubTask 2.2: 概览标签：统计卡片、价格对比表、热力图
  - [x] SubTask 2.3: 相关性标签：相关性矩阵、滚动相关性图表
  - [x] SubTask 2.4: 高级分析标签：协整分析、波动率曲面（可折叠）
  - [x] SubTask 2.5: 图表标签：交互式价格图表、价格分布

- [x] Task 3: 实现统计卡片收起/展开功能
  - [x] SubTask 3.1: 修改统计网格组件，支持精简/完整两种模式
  - [x] SubTask 3.2: 默认显示6个核心指标（平均价、最高价、最低价、价格区间、标准差、数据点数）
  - [x] SubTask 3.3: 添加"查看全部/收起"切换按钮

- [x] Task 4: 实现高级模块折叠功能
  - [x] SubTask 4.1: 创建 CollapsibleSection 可折叠容器组件
  - [x] SubTask 4.2: 为协整分析模块添加折叠支持
  - [x] SubTask 4.3: 为波动率曲面模块添加折叠支持
  - [x] SubTask 4.4: 默认折叠状态，保留展开状态到本地存储

- [x] Task 5: 创建快速导航栏组件
  - [x] SubTask 5.1: 创建 QuickNav 浮动导航组件
  - [x] SubTask 5.2: 实现滚动时显示/隐藏逻辑
  - [x] SubTask 5.3: 添加平滑滚动到对应模块功能

- [x] Task 6: 整合与测试
  - [x] SubTask 6.1: 在 page.tsx 中整合所有新组件
  - [x] SubTask 6.2: 确保标签切换时数据不会重复加载
  - [x] SubTask 6.3: 验证响应式布局在各屏幕尺寸下的表现
  - [x] SubTask 6.4: 测试所有交互功能正常工作

# Task Dependencies

- Task 2 依赖于 Task 1
- Task 4 依赖于 Task 2
- Task 6 依赖于 Task 1, 2, 3, 4, 5
