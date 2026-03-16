# Tasks

- [x] Task 1: 更新 Tellor 类型定义
  - [x] 在 `/src/lib/oracles/tellor.ts` 添加 Reporter 相关类型
  - [x] 添加 Risk 相关类型定义
  - [x] 更新 TellorData 接口

- [x] Task 2: 扩展 Tellor 客户端
  - [x] 在 `/src/lib/oracles/tellor.ts` 添加获取 Reporter 数据的方法
  - [x] 添加获取 Risk 数据的方法
  - [x] 添加模拟数据生成逻辑

- [x] Task 3: 更新 useTellorData Hook
  - [x] 添加 reporters 数据获取逻辑
  - [x] 添加 risk 数据获取逻辑
  - [x] 更新返回数据结构

- [x] Task 4: 创建 TellorReportersPanel 组件
  - [x] 创建 `/src/components/oracle/panels/TellorReportersPanel.tsx`
  - [x] 实现 Reporter 统计卡片（活跃数量、总质押量等）
  - [x] 实现质押分布图表
  - [x] 实现 Reporter 活动列表

- [x] Task 5: 创建 TellorRiskPanel 组件
  - [x] 创建 `/src/components/oracle/panels/TellorRiskPanel.tsx`
  - [x] 实现数据质量指标展示
  - [x] 实现价格偏差监控
  - [x] 实现质押风险分析

- [x] Task 6: 更新 oracles.tsx 配置
  - [x] 修改 Tellor 的 tabs 配置，添加 reporters 和 risk
  - [x] 调整 Tab 顺序

- [x] Task 7: 更新 tellor/page.tsx
  - [x] 导入新组件
  - [x] 添加 reporters 和 risk Tab 的渲染逻辑
  - [x] 更新 activeTab 条件渲染

- [x] Task 8: 添加 i18n 翻译键
  - [x] 添加 tellor.tabs.reporters 翻译
  - [x] 添加 tellor.tabs.risk 翻译
  - [x] 添加面板内所有标签的翻译键

# Task Dependencies

- Task 1 (类型定义) 必须在 Task 2、3 之前
- Task 2 (客户端扩展) 必须在 Task 3 之前
- Task 3 (Hook 更新) 必须在 Task 7 之前
- Task 4、5 (组件创建) 必须在 Task 7 之前
- Task 6 (配置更新) 必须在 Task 7 之前
- Task 7 (页面更新) 依赖于 Task 3、4、5、6
- Task 8 (i18n) 可以与其他任务并行
