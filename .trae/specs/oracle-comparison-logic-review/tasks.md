# Tasks

- [x] Task 1: 修复时间范围选择器功能
  - [x] SubTask 1.1: 创建时间范围数据过滤逻辑或移除无功能的选择器
  - [x] SubTask 1.2: 如果保留选择器，添加对应时间范围的模拟数据
  - [x] SubTask 1.3: 添加时间范围切换时的加载状态

- [x] Task 2: 修复 OraclePrefetchCard 交互冲突
  - [x] SubTask 2.1: 移除 Link 包裹，改为仅在特定区域显示导航按钮
  - [x] SubTask 2.2: 分离选中操作和导航操作
  - [x] SubTask 2.3: 添加视觉提示表明卡片可点击选中

- [x] Task 3: 修复 API 预取配置
  - [x] SubTask 3.1: 添加默认 symbol 参数到预取配置
  - [x] SubTask 3.2: 或修改预取逻辑，改为预取预言机列表而非详情
  - [x] SubTask 3.3: 添加预取错误处理和日志

- [x] Task 4: 修复表格视图数据一致性
  - [x] SubTask 4.1: 为趋势图创建专用的表格数据结构
  - [x] SubTask 4.2: 修改 renderTable 函数以正确处理趋势数据
  - [x] SubTask 4.3: 确保表格列标题与数据类型匹配

- [x] Task 5: 优化趋势图渲染
  - [x] SubTask 5.1: 创建 oracleLineConfig 数组配置
  - [x] SubTask 5.2: 使用 map 渲染 Line 组件
  - [x] SubTask 5.3: 减少重复代码

- [x] Task 6: 统一翻译键
  - [x] SubTask 6.1: 检查所有翻译键的使用
  - [x] SubTask 6.2: 更新 marketOverview.json 添加缺失的键
  - [x] SubTask 6.3: 移除未使用的翻译键

- [x] Task 7: 改进类型安全
  - [x] SubTask 7.1: 完善 MarketShareDataItem 接口
  - [x] SubTask 7.2: 添加类型守卫或可选链操作符
  - [x] SubTask 7.3: 确保所有数据访问都是类型安全的

# Task Dependencies

- [Task 2] 和 [Task 3] 可以并行处理
- [Task 4] 依赖 [Task 1] 的完成
- [Task 5] 可以独立处理
- [Task 6] 和 [Task 7] 可以并行处理
