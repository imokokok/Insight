# Checklist

## 类型定义和常量

- [x] `types/index.ts` 包含风险预警相关类型定义
- [x] `constants.ts` 包含新的 Tab 定义和风险阈值常量
- [x] `hooks/useCommonSymbols.ts` 实现并导出动态币种筛选逻辑

## 动态币种选择器

- [x] 根据已选预言机正确计算共同支持的币种列表
- [x] 币种选择器只显示共同支持的币种
- [x] 显示每个币种支持的预言机数量
- [x] 无共同币种时显示友好的提示信息
- [x] 切换预言机时币种选择器自动更新

## 价格异常风险预警系统

- [x] `hooks/usePriceAnomalyDetection.ts` 正确检测价格偏差（>1%标记为异常）
- [x] 数据延迟检测逻辑正常工作
- [x] `RiskAlertBanner.tsx` 组件正确显示风险预警
- [x] 价格表格中异常数据有明显标记
- [x] 提供可能的原因分析（如数据源延迟、市场波动等）

## 数据质量评分系统

- [x] `hooks/useDataQualityScore.ts` 正确计算各项评分
- [x] 一致性评分基于标准差计算
- [x] 新鲜度评分基于最后更新时间计算
- [x] 完整性评分基于成功响应率计算
- [x] `QualityScoreCard.tsx` 组件正确展示评分
- [x] 提供改进建议

## Tab 结构重构

- [x] `PriceComparisonTab.tsx` 存在且功能正常
- [x] `QualityAnalysisTab.tsx` 存在且功能正常
- [x] `OracleProfilesTab.tsx` 存在且功能正常
- [x] `ChainsTab.tsx` 和 `HistoryTab.tsx` 已删除
- [x] `TabNavigation.tsx` 使用新的 Tab 定义
- [x] Tab 切换正常工作

## ControlPanel 重构

- [x] 集成动态币种选择器
- [x] 悬停预言机选项显示特性提示
- [x] 偏差筛选器已移除
- [x] 可访问颜色模式选项已移除
- [x] 界面布局清晰易用

## 价格表格重构

- [x] 表格中有异常标记
- [x] 列简化，突出显示偏差率
- [x] 风险等级有颜色标识
- [x] 表格排序功能正常

## 主页面重构

- [x] `page.tsx` 使用新的 Tab 结构
- [x] 历史快照相关逻辑已移除
- [x] 全屏图表功能已移除
- [x] `useCrossOraclePage.ts` 状态管理简化
- [x] 风险预警和质量评分数据流整合

## 国际化

- [x] `zh-CN/crossOracle.json` 包含所有新文案
- [x] `en/crossOracle.json` 包含所有新文案
- [x] 风险预警文案完整
- [x] 质量评分文案完整

## 性能优化和清理

- [x] 未使用的组件文件已删除
- [x] 未使用的 hooks 已清理
- [x] 无冗余重新渲染
- [x] lint 检查通过
- [x] 无 TypeScript 错误

## 功能验证

- [x] 选择多个预言机后，币种列表正确过滤
- [x] 价格异常时显示风险预警
- [x] 质量评分正确计算并显示
- [x] 预言机档案 Tab 显示各预言机特性
- [x] 数据导出功能正常
- [x] 收藏配置功能正常
