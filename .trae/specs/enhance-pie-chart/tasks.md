# Tasks

- [ ] Task 1: 增强环形图中心信息展示
  - [ ] SubTask 1.1: 在环形图中心添加总 TVS 显示（大字号）
  - [ ] SubTask 1.2: 在中心添加预言机数量和时间范围显示（小字）
  - [ ] SubTask 1.3: 实现悬停时中心信息切换（显示选中预言机详情）
  - [ ] SubTask 1.4: 使用 Recharts Label 或自定义 SVG 实现中心文字

- [ ] Task 2: 添加环形图外围标签
  - [ ] SubTask 2.1: 在环形图周围显示预言机标签（颜色点+名称+份额）
  - [ ] SubTask 2.2: 标签位置对应扇形位置（使用 polar 坐标计算）
  - [ ] SubTask 2.3: 小字号样式（text-xs），名称灰色，份额深色
  - [ ] SubTask 2.4: 实现标签悬停与扇形高亮联动

- [ ] Task 3: 增强扇形交互效果
  - [ ] SubTask 3.1: 悬停时扇形向外偏移（explode）5-10px
  - [ ] SubTask 3.2: 悬停时扇形放大（scale 1.05）
  - [ ] SubTask 3.3: 显示 tooltip（名称、份额、TVS、24h变化）
  - [ ] SubTask 3.4: 其他扇形降低透明度（opacity-50）
  - [ ] SubTask 3.5: 点击扇形选中，再次点击取消选中

- [ ] Task 4: 在扇形上直接显示份额（大扇形）
  - [ ] SubTask 4.1: 对份额大于 5% 的扇形，在扇形上显示百分比
  - [ ] SubTask 4.2: 使用白色文字，居中显示
  - [ ] SubTask 4.3: 小扇形不显示文字，避免拥挤

- [ ] Task 5: 添加图表下方迷你趋势图
  - [ ] SubTask 5.1: 在环形图下方添加趋势图区域（高度 60-80px）
  - [ ] SubTask 5.2: 使用 Recharts AreaChart 或 LineChart 显示 30 天趋势
  - [ ] SubTask 5.3: 显示所有预言机的份额变化趋势
  - [ ] SubTask 5.4: 点击趋势图切换到趋势图表视图

- [ ] Task 6: 添加关键洞察行
  - [ ] SubTask 6.1: 在趋势图下方添加洞察行
  - [ ] SubTask 6.2: 显示"增长最快"（7天增长最多）
  - [ ] SubTask 6.3: 显示"份额变化最大"（24h变化最大）
  - [ ] SubTask 6.4: 显示"市场集中度 CR4"

- [ ] Task 7: 添加紧凑图例
  - [ ] SubTask 7.1: 在洞察行下方添加横向图例
  - [ ] SubTask 7.2: 每行显示 5 个预言机（颜色点+缩写+份额）
  - [ ] SubTask 7.3: 小字号（text-xs），紧凑排列

- [ ] Task 8: 调整环形图尺寸和布局
  - [ ] SubTask 8.1: 增大环形图尺寸（outerRadius=140-150, innerRadius=80-90）
  - [ ] SubTask 8.2: 调整 PieChart 容器高度，容纳下方信息
  - [ ] SubTask 8.3: 确保响应式布局正常

- [ ] Task 9: 测试和优化
  - [ ] SubTask 9.1: 测试所有交互功能正常
  - [ ] SubTask 9.2: 测试响应式布局
  - [ ] SubTask 9.3: 运行 lint 和 typecheck
  - [ ] SubTask 9.4: 优化性能（避免不必要的重渲染）

# Task Dependencies

- Task 2 依赖 Task 1（中心信息完成后添加外围标签）
- Task 3 可与 Task 1、2 并行
- Task 4 依赖 Task 3（扇形交互完成后添加文字）
- Task 5、6、7 可并行
- Task 8 依赖所有视觉任务完成后调整
- Task 9 依赖所有其他任务
