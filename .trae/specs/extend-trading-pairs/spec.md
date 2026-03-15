# 扩展跨预言机比较页面交易对规格

## Why
当前跨预言机比较页面仅支持 4 个交易对（BTC/USD、ETH/USD、SOL/USD、AVAX/USD），无法满足用户对更多加密资产进行预言机价格比较的需求。扩展交易对列表可以：
- 覆盖更多主流加密资产，满足不同用户的分析需求
- 支持 DeFi 生态中重要的代币价格比较
- 提供更全面的预言机性能评估维度

## What Changes
- 在交易对选择器中添加更多主流加密货币交易对
- 添加交易对分类/筛选功能，便于用户快速定位
- 优化选择器 UI 以支持更多选项的展示
- 确保新增交易对与现有预言机数据源兼容

## Impact
- Affected specs: 跨预言机比较页面交易对选择功能
- Affected code: 
  - `src/app/cross-oracle/constants.tsx` - 扩展 symbols 数组
  - `src/app/cross-oracle/components/PairSelector.tsx` - 添加分类筛选功能
  - `src/lib/oracles/` - 验证各预言机对新交易对的支持

## ADDED Requirements

### Requirement: 扩展交易对列表
The system SHALL support additional trading pairs beyond the current 4 pairs.

#### Scenario: 新增交易对
- **WHEN** 用户打开交易对选择器
- **THEN** 应显示以下新增交易对：
  - LINK/USD (Chainlink)
  - UNI/USD (Uniswap)
  - AAVE/USD (Aave)
  - MKR/USD (Maker)
  - SNX/USD (Synthetix)
  - COMP/USD (Compound)
  - YFI/USD (Yearn)
  - CRV/USD (Curve)

#### Scenario: 交易对图标支持
- **WHEN** 显示新增交易对
- **THEN** 每个交易对应显示对应的加密货币图标
- **AND** 图标风格应与现有交易对保持一致

### Requirement: 交易对分类筛选
The system SHALL provide category filtering for trading pairs.

#### Scenario: 按类别筛选
- **WHEN** 用户点击选择器
- **THEN** 应显示分类标签（Layer 1、DeFi、全部）
- **AND** 点击标签可筛选对应类别的交易对

#### Scenario: 分类定义
- **Layer 1**: BTC/USD, ETH/USD, SOL/USD, AVAX/USD
- **DeFi**: LINK/USD, UNI/USD, AAVE/USD, MKR/USD, SNX/USD, COMP/USD, YFI/USD, CRV/USD

### Requirement: 搜索功能增强
The system SHALL enhance the search functionality to support more trading pairs.

#### Scenario: 搜索优化
- **WHEN** 用户在搜索框输入
- **THEN** 应支持按代币名称、符号搜索
- **AND** 搜索结果应按相关度排序

## MODIFIED Requirements

### Requirement: PairSelector 组件
**Current**: 简单的下拉列表展示所有交易对
**Modified**: 支持下拉列表+分类标签+搜索的复合选择器

### Requirement: 交易对数据结构
**Current**: `symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD']`
**Modified**: 扩展为包含分类信息的结构化数据

## REMOVED Requirements
无
