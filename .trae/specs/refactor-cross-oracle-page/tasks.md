# 多预言机比较分析页面重构任务列表

## 阶段一：基础组件开发

### Task 1: 创建 LiveStatusBar 实时状态栏组件
**描述**: 创建专业的实时状态栏组件，显示 UTC 时间、网络延迟、最后更新时间和连接状态。
**依赖**: 无

- [x] SubTask 1.1: 创建 LiveStatusBar.tsx 组件文件
- [x] SubTask 1.2: 实现 UTC 时间显示（每秒更新）
- [x] SubTask 1.3: 实现网络延迟检测和显示
- [x] SubTask 1.4: 实现连接状态指示器（已连接/断开/重连中）
- [x] SubTask 1.5: 实现最后更新时间显示
- [x] SubTask 1.6: 添加响应式布局支持

### Task 2: 创建 SparklineChart 迷你趋势图组件
**描述**: 创建迷你趋势图组件，用于在统计卡片中显示数据趋势。
**依赖**: 无

- [x] SubTask 2.1: 创建 SparklineChart.tsx 组件文件
- [x] SubTask 2.2: 实现基于 SVG 的迷你折线图
- [x] SubTask 2.3: 支持趋势颜色（上涨/下跌/中性）
- [x] SubTask 2.4: 支持可选的面积填充
- [x] SubTask 2.5: 添加动画效果
- [x] SubTask 2.6: 添加响应式尺寸支持

### Task 3: 创建 Breadcrumb 面包屑导航组件
**描述**: 创建面包屑导航组件，显示页面导航路径。
**依赖**: 无

- [x] SubTask 3.1: 创建 Breadcrumb.tsx 组件文件
- [x] SubTask 3.2: 实现导航路径渲染
- [x] SubTask 3.3: 支持点击跳转
- [x] SubTask 3.4: 添加图标支持
- [x] SubTask 3.5: 实现当前页面高亮

## 阶段二：高级组件开发

### Task 4: 创建 DataTablePro 专业数据表格组件
**描述**: 创建专业数据表格组件，支持固定列、条件格式、多排序等高级功能。
**依赖**: 无

- [x] SubTask 4.1: 创建 DataTablePro.tsx 组件文件和类型定义
- [x] SubTask 4.2: 实现基础表格渲染
- [x] SubTask 4.3: 实现左侧固定列功能
- [x] SubTask 4.4: 实现右侧固定列功能
- [x] SubTask 4.5: 实现条件格式（根据数值范围自动着色）
- [x] SubTask 4.6: 实现多字段排序功能
- [x] SubTask 4.7: 实现列宽调整功能
- [x] SubTask 4.8: 实现列显示/隐藏功能
- [x] SubTask 4.9: 实现紧凑/标准/舒适三种密度模式
- [x] SubTask 4.10: 添加响应式支持

### Task 5: 创建 ChartToolbar 图表工具栏组件
**描述**: 创建专业的图表工具栏，支持时间范围切换、图表类型切换等功能。
**依赖**: 无

- [x] SubTask 5.1: 创建 ChartToolbar.tsx 组件文件
- [x] SubTask 5.2: 实现时间范围选择器（1H/24H/7D/30D/1Y/ALL）
- [x] SubTask 5.3: 实现图表类型切换（折线/面积/蜡烛）
- [x] SubTask 5.4: 实现缩放控制（放大/缩小/重置）
- [x] SubTask 5.5: 实现导出功能按钮
- [x] SubTask 5.6: 添加全屏切换按钮
- [x] SubTask 5.7: 实现图表联动控制

## 阶段三：页面组件重构

### Task 6: 重构 HeaderSection 头部区域
**描述**: 重构头部区域，采用紧凑布局，集成 LiveStatusBar 和 Breadcrumb。
**依赖**: Task 1, Task 3

- [x] SubTask 6.1: 修改布局为紧凑风格（减小间距）
- [x] SubTask 6.2: 集成 Breadcrumb 面包屑导航
- [x] SubTask 6.3: 调整交易对选择器样式
- [x] SubTask 6.4: 优化筛选面板按钮样式
- [x] SubTask 6.5: 优化操作按钮组布局

### Task 7: 重构 StatsCards 统计卡片
**描述**: 重构统计卡片，集成 SparklineChart，采用紧凑布局。
**依赖**: Task 2

- [x] SubTask 7.1: 修改布局为紧凑风格
- [x] SubTask 7.2: 集成 SparklineChart 迷你趋势图
- [x] SubTask 7.3: 优化趋势指示器样式
- [x] SubTask 7.4: 优化移动端适配

