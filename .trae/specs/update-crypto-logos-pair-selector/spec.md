# 交易对选择器加密货币官方 Logo 更新 Spec

## Why
当前交易对选择器（PairSelector）中显示的加密货币图标是使用代码前两个字母生成的占位符（如 "BT" 代表 BTC），而不是各加密货币的官方品牌 Logo。这降低了产品的专业感和品牌识别度。需要将交易对选择器中的加密货币图标替换为其官方 Logo，以提升用户体验和品牌一致性。

## What Changes
- 创建 `/public/logos/cryptos/` 目录存放加密货币官方 logo SVG 文件
- 添加 12 个加密货币的官方 logo SVG 文件（BTC、ETH、SOL、AVAX、LINK、UNI、AAVE、MKR、SNX、COMP、YFI、CRV）
- 更新 `src/app/cross-oracle/components/PairSelector.tsx` 中的 `CryptoIcon` 组件
- 将 `CryptoIcon` 从文字占位符改为使用 Image 组件加载官方 SVG logo
- 保持现有样式和交互行为不变

## Impact
- Affected specs: 无
- Affected code: 
  - `/public/logos/cryptos/` (新增目录和文件)
  - `src/app/cross-oracle/components/PairSelector.tsx` (修改 CryptoIcon 组件)

## ADDED Requirements
### Requirement: 加密货币官方 Logo 展示
The system SHALL 为交易对选择器中的所有加密货币提供官方品牌 Logo 展示。

#### Scenario: 交易对选择器展示
- **WHEN** 用户在交易对选择器中查看加密货币列表
- **THEN** 每个加密货币应显示其官方品牌 Logo 而非文字占位符

#### Scenario: 选中状态展示
- **WHEN** 用户选中某个交易对
- **THEN** 选择器按钮应显示该加密货币的官方 Logo

#### Scenario: Logo 一致性
- **WHEN** 在不同页面查看同一加密货币
- **THEN** Logo 显示应保持一致

#### Scenario: Logo 可访问性
- **WHEN** Logo 加载或显示
- **THEN** 应包含适当的 alt 文本以确保可访问性

#### Scenario: Logo 加载失败处理
- **WHEN** Logo 图片加载失败
- **THEN** 应回退到文字占位符显示
