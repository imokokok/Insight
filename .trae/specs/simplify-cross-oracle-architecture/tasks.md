# 多预言机对比页面信息架构简化任务列表

## 任务1: 更新Tab类型定义和导航组件
- [x] 更新TabId类型（5个→3个）
  - [x] 修改types.ts中的TabId类型定义
  - [x] 更新TabNavigation.tsx中的Tab配置
  - [x] 添加旧TabId到新TabId的映射逻辑
  - [x] 更新本地存储的键值处理
- [x] 更新Tab图标和标签
  - [x] 设计新的Tab图标（overview、analysis、history）
  - [x] 更新翻译键
  - [x] 确保移动端显示正常

## 任务2: 重构ComparisonTabs组件
- [x] 简化renderOverviewTab函数
  - [x] 移除重复的图表代码
  - [x] 保留核心指标卡片
  - [x] 保留价格对比表格
  - [x] 保留主价格趋势图
  - [x] 添加异常预警提示
- [x] 创建renderAnalysisTab函数（合并原charts+advanced+performance）
  - [x] 迁移价格偏差热力图
  - [x] 迁移价格分布箱线图
  - [x] 迁移波动率图表
  - [x] 迁移预言机性能排名
  - [x] 迁移价格相关性矩阵
  - [x] 迁移响应时间统计
  - [x] 整合移动平均线选项
- [x] 创建renderHistoryTab函数（合并原snapshots）
  - [x] 迁移快照列表组件
  - [x] 迁移快照对比功能
  - [x] 添加导出历史数据功能
- [x] 删除原renderChartsTab、renderAdvancedTab、renderPerformanceTab、renderSnapshotsTab函数

## 任务3: 提取useTabNavigation Hook
- [x] 从TabNavigation组件提取hook
  - [x] 创建hooks/useTabNavigation.ts文件
  - [x] 迁移状态管理逻辑
  - [x] 迁移本地存储逻辑
  - [x] 添加TabId映射逻辑
- [x] 更新TabNavigation组件使用新hook
- [x] 更新page.tsx使用新hook

## 任务4: 优化OverviewTab内容
- [ ] 简化StatsSection组件
  - [ ] 只保留4个核心指标
  - [ ] 移除复杂统计指标
  - [ ] 优化指标卡片布局
- [ ] 优化PriceTableSection组件
  - [ ] 精简表格列数
  - [ ] 简化行展开功能
  - [ ] 优化异常值高亮
- [ ] 添加异常预警组件
  - [ ] 创建DeviationAlert组件
  - [ ] 当偏差超过阈值时显示
  - [ ] 支持点击跳转到异常数据

## 任务5: 创建AnalysisTab组件
- [ ] 创建AnalysisTab.tsx组件
  - [ ] 整合价格偏差热力图
  - [ ] 整合价格分布箱线图
  - [ ] 整合波动率图表
  - [ ] 整合性能排名
  - [ ] 整合相关性矩阵
  - [ ] 添加图表懒加载
- [ ] 添加图表配置选项
  - [ ] 移动平均线开关
  - [ ] 时间范围选择器
  - [ ] 预言机筛选器

## 任务6: 创建HistoryTab组件
- [ ] 创建HistoryTab.tsx组件
  - [ ] 迁移快照管理功能
  - [ ] 迁移快照对比功能
  - [ ] 添加历史数据导出
  - [ ] 优化空状态显示
- [ ] 添加时间范围快速选择
  - [ ] 最近1小时、24小时、7天等快捷选项
  - [ ] 自定义时间范围选择

## 任务7: 更新类型定义
- [x] 更新types.ts
  - [x] 更新TabId类型
  - [x] 添加AnalysisTab需要的类型
  - [x] 添加HistoryTab需要的类型
  - [x] 移除不再使用的类型
- [x] 更新constants.ts
  - [x] 更新Tab相关常量
  - [x] 添加旧TabId映射常量

## 任务8: 更新翻译文件
- [ ] 添加新翻译键
  - [ ] analysis Tab相关翻译
  - [ ] history Tab相关翻译
  - [ ] 新组件相关翻译
- [ ] 移除不再使用的翻译键
  - [ ] advanced Tab翻译
  - [ ] charts Tab翻译
  - [ ] performance Tab翻译
  - [ ] snapshots Tab翻译

## 任务9: 验证和测试
- [x] 运行TypeScript类型检查
  - [x] 修复类型错误
  - [x] 确保所有组件类型兼容
- [ ] 构建项目验证
  - [ ] 确保无构建错误
  - [ ] 检查bundle大小变化
- [ ] 功能测试
  - [ ] 测试Tab切换
  - [ ] 测试本地存储迁移
  - [ ] 测试所有图表正常显示
  - [ ] 测试导出功能
- [ ] 响应式测试
  - [ ] 移动端Tab导航
  - [ ] 移动端图表显示
  - [ ] 移动端表格显示

## 任务10: 性能优化
- [ ] 实现Tab内容懒加载
  - [ ] AnalysisTab图表懒加载
  - [ ] HistoryTab数据按需获取
- [ ] 优化重渲染
  - [ ] 使用React.memo
  - [ ] 优化useMemo和useCallback
- [ ] 代码分割
  - [ ] AnalysisTab动态导入
  - [ ] HistoryTab动态导入

# 任务依赖关系
- 任务1 → 任务2 → 任务5、任务6
- 任务3 可以并行于 任务1
- 任务4 依赖于 任务2
- 任务7、任务8 可以并行
- 任务9 依赖于所有前置任务
- 任务10 可以在任务9通过后进行
