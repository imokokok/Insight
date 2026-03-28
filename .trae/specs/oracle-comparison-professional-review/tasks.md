# Tasks

## P0 - 必须修复

- [x] Task 1: 统一数据架构
  - [x] SubTask 1.1: 创建 `OracleMarketDataService` 数据服务层
  - [x] SubTask 1.2: 为 `OracleMarketOverview` 添加 API 数据获取逻辑
  - [x] SubTask 1.3: 实现数据缓存策略（使用 React Query）
  - [x] SubTask 1.4: 添加数据过期时间显示

- [x] Task 2: 添加错误处理 UI
  - [x] SubTask 2.1: 创建 `OracleErrorBoundary` 组件
  - [x] SubTask 2.2: 在 `CrossOracleComparison` 中显示失败的预言机列表
  - [x] SubTask 2.3: 添加重试按钮和重试逻辑
  - [x] SubTask 2.4: 显示数据完整性指标

- [x] Task 3: 标注模拟数据
  - [x] SubTask 3.1: 在 `OracleMarketOverview` 添加"模拟数据"标签
  - [x] SubTask 3.2: 添加数据来源说明
  - [x] SubTask 3.3: 在趋势图下方添加免责声明

## P1 - 应该修复

- [x] Task 4: 实现数据缓存策略
  - [x] SubTask 4.1: 将手动 fetch 替换为 React Query 的 useQuery
  - [x] SubTask 4.2: 配置合理的 staleTime 和 cacheTime
  - [x] SubTask 4.3: 实现请求去重
  - [x] SubTask 4.4: 优化历史数据保留策略

- [x] Task 5: 性能优化
  - [x] SubTask 5.1: 修复 `heatmapData` 的随机数生成问题
  - [x] SubTask 5.2: 对长列表实现虚拟化（使用 react-window）
  - [x] SubTask 5.3: 使用 React.lazy 懒加载图表组件
  - [x] SubTask 5.4: 拆分 `renderTable` 为独立组件

- [x] Task 6: 完善一致性评分算法
  - [x] SubTask 6.1: 设计多维度评分模型
  - [x] SubTask 6.2: 实现历史可靠性评分
  - [x] SubTask 6.3: 实现更新频率一致性评分
  - [x] SubTask 6.4: 添加评分算法说明文档

## P2 - 可以改进

- [x] Task 7: 添加导出功能到 OracleMarketOverview
  - [x] SubTask 7.1: 添加导出按钮
  - [x] SubTask 7.2: 实现 CSV 格式导出
  - [x] SubTask 7.3: 实现 JSON 格式导出
  - [x] SubTask 7.4: 支持图表截图导出

- [x] Task 8: 增强预言机元数据展示
  - [x] SubTask 8.1: 在 `OraclePrefetchCard` 添加悬停详情
  - [x] SubTask 8.2: 添加健康状态指示器
  - [x] SubTask 8.3: 使用图标表示关键指标

- [x] Task 9: 响应式设计优化
  - [x] SubTask 9.1: 添加响应式断点处理
  - [x] SubTask 9.2: 移动端使用简化视图
  - [x] SubTask 9.3: 表格支持横向滚动
  - [x] SubTask 9.4: 图表字体和间距适配

## P3 - 未来考虑

- [x] Task 10: 国际化完善
  - [x] SubTask 10.1: 移除所有硬编码中文文本
  - [x] SubTask 10.2: 使用 Intl.NumberFormat 格式化数字
  - [x] SubTask 10.3: 使用 Intl.DateTimeFormat 格式化日期

- [x] Task 11: 可访问性支持
  - [x] SubTask 11.1: 添加 ARIA 标签
  - [x] SubTask 11.2: 确保键盘可访问
  - [x] SubTask 11.3: 检查颜色对比度

# Task Dependencies

- [Task 2] 依赖 [Task 1] 的数据服务层
- [Task 4] 依赖 [Task 1] 的数据服务层
- [Task 5] 可以独立处理
- [Task 6] 可以独立处理
- [Task 7] 可以独立处理
- [Task 8] 可以独立处理
- [Task 9] 可以独立处理
- [Task 10] 和 [Task 11] 可以并行处理
