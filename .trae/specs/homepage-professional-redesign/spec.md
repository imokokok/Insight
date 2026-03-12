# 首页专业化重设计规范

## Why
当前首页虽然功能完整，但与顶级数据分析平台（如 Dune Analytics、Nansen、Token Terminal）相比，在专业性、信息密度和视觉层次上还有提升空间。需要通过优化现有组件的样式设计、增强数据可视化、提升交互体验来建立更强的专业可信度。

## What Changes
- **Hero 区域优化**: 增强实时数据展示，添加滚动数据跑马灯，优化搜索框交互，添加动态背景效果
- **新增实时数据条**: 在 Hero 下方添加全宽实时价格滚动条，提升专业感
- **Bento Grid 改进**: 优化卡片布局，改进实时更新指示器，优化图表样式
- **市场概览增强**: 添加更多图表类型和交互功能，优化颜色方案
- **Feature Cards 优化**: 改进视觉层次，添加预览图表，优化悬停动效
- **CTA 区域改进**: 添加更多转化入口，改进视觉设计
- **全局动画优化**: 添加微妙的微交互动画提升体验

## Impact
- 受影响文件:
  - `src/app/page.tsx`
  - `src/app/home-components/ProfessionalHero.tsx`
  - `src/app/home-components/BentoMetricsGrid.tsx`
  - `src/app/home-components/OracleMarketOverview.tsx`
  - `src/app/home-components/FeatureCards.tsx`
  - `src/app/home-components/ProfessionalCTA.tsx`
  - `src/app/home-components/ArbitrageHeatmap.tsx`
  - 新增: `src/app/home-components/LivePriceTicker.tsx`

## ADDED Requirements

### Requirement: 实时价格滚动条
系统应在 Hero 区域下方提供全宽实时价格滚动条

#### Scenario: 用户访问首页
- **WHEN** 用户加载首页
- **THEN** 应看到展示主流交易对实时价格和涨跌幅的滚动条
- **AND** 价格应自动滚动展示
- **AND** 正涨幅显示绿色，负涨幅显示红色

### Requirement: 增强 Hero 区域
系统应提供更专业的 Hero 区域

#### Scenario: 用户访问首页
- **WHEN** 用户看到 Hero 区域
- **THEN** 应看到动态背景效果
- **AND** 核心指标应有迷你趋势图
- **AND** 搜索框应有更好的视觉层次
- **AND** 应有实时指示器显示数据状态

### Requirement: 优化 Bento Grid
系统应提供更信息丰富的 Bento Grid

#### Scenario: 用户浏览指标区域
- **WHEN** 用户看到 Bento Grid
- **THEN** 每个卡片应有实时更新指示器
- **AND** 图表应更精致
- **AND** 悬停时应显示更多信息
- **AND** 布局应响应式适配

## MODIFIED Requirements

### Requirement: Feature Cards 优化
**现有功能**: 4个功能入口卡片
**修改内容**:
- 添加卡片预览图表或数据片段
- 改进悬停动效
- 添加使用统计数据（如"已有 1000+ 次查询"）
- 优化移动端布局

### Requirement: 市场概览增强
**现有功能**: 饼图、趋势图、柱状图切换
**修改内容**:
- 添加更多时间范围选项
- 改进图表交互体验
- 添加数据表格视图
- 优化颜色方案

### Requirement: CTA 区域改进
**现有功能**: 单一 CTA 按钮
**修改内容**:
- 添加多个转化入口
- 改进视觉设计
- 添加邮件订阅选项

## REMOVED Requirements
- ~~新增数据可信度区域~~: 已移除，专注于现有组件优化
- ~~新增合作伙伴/信任背书区域~~: 已移除，专注于现有组件优化

## 设计参考标准
参考以下平台的设计语言：
- **Dune Analytics**: 简洁的数据展示、深色/浅色主题切换、丰富的图表
- **Nansen**: 专业的视觉层次、智能货币概念、清晰的导航
- **Token Terminal**: 财务报告风格、标准化指标、机构级专业感
- **DeFiLlama**: 信息密度高、表格展示清晰、实时更新感
