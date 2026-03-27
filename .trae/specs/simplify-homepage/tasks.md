# 首页简化任务列表

## 任务依赖关系
```
Task 1 (简化 page.tsx) ──────────────────────┐
                                             ├──→ Task 3 (验证测试)
Task 2 (简化 ProfessionalHero) ──────────────┤
                                             │
Task 4 (简化 HeroBackground) ────────────────┘
```

---

- [x] **Task 1: 简化首页 page.tsx 文件**
  - [x] 1.1 移除 LivePriceTicker 动态导入和组件
  - [x] 1.2 移除 BentoMetricsGrid 动态导入和组件
  - [x] 1.3 移除 OracleMarketOverview 动态导入和组件
  - [x] 1.4 移除 ArbitrageHeatmap 动态导入和组件
  - [x] 1.5 移除 ProfessionalCTA 动态导入和组件
  - [x] 1.6 移除未使用的 Skeleton 导入
  - [x] 1.7 保留 ProfessionalHero 作为唯一组件
  - [x] 1.8 验证页面能正常编译

---

- [x] **Task 2: 简化 ProfessionalHero 组件**
  - [x] 2.1 移除 LiveMetricsPanel 组件导入
  - [x] 2.2 移除 TrustMetricsBanner 组件导入
  - [x] 2.3 修改布局：从左右分栏改为居中单栏
  - [x] 2.4 移除右侧 LiveMetricsPanel 组件引用
  - [x] 2.5 移除底部 TrustMetricsBanner 组件引用
  - [x] 2.6 调整内容区域为居中布局
  - [x] 2.7 保留搜索框完整功能
  - [x] 2.8 保留热门币种标签功能
  - [x] 2.9 保留 CTA 按钮（可选简化）
  - [x] 2.10 简化入场动画效果

---

- [x] **Task 3: 简化 HeroBackground 组件**
  - [x] 3.1 查看当前 HeroBackground 实现
  - [x] 3.2 移除 ParticleNetwork 组件引用（如存在）
  - [x] 3.3 移除 DataFlowLines 组件引用（如存在）
  - [x] 3.4 保留简洁的静态渐变背景
  - [x] 3.5 确保背景不影响文字可读性

---

- [x] **Task 4: 验证和测试**
  - [x] 4.1 运行 TypeScript 类型检查
  - [x] 4.2 验证页面能正常编译
  - [x] 4.3 检查首页显示效果
  - [x] 4.4 验证搜索功能正常工作
  - [x] 4.5 验证响应式布局正常

---

# Task Dependencies
- Task 2 可以并行于 Task 1
- Task 3 依赖于 Task 1 和 Task 2
- Task 4 依赖于所有功能任务完成
