# 更新项目设计风格为专业微小圆角

## Why
将 Insight 区块链预言机数据分析平台的设计风格从"完全无圆角"更新为"专业微小圆角"设计。这种设计更符合现代数据平台的最佳实践，在保持专业性的同时提升视觉舒适度和用户体验。

## What Changes
- **更新项目规范文档**：修改 `.trae/rules/project_rules.md` 中的设计规范描述
- **更新全局样式**：修改 `src/app/globals.css` 中的圆角变量和组件样式
- **更新 UI 组件**：修改所有基础 UI 组件使用新的圆角标准
- **更新 CSS 变量**：确保圆角变量值符合专业微小圆角标准

## Impact
- 受影响文件：
  - `.trae/rules/project_rules.md` - 项目规范文档
  - `src/app/globals.css` - 全局样式和 CSS 变量
  - `src/components/ui/*.tsx` - 基础 UI 组件

## ADDED Requirements

### Requirement: 专业微小圆角设计规范
系统 SHALL 使用专业的微小圆角设计系统，具体规范如下：

#### 圆角值标准
| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--radius-none` | 0 | 数据表格、分割线 |
| `--radius-sm` | 0.25rem (4px) | 小按钮、标签、状态指示器 |
| `--radius-md` | 0.375rem (6px) | 标准按钮、输入框 |
| `--radius-lg` | 0.5rem (8px) | 卡片、面板、模态框 |
| `--radius-xl` | 0.75rem (12px) | 大卡片、弹窗 |
| `--radius-2xl` | 1rem (16px) | 特殊容器 |
| `--radius-full` | 9999px | 圆形元素（头像、徽章） |

#### 组件圆角应用规范
- **按钮**：使用 `--radius-md` (6px)
- **卡片**：使用 `--radius-lg` (8px)
- **输入框**：使用 `--radius-md` (6px)
- **表格容器**：使用 `--radius-lg` (8px)
- **徽章/标签**：使用 `--radius-full` (完全圆角)
- **模态框/弹窗**：使用 `--radius-xl` (12px)
- **数据表格内部**：使用 `--radius-none` (无圆角)

#### 设计原则
- 保持克制：圆角值不超过 12px（除圆形元素外）
- 层次分明：交互元素使用较小圆角，容器使用较大圆角
- 统一协调：同一类组件使用相同的圆角值
- 专业感：避免过大的圆角导致"卡通感"

## MODIFIED Requirements

### Requirement: 项目设计特点更新
原规范：
- **扁平化设计** - Insight Clean Finance 风格，无圆角、无阴影

更新为：
- **专业现代设计** - Insight Professional Finance 风格，使用微妙圆角（4-8px）和柔和阴影，平衡专业感与现代感
