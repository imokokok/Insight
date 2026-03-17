# 统一切换选择器组件规范

## Why

项目中存在多种切换选择器的实现方式，样式不统一，维护成本高：
- `ProtocolList.tsx` 使用原生 `<select>` 元素
- `Selectors.tsx` 使用自定义按钮组
- `PairSelector.tsx` 使用自定义下拉选择器
- `LanguageSwitcher.tsx` 使用另一种下拉选择器

这导致：
1. 视觉风格不一致（圆角、颜色、间距各异）
2. 交互体验不一致（有的支持搜索、有的不支持）
3. 代码重复，维护困难
4. 新功能开发时需要重复造轮子

## What Changes

- 创建统一的切换选择器组件系统
- 提供两种主要类型：`SegmentedControl`（分段控制）和 `DropdownSelect`（下拉选择）
- 统一视觉风格，符合项目现有的设计语言
- 支持国际化

## Impact

- Affected specs: UI组件系统
- Affected code: 
  - `src/components/ui/` - 新增组件
  - `src/app/[locale]/price-query/components/Selectors.tsx` - 可重构使用新组件
  - `src/app/[locale]/cross-oracle/components/PairSelector.tsx` - 可重构使用新组件
  - `src/app/[locale]/market-overview/components/ProtocolList.tsx` - 可重构使用新组件

## ADDED Requirements

### Requirement: SegmentedControl 组件

系统应提供 `SegmentedControl` 组件，用于少量选项的快速切换（如时间范围、交易对选择）。

#### Scenario: 基础分段控制
- **WHEN** 用户需要从少量选项中选择一个
- **THEN** 显示为水平排列的按钮组，选中项高亮显示

#### Scenario: 多选模式
- **WHEN** 用户需要选择多个选项
- **THEN** 支持多选，已选项显示选中状态

### Requirement: DropdownSelect 组件

系统应提供 `DropdownSelect` 组件，用于大量选项的选择（如交易对选择器、预言机选择）。

#### Scenario: 带搜索的下拉选择
- **WHEN** 选项较多时
- **THEN** 提供搜索功能，支持键盘导航

#### Scenario: 带分类的下拉选择
- **WHEN** 选项需要分类展示
- **THEN** 支持分类标签切换

### Requirement: 统一视觉风格

所有切换选择器组件应遵循项目现有的设计规范：

#### Scenario: 颜色规范
- **WHEN** 选项被选中
- **THEN** 使用 `bg-gray-900 text-white` 样式

#### Scenario: 未选中状态
- **WHEN** 选项未被选中
- **THEN** 使用 `bg-white text-gray-700 border border-gray-200` 样式

#### Scenario: 圆角规范
- **WHEN** 渲染组件
- **THEN** 按钮使用 `rounded-md`，容器使用 `rounded-lg`

### Requirement: 国际化支持

所有组件应支持国际化文本。

#### Scenario: 多语言显示
- **WHEN** 用户切换语言
- **THEN** 组件内的文本自动切换为对应语言

## 设计建议

### 是否需要统一？

**建议：是的，值得做统一**

理由：
1. **一致性** - 统一的视觉风格提升用户体验
2. **可维护性** - 集中管理样式，修改一处全局生效
3. **开发效率** - 新功能开发时直接复用组件
4. **扩展性** - 统一的 API 设计便于后续扩展

### 组件设计建议

```
src/components/ui/selectors/
├── index.ts              # 导出
├── SegmentedControl.tsx  # 分段控制器（按钮组）
├── DropdownSelect.tsx    # 下拉选择器
├── MultiSelect.tsx       # 多选组件
└── types.ts              # 类型定义
```

### 样式规范

基于项目现有风格：

| 属性 | 值 |
|------|-----|
| 选中背景 | `bg-gray-900` |
| 选中文字 | `text-white` |
| 未选中背景 | `bg-white` |
| 未选中文字 | `text-gray-700` |
| 未选中边框 | `border border-gray-200` |
| 悬停背景 | `hover:bg-gray-100` |
| 按钮圆角 | `rounded-md` |
| 容器圆角 | `rounded-lg` |
| 内边距 | `px-3 py-1.5` |
| 字体大小 | `text-xs` |
| 过渡动画 | `transition-all duration-200` |
