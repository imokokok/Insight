# 预言机页面 Hero 区域简化规范

## Why

当前十个预言机页面的 Hero 区域虽然已经采用了分层布局，但仍然存在卡片过多的问题：

1. **卡片数量仍然过多**：4个核心统计卡片 + 4个次要统计卡片 + 3个信息卡片 = 11个卡片
2. **视觉复杂度偏高**：过多的卡片边框和背景造成视觉碎片化
3. **信息层级可以更简洁**：部分次要指标可以整合或简化展示
4. **现代设计趋势**：当前主流 DeFi 平台（如 DeFiLlama、Dune）趋向更简洁的头部设计

需要进一步简化 Hero 区域，采用更现代、更通透的设计语言。

## What Changes

- **减少核心统计卡片**：从4个减少到2-3个最关键指标
- **整合次要指标**：将4个次要统计卡片整合为1个综合指标行
- **简化信息卡片**：将3个信息卡片（链上指标、网络健康度、多链支持）整合为更紧凑的展示
- **采用更简洁的视觉风格**：减少边框使用，增加留白，使用更 subtle 的分隔方式
- **统一十个预言机页面**：所有页面采用新的简化 Hero 设计

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

### Requirement: 简化核心统计展示

The system SHALL provide 更简洁的核心统计展示：

#### Scenario: 核心指标精简

- **WHEN** 显示 Hero 区域核心统计
- **THEN** 只展示 2-3 个最关键指标（价格、TVS/市值、节点数）
- **AND** 采用更大的数字展示，减少卡片边框
- **AND** 使用水平布局替代网格布局

#### Scenario: 次要指标整合

- **WHEN** 显示次要统计指标
- **THEN** 将4个次要卡片整合为1行紧凑展示
- **AND** 使用纯文本+图标形式，去除卡片背景
- **AND** 用分隔符区分不同指标

### Requirement: 信息区整合

The system SHALL provide 更紧凑的信息展示：

#### Scenario: 链上指标简化

- **WHEN** 显示链上实时指标
- **THEN** 使用进度条+数字的紧凑形式
- **AND** 去除独立卡片背景

#### Scenario: 多链支持简化

- **WHEN** 显示多链支持
- **THEN** 只显示链数量+前3个链图标
- **AND** 使用圆形图标组展示

## MODIFIED Requirements

### Requirement: Hero 组件统计网格

**Current**: 4个核心卡片 + 4个次要卡片 + 3个信息卡片
**Modified**: 2-3个核心指标 + 1行次要指标 + 1个整合信息区

### Requirement: 视觉风格

**Current**: 每个统计使用独立卡片，带边框和背景
**Modified**: 减少卡片使用，增加留白，使用更 subtle 的分隔

## REMOVED Requirements

无
