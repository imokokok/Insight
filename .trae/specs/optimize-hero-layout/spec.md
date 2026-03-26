# Hero 区域布局优化规范

## Why

当前简化后的 Hero 区域存在右侧空白过多的问题：

1. **核心指标过少**：只有3个核心指标，在大屏幕上导致右侧大片空白
2. **布局不平衡**：左侧信息密集，右侧空旷，视觉不平衡
3. **空间利用率低**：可用空间没有充分利用来展示有价值的信息

需要优化布局，使 Hero 区域更加饱满、平衡。

## What Changes

- **增加核心指标数量**：从3个增加到4-5个，更好地利用水平空间
- **优化布局结构**：采用左右分栏或网格布局，平衡信息分布
- **添加迷你图表**：在右侧添加价格走势图或市场深度图
- **整合操作区域**：将刷新/导出按钮与统计信息更好地融合
- **统一十个预言机页面**：所有页面采用优化后的布局

## Impact

- Affected specs: 所有预言机详情页面的 Hero 组件
- Affected code:
  - src/components/oracle/data-display/OracleHero.tsx（基础组件）
  - src/app/[locale]/chainlink/components/ChainlinkHero.tsx
  - src/app/[locale]/pyth/components/PythHero.tsx
  - src/app/[locale]/api3/components/API3Hero.tsx
  - src/app/[locale]/tellor/components/TellorHero.tsx
  - src/app/[locale]/uma/components/UMAHero.tsx
  - src/app/[locale]/band-protocol/components/BandProtocolHero.tsx
  - src/app/[locale]/dia/components/DIAHero.tsx
  - src/app/[locale]/redstone/components/RedStoneHero.tsx
  - src/app/[locale]/chronicle/components/ChronicleHero.tsx
  - src/app/[locale]/winklink/components/WinklinkHero.tsx

## ADDED Requirements

### Requirement: 优化核心统计布局
The system SHALL provide 更饱满的核心统计展示：

#### Scenario: 增加核心指标
- **WHEN** 显示 Hero 区域核心统计
- **THEN** 展示 4-5 个关键指标（价格、TVS/市值、节点/发布者数、数据喂价、质押量等）
- **AND** 使用响应式网格布局（lg:5列, md:3列, sm:2列）
- **AND** 每个指标包含迷你趋势图

#### Scenario: 添加右侧迷你图表
- **WHEN** 屏幕宽度足够（lg及以上）
- **THEN** 在右侧显示价格走势迷你图或市场数据可视化
- **AND** 图表宽度占整个 Hero 区域的 25-30%
- **AND** 图表高度与左侧统计区域对齐

### Requirement: 优化布局结构
The system SHALL provide 更平衡的布局：

#### Scenario: 左右分栏布局
- **WHEN** 在桌面端显示 Hero 区域
- **THEN** 左侧显示统计指标（70%宽度）
- **AND** 右侧显示迷你图表和操作按钮（30%宽度）
- **AND** 两部分之间有清晰的分隔

#### Scenario: 操作按钮整合
- **WHEN** 显示操作按钮（刷新、导出）
- **THEN** 将按钮整合到右侧区域顶部
- **AND** 使用更紧凑的按钮样式

## MODIFIED Requirements

### Requirement: Hero 组件布局
**Current**: 3个核心指标水平排列，右侧大片空白
**Modified**: 4-5个核心指标网格布局 + 右侧迷你图表区域

### Requirement: 响应式布局
**Current**: 简单水平堆叠
**Modified**: 
- lg: 左侧统计(70%) + 右侧图表(30%)
- md: 4列网格布局
- sm: 2列网格布局

## REMOVED Requirements

无
