# WINkLINK 页面改造 Spec

## Why

WINkLINK 作为 TRON 生态的核心预言机，具有独特的游戏和 VRF 特性。当前页面虽然功能完善，但 Risk Tab 未启用、缺少跨预言机对比功能，且部分 Tab 缺少专属图标。通过改造，我们将充分展示 WINkLINK 的所有特性，提升用户体验。

## What Changes

- 启用 Risk Tab，展示风险评估数据
- 添加跨预言机对比 Tab，支持与其他预言机对比
- 为 tron 和 gaming Tab 添加专属图标
- 增强统计数据展示，添加 VRF 请求数、游戏交易量等特色指标
- 优化页面布局，提升信息密度

## Impact

- Affected specs: analyze-winklink-page
- Affected code:
  - src/app/winklink/page.tsx
  - src/lib/config/oracles.tsx
  - src/components/oracle/common/TabNavigation.tsx
  - src/hooks/useWINkLinkData.ts

## ADDED Requirements

### Requirement: Risk Tab 启用
The system SHALL 在 WINkLINK 页面中启用 Risk Tab，展示风险评估数据。

#### Scenario: 用户查看风险评估
- **WHEN** 用户点击 Risk Tab
- **THEN** 显示 WINkLinkRiskPanel，包含数据质量评分、价格偏差、节点集中度风险、正常运行时间风险

### Requirement: 跨预言机对比 Tab
The system SHALL 添加跨预言机对比 Tab，支持 WINkLINK 与其他预言机的数据对比。

#### Scenario: 用户查看跨预言机对比
- **WHEN** 用户点击 Cross-Oracle Tab
- **THEN** 显示跨预言机对比视图，展示价格、响应时间、节点数量等对比数据

### Requirement: Tab 专属图标
The system SHALL 为 tron 和 gaming Tab 添加专属图标。

#### Scenario: 用户查看 Tab 导航
- **WHEN** 用户查看 TabNavigation
- **THEN** tron Tab 显示 TRON 网络图标，gaming Tab 显示游戏手柄图标

### Requirement: 增强统计数据
The system SHALL 在页面顶部统计卡片中添加 VRF 请求数、游戏交易量等特色指标。

#### Scenario: 用户查看统计数据
- **WHEN** 用户打开 WINkLINK 页面
- **THEN** 看到包含 VRF 日请求数、游戏交易量等特色指标的统计卡片

## MODIFIED Requirements

### Requirement: 页面布局优化
The system SHALL 优化页面布局，提升信息展示密度和用户体验。

#### Scenario: 页面加载
- **WHEN** 用户打开 WINkLINK 页面
- **THEN** 页面布局合理，信息层次清晰，加载流畅
