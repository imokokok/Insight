# 风险评估完善任务清单

## Phase 1: 基础组件建设

- [x] Task 1: 创建 DataFreshnessIndicator 组件 - 显示数据最后更新时间，支持过期警告
  - [x] SubTask 1.1: 设计组件 UI（相对时间显示、刷新按钮）
  - [x] SubTask 1.2: 实现相对时间格式化函数
  - [x] SubTask 1.3: 添加过期警告样式（>1小时显示红色）
  - [x] SubTask 1.4: 添加点击刷新功能

- [x] Task 2: 创建 RiskScoreCard 组件 - 可复用的风险评分卡片
  - [x] SubTask 2.1: 设计卡片布局（标题、分数、进度条、描述）
  - [x] SubTask 2.2: 实现趋势指示器（上升/下降/稳定）
  - [x] SubTask 2.3: 支持四种风险等级颜色

- [x] Task 3: 创建 SecurityTimeline 组件 - 安全事件时间线
  - [x] SubTask 3.1: 设计时间线布局
  - [x] SubTask 3.2: 实现事件类型图标和颜色
  - [x] SubTask 3.3: 支持事件状态标签

- [x] Task 4: 创建 MitigationMeasuresGrid 组件 - 风险缓解措施网格
  - [x] SubTask 4.1: 设计网格布局
  - [x] SubTask 4.2: 实现措施类型标签
  - [x] SubTask 4.3: 添加有效性进度条

- [x] Task 5: 扩展风险工具函数 - 添加辅助函数
  - [x] SubTask 5.1: 添加 formatRelativeTime 函数
  - [x] SubTask 5.2: 添加 calculateOverallRiskScore 函数
  - [x] SubTask 5.3: 添加 isDataStale 函数

## Phase 2: 各预言机风险评估完善

- [x] Task 6: 完善 ChainlinkRiskPanel - 添加数据新鲜度和趋势
  - [x] SubTask 6.1: 集成 DataFreshnessIndicator
  - [x] SubTask 6.2: 添加评分趋势图表
  - [x] SubTask 6.3: 将静态数据改为动态生成

- [x] Task 7: 完善 PythRiskAssessmentPanel - 添加数据新鲜度
  - [x] SubTask 7.1: 集成 DataFreshnessIndicator
  - [x] SubTask 7.2: 添加第一方数据源可信度评分

- [x] Task 8: 完善 UMARiskPanel - 添加四维度评分
  - [x] SubTask 8.1: 集成 DataFreshnessIndicator
  - [x] SubTask 8.2: 添加四维度评分卡片

- [x] Task 9: 完善 TellorRiskPanel - 添加时间线和缓解措施
  - [x] SubTask 9.1: 集成 DataFreshnessIndicator
  - [x] SubTask 9.2: 添加 SecurityTimeline 组件
  - [x] SubTask 9.3: 添加 MitigationMeasuresGrid 组件

- [x] Task 10: 完善 API3RiskAssessmentPanel - 添加四维度评分和时间线
  - [x] SubTask 10.1: 集成 DataFreshnessIndicator
  - [x] SubTask 10.2: 添加四维度评分卡片
  - [x] SubTask 10.3: 添加 SecurityTimeline 组件
  - [x] SubTask 10.4: 添加 MitigationMeasuresGrid 组件

- [x] Task 11: 完善 BandRiskAssessmentPanel - 添加数据新鲜度和趋势
  - [x] SubTask 11.1: 集成 DataFreshnessIndicator
  - [x] SubTask 11.2: 添加评分趋势图表

- [x] Task 12: 完善 RedStoneRiskAssessmentPanel - 添加数据新鲜度和趋势
  - [x] SubTask 12.1: 集成 DataFreshnessIndicator
  - [x] SubTask 12.2: 添加评分趋势图表

- [x] Task 13: 完善 ChronicleRiskAssessmentPanel - 添加四维度评分和缓解措施
  - [x] SubTask 13.1: 集成 DataFreshnessIndicator
  - [x] SubTask 13.2: 添加四维度评分卡片
  - [x] SubTask 13.3: 添加 MitigationMeasuresGrid 组件

- [x] Task 14: 创建 DIARiskAssessmentPanel - 全新组件
  - [x] SubTask 14.1: 创建组件基础结构
  - [x] SubTask 14.2: 添加四维度评分卡片
  - [x] SubTask 14.3: 添加数据源可信度评分
  - [x] SubTask 14.4: 添加数据聚合风险分析
  - [x] SubTask 14.5: 添加 SecurityTimeline 组件
  - [x] SubTask 14.6: 添加跨链覆盖风险评估
  - [x] SubTask 14.7: 添加 MitigationMeasuresGrid 组件
  - [x] SubTask 14.8: 在 DIA page.tsx 中集成新面板

- [x] Task 15: 完善 WINkLinkRiskPanel - 全面增强
  - [x] SubTask 15.1: 集成 DataFreshnessIndicator
  - [x] SubTask 15.2: 添加四维度评分卡片
  - [x] SubTask 15.3: 添加风险趋势图表
  - [x] SubTask 15.4: 添加 SecurityTimeline 组件
  - [x] SubTask 15.5: 添加跨链风险评估 (TRON生态)
  - [x] SubTask 15.6: 添加 MitigationMeasuresGrid 组件
  - [x] SubTask 15.7: 添加游戏数据专项风险

## Phase 3: 类型定义和国际化

- [x] Task 16: 扩展 RiskMetric 类型定义
  - [x] SubTask 16.1: 添加 trend、 trendValue、weight 字段
  - [x] SubTask 16.2: 创建 RiskAssessmentData 接口

- [x] Task 17: 添加 i18n 翻译键
  - [x] SubTask 17.1: 添加通用组件翻译
  - [x] SubTask 17.2: 添加各预言机风险评估翻译

# Task Dependencies
- Phase 2 所有任务依赖于 Phase 1
- Task 14 和 Task 15 依赖于 Task 2、Task 3、Task 4
