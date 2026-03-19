# 首页细节优化 Spec

## Why
首页已经完成了 Dune 风格的整体设计，但在细节层面还有一些可以微调的地方，以提升视觉层次感和用户体验，同时保持简洁不过度设计。

## What Changes
- **Hero 区域**: 优化指标卡片的数据展示层次，微调搜索框视觉权重
- **Bento 网格**: 统一卡片间距，优化实时指示器位置
- **价格滚动条**: 简化卡片样式，提升滚动流畅感
- **市场概览**: 优化统计卡片对齐，简化图表容器
- **跨链监控**: 统一颜色语义，优化状态指示
- **CTA 区域**: 微调视觉层次，保持简洁

## Impact
- Affected specs: 首页视觉呈现、用户体验
- Affected code: 
  - `ProfessionalHero.tsx`
  - `BentoMetricsGrid.tsx`
  - `LivePriceTicker.tsx`
  - `OracleMarketOverview.tsx`
  - `ArbitrageHeatmap.tsx`
  - `ProfessionalCTA.tsx`

## ADDED Requirements
### Requirement: Hero 区域优化
The system SHALL provide清晰的指标数据层次

#### Scenario: 指标展示
- **WHEN** 用户浏览 Hero 区域
- **THEN** 指标数值突出显示，标签次要呈现
- **AND** 趋势图简洁不喧宾夺主

### Requirement: Bento 网格优化
The system SHALL 提供一致的卡片间距和视觉层次

#### Scenario: 网格展示
- **WHEN** 用户浏览指标网格
- **THEN** 卡片间距统一为 16px
- **AND** 实时指示器不遮挡内容

### Requirement: 价格滚动条优化
The system SHALL 提供流畅的价格展示

#### Scenario: 滚动展示
- **WHEN** 用户查看实时价格
- **THEN** 卡片无边框，使用背景色区分
- **AND** 滚动动画流畅自然

### Requirement: 市场概览优化
The system SHALL 提供清晰的图表和统计展示

#### Scenario: 数据可视化
- **WHEN** 用户查看市场分析
- **THEN** 统计卡片对齐统一
- **AND** 图表容器简洁无多余装饰

### Requirement: 跨链监控优化
The system SHALL 提供一致的状态颜色语义

#### Scenario: 状态展示
- **WHEN** 用户查看跨链价格
- **THEN** 颜色使用一致（绿=正常/好，红=异常/差）
- **AND** 偏差指示清晰可辨

## MODIFIED Requirements
无

## REMOVED Requirements
无
