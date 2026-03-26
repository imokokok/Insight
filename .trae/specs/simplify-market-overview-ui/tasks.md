# Tasks

- [ ] Task 1: 简化页面整体布局
  - [ ] SubTask 1.1: 移除 page.tsx 中所有外层卡片的 bg-white、border、rounded-lg
  - [ ] SubTask 1.2: 将 space-y-3 改为 space-y-8 增加区域间距
  - [ ] SubTask 1.3: 使用 bg-insight 作为统一背景色
  - [ ] SubTask 1.4: 调整整体内边距为 py-8

- [x] Task 2: 重构 MarketStats 为极简指标栏
  - [x] SubTask 2.1: 将 6 个卡片网格改为单行水平布局
  - [x] SubTask 2.2: 移除所有卡片样式（bg-white、border、rounded-lg、shadow）
  - [x] SubTask 2.3: 指标间使用细竖线（|）或 24px 间距分隔
  - [x] SubTask 2.4: 指标格式：标签（text-xs text-gray-500）+ 数值（text-xl font-semibold tabular-nums）+ 变化（text-xs）
  - [x] SubTask 2.5: 响应式：窄屏幕优先显示核心指标，其他可横向滚动

- [x] Task 3: 扁平化 ChartContainer 图表区域
  - [x] SubTask 3.1: 移除外层卡片的 bg-white、border、rounded-lg、p-3
  - [x] SubTask 3.2: 图表标题栏使用 border-b border-gray-100 分隔
  - [x] SubTask 3.3: 控件改为 text-only 样式，激活状态使用文字颜色变化
  - [x] SubTask 3.4: 移除按钮组的 bg-gray-50 和 rounded-md
  - [x] SubTask 3.5: 图表区域使用最小 padding（p-0 或 p-2）

- [x] Task 4: 简化 MarketSidebar 侧边栏
  - [x] SubTask 4.1: 移除外层卡片的 bg-white、border、rounded-lg、p-3
  - [x] SubTask 4.2: 列表项使用 border-b border-gray-100 分隔
  - [x] SubTask 4.3: 选中状态改为左侧 2px 色条（border-l-2 border-primary-500）
  - [x] SubTask 4.4: 移除 hover 时的背景色变化，改为文字颜色变化
  - [x] SubTask 4.5: 列表项高度缩减到 40-44px

- [x] Task 5: 扁平化 AssetsTable 资产表格
  - [x] SubTask 5.1: 移除外层卡片的 bg-white、border、rounded-lg、p-3
  - [x] SubTask 5.2: 表头使用 border-b border-gray-200
  - [x] SubTask 5.3: 表格行使用 hover:bg-gray-50 替代 zebra striping
  - [x] SubTask 5.4: 减少单元格 padding 到 py-2 px-3
  - [x] SubTask 5.5: 简化排名样式（移除徽章边框，只保留背景色）
  - [x] SubTask 5.6: 简化价格变化样式（移除热力图背景，保留箭头+颜色）

- [x] Task 6: 优化 MarketHeader 头部区域
  - [x] SubTask 6.1: 标题区域使用 border-b border-gray-100 与下方分隔
  - [x] SubTask 6.2: 操作按钮改为 text-only 样式
  - [x] SubTask 6.3: 按钮间使用间距而非分隔线
  - [x] SubTask 6.4: 移除按钮的 bg-gray-50 背景

- [ ] Task 7: 响应式适配和测试
  - [ ] SubTask 7.1: 测试桌面端布局正常
  - [ ] SubTask 7.2: 测试平板端布局正常
  - [ ] SubTask 7.3: 测试移动端布局正常
  - [ ] SubTask 7.4: 运行 lint 和 typecheck
  - [ ] SubTask 7.5: 验证所有交互功能正常

# Task Dependencies

- Task 2、3、4、5 可并行执行（各自独立的组件）
- Task 6 依赖 Task 1（页面布局调整后调整头部）
- Task 7 依赖所有其他任务完成后进行
