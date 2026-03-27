# 市场概览页视觉优化任务列表

## 任务依赖关系
```
Task 1 (page.tsx 布局重构)
    │
    ├──→ Task 2 (MarketStats 卡片化)
    │
    ├──→ Task 3 (ChartContainer 卡片化)
    │
    ├──→ Task 4 (MarketSidebar 卡片化)
    │
    └──→ Task 5 (AssetsTable 卡片化)
```

---

- [x] **Task 1: 重构 page.tsx 主页面布局**
  - [x] 1.1 调整模块间距：将 `space-y-8` 改为 `space-y-6`
  - [x] 1.2 为 MarketStats 添加卡片容器包裹
  - [x] 1.3 为 ChartContainer 添加卡片容器包裹
  - [x] 1.4 为 MarketSidebar 添加卡片容器包裹
  - [x] 1.5 为 AssetsTable 添加卡片容器包裹
  - [x] 1.6 统一卡片样式：`bg-white border border-gray-200 rounded-xl shadow-sm`
  - [x] 1.7 调整内边距：`p-4` 或 `p-6`
  - [x] 1.8 确保响应式布局正常

---

- [x] **Task 2: 优化 MarketStats 组件**
  - [x] 2.1 确认组件内部布局保持不变
  - [x] 2.2 调整组件根元素样式以适应卡片容器
  - [x] 2.3 确保移动端横向滚动正常
  - [x] 2.4 验证指标值和变化趋势显示清晰

---

- [x] **Task 3: 优化 ChartContainer 组件**
  - [x] 3.1 移除外层 `p-3` 包裹（移到 page.tsx 的卡片容器中）
  - [x] 3.2 确保图表标题栏样式正常
  - [x] 3.3 验证图表类型切换功能正常
  - [x] 3.4 确保时间范围选择器样式正常
  - [x] 3.5 验证图表渲染和交互正常

---

- [x] **Task 4: 优化 MarketSidebar 组件**
  - [x] 4.1 移除外层 `p-3` 包裹（移到 page.tsx 的卡片容器中）
  - [x] 4.2 调整内部 `space-y-3` 为合适的间距
  - [x] 4.3 确保预言机列表悬停效果正常
  - [x] 4.4 验证迷你走势图显示正常
  - [x] 4.5 确保时间范围显示正常

---

- [x] **Task 5: 优化 AssetsTable 组件**
  - [x] 5.1 移除外层 `p-3` 包裹（移到 page.tsx 的卡片容器中）
  - [x] 5.2 确保表格头部样式正常
  - [x] 5.3 验证表格行悬停效果正常
  - [x] 5.4 确保排序和筛选功能正常
  - [x] 5.5 验证表格滚动行为正常

---

- [x] **Task 6: 验证和测试**
  - [x] 6.1 验证所有卡片容器样式一致
  - [x] 6.2 测试桌面端布局（1920px、1440px、1280px）
  - [x] 6.3 测试平板端布局（768px）
  - [x] 6.4 测试移动端布局（375px、414px）
  - [x] 6.5 验证所有交互功能正常
  - [x] 6.6 检查 TypeScript 类型错误

---

# Task Dependencies
- Task 2-5 可以并行执行
- Task 6 依赖于 Task 1-5 完成
