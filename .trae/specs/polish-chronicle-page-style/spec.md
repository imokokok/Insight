# Chronicle 预言机页面样式优化规格

## Why
Chronicle 预言机页面目前的样式与项目整体的 Dune 扁平化设计风格基本一致，但在视觉层次、信息密度和交互细节上还有提升空间。本次优化将在保持现有风格的基础上，通过微调间距、统一色彩应用和增强视觉引导，让页面更加精致专业。

## What Changes
- **优化统计卡片布局**：统一 StatCard 组件的样式，确保与整体设计语言一致
- **改进 DashboardCard 标题样式**：增强标题的视觉权重，提升信息层级
- **优化表格样式**：统一表格头部和内容区域的样式，提升可读性
- **增强色彩一致性**：确保 Chronicle 主题色（琥珀色/amber）在各面板中统一应用
- **优化进度条/指标条样式**：统一进度条的高度、圆角和过渡效果
- **改进图标容器样式**：统一图标背景色和尺寸，增强视觉一致性
- **优化标签/徽章样式**：统一状态标签的样式规范

## Impact
- Affected specs: 无
- Affected code:
  - `src/app/[locale]/chronicle/page.tsx`
  - `src/components/oracle/panels/ChronicleScuttlebuttPanel.tsx`
  - `src/components/oracle/panels/ChronicleNetworkPanel.tsx`
  - `src/components/oracle/panels/ChronicleValidatorPanel.tsx`
  - `src/components/oracle/panels/ChronicleMakerDAOIntegrationPanel.tsx`
  - `src/components/oracle/panels/ChronicleRiskAssessmentPanel.tsx`
  - `src/components/oracle/common/StatCard.tsx` (如存在)
  - `src/components/oracle/common/DashboardCard.tsx` (如存在)

## ADDED Requirements
### Requirement: 样式统一与优化
The system SHALL provide consistent styling across all Chronicle page components.

#### Scenario: 统计卡片展示
- **WHEN** 用户查看 Chronicle 页面顶部的统计卡片
- **THEN** 所有卡片应具有统一的间距、边框和图标样式
- **AND** 图标背景色应使用与主题一致的琥珀色系

#### Scenario: DashboardCard 标题
- **WHEN** 用户查看各面板的标题
- **THEN** 标题应具有适当的视觉权重（字体大小、字重）
- **AND** 标题与内容区域应有清晰的分隔

#### Scenario: 表格展示
- **WHEN** 用户查看验证者列表或 MakerDAO 资产表格
- **THEN** 表头应具有统一的背景色和文字样式
- **AND** 行悬停效果应一致且 subtle

#### Scenario: 进度条/指标条
- **WHEN** 页面中出现进度条（如声誉分数、质押分布）
- **THEN** 进度条高度统一为 4px 或 8px
- **AND** 使用主题色（琥珀色）作为填充色
- **AND** 具有平滑的过渡动画

#### Scenario: 状态标签
- **WHEN** 页面中出现状态标签（如 active、verified、high）
- **THEN** 标签应具有统一的内边距、圆角和字体大小
- **AND** 不同状态的配色应符合设计规范

## MODIFIED Requirements
无

## REMOVED Requirements
无
