# DIA页面改造Spec - 充分展示DIA特性

## Why
DIA作为开源跨链数据预言机平台，拥有独特的数据源透明度、NFT数据支持、自定义数据馈送等核心特性。当前页面未能充分展示这些差异化特性，需要通过改造让用户更直观地了解DIA的价值主张。

## What Changes

### Tab结构重构
- **BREAKING** 重新设计Tab结构，从6个优化为7个，功能边界更清晰：
  1. **market** - 市场数据（保留）
  2. **network** - 网络健康（保留）
  3. **data-feeds** - 数据馈送（新增，合并原data-sources和cross-chain）
  4. **nft-data** - NFT数据（新增，展示DIA NFT地板价特色）
  5. **staking** - 质押详情（新增，替代统计卡片中的简单展示）
  6. **ecosystem** - 生态系统（增强）
  7. **risk** - 风险评估（保留）

### 新增Panel组件
- **BREAKING** 创建 `DIANFTDataPanel` - NFT地板价数据展示
- **BREAKING** 创建 `DIAStakingPanel` - 质押详情和计算器
- **BREAKING** 创建 `DIADataFeedsPanel` - 统一的数据馈送展示（替代原有分散的data-sources和cross-chain）
- **BREAKING** 创建 `DIAEcosystemPanel` - 增强版生态系统展示

### 数据层扩展
- **BREAKING** 在 `dia.ts` 中新增NFT数据接口
- **BREAKING** 在 `dia.ts` 中新增质押详情接口
- **BREAKING** 在 `dia.ts` 中新增自定义数据馈送接口
- **BREAKING** 在 `useDIAData.ts` 中新增对应hooks

### 配置与国际化
- **BREAKING** 更新 `oracles.tsx` 中的DIA tabs配置
- **BREAKING** 更新 `zh-CN.json` 和 `en.json` 中的DIA相关翻译

## Impact
- Affected specs: DIA页面用户体验、特性展示完整性
- Affected code:
  - `/src/app/dia/page.tsx` - 主页面重构
  - `/src/components/oracle/panels/DIANFTDataPanel.tsx` - 新增
  - `/src/components/oracle/panels/DIAStakingPanel.tsx` - 新增
  - `/src/components/oracle/panels/DIADataFeedsPanel.tsx` - 新增
  - `/src/components/oracle/panels/DIAEcosystemPanel.tsx` - 新增
  - `/src/hooks/useDIAData.ts` - 扩展
  - `/src/lib/oracles/dia.ts` - 扩展
  - `/src/lib/config/oracles.tsx` - 修改
  - `/src/i18n/zh-CN.json` - 扩展
  - `/src/i18n/en.json` - 扩展

## ADDED Requirements

### Requirement: NFT数据展示
The system SHALL provide comprehensive NFT floor price data display for DIA.

#### Scenario: NFT数据浏览
- **WHEN** 用户切换到nft-data tab
- **THEN** 看到热门NFT集合的地板价数据
- **AND** 看到价格趋势图表
- **AND** 看到链分布统计

#### Scenario: NFT数据筛选
- **WHEN** 用户选择不同链或NFT类型
- **THEN** 数据实时过滤显示
- **AND** 图表同步更新

### Requirement: 质押详情展示
The system SHALL provide detailed staking information and calculator.

#### Scenario: 质押信息查看
- **WHEN** 用户切换到staking tab
- **THEN** 看到当前APR、总质押量、质押者数量
- **AND** 看到质押收益计算器
- **AND** 看到质押历史趋势

#### Scenario: 收益计算
- **WHEN** 用户输入质押金额和期限
- **THEN** 实时计算预期收益
- **AND** 显示收益明细

### Requirement: 统一数据馈送展示
The system SHALL provide unified data feeds display combining sources and cross-chain coverage.

#### Scenario: 数据馈送浏览
- **WHEN** 用户切换到data-feeds tab
- **THEN** 看到所有数据馈送列表
- **AND** 看到按链筛选功能
- **AND** 看到数据质量评分

#### Scenario: 数据馈送详情
- **WHEN** 用户点击某个数据馈送
- **THEN** 展开显示详细信息
- **AND** 包括数据源、更新频率、置信度等

### Requirement: 增强生态系统展示
The system SHALL provide enhanced ecosystem integration display.

#### Scenario: 生态系统浏览
- **WHEN** 用户切换到ecosystem tab
- **THEN** 看到集成的DeFi协议列表
- **AND** 看到按类别分类（DEX、借贷、衍生品等）
- **AND** 看到集成深度指标

## MODIFIED Requirements

### Requirement: DIA主页面重构
**Current**: 6个tabs，data-sources和cross-chain分离
**Modified**: 7个tabs，功能边界更清晰，新增NFT和Staking专属tab

### Requirement: 统计卡片优化
**Current**: 4个基础统计卡片
**Modified**: 根据当前tab动态显示相关统计指标

## REMOVED Requirements
无
