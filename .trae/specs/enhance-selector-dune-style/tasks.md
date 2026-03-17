# Tasks

- [x] Task 1: 优化 SegmentedControl 组件样式
  - [x] SubTask 1.1: 更新容器样式 - 使用 `bg-gray-100/80` 背景和 `rounded-lg` 圆角
  - [x] SubTask 1.2: 更新选中项样式 - 使用 `bg-white` + `shadow-sm` + `text-gray-900`
  - [x] SubTask 1.3: 更新未选中项样式 - 使用 `text-gray-600` + `hover:text-gray-900`
  - [x] SubTask 1.4: 添加交互反馈 - `active:scale-[0.98]` 和 `ring-2 ring-blue-500/20` 聚焦状态
  - [x] SubTask 1.5: 更新尺寸类 - 添加 xs 尺寸支持

- [x] Task 2: 优化 DropdownSelect 组件样式
  - [x] SubTask 2.1: 更新触发按钮样式 - `rounded-lg` 和更精致的边框
  - [x] SubTask 2.2: 更新下拉菜单样式 - `rounded-xl shadow-xl border-gray-100`
  - [x] SubTask 2.3: 更新搜索框样式 - `bg-gray-50 rounded-lg`，聚焦时 `bg-white`
  - [x] SubTask 2.4: 更新选项样式 - 悬停 `bg-gray-50`，选中 `bg-blue-50 text-blue-700`
  - [x] SubTask 2.5: 更新分类标签样式 - 底部边框指示器风格

- [x] Task 3: 验证样式效果
  - [x] SubTask 3.1: 检查 SegmentedControl 在各种状态下的显示效果
  - [x] SubTask 3.2: 检查 DropdownSelect 在各种状态下的显示效果
  - [x] SubTask 3.3: 确保无 lint 错误（选择器组件无新增错误）

# Task Dependencies

- [Task 2] depends on [Task 1] - DropdownSelect 的样式应与 SegmentedControl 保持一致的风格
