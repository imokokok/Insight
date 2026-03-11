# 整理任务清单

## 任务1：代码重构优化

- [x] 1.1 审查现有类型定义，识别冗余和不一致
  - [x] 读取 src/lib/types/oracle.ts
  - [x] 读取 src/lib/types/snapshot.ts
  - [x] 读取各Oracle页面组件的类型使用情况
  - [x] 输出类型审查报告

- [x] 1.2 创建统一的Oracle核心类型（OracleTypes.ts）
  - [x] 定义 OracleProvider 枚举
  - [x] 定义基础数据结构（PriceData, ValidatorData, NetworkData等）
  - [x] 定义图表数据类型（ChartDataPoint, TimeSeriesData等）
  - [x] 定义筛选和配置类型（FilterConfig, TabConfig等）

- [x] 1.3 提取共享图表组件
  - [x] 创建 ChartWrapper 基础组件
  - [x] 统一颜色配置
  - [x] 统一Tooltip和Legend样式
  - [x] 迁移现有图表组件使用共享配置

- [x] 1.4 提取共享筛选组件
  - [x] 创建通用 FilterPanel 组件
  - [x] 创建通用 DateRangePicker 组件
  - [x] 创建通用 Select/Tag 筛选组件

- [x] 1.5 重构工具函数库
  - [x] 审查 src/lib/utils/format.ts 和 chartUtils.ts
  - [x] 统一格式化函数命名和参数
  - [x] 提取通用计算函数
  - [x] 添加JSDoc注释

- [x] 1.6 优化数据获取Hooks
  - [x] 审查现有Hooks（useOracleData, useOraclePrices, usePriceHistory）
  - [x] 统一错误处理和Loading状态
  - [x] 添加数据缓存策略

## 任务2：交互体验优化

- [x] 2.1 增强OraclePageTemplate功能
  - [x] 添加内置Loading状态
  - [x] 添加Error Boundary支持
  - [x] 支持页面配置对象
  - [x] 添加自定义布局支持

- [x] 2.2 统一TabNavigation组件
  - [x] 添加URL同步功能（可选）
  - [x] 添加键盘快捷键支持
  - [x] 统一Tab样式和动画
  - [x] 统一所有Oracle页面的Tab配置

- [x] 2.3 统一筛选器交互模式
  - [x] 制定筛选器交互规范
  - [x] 统一筛选面板展开/收起动画
  - [x] 统一筛选结果展示

- [x] 2.4 统一数据导出功能
  - [x] 审查现有导出功能
  - [x] 统一导出格式（CSV, JSON, PNG）
  - [x] 创建通用导出组件

## 任务3：开发规范制定

- [x] 3.1 编写组件开发规范
  - [x] 组件命名规范
  - [x] 组件结构规范
  - [x] Props定义规范
  - [x] 样式规范

- [x] 3.2 编写类型定义规范
  - [x] 类型命名规范
  - [x] 接口 vs 类型别名使用场景
  - [x] 泛型使用规范

- [x] 3.3 编写Hooks使用规范
  - [x] Hooks命名规范
  - [x] 状态管理规范
  - [x] 副作用处理规范

- [x] 3.4 创建组件代码模板
  - [x] 通用组件模板
  - [x] 图表组件模板
  - [x] 页面组件模板
  - [x] Hook模板

---

## 任务依赖关系

- 任务1.1 → 任务1.2（类型审查为统一类型定义提供基础）
- 任务1.2 → 任务1.3、1.4、1.5（统一类型是组件重构的前提）
- 任务1.3、1.4 → 任务2.1、2.2（共享组件为交互优化提供基础）
- 任务1 → 任务2（代码重构为交互体验优化提供基础设施）
- 任务1、2 → 任务3（代码实践为规范制定提供依据）

## 并行执行建议

以下任务可以并行执行：
- 任务1.3（共享图表组件）和 任务1.4（共享筛选组件）
- 任务2.2（Tab导航）和 任务2.3（筛选器）
- 任务3.1、3.2、3.3（规范文档可以并行编写）
