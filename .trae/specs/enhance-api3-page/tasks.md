# API3 页面改造任务列表

## Task 1: 更新 Tab 配置
更新 API3 的 Tab 配置，拆分 advanced Tab 并新增 risk 和 cross-oracle Tab
- [x] SubTask 1.1: 在 oracles.tsx 中更新 API3 的 tabs 配置
- [x] SubTask 1.2: 更新 features 配置，添加 hasRiskAssessment: true
- [x] SubTask 1.3: 添加 Tab 图标支持（在 TabNavigation.tsx 中添加 analytics、gas、risk、cross-oracle 图标）

## Task 2: 创建 RiskAssessmentPanel 组件
创建风险评估面板组件，展示 API3 网络的风险指标
- [x] SubTask 2.1: 创建组件文件 `src/components/oracle/panels/API3RiskAssessmentPanel.tsx`
- [x] SubTask 2.2: 实现覆盖池风险评分展示
- [x] SubTask 2.3: 实现数据源集中度风险展示
- [x] SubTask 2.4: 实现网络健康风险指标
- [x] SubTask 2.5: 实现质押风险分析

## Task 3: 创建 CrossOracleComparisonPanel 组件
创建跨预言机对比面板组件
- [x] SubTask 3.1: 创建组件文件 `src/components/oracle/panels/API3CrossOraclePanel.tsx`
- [x] SubTask 3.2: 实现响应时间对比图表
- [x] SubTask 3.3: 实现数据准确性对比
- [x] SubTask 3.4: 实现可用性对比
- [x] SubTask 3.5: 实现成本效率对比
- [x] SubTask 3.6: 实现更新频率对比

## Task 4: 更新 API3 Page 主文件
更新 page.tsx 文件，适配新的 Tab 结构
- [x] SubTask 4.1: 导入新的 Panel 组件
- [x] SubTask 4.2: 拆分 advanced Tab 逻辑为 analytics 和 gas
- [x] SubTask 4.3: 添加 risk Tab 渲染逻辑
- [x] SubTask 4.4: 添加 cross-oracle Tab 渲染逻辑
- [x] SubTask 4.5: 在 market Tab 添加第一方优势简介卡片

## Task 5: 添加 i18n 翻译
添加新 Tab 和组件所需的翻译键
- [x] SubTask 5.1: 添加 Tab 标签翻译
- [x] SubTask 5.2: 添加 Risk Panel 翻译
- [x] SubTask 5.3: 添加 Cross-Oracle Panel 翻译

## Task 6: 验证与测试
验证改造后的页面功能正常
- [x] SubTask 6.1: 验证所有 Tab 正常切换
- [x] SubTask 6.2: 验证新组件数据展示正确
- [x] SubTask 6.3: 验证响应式布局

# Task Dependencies
- Task 2 依赖 Task 1（需要 Tab 配置先更新）
- Task 3 依赖 Task 1
- Task 4 依赖 Task 2 和 Task 3（需要新组件创建完成）
- Task 5 可以与 Task 2、3 并行
- Task 6 依赖 Task 4
