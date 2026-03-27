# Tasks

- [x] Task 1: 图片组件优化 - 将 Oracle Hero 区域的原生 `<img>` 标签替换为优化组件
  - [x] SubTask 1.1: 检查所有 Oracle Hero 组件中的图片使用情况
  - [x] SubTask 1.2: 将 ChainlinkHero、PythHero、API3Hero 等组件中的 `<img>` 替换为 OptimizedImage
  - [x] SubTask 1.3: 为首屏图片添加 priority 属性，非首屏图片使用 lazy loading

- [x] Task 2: 图表组件懒加载优化
  - [x] SubTask 2.1: 审查 LazyCharts.tsx 的实现，确保 Recharts 组件正确懒加载
  - [x] SubTask 2.2: 识别非首屏图表组件，应用懒加载策略
  - [x] SubTask 2.3: 为懒加载图表添加合理的加载占位符

- [x] Task 3: ParticleNetwork 性能降级
  - [x] SubTask 3.1: 添加 `prefers-reduced-motion` 媒体查询检测
  - [x] SubTask 3.2: 实现低端设备检测逻辑（基于内存或 FPS）
  - [x] SubTask 3.3: 实现降级策略：减少粒子数量或完全禁用
  - [x] SubTask 3.4: 添加降级事件日志记录

- [x] Task 4: 性能配置验证
  - [x] SubTask 4.1: 运行 Bundle 分析，验证 optimizePackageImports 生效
  - [x] SubTask 4.2: 检查是否有重复依赖
  - [x] SubTask 4.3: 验证性能预算配置是否合理

- [x] Task 5: 性能测试验证
  - [x] SubTask 5.1: 运行 `npm run perf:quick` 验证优化效果
  - [x] SubTask 5.2: 对比优化前后的 Web Vitals 指标
  - [x] SubTask 5.3: 在低端设备模拟模式下测试降级效果

# Task Dependencies

- Task 5 依赖 Task 1-4 完成
- Task 1 和 Task 2 可以并行执行
- Task 3 和 Task 4 可以并行执行
