# Tasks

- [x] Task 1: 添加选择器快捷操作
  - [x] SubTask 1.1: 为预言机选择器添加"全选/取消全选"按钮
  - [x] SubTask 1.2: 为区块链选择器添加"全选/取消全选"按钮
  - [x] SubTask 1.3: 根据选中的预言机动态显示支持的区块链（不支持的链置灰）

- [x] Task 2: 添加查询状态反馈
  - [x] SubTask 2.1: 添加查询进度指示器（显示正在查询的组合）
  - [x] SubTask 2.2: 添加查询完成后的耗时统计显示

- [x] Task 3: 添加价格偏差高亮
  - [x] SubTask 3.1: 计算每个价格与平均价格的偏差百分比
  - [x] SubTask 3.2: 为偏差超过阈值的表格行添加高亮样式
  - [x] SubTask 3.3: 在价格列显示偏差百分比标签

- [x] Task 4: 添加查询历史记录功能
  - [x] SubTask 4.1: 创建 `src/utils/queryHistory.ts` 工具函数（保存/读取 localStorage）
  - [x] SubTask 4.2: 在页面添加历史记录下拉菜单或面板
  - [x] SubTask 4.3: 实现点击历史记录自动填充查询配置

- [x] Task 5: 优化图表图例交互
  - [x] SubTask 5.1: 为 Recharts 图表添加图例点击事件处理
  - [x] SubTask 5.2: 实现数据系列显示/隐藏切换逻辑

- [x] Task 6: 添加URL参数同步
  - [x] SubTask 6.1: 创建 `src/utils/urlParams.ts` 工具函数（解析/生成URL参数）
  - [x] SubTask 6.2: 在查询配置变化时更新URL参数
  - [x] SubTask 6.3: 在页面加载时从URL参数恢复查询配置

# Task Dependencies
- [Task 4] depends on [Task 6] (URL参数和历史记录共享查询配置结构)
- [Task 3] depends on [Task 2] (偏差计算依赖查询结果)
