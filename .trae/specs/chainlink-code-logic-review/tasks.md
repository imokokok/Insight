# Tasks

## P0 - 严重问题修复（立即实施）

- [x] Task 1: 集中管理 Mock 数据
  - [x] SubTask 1.1: 创建 `/src/app/[locale]/chainlink/data/mockData.ts` 统一存放所有 mock 数据
  - [x] SubTask 1.2: 创建数据源接口 `IChainlinkDataSource`
  - [x] SubTask 1.3: 实现 `MockChainlinkDataSource` 类
  - [x] SubTask 1.4: 重构各组件使用统一数据源
  - [x] SubTask 1.5: 添加数据源切换配置

- [x] Task 2: 修复潜在 Bug
  - [x] SubTask 2.1: 创建安全除法工具函数 `safeDivide`
  - [x] SubTask 2.2: 修复 ChainlinkVRFView.tsx 中的除零风险
  - [x] SubTask 2.3: 修复 ChainlinkEcosystemView.tsx 中的除零风险
  - [x] SubTask 2.4: 添加数组边界检查（使用 `.at()` 方法）
  - [x] SubTask 2.5: 修复日期处理问题（使用 date-fns）

## P1 - 高优先级改进（短期实施）

- [x] Task 3: 修复类型安全问题
  - [x] SubTask 3.1: 重构 ChainlinkDataTable 为正确的泛型组件
  - [x] SubTask 3.2: 移除所有 `as unknown as` 类型转换
  - [x] SubTask 3.3: 创建数据规范化函数处理可选属性
  - [x] SubTask 3.4: 添加严格的类型定义

- [x] Task 4: 改进错误处理
  - [x] SubTask 4.1: 创建组件级错误边界组件
  - [x] SubTask 4.2: 为关键视图添加错误边界包装
  - [x] SubTask 4.3: 在 useChainlinkPage hook 中添加错误处理
  - [x] SubTask 4.4: 创建错误日志记录工具

- [x] Task 5: 提取公共工具函数
  - [x] SubTask 5.1: 创建 `/src/app/[locale]/chainlink/utils/format.ts`
  - [x] SubTask 5.2: 统一 formatNumber 函数
  - [x] SubTask 5.3: 统一 formatCurrency 函数
  - [x] SubTask 5.4: 统一 formatTimeAgo 函数
  - [x] SubTask 5.5: 统一 getStatusColor 函数
  - [x] SubTask 5.6: 更新各组件导入使用公共函数

- [x] Task 6: 创建服务层抽象
  - [x] SubTask 6.1: 创建 `/src/app/[locale]/chainlink/services/chainlinkService.ts`
  - [x] SubTask 6.2: 定义服务接口
  - [x] SubTask 6.3: 实现 mock 服务
  - [x] SubTask 6.4: 实现 API 服务骨架
  - [x] SubTask 6.5: 创建服务工厂函数

## P2 - 中优先级优化（中期实施）

- [x] Task 7: 性能优化
  - [x] SubTask 7.1: 优化 RealtimeThroughputMonitor 的 interval 处理
  - [x] SubTask 7.2: 为图表组件添加 React.memo
  - [x] SubTask 7.3: 使用 useMemo 优化图表数据计算
  - [x] SubTask 7.4: 评估并实现虚拟滚动（如需要）

- [x] Task 8: 创建通用 UI 组件
  - [x] SubTask 8.1: 创建 StatCard 通用统计卡片组件
  - [x] SubTask 8.2: 创建 TrendIndicator 趋势指示器组件
  - [x] SubTask 8.3: 创建表格列配置工厂函数
  - [x] SubTask 8.4: 重构各视图使用通用组件

- [x] Task 9: 添加可访问性支持
  - [x] SubTask 9.1: 为导航项添加 ARIA 标签
  - [x] SubTask 9.2: 为排序按钮添加 ARIA 支持
  - [x] SubTask 9.3: 为筛选按钮添加键盘导航
  - [x] SubTask 9.4: 为可展开区域添加键盘支持

## P3 - 低优先级完善（长期实施）

- [x] Task 10: 完善国际化
  - [x] SubTask 10.1: 提取硬编码字符串到翻译文件
  - [x] SubTask 10.2: 创建时间格式化国际化函数
  - [x] SubTask 10.3: 统一数字格式化国际化

- [x] Task 11: 重构大型组件
  - [x] SubTask 11.1: 拆分 ChainlinkStakingView 为多个子组件
  - [x] SubTask 11.2: 创建 useStakingCalculator 自定义 hook
  - [x] SubTask 11.3: 拆分 ChainlinkHero 为多个子组件
  - [x] SubTask 11.4: 创建 ChainlinkContext 全局状态管理

# Task Dependencies

- [Task 2] 应在 [Task 5] 之前完成，因为工具函数会被修复使用
- [Task 3] 应在 [Task 8] 之前完成，类型修复后再创建通用组件
- [Task 5] 和 [Task 6] 可以并行进行
- [Task 7] 依赖 [Task 5] 完成
- [Task 8] 依赖 [Task 3] 和 [Task 5] 完成
- [Task 11] 应在 [Task 5] 和 [Task 8] 完成后进行
