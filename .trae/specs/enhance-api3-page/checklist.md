# API3 页面改造检查清单

## Tab 配置更新检查

- [x] API3 的 tabs 配置已更新为 10 个 Tab
- [x] features 配置已添加 hasRiskAssessment: true
- [x] TabNavigation 组件已添加 analytics、gas、risk、cross-oracle 图标支持

## RiskAssessmentPanel 组件检查

- [x] API3RiskAssessmentPanel 组件文件已创建
- [x] 覆盖池风险评分展示功能正常
- [x] 数据源集中度风险展示功能正常
- [x] 网络健康风险指标展示功能正常
- [x] 质押风险分析展示功能正常

## CrossOracleComparisonPanel 组件检查

- [x] API3CrossOraclePanel 组件文件已创建
- [x] 响应时间对比图表展示正常
- [x] 数据准确性对比展示正常
- [x] 可用性对比展示正常
- [x] 成本效率对比展示正常
- [x] 更新频率对比展示正常

## Page 文件更新检查

- [x] 新 Panel 组件已正确导入
- [x] advanced Tab 已拆分为 analytics 和 gas
- [x] risk Tab 渲染逻辑已添加
- [x] cross-oracle Tab 渲染逻辑已添加
- [x] market Tab 已添加第一方优势简介卡片

## i18n 翻译检查

- [x] Tab 标签翻译已添加
- [x] Risk Panel 翻译已添加
- [x] Cross-Oracle Panel 翻译已添加

## 功能验证检查

- [x] 所有 10 个 Tab 可以正常切换
- [x] 新组件数据展示正确
- [x] 页面响应式布局正常
- [x] 无控制台报错
