# Tasks

- [x] Task 1: 实现 Divergence Signal Engine 核心计算逻辑
  - [x] SubTask 1.1: 创建 `src/lib/analytics/divergenceSignals.ts`，实现偏差时序追踪（记录每次更新的偏差百分比、方向、时间戳）
  - [x] SubTask 1.2: 实现偏差加速度检测（计算偏差变化的二阶导数，阈值判断）
  - [x] SubTask 1.3: 实现领先/滞后预言机识别（基于价格变化时间戳排序，计算相对延迟）
  - [x] SubTask 1.4: 实现偏差方向一致性检测（连续同方向偏差 >= 3 次标记为方向性偏差）
  - [ ] SubTask 1.5: 编写 divergenceSignals.ts 的单元测试

- [x] Task 2: 实现 Feed Behavior Analytics 核心计算逻辑
  - [x] SubTask 2.1: 创建 `src/lib/analytics/feedBehavior.ts`，实现更新节奏异常检测（实际间隔 vs 预期间隔偏差 > 50% 标记异常，滑动平均+标准差）
  - [x] SubTask 2.2: 实现置信区间动态追踪（区间宽度变化趋势、扩张率计算、不确定性激增检测）
  - [x] SubTask 2.3: 实现心跳检测（2 倍预期周期未更新标记丢失，计算心跳可靠性指标）
  - [x] SubTask 2.4: 实现 Feed 健康度综合评分（更新节奏 30% + 置信区间 25% + 心跳 25% + 新鲜度 20%）
  - [ ] SubTask 2.5: 编写 feedBehavior.ts 的单元测试

- [x] Task 3: 实现 Stability Score & Decay Detection 核心计算逻辑
  - [x] SubTask 3.1: 创建 `src/lib/analytics/stabilityScore.ts`，实现稳定性评分计算（价格一致性 30% + 更新频率一致性 25% + 置信度稳定性 25% + 数据完整性 20%）
  - [x] SubTask 3.2: 实现稳定性衰减检测（滑动窗口内评分下降斜率计算，衰减预警阈值判断）
  - [x] SubTask 3.3: 实现衰减预测（按当前衰减速率预测降至 Critical 的时间）
  - [ ] SubTask 3.4: 编写 stabilityScore.ts 的单元测试

- [x] Task 4: 创建 Cross-Oracle 页面的 React Hooks
  - [x] SubTask 4.1: 创建 `src/app/cross-oracle/hooks/useDivergenceSignals.ts`，桥接 divergenceSignals 引擎到 React 组件
  - [x] SubTask 4.2: 创建 `src/app/cross-oracle/hooks/useFeedBehavior.ts`，桥接 feedBehavior 引擎到 React 组件
  - [x] SubTask 4.3: 创建 `src/app/cross-oracle/hooks/useStabilityScore.ts`，桥接 stabilityScore 引擎到 React 组件
  - [x] SubTask 4.4: 更新 `src/app/cross-oracle/hooks/index.ts` 导出新 hooks

- [x] Task 5: 实现 Divergence Signal Tab UI
  - [x] SubTask 5.1: 创建 `src/app/cross-oracle/components/tabs/DivergenceSignalTab.tsx` 主组件
  - [x] SubTask 5.2: 实现偏差信号总览卡片（预警数量、加速数量、方向性偏差数量、领先预言机）
  - [x] SubTask 5.3: 实现偏差时序折线图（各预言机偏差百分比 vs 时间，正负偏颜色区分，标注加速/方向性区间）
  - [x] SubTask 5.4: 实现领先/滞后排名组件（延迟秒数、颜色编码）
  - [x] SubTask 5.5: 实现预言机间偏差热力图（两两偏差矩阵，悬停详情，高偏差红色标注）

- [x] Task 6: 实现 Feed Health Tab UI
  - [x] SubTask 6.1: 创建 `src/app/cross-oracle/components/tabs/FeedHealthTab.tsx` 主组件
  - [x] SubTask 6.2: 实现 Feed 健康度总览卡片（各预言机评分、异常计数）
  - [x] SubTask 6.3: 实现更新节奏时间序列图（实际间隔 vs 预期参考线，异常区间标注）
  - [x] SubTask 6.4: 实现置信区间追踪图（区间宽度趋势、不确定性激增标注、价格变化叠加）
  - [x] SubTask 6.5: 实现心跳监控面板（预期 vs 实际更新次数、丢失事件时间线）

- [x] Task 7: 增强 Risk Analysis Tab
  - [x] SubTask 7.1: 更新 `src/lib/analytics/riskMetrics.ts`，增加偏差加速度风险、Feed 行为健康度、稳定性衰减风险三个新维度
  - [x] SubTask 7.2: 调整综合风险评分权重（新增维度占 25%，原有维度权重相应调整）
  - [x] SubTask 7.3: 实现风险归因分析（标识贡献最大的维度，生成可操作建议）
  - [x] SubTask 7.4: 更新 `src/app/cross-oracle/components/tabs/RiskAnalysisTab.tsx` 展示新增维度和归因分析

- [x] Task 8: 集成新 Tab 到 Cross-Oracle 页面
  - [x] SubTask 8.1: 更新 `src/app/cross-oracle/CrossOracleContent.tsx`，增加 Divergence Signal 和 Feed Health Tab
  - [x] SubTask 8.2: 更新 Tab 导航组件支持 5 个 Tab
  - [x] SubTask 8.3: 确保新 Tab 与现有数据流（useCrossOraclePage、useOracleData 等）正确集成

- [x] Task 9: 增强 PriceFreshnessMonitor
  - [x] SubTask 9.1: 在 PriceFreshnessMonitor 中增加更新节奏异常检测可视化
  - [x] SubTask 9.2: 增加心跳丢失检测和计数显示
  - [x] SubTask 9.3: 增加稳定性评分趋势指示器（上升/稳定/下降箭头）

- [x] Task 10: 增强首页 HomeDashboard
  - [x] SubTask 10.1: 在 HomeDashboard 增加实时偏差信号摘要卡片
  - [x] SubTask 10.2: 增加 Feed 健康度摘要卡片
  - [x] SubTask 10.3: 确保摘要卡片点击可跳转到对应 Tab

# Task Dependencies

- [Task 4] depends on [Task 1, Task 2, Task 3]
- [Task 5] depends on [Task 4]
- [Task 6] depends on [Task 4]
- [Task 7] depends on [Task 1, Task 2, Task 3]
- [Task 8] depends on [Task 5, Task 6]
- [Task 9] depends on [Task 2, Task 3]
- [Task 10] depends on [Task 5, Task 6]
- [Task 5] and [Task 6] can be parallelized
