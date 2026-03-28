# Tasks

## 第一阶段：修复关键问题

- [ ] Task 1: 添加数据新鲜度指示器
  - [ ] SubTask 1.1: 创建 `useDataFreshness` hook，计算数据新鲜度状态
  - [ ] SubTask 1.2: 创建 `DataFreshnessIndicator` 组件，显示新鲜度状态（绿/黄/红）
  - [ ] SubTask 1.3: 在所有预言机的 Hero 组件中集成新鲜度指示器
  - [ ] SubTask 1.4: 添加数据过期自动刷新机制
  - [ ] SubTask 1.5: 添加"数据已过期，点击刷新"提示

- [ ] Task 2: 实现离线状态处理
  - [ ] SubTask 2.1: 创建 `useNetworkStatus` hook，检测网络状态
  - [ ] SubTask 2.2: 创建 `OfflineBanner` 组件，显示离线提示
  - [ ] SubTask 2.3: 在所有预言机页面中集成离线状态检测
  - [ ] SubTask 2.4: 离线时禁用或隐藏刷新按钮
  - [ ] SubTask 2.5: 实现离线时显示缓存数据的功能

- [ ] Task 3: 修复 RedStone 客户端实例位置
  - [ ] SubTask 3.1: 将 RedStone 客户端实例创建移到 `useRedStonePage` hook 中
  - [ ] SubTask 3.2: 使用单例模式确保只创建一个实例
  - [ ] SubTask 3.3: 更新 `redstone/page.tsx`，移除页面级别的客户端实例
  - [ ] SubTask 3.4: 测试 RedStone 页面功能正常

- [ ] Task 4: 添加错误边界
  - [ ] SubTask 4.1: 创建 `OraclePageErrorBoundary` 组件
  - [ ] SubTask 4.2: 设计友好的错误提示页面
  - [ ] SubTask 4.3: 在所有预言机页面中添加错误边界包裹
  - [ ] SubTask 4.4: 添加错误日志记录功能

- [ ] Task 5: 修复 Chronicle 页面导入问题
  - [ ] SubTask 5.1: 在 `chronicle/page.tsx` 中添加 `useTranslations` 导入
  - [ ] SubTask 5.2: 验证所有翻译键正常工作

## 第二阶段：提升用户体验

- [ ] Task 6: 提取移动端菜单管理 hook
  - [ ] SubTask 6.1: 创建 `useMobileMenu` hook
  - [ ] SubTask 6.2: 实现菜单状态管理（open/close/toggle）
  - [ ] SubTask 6.3: 添加滚动锁定功能
  - [ ] SubTask 6.4: 更新所有预言机页面使用 `useMobileMenu` hook
  - [ ] SubTask 6.5: 移除各页面中的 `isMobileMenuOpen` 状态

- [ ] Task 7: 移动 API3 数据映射到 hook
  - [ ] SubTask 7.1: 在 `useAPI3Page` hook 中计算 `networkStats`
  - [ ] SubTask 7.2: 更新 `api3/page.tsx`，移除页面级别的数据映射
  - [ ] SubTask 7.3: 确保 API3 页面功能正常

- [ ] Task 8: 确保所有组件正确传递 isLoading
  - [ ] SubTask 8.1: 审查所有预言机页面的视图组件
  - [ ] SubTask 8.2: 为缺少 `isLoading` 的组件添加属性
  - [ ] SubTask 8.3: 确保所有组件正确显示加载状态
  - [ ] SubTask 8.4: 创建骨架屏组件作为默认加载状态

- [ ] Task 9: 添加 SEO 元数据
  - [ ] SubTask 9.1: 为每个预言机创建 `metadata` 导出
  - [ ] SubTask 9.2: 设置动态页面标题（如 "Chainlink 价格 | Insight"）
  - [ ] SubTask 9.3: 添加 Open Graph 元数据
  - [ ] SubTask 9.4: 添加 Twitter Card 元数据
  - [ ] SubTask 9.5: 添加结构化数据（JSON-LD）

- [ ] Task 10: 实现数据对比功能
  - [ ] SubTask 10.1: 在 Hero 区域添加"与其他预言机对比"按钮
  - [ ] SubTask 10.2: 创建 `OracleComparisonPopover` 组件，显示快速对比
  - [ ] SubTask 10.3: 显示当前预言机价格与市场平均价格的偏差
  - [ ] SubTask 10.4: 提供跳转到跨预言机对比页面的链接

- [ ] Task 11: 完善历史数据导出
  - [ ] SubTask 11.1: 创建 `ExportPanel` 组件，显示导出配置选项
  - [ ] SubTask 11.2: 支持多种导出格式（CSV, JSON, Excel）
  - [ ] SubTask 11.3: 支持自定义时间范围选择
  - [ ] SubTask 11.4: 实现批量导出功能
  - [ ] SubTask 11.5: 添加导出进度指示

