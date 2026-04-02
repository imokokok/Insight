# 优化价格查询功能 Spec

## Why

当前价格查询功能过于泛化，所有预言机使用相同的币种选择和查询逻辑，没有针对不同预言机的特点进行优化。用户无法直观地了解每个预言机支持的币种和链，导致查询体验不佳。需要针对每个预言机的特性进行专门优化，提供更精准的币种支持和更好的用户体验。

## What Changes

- **BREAKING**: 重构价格查询页面，支持按预言机筛选币种
- **BREAKING**: 为每个预言机定义专门的币种支持列表
- **BREAKING**: 优化前端 UI，根据选择的预言机动态显示支持的币种
- 添加预言机特定的功能特性展示
- 优化价格数据展示，区分实时数据和模拟数据

## Impact

- 受影响页面: `/price-query` 页面及相关组件
- 受影响文件:
  - `src/lib/oracles/*.ts` - 各预言机客户端
  - `src/app/[locale]/price-query/page.tsx` - 价格查询页面
  - `src/app/[locale]/price-query/components/` - 查询表单和结果组件
  - `src/lib/config/basePrices.ts` - 基础价格配置

## ADDED Requirements

### Requirement: 预言机币种支持配置

系统 SHALL 为每个预言机提供明确的币种支持列表

#### Scenario: Chainlink 币种支持

- **WHEN** 用户选择 Chainlink 预言机
- **THEN** 系统显示 Chainlink 支持的币种: ETH, BTC, LINK, USDC, USDT, DAI, MATIC, AVAX, BNB

#### Scenario: RedStone 币种支持

- **WHEN** 用户选择 RedStone 预言机
- **THEN** 系统显示 RedStone 支持的币种: BTC, ETH, SOL, AVAX, LINK, UNI, AAVE, SNX, CRV, MKR, COMP, YFI, SUSHI, 1INCH, LDO, STETH, USDC, USDT, DAI, FRAX, WBTC, WETH, MATIC, BNB, FTM, OP, ARB, BASE, MNT

#### Scenario: UMA 币种支持

- **WHEN** 用户选择 UMA 预言机
- **THEN** 系统仅显示 UMA 币种（UMA 代币专用预言机）

#### Scenario: WINkLink 币种支持

- **WHEN** 用户选择 WINkLink 预言机
- **THEN** 系统显示 WINkLink 支持的币种（基于 TRON 生态）

#### Scenario: Band Protocol 币种支持

- **WHEN** 用户选择 Band Protocol 预言机
- **THEN** 系统显示 Band 支持的主流币种

#### Scenario: DIA 币种支持

- **WHEN** 用户选择 DIA 预言机
- **THEN** 系统显示 DIA 支持的币种: BTC, ETH, USDC, USDT, LINK, UNI

#### Scenario: API3 币种支持

- **WHEN** 用户选择 API3 预言机
- **THEN** 系统显示 API3 支持的币种

#### Scenario: Chronicle 币种支持

- **WHEN** 用户选择 Chronicle 预言机
- **THEN** 系统显示 Chronicle 支持的币种: ETH, WBTC, USDC, DAI, LINK

#### Scenario: Tellor 币种支持

- **WHEN** 用户选择 Tellor 预言机
- **THEN** 系统显示 Tellor 支持的币种

#### Scenario: Pyth 币种支持

- **WHEN** 用户选择 Pyth 预言机
- **THEN** 系统显示 Pyth 支持的币种

### Requirement: 动态币种选择 UI

系统 SHALL 根据选择的预言机动态更新币种选择器

#### Scenario: 单预言机选择

- **WHEN** 用户选择单个预言机
- **THEN** 币种选择器仅显示该预言机支持的币种
- **AND** 不支持的币种被禁用或隐藏

#### Scenario: 多预言机选择

- **WHEN** 用户选择多个预言机
- **THEN** 币种选择器显示所有选中预言机共同支持的币种
- **OR** 显示所有选中预言机支持的币种的并集（带预言机标识）

#### Scenario: 币种不支持提示

- **WHEN** 用户选择某个币种但当前预言机不支持
- **THEN** 显示提示信息说明哪些预言机支持该币种

### Requirement: 预言机特性展示

系统 SHALL 在价格查询页面展示每个预言机的特性

#### Scenario: 实时数据标识

- **WHEN** 价格来自预言机实时链上数据
- **THEN** 显示"实时数据"标识

#### Scenario: 模拟数据标识

- **WHEN** 价格来自模拟数据
- **THEN** 显示"模拟数据"标识

#### Scenario: 数据源信息

- **WHEN** 显示价格结果
- **THEN** 展示数据来源（链上合约地址/API/模拟）

### Requirement: 链支持筛选

系统 SHALL 根据选择的预言机和币种动态更新链选择器

#### Scenario: Chainlink 链支持

- **WHEN** 用户选择 Chainlink 和某个币种
- **THEN** 显示该币种在 Chainlink 上支持的链

#### Scenario: 不支持链提示

- **WHEN** 用户选择某个链但当前预言机+币种不支持
- **THEN** 禁用该链选项或显示不支持提示

## MODIFIED Requirements

### Requirement: 价格查询页面重构

现有价格查询页面 SHALL 支持预言机特定的币种筛选

#### Scenario: 查询表单优化

- **WHEN** 用户打开价格查询页面
- **THEN** 显示优化后的查询表单
- **AND** 预言机选择器支持多选
- **AND** 币种选择器根据预言机动态更新

#### Scenario: 查询结果优化

- **WHEN** 显示查询结果
- **THEN** 展示每个结果的预言机来源
- **AND** 标识数据是实时还是模拟

### Requirement: 预言机客户端接口扩展

各预言机客户端 SHALL 提供支持的币种列表方法

#### Scenario: 获取支持币种

- **WHEN** 调用 `getSupportedSymbols()`
- **THEN** 返回该预言机支持的所有币种列表

#### Scenario: 获取链上支持币种

- **WHEN** 调用 `getSupportedSymbolsOnChain(chain)`
- **THEN** 返回该预言机在指定链上支持的币种列表

#### Scenario: 检查币种支持

- **WHEN** 调用 `isSymbolSupported(symbol, chain?)`
- **THEN** 返回该币种（在指定链上）是否被支持

## REMOVED Requirements

无
