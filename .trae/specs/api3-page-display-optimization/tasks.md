# API3 页面显示优化任务列表

## P0 - 立即优化（影响核心体验）

### 任务1: Hero区域信息密度优化
- [ ] 重构核心统计指标展示，从5个减少到3个最关键指标
- [ ] 增大迷你价格图表高度至120px
- [ ] 添加"查看更多指标"展开/折叠功能
- [ ] 将次要指标（4个）移到可展开区域
- [ ] 统一操作按钮位置，移除移动端和桌面端的重复按钮
- [ ] 将网络健康度、Gas、响应时间整合为图标+tooltip形式

**相关文件**:
- `src/app/[locale]/api3/components/API3Hero.tsx`

---

### 任务2: 移动端导航重构
- [ ] 设计底部Tab导航组件
- [ ] 实现底部固定Tab栏（显示最常用的3-4个标签）
- [ ] 添加"更多"下拉菜单显示其余标签
- [ ] 支持左右滑动切换标签
- [ ] 在移动端隐藏侧边栏抽屉
- [ ] 添加标签切换动画效果

**相关文件**:
- `src/app/[locale]/api3/page.tsx`
- `src/app/[locale]/api3/components/API3Sidebar.tsx`
- `src/components/navigation/MobileBottomNav.tsx` (新建)

---

### 任务3: 表格可读性优化
- [ ] 为Airnode列表设计专用表格样式
- [ ] 为DAPI列表设计专用表格样式
- [ ] 实现表头固定功能
- [ ] 添加行悬停高亮效果
- [ ] 实现点击展开行内详情面板
- [ ] 添加移动端横向滚动提示
- [ ] 移动端次要列隐藏或卡片化展示

**相关文件**:
- `src/app/[locale]/api3/components/API3AirnodeView.tsx`
- `src/app/[locale]/api3/components/API3DapiView.tsx`
- `src/components/ui/DataTablePro.tsx` (新建)

---

## P1 - 短期优化（提升专业度）

### 任务4: 图表样式统一
- [ ] 统一所有图表的配色方案
- [ ] 统一坐标轴样式和字体
- [ ] 统一tooltip样式
- [ ] 将TVL趋势图的链筛选按钮改为SegmentedControl组件
- [ ] 在OEV趋势图关键数据点添加标记
- [ ] 网络拓扑图添加节点详情弹窗
- [ ] 优化图表在移动端的显示效果

**相关文件**:
- `src/app/[locale]/api3/components/API3EcosystemView.tsx`
- `src/app/[locale]/api3/components/API3OevView.tsx`
- `src/app/[locale]/api3/components/API3NetworkView.tsx`
- `src/components/oracle/charts/ChartContainer.tsx` (新建)

---

### 任务5: 加载状态优化
- [ ] 设计统一的骨架屏组件
- [ ] 实现渐进式加载效果（优先加载Hero区域）
- [ ] 添加加载进度指示器
- [ ] 为各视图组件统一加载状态样式
- [ ] 实现部分加载（skeleton + 真实数据混合）

**相关文件**:
- `src/components/ui/Skeleton.tsx`
- `src/components/ui/LoadingProgress.tsx` (新建)
- `src/app/[locale]/api3/components/API3Hero.tsx`
- `src/app/[locale]/api3/components/API3MarketView.tsx`

---

### 任务6: 实时数据展示优化
- [ ] 实现价格更新动画（上涨/下跌不同颜色闪烁）
- [ ] 添加数据新鲜度指示器（"刚刚更新"、倒计时）
- [ ] 数据过期时显示警告样式
- [ ] 添加小型实时活动feed（最近10条更新）
- [ ] 支持展开查看完整活动历史

**相关文件**:
- `src/app/[locale]/api3/components/API3Hero.tsx`
- `src/components/oracle/data-display/RealtimeActivityFeed.tsx` (新建)
- `src/components/ui/DataFreshnessIndicator.tsx` (新建)

---

## P2 - 中期优化（锦上添花）

### 任务7: 专业组件封装
- [ ] 封装MetricCard专业指标卡组件
  - 支持趋势图sparkline
  - 支持同比/环比显示
  - 支持阈值警告
- [ ] 封装DataTablePro专业数据表组件
  - 内置排序、筛选、分页
  - 支持列自定义
  - 支持数据导出
