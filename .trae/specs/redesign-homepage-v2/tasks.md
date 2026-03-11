# 首页重构 V2 任务列表

- [ ] Task 1: 安装图表库依赖
  - [ ] SubTask 1.1: 安装 recharts 图表库
  - [ ] SubTask 1.2: 验证安装成功

- [ ] Task 2: 重构整体布局为仪表盘式
  - [ ] SubTask 2.1: 创建左侧固定导航栏组件
  - [ ] SubTask 2.2: 创建主内容区布局
  - [ ] SubTask 2.3: 实现响应式布局（移动端隐藏侧边栏）

- [ ] Task 3: 重构 Hero 头部区域
  - [ ] SubTask 3.1: 设计紧凑的专业头部（高度 ~200px）
  - [ ] SubTask 3.2: 添加系统状态指示器（在线状态、最后更新时间）
  - [ ] SubTask 3.3: 添加 subtle 渐变背景

- [ ] Task 4: 创建数据概览卡片网格
  - [ ] SubTask 4.1: 设计 4 列网格布局
  - [ ] SubTask 4.2: 创建指标卡片组件（标题、数值、趋势、迷你图）
  - [ ] SubTask 4.3: 实现 4 个关键指标：总数据源、活跃预言机、24h 更新、平均响应时间
  - [ ] SubTask 4.4: 添加实时数据更新动画效果

- [ ] Task 5: 创建预言机性能对比表
  - [ ] SubTask 5.1: 设计详细数据表格（类似 Dune 风格）
  - [ ] SubTask 5.2: 添加表格列：名称、价格、24h 变化、市值、更新频率、准确性
  - [ ] SubTask 5.3: 实现表格排序功能
  - [ ] SubTask 5.4: 实现行展开详情功能

- [ ] Task 6: 创建数据可视化图表区域
  - [ ] SubTask 6.1: 创建价格趋势面积图（使用 recharts）
  - [ ] SubTask 6.2: 创建各链数据量柱状图
  - [ ] SubTask 6.3: 添加图表交互提示框
  - [ ] SubTask 6.4: 实现图表数据自动更新

- [ ] Task 7: 创建最新活动流
  - [ ] SubTask 7.1: 设计活动流列表（类似区块链浏览器）
  - [ ] SubTask 7.2: 显示字段：时间、预言机、价格、链
  - [ ] SubTask 7.3: 实现活动自动滚动更新效果
  - [ ] SubTask 7.4: 添加 "查看全部" 链接

- [ ] Task 8: 实现实时数据效果
  - [ ] SubTask 8.1: 创建数据更新闪烁动画
  - [ ] SubTask 8.2: 实现实时时间戳更新
  - [ ] SubTask 8.3: 添加数据更新指示器组件

- [ ] Task 9: 整体样式优化
  - [ ] SubTask 9.1: 统一深色主题配色
  - [ ] SubTask 9.2: 优化数据密度和间距
  - [ ] SubTask 9.3: 确保所有区域视觉统一
  - [ ] SubTask 9.4: 优化响应式表现

- [ ] Task 10: 验证与测试
  - [ ] SubTask 10.1: 验证所有图表正常渲染
  - [ ] SubTask 10.2: 验证数据实时更新正常
  - [ ] SubTask 10.3: 验证响应式布局
  - [ ] SubTask 10.4: 运行 lint 检查

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3-8 可并行执行
- Task 9 依赖 Task 3-8
- Task 10 依赖 Task 9
