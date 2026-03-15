# 更新官方 Logo Spec

## Why
当前项目中所有预言机（Chainlink、Band Protocol、UMA、Pyth、API3、RedStone、DIA、Tellor、Chronicle、WINkLink）的显示图标都是简单的文字占位符或基础几何图形，而不是各自的官方品牌 Logo。这降低了产品的专业感和品牌识别度。需要将所有预言机的显示图标替换为其官方 Logo，以提升用户体验和品牌一致性。

## What Changes
- 创建 `/public/logos/oracles/` 目录存放预言机官方 logo SVG 文件
- 添加 10 个预言机的官方 logo SVG 文件
- 更新 `src/lib/config/oracles.tsx` 中的 icon 配置，使用官方 logo 替代现有文字/图形占位符
- 保持现有颜色主题和样式一致性

## Impact
- Affected specs: 无
- Affected code: 
  - `/public/logos/oracles/` (新增目录和文件)
  - `src/lib/config/oracles.tsx` (修改 icon 配置)

## ADDED Requirements
### Requirement: 官方 Logo 展示
The system SHALL 为所有支持的预言机提供官方品牌 Logo 展示。

#### Scenario: 预言机列表展示
- **WHEN** 用户在界面中查看预言机列表或详情
- **THEN** 每个预言机应显示其官方品牌 Logo 而非文字占位符

#### Scenario: Logo 一致性
- **WHEN** 在不同页面查看同一预言机
- **THEN** Logo 显示应保持一致

#### Scenario: Logo 可访问性
- **WHEN** Logo 加载或显示
- **THEN** 应包含适当的 alt 文本和 aria 标签以确保可访问性