- [ ] 封装ChartContainer图表容器组件
  - 统一图表工具栏
  - 支持全屏查看
  - 支持数据导出
- [ ] 封装StatusBadge状态徽章组件
  - 多种状态样式
  - 支持动画效果
  - 支持图标+文字

**相关文件**:
- `src/components/ui/MetricCard.tsx` (新建)
- `src/components/ui/DataTablePro.tsx` (新建)
- `src/components/oracle/charts/ChartContainer.tsx` (新建)
- `src/components/ui/StatusBadge.tsx` (新建)

---

### 任务8: 空状态和错误状态优化
- [ ] 设计统一的空状态组件
- [ ] 设计统一的错误状态组件
- [ ] 添加操作引导（刷新数据、检查网络）
- [ ] 错误状态提供重试按钮和错误详情
- [ ] 为各视图组件集成空状态和错误状态

**相关文件**:
- `src/components/ui/EmptyState.tsx` (新建)
- `src/components/ui/ErrorState.tsx` (新建)
- `src/app/[locale]/api3/components/API3MarketView.tsx`
- `src/app/[locale]/api3/components/API3NetworkView.tsx`

---

### 任务9: 视觉细节打磨
- [ ] 优化色彩系统（降低主色饱和度）
- [ ] 统一间距系统（4px/8px基数）
- [ ] 统一字体层级
- [ ] 统一阴影和圆角
- [ ] 检查并修复各视图的视觉不一致问题

**相关文件**:
- `src/app/globals.css`
- `tailwind.config.ts`
- 所有API3视图组件

---

## 任务依赖关系

```
任务1 (Hero优化)
  └── 依赖: 无

任务2 (移动端导航)
  └── 依赖: 无

任务3 (表格优化)
  └── 依赖: 无

任务4 (图表统一)
  └── 依赖: 无

任务5 (加载优化)
  └── 依赖: 无

任务6 (实时数据)
  └── 依赖: 无

任务7 (组件封装)
  └── 依赖: 任务3、任务4、任务5

任务8 (空状态优化)
  └── 依赖: 无

任务9 (视觉打磨)
  └── 依赖: 任务1-8完成
```

---

## 实施时间线

### 第1周: P0任务
- Day 1-2: 任务1 - Hero区域优化
- Day 3-4: 任务2 - 移动端导航
- Day 5: 任务3 - 表格优化

### 第2周: P1任务
- Day 1-2: 任务4 - 图表统一
- Day 3-4: 任务5 - 加载优化
- Day 5: 任务6 - 实时数据

### 第3周: P2任务
- Day 1-2: 任务7 - 组件封装
- Day 3: 任务8 - 空状态优化
- Day 4-5: 任务9 - 视觉打磨

---

## 验收标准

### Hero区域
- [ ] 首屏只显示3个核心指标
- [ ] 迷你图表高度≥120px，趋势清晰可见
- [ ] 操作按钮不重复显示
- [ ] 次要指标可通过按钮展开/折叠

### 移动端导航
- [ ] 底部Tab导航正常工作
- [ ] 支持左右滑动切换
- [ ] "更多"菜单正确显示其余标签
- [ ] 侧边栏在移动端隐藏

### 表格
- [ ] 表头固定，滚动时可见
- [ ] 行悬停有明显高亮效果
- [ ] 点击行可展开详情
- [ ] 移动端有横向滚动提示

### 图表
- [ ] 所有图表配色统一
- [ ] 筛选按钮样式一致
- [ ] 关键数据点有标记
- [ ] 移动端显示正常

### 加载状态
- [ ] 骨架屏样式统一
- [ ] 渐进式加载正常工作
- [ ] 加载进度指示器显示正确

### 实时数据
- [ ] 价格更新有动画效果
- [ ] 数据新鲜度指示正确
- [ ] 活动feed正常显示

---

## 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 移动端适配问题 | 中 | 高 | 充分测试各种屏幕尺寸 |
| 性能问题 | 低 | 中 | 使用React.memo和useMemo优化 |
| 浏览器兼容性 | 低 | 中 | 测试主流浏览器 |
| 用户体验不一致 | 中 | 中 | 建立设计规范和组件库 |
