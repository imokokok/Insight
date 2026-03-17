# Tasks

- [x] Task 1: 创建 SegmentedControl 组件
  - [x] SubTask 1.1: 定义组件 Props 类型（支持单选/多选模式）
  - [x] SubTask 1.2: 实现基础分段控制 UI
  - [x] SubTask 1.3: 实现选中状态切换逻辑
  - [x] SubTask 1.4: 添加国际化支持
  - [x] SubTask 1.5: 编写组件文档注释

- [x] Task 2: 创建 DropdownSelect 组件
  - [x] SubTask 2.1: 定义组件 Props 类型
  - [x] SubTask 2.2: 实现下拉菜单基础 UI
  - [x] SubTask 2.3: 实现搜索功能
  - [x] SubTask 2.4: 实现键盘导航（↑↓ Enter Escape）
  - [x] SubTask 2.5: 实现点击外部关闭
  - [x] SubTask 2.6: 添加分类标签支持
  - [x] SubTask 2.7: 添加国际化支持

- [x] Task 3: 创建 MultiSelect 组件
  - [x] SubTask 3.1: 定义组件 Props 类型
  - [x] SubTask 3.2: 实现多选 UI（基于 SegmentedControl 扩展）
  - [x] SubTask 3.3: 实现全选/取消全选功能
  - [x] SubTask 3.4: 添加国际化支持

- [x] Task 4: 创建统一类型定义和导出
  - [x] SubTask 4.1: 创建 types.ts 定义公共类型
  - [x] SubTask 4.2: 创建 index.ts 统一导出
  - [x] SubTask 4.3: 更新 src/components/ui/index.ts 导出新组件

- [x] Task 5: 重构现有组件使用新选择器（可选）
  - [x] SubTask 5.1: 重构 Selectors.tsx 使用 SegmentedControl
  - [x] SubTask 5.2: 重构 ProtocolList.tsx 使用 DropdownSelect

# Task Dependencies

- [Task 4] depends on [Task 1, Task 2, Task 3]
- [Task 5] depends on [Task 4]
