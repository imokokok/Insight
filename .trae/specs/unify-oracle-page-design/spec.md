# 预言机页面设计统一与优化规范

## Why

作为专业预言机数据分析平台，当前十个预言机页面（Chainlink、Pyth、API3、Tellor、UMA、Band Protocol、DIA、RedStone、Chronicle、Winklink）虽然采用了统一的设计架构，但存在以下影响专业度和用户体验的问题：

1. **Hero 区域信息过载**：8个统计卡片在 lg 屏幕下挤在一行，信息密度过高，难以快速捕捉关键指标
2. **视觉层次不够清晰**：核心指标与次要指标平级展示，缺乏信息优先级区分
3. **Sidebar 设计不一致**：部分页面使用 SVG 图标，部分使用 Lucide 图标，风格不统一
4. **响应式体验欠佳**：移动端菜单按钮样式简陋，缺乏专业感
5. **主题色应用不一致**：部分组件硬编码颜色，未充分利用 config.themeColor
6. **数据可视化缺乏专业性**：缺少 Sparkline 趋势图、健康度评分等金融平台常见元素
7. **页面间交互模式不统一**：部分页面使用旧版 Header，部分使用新版 Hero 组件

## What Changes

- 重构 Hero 区域信息架构，采用分层布局突出核心指标
- 统一 Sidebar 设计规范，全部使用 Lucide 图标库
- 优化移动端菜单按钮，提升专业感
- 完善主题色系统应用，确保各预言机品牌色一致性
- 增强统计卡片功能，添加 Sparkline 趋势图
- 统一十个预言机页面的交互模式和组件使用
- 优化响应式布局，改进移动端体验

## Impact

- Affected specs: 所有预言机详情页面
- Affected code:
  - src/app/[locale]/chainlink/components/\*
  - src/app/[locale]/pyth/components/\*
  - src/app/[locale]/api3/components/\*
  - src/app/[locale]/tellor/components/\*
  - src/app/[locale]/uma/components/\*
  - src/app/[locale]/band-protocol/components/\*
  - src/app/[locale]/dia/components/\*
  - src/app/[locale]/redstone/components/\*
  - src/app/[locale]/chronicle/components/\*
  - src/app/[locale]/winklink/components/\*
  - src/components/oracle/data-display/OracleHero.tsx
  - src/components/ui/MobileSidebar.tsx

## ADDED Requirements

### Requirement: Hero 区域分层布局

The system SHALL provide 分层的 Hero 信息展示：

#### Scenario: 核心指标突出显示

- **WHEN** 显示 Hero 区域统计数据
- **THEN** 应将价格、TVS/市值、24h变化、节点/发布者数作为核心指标
- **AND** 核心指标使用更大的卡片、更突出的视觉权重
- **AND** 次要指标（响应时间、成功率等）使用更紧凑的展示方式

#### Scenario: 统计卡片网格响应式

- **WHEN** 屏幕宽度变化
- **THEN** 网格应自适应：
  - lg 屏幕：4列核心指标 + 4列次要指标（紧凑）
  - md 屏幕：2列布局
  - sm 屏幕：1列堆叠

### Requirement: 统一 Sidebar 设计规范

The system SHALL provide 一致的 Sidebar 组件：

#### Scenario: 图标规范

- **WHEN** 渲染 Sidebar 导航项
- **THEN** 所有图标应使用 Lucide React 图标库
- **AND** 图标尺寸统一为 w-5 h-5
- **AND** 描边宽度统一为 1.5

#### Scenario: 交互反馈

- **WHEN** 用户点击导航项
- **THEN** 应显示左侧边框高亮（border-l-4）
- **AND** 背景色变化提供视觉反馈
- **AND** 过渡动画时长 200ms

### Requirement: 移动端菜单按钮优化

The system SHALL provide 专业的移动端菜单按钮：

#### Scenario: 按钮样式

- **WHEN** 在移动端显示菜单按钮
- **THEN** 应使用与页面主题一致的样式
- **AND** 包含图标 + 文字标签
- **AND** 使用主题色边框或背景

### Requirement: 主题色系统完善

The system SHALL provide 一致的主题色应用：

#### Scenario: Hero 组件主题色

- **WHEN** 渲染 Hero 区域
- **THEN** 导出按钮应使用 config.themeColor
- **AND** 统计卡片图标背景应使用主题色 15% 透明度
- **AND** 多链支持链接应使用主题色

#### Scenario: Sidebar 主题色

- **WHEN** 渲染 Sidebar 激活状态
- **THEN** 应使用 config.themeColor 作为激活色
- **AND** 未激活状态使用灰色系

### Requirement: 增强统计卡片功能

The system SHALL provide 专业的统计卡片：

#### Scenario: Sparkline 趋势图

- **WHEN** 显示价格或指标卡片
- **THEN** 应显示 24h Sparkline 趋势图
- **AND** 上涨趋势使用绿色，下跌使用红色
- **AND** 图表高度 24px，宽度 60px

#### Scenario: 变化率指示

- **WHEN** 显示变化率
- **THEN** 应使用颜色编码：绿色（上涨）、红色（下跌）、灰色（持平）
- **AND** 包含趋势图标（TrendingUp/TrendingDown）

## MODIFIED Requirements

### Requirement: Hero 组件统计网格

**Current**: 8个统计卡片平级展示，lg 屏幕下 8 列布局
**Modified**: 分层展示，核心指标 4 列突出，次要指标 4 列紧凑

### Requirement: Sidebar 图标规范

**Current**: 混合使用 SVG 和 Lucide 图标，风格不一致
**Modified**: 全部使用 Lucide React 图标，统一尺寸和描边

### Requirement: 移动端菜单按钮

**Current**: 简单按钮，白色背景，灰色边框
**Modified**: 主题色边框，更专业的视觉设计

### Requirement: 主题色应用

**Current**: 部分组件硬编码蓝色（#3b82f6）
**Modified**: 全部使用 config.themeColor，支持各预言机品牌色

## REMOVED Requirements

无
