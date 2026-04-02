# Tasks
- [x] Task 1: 重构 QueryResults 组件，创建统一卡片布局: 将当前价格、统计数据、价格图表整合到一个大的卡片容器中
  - [x] SubTask 1.1: 创建统一卡片容器，包含渐变背景和边框样式
  - [x] SubTask 1.2: 将当前价格详情整合到卡片顶部
  - [x] SubTask 1.3: 将统计数据以紧凑布局整合到卡片中
  - [x] SubTask 1.4: 将价格图表整合到卡片底部
- [x] Task 2: 优化统一卡片内部布局: 设计清晰的信息层次和视觉分隔
  - [x] SubTask 2.1: 设计卡片头部（标题和当前价格）
  - [x] SubTask 2.2: 设计统计数据区域布局
  - [x] SubTask 2.3: 设计图表区域布局
  - [x] SubTask 2.4: 添加适当的分隔线和间距
- [x] Task 3: 保持数据源和导出功能: 确保这些功能在统一卡片外部正常工作
  - [x] SubTask 3.1: 调整 DataSourceSection 位置
  - [x] SubTask 3.2: 调整 UnifiedExportSection 位置
- [x] Task 4: 验证功能完整性: 确保所有功能正常工作
  - [x] SubTask 4.1: 测试查询功能
  - [x] SubTask 4.2: 测试刷新功能
  - [x] SubTask 4.3: 测试导出功能

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1, Task 2, Task 3
