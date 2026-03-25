# 多预言机对比页面信息架构简化检查清单

## Tab结构简化检查

- [x] Tab数量从5个减少到3个
- [x] TabId类型已更新为'overview' | 'analysis' | 'history'
- [x] TabNavigation组件显示3个Tab
- [x] 旧TabId（charts、advanced、snapshots、performance）已映射到新TabId
- [x] 本地存储的Tab状态迁移逻辑正常工作
- [x] Tab图标和标签已更新
- [x] 移动端Tab导航显示正常

## OverviewTab优化检查

- [ ] 只保留核心指标（一致性评分、平均价格、最大偏差、数据点数）
- [ ] 移除了CV、SEM、IQR、偏度等复杂统计指标
- [ ] 价格对比表格精简（预言机、价格、偏差、置信度）
- [ ] 移除了Z-Score和置信区间列
- [ ] 保留了主价格趋势图
- [ ] 移除了重复的图表（热力图、箱线图等已移到AnalysisTab）
- [ ] 添加了异常预警提示组件
- [ ] 简化了行展开功能

## AnalysisTab整合检查

- [ ] 价格偏差热力图已迁移
- [ ] 价格分布箱线图已迁移
- [ ] 波动率图表已迁移
- [ ] 预言机性能排名已迁移
- [ ] 价格相关性矩阵已迁移
- [ ] 响应时间统计已迁移
- [ ] 移动平均线作为图表叠加选项
- [ ] 图表支持懒加载
- [ ] 时间范围选择器正常工作
- [ ] 预言机筛选器正常工作

## HistoryTab整合检查

- [ ] 快照列表组件已迁移
- [ ] 快照对比功能已迁移
- [ ] 历史数据导出功能已添加
- [ ] 时间范围快速选择已添加
- [ ] 空状态显示优化

## 代码架构检查

- [x] useTabNavigation hook已提取
- [x] TabNavigation组件使用新hook
- [x] page.tsx使用新hook
- [x] ComparisonTabs组件render函数已简化
- [x] 原renderChartsTab函数已删除
- [x] 原renderAdvancedTab函数已删除
- [x] 原renderPerformanceTab函数已删除
- [x] 原renderSnapshotsTab函数已删除

## 类型定义检查

- [x] types.ts中的TabId类型已更新
- [x] AnalysisTab需要的类型已添加
- [x] HistoryTab需要的类型已添加
- [x] 不再使用的类型已移除
- [x] 所有组件类型无错误

## 翻译文件检查

- [ ] analysis Tab相关翻译键已添加
- [ ] history Tab相关翻译键已添加
- [ ] 新组件相关翻译键已添加
- [ ] advanced Tab翻译键已移除
- [ ] charts Tab翻译键已移除
- [ ] performance Tab翻译键已移除
- [ ] snapshots Tab翻译键已移除

## 视觉风格检查

- [ ] 所有Tab使用扁平化设计（bg-slate-50/30）
- [ ] 移除了所有卡片样式（阴影、圆角）
- [ ] 使用细边框分隔区域
- [ ] 图表工具栏样式统一
- [ ] 时间范围选择器样式统一
- [ ] 预言机筛选器样式统一

## 功能测试检查

- [ ] Tab切换正常工作
- [ ] 本地存储迁移正常工作（旧TabId自动映射）
- [ ] OverviewTab核心指标显示正常
- [ ] 价格对比表格显示正常
- [ ] 主价格趋势图显示正常
- [ ] 异常预警提示正常工作
- [ ] AnalysisTab所有图表显示正常
- [ ] HistoryTab快照功能正常工作
- [ ] 导出功能正常工作
- [ ] 响应式布局正常工作

## 性能优化检查

- [ ] AnalysisTab图表懒加载已实现
- [ ] HistoryTab数据按需获取已实现
- [ ] 不必要的重渲染已优化
- [ ] 代码分割已实现（动态导入）
- [ ] Bundle大小无显著增加

## 向后兼容检查

- [ ] 旧链接（如#advanced）能正确重定向
- [ ] 用户本地存储的旧Tab状态能正确迁移
- [ ] 不会出现undefined或错误的Tab状态
