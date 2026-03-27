# Tasks

- [x] Task 1: 启用低密度粒子效果
  - [x] SubTask 1.1: 修改 ProfessionalHero.tsx，启用粒子效果
  - [x] SubTask 1.2: 调整粒子参数为低密度（particleCount: 25, connectionDistance: 120）

- [x] Task 2: 优化静态渐变层次
  - [x] SubTask 2.1: 在 HeroBackground.tsx 中添加淡青色辅助光晕
  - [x] SubTask 2.2: 微调现有光晕的透明度和位置，确保层次丰富但不抢眼

- [x] Task 3: 验证视觉效果
  - [x] SubTask 3.1: 确保背景不干扰前景内容阅读
  - [x] SubTask 3.2: 验证 prefers-reduced-motion 设置正常工作

# Task Dependencies

- Task 2 可以并行于 Task 1
- Task 3 依赖于 Task 1 和 Task 2
