# 多预言机比较分析页面优化任务列表

## Task 1: 调整页面内边距
**描述**: 将页面内边距从 px-3 py-3 改为 px-4 sm:px-6 lg:px-8 py-6，与价格查询页面保持一致。
**依赖**: 无

- [x] SubTask 1.1: 修改 page.tsx 的容器内边距
- [x] SubTask 1.2: 调整组件间距从 space-y-3 到 space-y-6
- [x] SubTask 1.3: 调整卡片内边距从 p-3 到 p-4
- [x] SubTask 1.4: 调整网格间距从 gap-3 到 gap-4/gap-6

## Task 2: 创建 ControlPanel 统一控制面板
**描述**: 创建统一控制面板组件，整合交易对选择、预言机选择、时间范围、偏差筛选等功能。
**依赖**: 无

- [x] SubTask 2.1: 创建 ControlPanel.tsx 组件文件
- [x] SubTask 2.2: 实现交易对选择器
- [x] SubTask 2.3: 实现预言机多选功能
- [x] SubTask 2.4: 实现时间范围选择
- [x] SubTask 2.5: 实现偏差筛选功能
- [x] SubTask 2.6: 实现查询按钮
- [x] SubTask 2.7: 实现色盲模式切换
- [x] SubTask 2.8: 添加响应式折叠功能

## Task 3: 简化 HeaderSection
**描述**: 简化头部区域，移除重复功能，只保留核心操作。
**依赖**: Task 2

- [x] SubTask 3.1: 移除 PairSelector（移至 ControlPanel）
- [x] SubTask 3.2: 移除 FilterPanel 按钮（移至 ControlPanel）
- [x] SubTask 3.3: 移除色盲模式切换（移至 ControlPanel）
- [x] SubTask 3.4: 保留面包屑、标题、刷新、收藏、更新时间
- [x] SubTask 3.5: 优化按钮组布局

## Task 4: 优化 PriceTableSection
**描述**: 优化价格表格区域，简化预言机选择器样式。
**依赖**: Task 2

- [x] SubTask 4.1: 简化预言机选择器样式（改为紧凑标签式）
- [x] SubTask 4.2: 移除重复功能按钮
- [x] SubTask 4.3: 与 ControlPanel 选择状态同步
- [x] SubTask 4.4: 优化表格区域布局

## Task 5: 重构 ComparisonTabs 布局
**描述**: 采用左右分栏布局，左侧控制面板 + 右侧内容区域。
**依赖**: Task 2, Task 3, Task 4

- [x] SubTask 5.1: 修改 ComparisonTabs 为左右分栏布局
- [x] SubTask 5.2: 左侧集成 ControlPanel（固定宽度 400px）
- [x] SubTask 5.3: 右侧为标签内容区域（自适应）
- [x] SubTask 5.4: 标签导航保持在内容区域顶部
- [x] SubTask 5.5: 添加响应式适配（移动端折叠）

## Task 6: 重构主页面 page.tsx
**描述**: 重构主页面，采用新的布局结构。
**依赖**: Task 1, Task 2, Task 3, Task 5

- [x] SubTask 6.1: 调整页面容器内边距
- [x] SubTask 6.2: 集成简化后的 HeaderSection
- [x] SubTask 6.3: 采用左右分栏布局
- [x] SubTask 6.4: 左侧边栏放置 ControlPanel
- [x] SubTask 6.5: 右侧主内容区放置 ComparisonTabs
- [x] SubTask 6.6: 调整 StatsSection 和 StatsOverview 位置

## Task 7: 功能验证和优化
**描述**: 验证所有功能正常工作，进行细节优化。
**依赖**: Task 6

- [x] SubTask 7.1: 验证所有筛选功能正常
- [x] SubTask 7.2: 验证预言机选择同步
- [x] SubTask 7.3: 验证响应式布局
- [x] SubTask 7.4: 验证所有标签页功能
- [x] SubTask 7.5: 运行 TypeScript 类型检查
- [x] SubTask 7.6: 运行构建验证

## 任务依赖关系

```
Task 1 (内边距调整) ──────┐
Task 2 (ControlPanel) ────┼──→ Task 3 (HeaderSection简化)
                          │    Task 4 (PriceTableSection优化)
                          │
                          └──→ Task 5 (ComparisonTabs布局)
                                   │
                                   └──→ Task 6 (page.tsx重构)
                                            │
                                            └──→ Task 7 (验证优化)
```

## 并行执行建议

**可并行执行的任务组**:
1. Task 1（内边距调整）可以独立执行
2. Task 2（ControlPanel）可以独立开发
3. Task 3 和 Task 4 依赖 Task 2，可以并行执行
4. Task 5 依赖 Task 2, 3, 4
5. Task 6 依赖 Task 1, 2, 3, 5
6. Task 7 依赖 Task 6
