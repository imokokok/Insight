# 首页简化规范

## Why
当前首页功能过于复杂，包含大量组件（实时价格滚动、BentoMetricsGrid、OracleMarketOverview、ArbitrageHeatmap、ProfessionalCTA等），导致：
- 页面加载缓慢
- 视觉焦点分散
- 用户难以快速找到核心功能
- 维护成本高

需要简化为一个轻量的入口页，突出核心功能，提升用户体验。

## What Changes

### 页面结构简化
- **保留**：ProfessionalHero 组件（核心入口）
- **移除**：
  - LivePriceTicker（实时价格滚动条）
  - BentoMetricsGrid（Bento网格指标）
  - OracleMarketOverview（预言机市场概览）
  - ArbitrageHeatmap（套利热力图）
  - ProfessionalCTA（底部CTA）

### ProfessionalHero 组件简化
- **保留功能**：
  - 搜索框（核心功能）
  - 热门币种标签
  - 基础背景效果
- **移除功能**：
  - LiveMetricsPanel（右侧实时指标面板）
  - TrustMetricsBanner（底部信任指标横幅）
  - 复杂的粒子网络动画
- **布局调整**：
  - 从左右分栏改为居中单栏布局
  - 简化背景为静态渐变
  - 减少视觉元素，突出搜索功能

### 视觉风格
- 保持简洁、干净的视觉风格
- 使用柔和的背景渐变
- 突出搜索框作为页面核心
- 减少动画效果，提升性能

## Impact
- **受影响文件**：
  - `src/app/[locale]/page.tsx` - 移除多余组件
  - `src/app/[locale]/home-components/ProfessionalHero.tsx` - 简化布局和功能
  - `src/app/[locale]/home-components/HeroBackground.tsx` - 简化背景
- **保留文件**（不做修改）：
  - 其他 home-components 组件文件（供将来可能使用）

## ADDED Requirements

### Requirement: 简化版首页入口
The system SHALL provide a simplified homepage that:
- 以搜索功能为核心
- 使用居中单栏布局
- 显示简洁的标题和描述
- 提供热门币种快速入口
- 加载速度快，无复杂动画

#### Scenario: 用户访问首页
- **WHEN** 用户访问首页
- **THEN** 显示简洁的入口页面
- **AND** 页面核心为搜索框
- **AND** 无复杂的实时数据展示

### Requirement: 简化版 Hero 背景
The system SHALL provide a simplified hero background that:
- 使用静态渐变背景替代动态粒子效果
- 保持视觉美感但减少性能开销
- 支持响应式布局

#### Scenario: 页面加载
- **WHEN** 页面加载
- **THEN** 显示简洁的渐变背景
- **AND** 无复杂的动画效果

## MODIFIED Requirements

### Requirement: ProfessionalHero 组件简化
**现有功能**：左右分栏布局，包含实时指标面板、信任横幅、复杂动画
**修改后**：
- 采用居中单栏布局
- 移除 LiveMetricsPanel 组件引用
- 移除 TrustMetricsBanner 组件引用
- 保留搜索框完整功能
- 简化入场动画

#### Scenario: Hero 区域渲染
- **WHEN** 页面渲染 Hero 区域
- **THEN** 使用居中单栏布局
- **AND** 核心为搜索框和标题
- **AND** 无侧边数据面板

### Requirement: 首页页面结构
**现有功能**：包含6个动态加载的组件区块
**修改后**：
- 仅保留 ProfessionalHero 组件
- 移除其他所有区块组件
- 页面结构更加简洁

#### Scenario: 首页渲染
- **WHEN** 用户访问首页
- **THEN** 仅显示 ProfessionalHero
- **AND** 页面加载更快

## REMOVED Requirements

### Requirement: 实时指标面板 (LiveMetricsPanel)
**Reason**：简化首页，减少信息密度
**Migration**：指标数据可在其他页面查看

### Requirement: 信任指标横幅 (TrustMetricsBanner)
**Reason**：简化首页视觉
**Migration**：相关信任信息可在关于页面展示

### Requirement: 实时价格滚动条 (LivePriceTicker)
**Reason**：减少首页复杂度
**Migration**：价格信息可在价格查询页面查看

### Requirement: BentoMetricsGrid
**Reason**：减少首页信息密度
**Migration**：指标详情可在市场概览页面查看

### Requirement: OracleMarketOverview
**Reason**：简化首页
**Migration**：预言机信息可在各预言机详情页查看

### Requirement: ArbitrageHeatmap
**Reason**：减少首页复杂度
**Migration**：套利信息可在专门页面查看

### Requirement: ProfessionalCTA
**Reason**：简化首页，搜索框已提供主要入口
**Migration**：CTA功能整合到导航中
