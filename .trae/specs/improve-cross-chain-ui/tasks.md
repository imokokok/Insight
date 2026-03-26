# Tasks

- [x] Task 1: 重构 CompactStatsGrid 组件 - 精简统计指标展示，优化视觉层次
  - [x] SubTask 1.1: 修改组件逻辑，默认只显示6个核心指标
  - [x] SubTask 1.2: 添加"查看全部/收起"切换按钮和功能
  - [x] SubTask 1.3: 移除模拟 Sparkline 数据，使用真实趋势数据
  - [x] SubTask 1.4: 优化卡片间距，使用 gap-3 替代 gap-4
  - [x] SubTask 1.5: 更新统计卡片样式，统一使用新的色彩系统

- [x] Task 2: 优化 PriceComparisonTable 组件 - 改进表格展示和交互
  - [x] SubTask 2.1: 优化列宽配置，区块链名称列固定左侧
  - [x] SubTask 2.2: 增强条件格式，添加背景色高亮效果
  - [x] SubTask 2.3: 改进异常值标记样式，使用 amber 标签
  - [x] SubTask 2.4: 添加表格密度切换选项（紧凑/正常/宽松）
  - [x] SubTask 2.5: 优化表格头部样式，统一使用 uppercase tracking-wide

- [x] Task 3: 重构 PriceSpreadHeatmap 组件 - 优化热力图布局和样式
  - [x] SubTask 3.1: 减小热力图单元格尺寸至 48px × 48px
  - [x] SubTask 3.2: 优化图例布局，使用水平渐变条替代垂直图例
  - [x] SubTask 3.3: 改进悬停提示样式，添加阴影和圆角
  - [x] SubTask 3.4: 添加点击选中状态，使用 ring 效果
  - [x] SubTask 3.5: 优化热力图容器间距，减少垂直空间占用

- [x] Task 4: 优化 InteractivePriceChart 组件 - 统一图表样式和交互
  - [x] SubTask 4.1: 统一工具栏按钮样式，使用新的按钮状态规范
  - [x] SubTask 4.2: 优化坐标轴标签格式，使用统一的文本颜色
  - [x] SubTask 4.3: 改进提示框样式，添加圆角和阴影
  - [x] SubTask 4.4: 添加图表标题和说明文字
  - [x] SubTask 4.5: 优化图例布局，支持点击交互

- [x] Task 5: 重构 CrossChainFilters 组件 - 改进过滤器面板体验
  - [x] SubTask 5.1: 添加折叠/展开功能，优化移动端体验
  - [x] SubTask 5.2: 改进表单控件样式，统一使用新的色彩系统
  - [x] SubTask 5.3: 添加过滤器摘要显示，展示当前激活的过滤器
  - [x] SubTask 5.4: 优化移动端布局，使用更紧凑的间距
  - [x] SubTask 5.5: 改进链选择器样式，使用更小的标签尺寸

- [x] Task 6: 更新页面布局和样式 - 优化整体视觉层次
  - [x] SubTask 6.1: 优化页面头部布局，改进标题和控制的排列
  - [x] SubTask 6.2: 统一使用新的间距规范（p-4, gap-4, mb-6）
  - [x] SubTask 6.3: 优化两栏布局，改进侧边栏和主内容区的比例
  - [x] SubTask 6.4: 更新加载状态和空状态样式
  - [x] SubTask 6.5: 优化标签导航样式，使用新的激活状态规范

- [x] Task 7: 优化移动端适配 - 改进响应式设计
  - [x] SubTask 7.1: 优化移动端统计卡片布局，使用单列展示
  - [x] SubTask 7.2: 改进移动端表格体验，支持横向滚动
  - [x] SubTask 7.3: 优化移动端图表展示，简化交互控件
  - [x] SubTask 7.4: 确保触摸目标最小尺寸为 44px × 44px
  - [x] SubTask 7.5: 测试并修复移动端布局问题

- [x] Task 8: 更新国际化文本 - 优化文本内容和格式
  - [x] SubTask 8.1: 添加新的统计指标相关文本
  - [x] SubTask 8.2: 更新按钮和标签文本，使用更专业的术语
  - [x] SubTask 8.3: 添加过滤器摘要相关文本
  - [x] SubTask 8.4: 优化提示和说明文本
  - [x] SubTask 8.5: 确保所有新功能都有对应的国际化文本

# Task Dependencies

- Task 2 依赖于 Task 1（统计指标数据结构）
- Task 6 依赖于 Task 1-5（组件更新完成后进行整体布局调整）
- Task 7 依赖于 Task 6（整体布局完成后进行移动端适配）
- Task 8 可以与其他任务并行进行
