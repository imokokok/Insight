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

- [ ] **Task 1: 重构 page.tsx 主页面布局**
  - [ ] 1.1 调整模块间距：将 `space-y-8` 改为 `space-y