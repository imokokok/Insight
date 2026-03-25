# 多预言机对比页面代码架构优化任务列表

## 任务1: 创建 Context Providers
- [x] 创建 OracleDataContext
  - [x] 定义 Context 类型接口
  - [x] 创建 Provider 组件
  - [x] 提供价格数据、统计指标
- [x] 创建 ChartConfigContext
  - [x] 定义图表配置类型
  - [x] 提供颜色、时间范围等配置
- [x] 创建 UIStateContext
  - [x] 定义 UI 状态类型
  - [x] 提供 loading、hovered 等状态

## 任务2: 拆分 useCrossOraclePage Hook
- [ ] 创建 hooks/useCrossOraclePage/ 目录
- [ ] 创建 useOracleSelection.ts
  - [ ] 迁移 selectedOracles 状态
  - [ ] 迁移 toggleOracle 函数
- [ ] 创建 usePriceData.ts
  - [ ] 迁移价格数据获取逻辑
  - [ ] 迁移 fetchPriceData 函数
- [ ] 创建 useChartInteractions.ts
  - [ ] 迁移 zoom 相关状态和方法
  - [ ] 迁移 hover 相关状态
- [ ] 创建 useFilterState.ts
  - [ ] 迁移筛选相关状态
  - [ ] 迁移排序相关逻辑
- [ ] 重构主 useCrossOraclePage.ts
  - [ ] 组合各个子 hook
  - [ ] 保持返回类型兼容

## 任务3: 拆分 ComparisonTabs 组件
- [ ] 创建 components/tabs/ 目录
- [ ] 创建 OverviewTab 组件
  - [ ] 从 ComparisonTabs 提取 renderOverviewTab 逻辑
  - [ ] 使用 Context 获取数据
  - [ ] 添加动态导入
- [ ] 创建 AnalysisTab 组件
  - [ ] 从 ComparisonTabs 提取 renderAnalysisTab 逻辑
  - [ ] 使用 Context 获取数据
  - [ ] 添加动态导入
- [ ] 创建 HistoryTab 组件
  - [ ] 从 ComparisonTabs 提取 renderHistoryTab 逻辑
  - [ ] 使用 Context 获取数据
  - [ ] 添加动态导入
- [ ] 重构 ComparisonTabs.tsx
  - [ ] 使用动态导入加载 Tab 组件
  - [ ] 大幅减少 props 数量
  - [ ] 使用 Context 传递数据

## 任务4: 优化性能
- [ ] 添加 React.memo
  - [ ] 包裹 StatsSection 组件
  - [ ] 包裹 PriceTableSection 组件
  - [ ] 包裹图表组件
- [ ] 优化 useMemo 使用
  - [ ] 缓存图表数据计算
  - [ ] 缓存统计指标计算
- [ ] 优化 useCallback 使用
  - [ ] 缓存事件处理函数
  - [ ] 缓存排序函数

## 任务5: 重构类型定义
- [ ] 创建 types/ 目录
- [ ] 创建 oracle.ts
  - [ ] 迁移预言机相关类型
  - [ ] 统一类型命名
- [ ] 创建 chart.ts
  - [ ] 迁移图表相关类型
  - [ ] 统一图表数据类型
- [ ] 创建 stats.ts
  - [ ] 迁移统计指标类型
  - [ ] 统一统计类型
- [ ] 创建 ui.ts
  - [ ] 迁移 UI 状态类型
  - [ ] 统一 UI 类型
- [ ] 更新现有文件导入
  - [ ] 更新所有类型导入路径
  - [ ] 移除重复类型定义

## 任务6: 更新 page.tsx
- [ ] 添加 Context Providers
  - [ ] 包裹 OracleDataProvider
  - [ ] 包裹 ChartConfigProvider
  - [ ] 包裹 UIStateProvider
- [ ] 更新组件使用方式
  - [ ] 简化传递给 ComparisonTabs 的 props

## 任务7: 验证和测试
- [ ] 运行 TypeScript 类型检查
  - [ ] 修复所有类型错误
- [ ] 构建项目
  - [ ] 确保无构建错误
  - [ ] 检查 bundle 大小变化
- [ ] 功能测试
  - [ ] 测试所有 Tab 正常显示
  - [ ] 测试 Context 数据传递
  - [ ] 测试懒加载正常工作
- [ ] 性能测试
  - [ ] 测试首屏加载时间
  - [ ] 测试组件重渲染次数

# 任务依赖关系
- 任务1 → 任务2 → 任务3 → 任务6
- 任务4 可以并行于 任务3
- 任务5 可以并行于 任务1
- 任务7 依赖于所有前置任务
