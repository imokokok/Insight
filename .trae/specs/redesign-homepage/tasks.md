# Tasks

- [x] Task 1: 重构 Hero 区域为扁平化设计
  - [x] SubTask 1.1: 简化背景为纯色深色（如 bg-gray-900）
  - [x] SubTask 1.2: 去除渐变文字效果，使用纯白色标题
  - [x] SubTask 1.3: 简化粒子效果为微妙的数据网格背景
  - [x] SubTask 1.4: 去除动画计数，使用静态数字展示核心指标
  - [x] SubTask 1.5: 简化 CTA 按钮为扁平样式

- [x] Task 2: 重构实时价格数据区为无边框列表
  - [x] SubTask 2.1: 将卡片布局改为表格/列表布局
  - [x] SubTask 2.2: 去除卡片边框和阴影
  - [x] SubTask 2.3: 使用分隔线（border-b）区分各行
  - [x] SubTask 2.4: 悬停效果改为微妙背景色变化（hover:bg-gray-50）
  - [x] SubTask 2.5: 简化价格趋势图为极简线条

- [x] Task 3: 重构功能导航为极简风格
  - [x] SubTask 3.1: 去除卡片背景色、边框、阴影
  - [x] SubTask 3.2: 改为图标+文字的简洁链接形式
  - [x] SubTask 3.3: 悬停效果改为文字颜色变化或下划线
  - [x] SubTask 3.4: 使用网格布局排列导航项

- [x] Task 4: 重构预言机协议展示为网格布局
  - [x] SubTask 4.1: 去除品牌卡片的渐变背景和边框
  - [x] SubTask 4.2: 改为简洁的网格项，仅显示 Logo 和名称
  - [x] SubTask 4.3: 悬停时显示微妙背景色（如 bg-gray-50）
  - [x] SubTask 4.4: 添加简洁的箭头指示

- [x] Task 5: 重构平台数据统计为仪表盘风格
  - [x] SubTask 5.1: 去除深色背景和装饰性元素
  - [x] SubTask 5.2: 改为大号数字+简洁标签的形式
  - [x] SubTask 5.3: 使用留白分隔各统计项
  - [x] SubTask 5.4: 去除动画计数效果

- [x] Task 6: 重构数据洞察区域
  - [x] SubTask 6.1: 去除卡片样式，改为简洁的指标展示
  - [x] SubTask 6.2: 简化进度条和状态指示器
  - [x] SubTask 6.3: 使用扁平化图标

- [x] Task 7: 更新全局样式
  - [x] SubTask 7.1: 在 globals.css 中添加扁平化设计相关的工具类
  - [x] SubTask 7.2: 更新 Card 组件支持扁平化变体
  - [x] SubTask 7.3: 确保整体风格统一

- [x] Task 8: 整合和验证
  - [x] SubTask 8.1: 在 page.tsx 中整合所有扁平化组件
  - [x] SubTask 8.2: 验证响应式布局
  - [x] SubTask 8.3: 运行 lint 和类型检查
  - [x] SubTask 8.4: 验证视觉效果符合扁平化设计规范

# Task Dependencies
- Task 2 依赖于 Task 1
- Task 3 依赖于 Task 1
- Task 4 依赖于 Task 1
- Task 5 依赖于 Task 1
- Task 6 依赖于 Task 1
- Task 8 依赖于 Task 2, 3, 4, 5, 6, 7
