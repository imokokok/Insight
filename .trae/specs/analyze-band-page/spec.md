# Band Protocol 页面分析与改进 Spec

## Why

Band Protocol 作为基于 Cosmos 的跨链数据预言机，其页面需要充分展现其独特特性：

1. **Cosmos 生态集成** - 基于 Cosmos SDK 构建，支持 IBC 跨链通信
2. **验证者网络** - 70+ 去中心化验证者保障网络安全
3. **跨链数据服务** - 支持多链数据请求和传输
4. **风险评估** - 需要展示验证者集中度、质押分布等风险指标

当前页面虽然基本功能已具备，但 Tab 功能区分可以更加明确，部分特性支持可以更完善。

## What Changes

### 1. Tab 功能区分优化

- **market**: 市场数据、价格图表、BAND 代币信息
- **network**: 网络健康度、验证者列表、链上事件监控、跨链价格一致性
- **cross-chain**: 跨链数据请求统计、IBC 信息、各链数据对比
- **ecosystem**: Cosmos 生态系统集成、IBC 连接、dApp 集成
- **risk**: 风险评估面板、验证者集中度、质押分布、风险缓解策略
- **cross-oracle**: 跨预言机对比分析

### 2. 新增功能支持

- **Staking Tab**: Band Protocol 有质押机制，应增加 Staking 面板展示质押数据
- **Validators Tab**: 专门的验证者分析 Tab，与 network 中的验证者列表区分
- **Data Feeds Tab**: 展示支持的数据源和价格喂价

### 3. 现有组件完善

- 完善 i18n 翻译键值
- 优化组件数据展示
- 增强跨链价格一致性组件功能

## Impact

- Affected specs: Band Protocol 页面配置、Tab 导航、i18n 翻译
- Affected code:
  - `src/lib/config/oracles.tsx` - Tab 配置
  - `src/components/oracle/common/OraclePageTemplate.tsx` - Tab 内容渲染
  - `src/i18n/zh-CN.json` / `src/i18n/en.json` - 翻译键值
  - 新增/完善 Panel 组件

## ADDED Requirements

### Requirement: Staking Tab 支持

The system SHALL provide a dedicated Staking tab for Band Protocol to display staking-related data.

#### Scenario: Staking data display

- **WHEN** user navigates to the Staking tab
- **THEN** the system displays staking metrics including total staked, staking APR, validator staking distribution

### Requirement: Validators Tab 支持

The system SHALL provide a dedicated Validators tab for detailed validator analytics.

#### Scenario: Validator analytics display

- **WHEN** user navigates to the Validators tab
- **THEN** the system displays validator list, performance ranking, geographic distribution, earnings analysis

### Requirement: Data Feeds Tab 支持

The system SHALL provide a Data Feeds tab to show supported price feeds and data sources.

#### Scenario: Data feeds display

- **WHEN** user navigates to the Data Feeds tab
- **THEN** the system displays supported trading pairs, update frequency, data source distribution

## MODIFIED Requirements

### Requirement: Tab 配置优化

The system SHALL clearly distinguish between different tabs for Band Protocol.

#### Current Tab 配置:

```
- market: 市场数据
- network: 网络健康度 + 验证者 + 链上事件 + 跨链价格一致性
- cross-chain: 跨链数据请求统计
- ecosystem: 生态系统
- risk: 风险评估
- cross-oracle: 跨预言机对比
```

#### Optimized Tab 配置:

```
- market: 市场数据（价格、图表、代币信息）
- network: 网络健康度（节点状态、网络统计）
- validators: 验证者分析（列表、排名、地理分布）
- cross-chain: 跨链数据（IBC 统计、各链请求）
- data-feeds: 数据喂价（支持的交易对、数据源）
- staking: 质押数据（质押量、APR、分布）
- ecosystem: 生态系统（Cosmos 集成、dApp）
- risk: 风险评估（集中度、风险指标）
- cross-oracle: 跨预言机对比
```

## REMOVED Requirements

None - 所有现有功能保留，仅进行优化和扩展
