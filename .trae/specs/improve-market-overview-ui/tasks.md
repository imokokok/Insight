# Tasks

- [x] Task 1: 重构 MarketStats 统计卡片组件
  - [x] SubTask 1.1: 区分核心指标和次要指标的数据结构
  - [x] SubTask 1.2: 实现核心指标卡片样式（大字号+强调色边框）
  - [x] SubTask 1.3: 实现次要指标可折叠设计
  - [x] SubTask 1.4: 添加响应式布局支持（桌面/平板/移动端）
  - [x] SubTask 1.5: 统一卡片高度，breakdown 默认折叠

- [x] Task 2: 优化 ChartContainer 图表类型切换
  - [x] SubTask 2.1: 将 9 个图表类型分为主要（4个）和次要（5个）
  - [x] SubTask 2.2: 实现主图表一级标签页组件
  - [x] SubTask 2.3: 实现次要图表下拉菜单组件
  - [x] SubTask 2.4: 添加图表类型记忆功能（localStorage）
  - [x] SubTask 2.5: 优化标签样式（图标+短文字）

- [x] Task 3: 合并重复的时间范围控件
  - [x] SubTask 3.1: 移除 ChartToolbar 中的时间范围选择器
  - [x] SubTask 3.2: 统一使用顶部的 TIME_RANGES 选择器
  - [x] SubTask 3.3: 确保时间范围切换时所有图表同步更新
  - [x] SubTask 3.4: 添加时间范围切换的加载状态

- [x] Task 4: 改进专业异常检测控件
  - [x] SubTask 4.1: 使用分段按钮替代滑块（5%, 10%, 15%, 20%, 30%, 50%）
  - [x] SubTask 4.2: 实现阈值段颜色编码（绿→黄→橙→红）
  - [x] SubTask 4.3: 在图表数据点上添加异常标记
  - [x] SubTask 4.4: 实现异常详情的 tooltip 显示

- [x] Task 5: 优化 MarketSidebar 侧边栏
  - [x] SubTask 5.1: 压缩预言机列表项高度（~50px）
  - [x] SubTask 5.2: 将 TVS 和链数量移到 tooltip
  - [x] SubTask 5.3: 移除底部 "Total Market Share" 冗余卡片
  - [x] SubTask 5.4: 使用真实历史数据生成 sparkline
  - [x] SubTask 5.5: 优化选中状态（左侧边框高亮+透明度变化）

- [x] Task 6: 增强 AssetsTable 专业度
  - [x] SubTask 6.1: 实现排名徽章样式（前3名金银铜配色）
  - [x] SubTask 6.2: 为价格变化添加上升/下降箭头
  - [x] SubTask 6.3: 实现价格变化热力图背景
  - [x] SubTask 6.4: 优化主要预言机列（徽章+品牌色点）
  - [x] SubTask 6.5: 添加预言机列的 tooltip 和点击跳转

- [x] Task 7: 精简 MarketHeader 操作区
  - [x] SubTask 7.1: 按功能分组操作按钮（数据操作/视图控制）
  - [x] SubTask 7.2: 移除 LiveStatusBar 组件
  - [x] SubTask 7.3: 简化 RefreshControl（移除行内倒计时）
  - [x] SubTask 7.4: 添加刷新成功的 toast 通知
  - [x] SubTask 7.5: 统一实时状态指示器样式

- [x] Task 8: 优化置信区间控件
  - [x] SubTask 8.1: 改进 CI 开关的视觉效果
  - [x] SubTask 8.2: 确保 CI 只在非对比模式下显示
  - [x] SubTask 8.3: 优化 95% 置信度标签的显示

- [ ] Task 9: 响应式适配和测试
  - [ ] SubTask 9.1: 测试桌面端（1920px, 1440px, 1280px）布局
  - [ ] SubTask 9.2: 测试平板端（1024px, 768px）布局
  - [ ] SubTask 9.3: 测试移动端（375px, 414px）布局
  - [ ] SubTask 9.4: 验证所有交互功能正常
  - [ ] SubTask 9.5: 运行 lint 和 typecheck

# Task Dependencies

- Task 3 依赖 Task 2（图表类型切换完成后才能统一时间范围）
- Task 7 依赖 Task 5（侧边栏优化完成后调整头部布局）
- Task 9 依赖所有其他任务完成后进行
