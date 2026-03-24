# UMA页面重构规格说明书

## Why
当前UMA页面使用通用的OraclePageTemplate，信息展示冗余，数据密度低，无法充分展示UMA作为乐观预言机协议的独特特性（争议解决机制、验证者经济、质押系统等）。需要参考Chainlink页面的高密度布局设计，重构为更具信息密度的专业页面。

## What Changes
- 将UMA页面从OraclePageTemplate迁移为独立页面组件（类似Chainlink）
- 采用侧边栏导航+主内容区的布局结构
- 优化数据展示密度，减少不必要的空白和重复信息
- 突出UMA核心特性：争议解决、验证者分析、质押收益、风险评估
- 整合实时数据展示，提升页面专业性

**BREAKING**: 移除对OraclePageTemplate的依赖，改为独立实现

## Impact
- Affected specs: UMA页面展示、数据获取hooks、组件结构
- Affected code: 
  - `/src/app/[locale]/uma/page.tsx`
  - 新增 `/src/app/[locale]/uma/components/` 目录
  - 新增 `/src/app/[locale]/uma/hooks/` 目录
  - 新增 `/src/app/[locale]/uma/types.ts`

## ADDED Requirements

### Requirement: 页面布局重构
The system SHALL provide类似Chainlink的高密度布局结构

#### Scenario: 页面结构
- **GIVEN** 用户访问UMA页面
- **WHEN** 页面加载完成
- **THEN** 显示Hero区域（含价格、统计卡片