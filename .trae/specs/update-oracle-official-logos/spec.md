# 更新预言机官方 Logo Spec

## Why
当前项目中所有预言机的 logo 都是简化的几何图形占位符（统一的六边形/立方体模板），而不是各自的官方品牌 Logo。这降低了产品的专业感和品牌识别度。需要将所有预言机的 logo 替换为其真正的官方品牌 Logo，以提升用户体验和品牌一致性。

## What Changes
- 更新 `/public/logos/oracles/` 目录下所有预言机的 SVG logo 文件
- 替换为各预言机的官方品牌 Logo SVG
- 保持 `src/lib/config/oracles.tsx` 中的配置不变（已经引用正确的路径）

## Impact
- Affected specs: 无
- Affected code: 
  - `/public/logos/oracles/*.svg` (更新所有 logo 文件)

## ADDED Requirements
### Requirement: 官方 Logo 展示
The system SHALL 为所有支持的预言机提供官方品牌 Logo 展示。

#### Scenario: 预言机列表展示
- **WHEN** 用户在界面中查看预言机列表或详情
- **THEN** 每个预言机应显示其官方品牌 Logo 而非几何占位符

#### Scenario: Logo 一致性
- **WHEN** 在不同页面查看同一预言机
- **THEN** Logo 显示应保持一致

#### Scenario: Logo 可访问性
- **WHEN** Logo 加载或显示
- **THEN** 应包含适当的 alt 文本和 aria 标签以确保可访问性

## 官方 Logo 参考

### Chainlink
- 官方 Logo: 蓝色立方体，由多个菱形面组成
- 品牌色: #375BD2
- 参考: https://chain.link/

### Band Protocol
- 官方 Logo: 圆形内嵌抽象 "B" 字形图案
- 品牌色: #516AFF
- 参考: https://www.bandprotocol.com/

### UMA
- 官方 Logo: 红色圆形内嵌 "UMA" 字样或抽象图案
- 品牌色: #FF4A4A
- 参考: https://umaproject.org/

### Pyth Network
- 官方 Logo: 紫色六边形/多边形图案
- 品牌色: #8B5CF6 (紫色渐变)
- 参考: https://pyth.network/

### API3
- 官方 Logo: 黑色背景上的抽象图案或 "API3" 字样
- 品牌色: #1F2937
- 参考: https://api3.org/

### RedStone
- 官方 Logo: 红色背景上的抽象图案
- 品牌色: #DC2626
- 参考: https://redstone.finance/

### DIA
- 官方 Logo: 蓝色圆形内嵌 "DIA" 字样或抽象图案
- 品牌色: #3B82F6
- 参考: https://www.diadata.org/

### Tellor
- 官方 Logo: 蓝绿色圆形内嵌抽象图案
- 品牌色: #14B8A6
- 参考: https://tellor.io/

### Chronicle
- 官方 Logo: 黄色/金色背景上的抽象图案
- 品牌色: #EAB308
- 参考: https://chroniclelabs.org/

### WINkLink
- 官方 Logo: 粉色/红色圆形内嵌抽象图案
- 品牌色: #EC4899
- 参考: https://winklink.org/
