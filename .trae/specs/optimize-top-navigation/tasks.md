# Tasks

- [ ] Task 1: 重构导航数据结构
  - [ ] SubTask 1.1: 设计新的导航配置结构（支持分组、图标、子菜单）
  - [ ] SubTask 1.2: 更新 i18n 翻译文件，添加分组标题

- [ ] Task 2: 实现分层导航组件
  - [ ] SubTask 2.1: 创建 DropdownMenu 子组件
  - [ ] SubTask 2.2: 创建 MegaMenu 子组件（用于预言机详情分组）
  - [ ] SubTask 2.3: 重构 Navbar 主组件，集成新的导航结构

- [ ] Task 3: 添加图标系统
  - [ ] SubTask 3.1: 为每个导航项选择合适的 Lucide 图标
  - [ ] SubTask 3.2: 实现图标与导航配置的关联

- [ ] Task 4: 实现交互增强
  - [ ] SubTask 4.1: 添加悬停延迟逻辑（150ms）
  - [ ] SubTask 4.2: 实现键盘导航支持
  - [ ] SubTask 4.3: 添加当前页面高亮指示器

- [ ] Task 5: 移动端适配
  - [ ] SubTask 5.1: 创建 MobileDrawer 组件
  - [ ] SubTask 5.2: 实现分组折叠/展开功能
  - [ ] SubTask 5.3: 添加滑动手势支持

- [ ] Task 6: 视觉优化
  - [ ] SubTask 6.1: 添加分组标题样式
  - [ ] SubTask 6.2: 优化下拉菜单阴影和动画
  - [ ] SubTask 6.3: 添加分隔线和间距

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 2
- Task 5 depends on Task 2
- Task 6 depends on Task 2
