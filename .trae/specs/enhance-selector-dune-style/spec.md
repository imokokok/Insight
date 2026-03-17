# 切换框样式优化 - Dune 风格

## Why

现有的切换框组件（SegmentedControl、DropdownSelect、MultiSelect）功能完善，但视觉风格较为基础，缺乏现代感和品牌特色。用户希望优化样式，使其更符合 Dune Analytics 的风格：

- 更加现代化的视觉设计
- 更精致的圆角和阴影
- 更具品牌感的选中状态
- 更好的视觉层次和交互反馈

## What Changes

- **优化 SegmentedControl 组件样式**：改进圆角、阴影、选中状态样式
- **优化 DropdownSelect 组件样式**：改进下拉菜单、搜索框、选项样式
- **优化 MultiSelect 组件样式**：继承 SegmentedControl 的优化
- **统一整体视觉风格**：更加现代、精致、具有 Dune 风格特点

## Impact

- Affected specs: UI组件系统
- Affected code:
  - `src/components/ui/selectors/SegmentedControl.tsx` - 样式优化
  - `src/components/ui/selectors/DropdownSelect.tsx` - 样式优化
  - `src/components/ui/selectors/MultiSelect.tsx` - 样式优化（基于 SegmentedControl）

## ADDED Requirements

### Requirement: Dune 风格视觉设计

所有切换选择器组件应采用类似 Dune Analytics 的现代视觉风格。

#### Scenario: SegmentedControl 样式
- **WHEN** 渲染分段控制器
- **THEN** 使用以下样式规范：
  - 容器：`bg-gray-100/80` 背景，更柔和的圆角 `rounded-lg`
  - 选中项：`bg-white` 白色背景，`shadow-sm` 阴影，`text-gray-900` 文字
  - 未选中项：`text-gray-600` 文字，`hover:text-gray-900` 悬停效果
  - 按钮圆角：`rounded-md`
  - 过渡动画：`transition-all duration-200 ease-out`
  - 内边距：`px-3 py-1.5` (sm), `px-4 py-2` (md)
  - 字体：`text-xs font-medium`

#### Scenario: DropdownSelect 样式
- **WHEN** 渲染下拉选择器
- **THEN** 使用以下样式规范：
  - 触发按钮：`bg-white border border-gray-200 rounded-lg`，悬停时 `border-gray-300`
  - 下拉菜单：`bg-white rounded-xl shadow-xl border border-gray-100`
  - 搜索框：`bg-gray-50 border-gray-200 rounded-lg`，聚焦时 `bg-white`
  - 选项：悬停时 `bg-gray-50`，选中时 `bg-blue-50 text-blue-700`
  - 分类标签：底部边框指示器，选中时 `text-blue-600 border-blue-600`
  - 圆角更加柔和：`rounded-xl` 用于菜单

#### Scenario: 交互反馈
- **WHEN** 用户与组件交互
- **THEN** 提供流畅的视觉反馈：
  - 点击时轻微缩放效果 `active:scale-[0.98]`
  - 平滑的过渡动画 `duration-200`
  - 聚焦状态使用 `ring-2 ring-blue-500/20`

### Requirement: 响应式尺寸支持

组件应支持多种尺寸以适应不同场景。

#### Scenario: 尺寸变体
- **WHEN** 需要不同大小的切换器
- **THEN** 提供 xs、sm、md、lg 四种尺寸
  - xs: `px-2 py-1 text-[10px]` - 用于紧凑场景
  - sm: `px-2.5 py-1 text-[11px]` - 默认小尺寸
  - md: `px-3 py-1.5 text-xs` - 标准尺寸
  - lg: `px-4 py-2 text-sm` - 大尺寸

## 设计参考

### Dune 风格特点

1. **背景层次**：使用微妙的灰色背景区分层次
2. **选中状态**：白色背景 + 轻微阴影，而非深色填充
3. **圆角**：更加柔和，使用 `rounded-lg` 和 `rounded-xl`
4. **阴影**：精致的 `shadow-sm` 和 `shadow-xl`
5. **颜色**：更加克制的配色，强调灰度层次

### 样式对比

| 属性 | 当前样式 | Dune 风格 |
|------|----------|-----------|
| 容器背景 | `bg-white` | `bg-gray-100/80` |
| 选中背景 | `bg-gray-900` | `bg-white` |
| 选中文字 | `text-white` | `text-gray-900` |
| 阴影 | `shadow-sm` | `shadow-sm` + 更精致 |
| 圆角 | `rounded-md` | `rounded-lg` |
| 边框 | `border-gray-200` | 更微妙的边框或无边框 |