### Task 8: 重构 StatsSection 统计区域
**描述**: 重构统计区域，采用紧凑布局，集成增强的 StatsCards。
**依赖**: Task 7

- [x] SubTask 8.1: 修改布局为紧凑风格
- [x] SubTask 8.2: 优化交易对信息展示
- [x] SubTask 8.3: 集成增强的 StatsCards
- [x] SubTask 8.4: 优化数据质量分数卡片样式

### Task 9: 重构 PriceTable 价格表格
**描述**: 重构价格表格，使用 DataTablePro 组件，添加高级功能。
**依赖**: Task 4

- [x] SubTask 9.1: 替换为 DataTablePro 组件
- [x] SubTask 9.2: 配置固定列（预言机名称、价格）
- [x] SubTask 9.3: 配置条件格式（偏差高亮）
- [x] SubTask 9.4: 保留现有排序功能
- [x] SubTask 9.5: 保留展开详情功能
- [x] SubTask 9.6: 保留悬停提示功能
- [x] SubTask 9.7: 优化移动端显示

### Task 10: 重构 PriceTableSection 表格区域
**描述**: 重构表格区域，集成增强的 PriceTable。
**依赖**: Task 9

- [x] SubTask 10.1: 修改布局为紧凑风格
- [x] SubTask 10.2: 集成增强的 PriceTable
- [x] SubTask 10.3: 优化预言机选择器样式

### Task 11: 重构 ComparisonTabs 对比标签页
**描述**: 重构对比标签页，采用紧凑布局，集成 ChartToolbar。
**依赖**: Task 5

- [x] SubTask 11.1: 修改布局为紧凑风格
- [x] SubTask 11.2: 在图表区域集成 ChartToolbar
- [x] SubTask 11.3: 实现图表时间范围联动
- [x] SubTask 11.4: 优化各标签页内容布局

## 阶段四：页面整合

### Task 12: 重构主页面 page.tsx
**描述**: 重构主页面，集成所有更新后的组件，采用紧凑专业布局。
**依赖**: Task 6, Task 8, Task 10, Task 11

- [x] SubTask 12.1: 修改页面容器为紧凑布局
- [x] SubTask 12.2: 集成 LiveStatusBar
- [x] SubTask 12.3: 集成重构后的 HeaderSection
- [x] SubTask 12.4: 集成重构后的 StatsSection
- [x] SubTask 12.5: 集成重构后的 ComparisonTabs
- [x] SubTask 12.6: 更新组件导出

### Task 13: 更新组件索引
**描述**: 更新 components/index.ts 导出文件。
**依赖**: 无

- [x] SubTask 13.1: 检查并更新所有组件导出

## 阶段五：验证和优化

### Task 14: 功能验证
**描述**: 验证所有功能正常工作。
**依赖**: Task 12

- [x] SubTask 14.1: 验证所有现有功能完整保留
- [x] SubTask 14.2: 验证 LiveStatusBar 正常显示
- [x] SubTask 14.3: 验证 DataTablePro 高级功能
- [x] SubTask 14.4: 验证 SparklineChart 正常显示
- [x] SubTask 14.5: 验证 ChartToolbar 功能
- [x] SubTask 14.6: 验证 Breadcrumb 导航
- [x] SubTask 14.7: 验证响应式设计

### Task 15: 性能优化
**描述**: 优化页面性能。
**依赖**: Task 14

- [x] SubTask 15.1: 优化组件渲染性能
- [x] SubTask 15.2: 优化图表渲染性能
- [x] SubTask 15.3: 优化表格大数据量渲染

## 任务依赖关系

```
Task 1 (LiveStatusBar) ──────┐
Task 2 (SparklineChart) ─────┼──→ Task 6 (HeaderSection)
Task 3 (Breadcrumb) ──────────┘    Task 7 (StatsCards)
                                   Task 8 (StatsSection)
Task 4 (DataTablePro) ───────→ Task 9 (PriceTable)
                                   Task 10 (PriceTableSection)
Task 5 (ChartToolbar) ───────→ Task 11 (ComparisonTabs)

Task 6, 8, 10, 11 ───────────→ Task 12 (page.tsx)
Task 12 ─────────────────────→ Task 14 (功能验证)
Task 14 ─────────────────────→ Task 15 (性能优化)
```

## 并行执行建议

**可并行执行的任务组**:
1. Task 1, Task 2, Task 3（基础组件）
2. Task 4, Task 5（高级组件）
3. Task 6, Task 7（依赖基础组件）
4. Task 8, Task 9, Task 10, Task 11（依赖前面的任务）
