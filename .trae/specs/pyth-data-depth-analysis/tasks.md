# Tasks

- [x] Task 1: 增加延迟分位数统计指标
  - [x] SubTask 1.1: 在 LatencyTrendChart 组件中计算并展示 P50/P90/P99 延迟
  - [x] SubTask 1.2: 添加延迟分布直方图可视化
  - [x] SubTask 1.3: 更新统计卡片布局，融入现有UI风格

- [x] Task 2: 实现动态阈值机制
  - [x] SubTask 2.1: 基于历史延迟数据计算动态基线（移动平均+标准差）
  - [x] SubTask 2.2: 实现阈值自适应调整算法
  - [x] SubTask 2.3: 添加阈值调整历史记录可视化

- [x] Task 3: 添加 Publisher 相关性分析
  - [x] SubTask 3.1: 计算 Publisher 间价格相关性矩阵
  - [x] SubTask 3.2: 实现相关性热力图组件
  - [x] SubTask 3.3: 添加异常关联检测（多Publisher同时异常告警）

- [x] Task 4: 扩展跨链覆盖支持
  - [x] SubTask 4.1: 在 CrossChainPriceConsistency 中添加 Base、Optimism、Polygon 链支持
  - [x] SubTask 4.2: 更新链图标和配置
  - [x] SubTask 4.3: 优化多链展示布局（考虑响应式设计）

- [x] Task 5: 引入基础时序预测能力
  - [x] SubTask 5.1: 实现简单移动平均（SMA）预测
  - [x] SubTask 5.2: 添加预测置信区间
  - [x] SubTask 5.3: 可视化预测与实际值对比

# Task Dependencies
- Task 2 depends on Task 1（需要先完善延迟统计基础）
- Task 3 可与 Task 1、Task 2 并行
- Task 4 独立，可优先实施
- Task 5 depends on Task 2（需要动态阈值作为预测基础）
