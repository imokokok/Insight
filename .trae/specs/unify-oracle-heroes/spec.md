# 统一预言机 Hero 组件设计规范

## Why
当前十个预言机页面的 Hero 组件设计不一致，ChainlinkHero 设计丰富专业，而其他预言机使用简单的 OracleHero 组件，导致用户体验割裂，专业感不足。需要统一所有预言机 Hero 组件的设计标准，提升整体产品专业度。

## What Changes
- 统一所有预言机 Hero 组件为专业级设计（参考 ChainlinkHero）
- 为所有统计卡片添加 Sparkline 迷你趋势图
- 添加 LiveStatusBar 实时状态栏组件
- 统一标签页命名规范
- 提取 MobileSidebar 通用组件减少代码重复
- 填充所有空的 View 组件
- 添加 ChartToolbar 图表工具栏
- 增强数据表格功能

## Impact
- Affected specs: 所有预言机页面（Chainlink、Band Protocol、UMA、Pyth、API3、RedStone、DIA、Tellor、Chronicle、WINkLink）
- Affected code: 
  - src/app/[locale]/*/components/*Hero.tsx
  - src/app/[locale]/*/page.tsx
  - src/components/oracle/shared/
  - src/components/ui/

## ADDED Requirements

### Requirement: 统一 Hero 组件标准
The system SHALL provide 统一的 Hero 组件设计标准，所有预言机页面必须包含：

#### Scenario: Hero 组件结构
- **WHEN** 用户访问任意预言机页面
- **THEN** Hero 区域应包含：
  1. 顶部状态栏（LiveStatusBar）
  2. 头部信息（Logo、标题、描述、操作按钮）
  3. 8 个核心统计指标卡片（带 Sparkline 趋势图）
  4. 链上实时指标面板
  5. 网络健康度评分
  6. 多链支持展示
  7. 快速操作按钮组
  8. 最新动态滚动条

### Requirement: 统计卡片增强
The system SHALL provide 增强的统计卡片组件，包含：

#### Scenario: StatCard 功能
- **WHEN** 展示统计数据
- **THEN** 卡片应显示：
  - 标题和图标
  - 当前数值
  - 变化率和趋势
  - 24 小时 Sparkline 趋势图
  - 悬停效果

### Requirement: 实时状态栏
The system SHALL provide LiveStatusBar 组件：

#### Scenario: 实时状态展示
- **WHEN** 页面加载完成
- **THEN** 状态栏应显示：
  - 当前 UTC 时间（精确到秒）
  - WebSocket 连接状态
  - 网络延迟（ms）
  - 最后更新时间
  - 数据新鲜度指示

### Requirement: 通用 MobileSidebar
The system SHALL provide 可复用的 MobileSidebar 组件：

#### Scenario: 移动端菜单
- **WHEN** 用户在移动端访问
- **THEN** 应使用统一的 MobileSidebar 组件，避免代码重复

## MODIFIED Requirements

### Requirement: 标签页命名规范
**Current**: 各预言机使用不同的标签页命名（menu/tabs 混用）
**Modified**: 统一使用 `tabs` 命名空间，标准化标签页 ID

### Requirement: 主题色彩应用
**Current**: 部分 Hero 使用硬编码颜色
**Modified**: 所有 Hero 必须从 config.themeColor 获取主题色

## REMOVED Requirements

### Requirement: 简化 Hero 设计
**Reason**: 需要统一为专业级设计
**Migration**: 使用新的统一 Hero 标准
