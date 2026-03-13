# Tasks

## 布局与响应式修复

- [x] Task 1: 修复首页 ProfessionalHero 移动端显示问题
  - [x] SubTask 1.1: 调整搜索框在移动端的内边距 (py-5 → py-3)
  - [x] SubTask 1.2: 优化标题字体大小响应式 (text-4xl → text-3xl on mobile)
  - [x] SubTask 1.3: 修复搜索按钮在窄屏幕上的显示

- [x] Task 2: 修复 BentoMetricsGrid 响应式布局
  - [x] SubTask 2.1: 调整小屏幕上的卡片内边距
  - [x] SubTask 2.2: 优化图表在移动端的高度
  - [x] SubTask 2.3: 修复卡片内容溢出问题

- [x] Task 3: 修复导航栏移动端适配
  - [x] SubTask 3.1: 优化 Logo 和菜单按钮间距
  - [x] SubTask 3.2: 修复移动端抽屉菜单全屏显示
  - [x] SubTask 3.3: 调整用户菜单在小屏幕上的适配

- [x] Task 4: 修复图表页面移动端布局
  - [x] SubTask 4.1: 图表容器高度动态调整 (400px → 300px on mobile)
  - [x] SubTask 4.2: 图例文字溢出处理 (添加 ellipsis)
  - [x] SubTask 4.3: 数据表格添加水平滚动支持

- [x] Task 5: 修复跨链分析页面统计栏
  - [x] SubTask 5.1: 统计卡片在小屏幕上换行显示
  - [x] SubTask 5.2: 优化数值显示，防止溢出
  - [x] SubTask 5.3: 调整图表控制栏的响应式布局

## 视觉一致性优化

- [x] Task 6: 统一颜色系统
  - [x] SubTask 6.1: 检查所有页面使用 `--finance-primary` 作为主色
  - [x] SubTask 6.2: 统一成功/警告/错误状态色
  - [x] SubTask 6.3: 标准化渐变背景

- [x] Task 7: 统一字体和排版
  - [x] SubTask 7.1: 定义标题层级样式 (h1-h6)
  - [x] SubTask 7.2: 统一正文行高为 1.6
  - [x] SubTask 7.3: 数字添加 tabular-nums 样式

- [x] Task 8: 统一间距系统
  - [x] SubTask 8.1: 页面容器统一使用 max-w-7xl
  - [x] SubTask 8.2: 卡片内边距统一为 p-6
  - [x] SubTask 8.3: 组件间距使用统一刻度

## 交互体验改进

- [x] Task 9: 优化按钮交互状态
  - [x] SubTask 9.1: 添加统一的 hover 效果
  - [x] SubTask 9.2: 优化 active 状态反馈
  - [x] SubTask 9.3: 统一 disabled 状态样式

- [x] Task 10: 优化表单交互
  - [x] SubTask 10.1: 增强 focus 状态可见性
  - [x] SubTask 10.2: 添加表单验证反馈样式
  - [x] SubTask 10.3: 统一 loading 指示器

- [x] Task 11: 优化图表交互
  - [x] SubTask 11.1: 增强 Tooltip 对比度和阴影
  - [x] SubTask 11.2: 确保图表线条最小 2px 粗细
  - [x] SubTask 11.3: 优化数据点 hover 效果

- [x] Task 12: 优化表格交互
  - [x] SubTask 12.1: 表头添加 sticky 定位
  - [x] SubTask 12.2: 优化行 hover 效果
  - [x] SubTask 12.3: 增强排序指示器可见性

## 可访问性提升

- [x] Task 13: 键盘导航支持
  - [x] SubTask 13.1: 添加可见的 focus 轮廓
  - [x] SubTask 13.2: 优化 Tab 顺序
  - [x] SubTask 13.3: 添加快捷键支持

- [x] Task 14: 屏幕阅读器支持
  - [x] SubTask 14.1: 为图片添加描述性 alt 文本
  - [x] SubTask 14.2: 为图表添加 ARIA 标签
  - [x] SubTask 14.3: 动态内容添加 aria-live 通知

- [x] Task 15: 对比度和颜色优化
  - [x] SubTask 15.1: 检查并修复对比度不足的文字
  - [x] SubTask 15.2: 添加图标辅助颜色信息
  - [x] SubTask 15.3: 完善色盲友好模式

## 性能优化

- [x] Task 16: 图表渲染优化
  - [x] SubTask 16.1: 确保 LTTB 下采样算法正确应用
  - [x] SubTask 16.2: 优化 Recharts 组件重渲染
  - [x] SubTask 16.3: 动画使用 transform 和 opacity

- [x] Task 17: 资源加载优化
  - [x] SubTask 17.1: 图片添加懒加载
  - [x] SubTask 17.2: 字体使用 font-display: swap
  - [x] SubTask 17.3: 非关键资源延迟加载

# Task Dependencies
- Task 6 (颜色系统) 应在 Task 1-5 之前完成
- Task 8 (间距系统) 应在 Task 1-5 之前完成
- Task 9-12 (交互优化) 依赖于 Task 6-8
- Task 13-15 (可访问性) 应在主要功能完成后进行