- [ ] Task 12: 添加自定义时间范围选择
  - [ ] SubTask 12.1: 创建 `DateRangePicker` 组件
  - [ ] SubTask 12.2: 支持预设时间范围（1小时、24小时、7天、30天）
  - [ ] SubTask 12.3: 支持自定义时间范围
  - [ ] SubTask 12.4: 在所有预言机的 MarketView 组件中集成

- [ ] Task 13: 添加价格预警快速设置
  - [ ] SubTask 13.1: 在 Hero 区域添加"设置预警"按钮
  - [ ] SubTask 13.2: 创建 `QuickAlertDialog` 组件
  - [ ] SubTask 13.3: 预填充当前预言机和价格信息
  - [ ] SubTask 13.4: 集成到预警系统

- [ ] Task 14: 添加数据质量指标
  - [ ] SubTask 14.1: 创建 `DataQualityPanel` 组件
  - [ ] SubTask 14.2: 显示数据延迟（毫秒）
  - [ ] SubTask 14.3: 显示更新频率
  - [ ] SubTask 14.4: 显示数据源数量
  - [ ] SubTask 14.5: 显示历史数据完整性

## 第三阶段：优化与增强

- [ ] Task 15: 添加键盘快捷键支持
  - [ ] SubTask 15.1: 创建 `useKeyboardShortcuts` hook
  - [ ] SubTask 15.2: 实现 R 键刷新数据
  - [ ] SubTask 15.3: 实现 1-7 键切换 Tab
  - [ ] SubTask 15.4: 实现 E 键导出数据
  - [ ] SubTask 15.5: 实现 ? 键显示快捷键帮助
  - [ ] SubTask 15.6: 创建 `KeyboardShortcutsHelp` 组件

- [ ] Task 16: 实现性能监控
  - [ ] SubTask 16.1: 创建 `usePerformanceMonitoring` hook
  - [ ] SubTask 16.2: 记录首次内容绘制（FCP）
  - [ ] SubTask 16.3: 记录最大内容绘制（LCP）
  - [ ] SubTask 16.4: 记录首次输入延迟（FID）
  - [ ] SubTask 16.5: 记录累积布局偏移（CLS）
  - [ ] SubTask 16.6: 将性能数据发送到分析服务

- [ ] Task 17: 优化数据缓存策略
  - [ ] SubTask 17.1: 为不同类型的数据设置不同的缓存时间
  - [ ] SubTask 17.2: 在 UI 中显示缓存状态
  - [ ] SubTask 17.3: 提供"强制刷新"选项
  - [ ] SubTask 17.4: 添加缓存过期提示

- [ ] Task 18: 添加页面级别的加载进度指示
  - [ ] SubTask 18.1: 创建 `PageProgressBar` 组件
  - [ ] SubTask 18.2: 显示加载步骤（如"正在获取价格数据..."）
  - [ ] SubTask 18.3: 支持部分加载显示
  - [ ] SubTask 18.4: 集成到所有预言机页面

- [ ] Task 19: 实现用户偏好持久化
  - [ ] SubTask 19.1: 创建 `useUserPreferences` hook
  - [ ] SubTask 19.2: 保存上次选择的 Tab
  - [ ] SubTask 19.3: 保存时间范围偏好
  - [ ] SubTask 19.4: 保存图表类型偏好
  - [ ] SubTask 19.5: 保存主题偏好
  - [ ] SubTask 19.6: 在页面加载时恢复用户偏好

- [ ] Task 20: 提升可访问性
  - [ ] SubTask 20.1: 添加完整的 ARIA 标签
  - [ ] SubTask 20.2: 确保所有交互元素可通过键盘访问
  - [ ] SubTask 20.3: 添加屏幕阅读器友好的提示
  - [ ] SubTask 20.4: 支持高对比度模式
  - [ ] SubTask 20.5: 进行 WCAG 合规性测试

# Task Dependencies

- [Task 1-5] 是第一阶段任务，可以并行处理
- [Task 6-14] 是第二阶段任务，建议在第一阶段完成后开始
- [Task 15-20] 是第三阶段任务，建议在第二阶段完成后开始
- [Task 6] 依赖 [Task 5] 完成（确保代码一致性）
- [Task 7] 依赖 [Task 3] 完成（确保客户端实例模式一致）
- [Task 8] 可以与 [Task 6-7] 并行处理
- [Task 10] 依赖 [Task 1] 完成（数据新鲜度指示器）
- [Task 11] 和 [Task 12] 可以并行处理
- [Task 13] 依赖预警系统 API 可用
- [Task 16] 可以独立进行
- [Task 19] 可以与其他第三阶段任务并行处理
