# 统一项目圆角设计规范

## Why
Insight 区块链预言机数据分析平台目前存在圆角使用不统一的问题：
- 部分组件使用圆角，部分组件无圆角
- 不同组件使用不同的圆角值，缺乏一致性
- 项目规范已更新为"专业微小圆角"设计，但大量现有代码仍使用无圆角样式

需要统一整个项目的圆角设计，确保视觉一致性和专业感。

## What Changes
- **制定统一的圆角标准**：确定专业的圆角值规范
- **更新项目规范文档**：同步更新 `.trae/rules/project_rules.md` 中的样式规范
- **更新全局 CSS 变量**：确保圆角变量值符合标准
- **批量更新组件**：统一所有 UI 组件的圆角使用
- **更新页面布局**：确保页面级别的容器和卡片使用正确的圆角
- **添加圆角工具类**：在需要的地方添加适当的圆角类

## Impact
- 受影响文件：
  - `.trae/rules/project_rules.md` - 项目规范文档
  - `src/app/globals.css` - CSS 变量和全局样式
  - `src/components/ui/*.tsx` - 基础 UI 组件
  - `src/components/**/*.tsx` - 业务组件
  - `src/app/**/*.tsx` - 页面组件

## ADDED Requirements

### Requirement: 统一圆角设计标准
系统 SHALL 使用以下统一的圆角设计标准：

#### 圆角值规范
| 变量名 | 值 | Tailwind 类 | 用途 |
|--------|-----|-------------|------|
| `--radius-none` | 0 | `rounded-none` | 数据表格、分割线、纯数据展示 |
| `--radius-sm` | 0.125rem (2px) | `rounded-sm` | 极小元素、细边框 |
| `--radius-md` | 0.375rem (6px) | `rounded-md` | 按钮、输入框、小卡片 |
| `--radius-lg` | 0.5rem (8px) | `rounded-lg` | 卡片、面板、容器 |
| `--radius-xl` | 0.75rem (12px) | `rounded-xl` | 大卡片、模态框、弹窗 |
| `--radius-2xl` | 1rem (16px) | `rounded-2xl` | 特殊容器、Hero 区域 |
| `--radius-full` | 9999px | `rounded-full` | 圆形元素（头像、徽章、状态点） |

#### 组件圆角应用矩阵
| 组件类型 | 圆角类 | 说明 |
|----------|--------|------|
| 按钮 (Button) | `rounded-md` (6px) | 所有按钮统一 |
| 卡片 (Card) | `rounded-lg` (8px) | 所有卡片、面板 |
| 输入框 (Input) | `rounded-md` (6px) | 输入框、选择器 |
| 文本域 (Textarea) | `rounded-md` (6px) | 多行文本输入 |
| 选择器 (Select) | `rounded-md` (6px) | 下拉选择器 |
| 表格容器 | `rounded-lg` (8px) | 表格外部容器 |
| 表格内部 | `rounded-none` | 表格单元格无圆角 |
| 徽章 (Badge) | `rounded-full` | 标签徽章 |
| 标签 (Tag) | `rounded-full` | 可移除标签 |
| 头像 (Avatar) | `rounded-full` | 用户头像 |
| 模态框 (Modal) | `rounded-xl` (12px) | 弹窗、对话框 |
| 工具提示 (Tooltip) | `rounded-md` (6px) | 悬浮提示 |
| 骨架屏 (Skeleton) | `rounded-md` (6px) | 加载占位 |
| 复选框 (Checkbox) | `rounded` (4px) | 小圆角 |
| 单选框 (Radio) | `rounded-full` | 圆形 |
| 开关 (Switch) | `rounded-full` | 圆形滑块 |
| 分隔线 (Divider) | `rounded-none` | 无圆角 |
| 导航栏 | `rounded-none` | 无圆角 |
| 侧边栏 | `rounded-none` 或 `rounded-lg` | 根据设计 |
| 图表容器 | `rounded-lg` (8px) | 图表卡片 |

#### 设计原则
1. **一致性**：同类组件使用相同的圆角值
2. **层级感**：容器 > 内容，外层圆角略大于内层
3. **克制性**：最大圆角不超过 12px（圆形元素除外）
4. **功能性**：数据密集区域使用较小圆角或无圆角
5. **现代感**：保持专业感的同时体现现代设计

## MODIFIED Requirements

### Requirement: 现有组件圆角更新
所有现有组件 SHALL 按照上述标准更新圆角：

#### 必须更新的组件
- 所有卡片类组件 → `rounded-lg`
- 所有按钮类组件 → `rounded-md`
- 所有输入类组件 → `rounded-md`
- 所有徽章类组件 → `rounded-full`
- 所有模态框类组件 → `rounded-xl`
- 所有骨架屏类组件 → `rounded-md`

#### 更新策略
1. 首先更新项目规范文档 (`.trae/rules/project_rules.md`)
2. 然后更新全局样式 (`src/app/globals.css`)
3. 优先更新基础 UI 组件 (`src/components/ui/`)
4. 然后更新业务组件 (`src/components/oracle/`, `src/components/charts/` 等)
5. 最后更新页面组件 (`src/app/`)
