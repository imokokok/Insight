# 首页 Hero 重构任务列表

## 任务依赖关系
```
Task 1 (ParticleNetwork) ──┐
                           ├──→ Task 4 (HeroBackground整合)
Task 2 (DataFlowLines) ────┤                           │
                           │                           ├──→ Task 5 (ProfessionalHero重构)
Task 3 (LiveMetricsPanel) ─┘                           │
                                                       ├──→ Task 6 (信任指标横幅)
Task 7 (搜索框增强) ────────────────────────────────────┘
```

---

- [x] **Task 1: 创建 ParticleNetwork 粒子网络背景组件**
  - [x] 1.1 创建 `ParticleNetwork.tsx` 组件文件
  - [x] 1.2 实现粒子类：位置、速度、半径、透明度属性
  - [x] 1.3 实现粒子连线逻辑：距离检测、连线透明度计算
  - [x] 1.4 实现动画循环：requestAnimationFrame 驱动
  - [x] 1.5 性能优化：限制粒子数量 60 个，使用 Canvas API
  - [x] 1.6 响应式处理：窗口大小变化时重新初始化
  - [x] 1.7 添加组件 props：particleCount, connectionDistance, themeColor

---

- [x] **Task 2: 创建 DataFlowLines 数据流动画组件**
  - [x] 2.1 创建 `DataFlowLines.tsx` 组件文件
  - [x] 2.2 定义数据流线条数据结构：y位置、速度、长度、透明度
  - [x] 2.3 实现线条流动动画：CSS animation 或 Canvas
  - [x] 2.4 添加多条线条，设置不同速度和延迟
  - [x] 2.5 使用主题色（蓝紫色渐变）
  - [x] 2.6 添加模糊效果增强视觉层次

---

- [x] **Task 3: 创建 LiveMetricsPanel 实时指标面板组件**
  - [x] 3.1 创建 `LiveMetricsPanel.tsx` 组件文件
  - [x] 3.2 定义指标数据类型：label, value, change, trend, icon
  - [x] 3.3 实现 6 个核心指标：TVS、预言机数、交易对、API调用、准确率、响应时间
  - [x] 3.4 集成迷你走势图（使用 recharts AreaChart）
  - [x] 3.5 实现数据自动刷新：每 5 秒更新一次
  - [x] 3.6 添加变化趋势指示器（上涨/下跌）
  - [x] 3.7 样式优化：无卡片背景，使用分隔线和图标

---

- [x] **Task 4: 重构 HeroBackground 组件**
  - [x] 4.1 保留现有渐变背景作为底层
  - [x] 4.2 集成 ParticleNetwork 组件（中层）
  - [x] 4.3 集成 DataFlowLines 组件（上层）
  - [x] 4.4 调整各层透明度，确保文字可读性
  - [x] 4.5 添加性能优化：低性能设备禁用粒子动画
  - [x] 4.6 测试背景在不同屏幕尺寸下的表现

---

- [x] **Task 5: 重构 ProfessionalHero 组件 - 布局重构**
  - [x] 5.1 修改布局为左右分栏：左侧 60%，右侧 40%
  - [x] 5.2 左侧内容：标题、描述、搜索框、CTA按钮
  - [x] 5.3 右侧内容：集成 LiveMetricsPanel
  - [x] 5.4 移除原有的卡片式指标展示代码
  - [x] 5.5 保留搜索框完整功能（搜索、历史、热门标签）
  - [x] 5.6 确保响应式：移动端改为上下布局
  - [x] 5.7 调整间距和字体大小，提升可读性

---

- [x] **Task 6: 创建 TrustMetricsBanner 信任指标横幅**
  - [x] 6.1 创建 `TrustMetricsBanner.tsx` 组件文件
  - [x] 6.2 定义 4 个信任指标：支持链数、合作伙伴、API调用/天、正常运行时间
  - [x] 6.3 实现横向排列布局，无卡片背景
  - [x] 6.4 添加分隔线区分各指标
  - [x] 6.5 样式：数字大字体，标签小字体灰色
  - [x] 6.6 添加悬停效果：轻微上浮 + 颜色变化
  - [x] 6.7 集成到 ProfessionalHero 底部

---

- [x] **Task 7: 搜索框体验增强**
  - [x] 7.1 添加 focus 状态发光效果（box-shadow）
  - [x] 7.2 优化热门搜索标签为横向滚动展示
  - [x] 7.3 调整下拉框样式：圆角、阴影、动画
  - [x] 7.4 确保搜索历史功能正常
  - [x] 7.5 测试键盘导航（上下箭头、Enter、ESC）

---

- [x] **Task 8: 性能优化和测试**
  - [x] 8.1 添加 `prefers-reduced-motion` 媒体查询支持
  - [x] 8.2 优化 Canvas 动画性能
  - [x] 8.3 测试移动端性能，必要时简化动画
  - [x] 8.4 验证所有交互功能正常
  - [x] 8.5 检查内存泄漏（组件卸载时清理动画）

---

- [x] **Task 9: 类型定义和导出**
  - [x] 9.1 为新组件添加 TypeScript 类型定义
  - [x] 9.2 更新 `home-components/index.ts` 导出
  - [x] 9.3 确保类型安全，无 TypeScript 错误

# Task Dependencies
- Task 4 依赖于 Task 1 和 Task 2
- Task 5 依赖于 Task 3 和 Task 4
- Task 6 依赖于 Task 5
- Task 7 可以并行于 Task 5-6
- Task 8 依赖于所有功能任务完成
- Task 9 依赖于所有功能任务完成
