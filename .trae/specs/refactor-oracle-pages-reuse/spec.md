# Oracle 页面代码复用重构 Spec

## Why
代码库中存在 8 个 Oracle 页面（api3, chainlink, chronicle, dia, pyth-network, redstone, tellor, winklink）具有高度相似的代码结构，而 band-protocol 和 uma 页面已经成功使用了 `OraclePageTemplate` 模板组件，仅用 10 行代码就实现了相同功能。将这些页面迁移到模板可以减少约 1500+ 行重复代码，提高代码可维护性。

## What Changes
- 将 api3/page.tsx 迁移到使用 OraclePageTemplate
- 将 chainlink/page.tsx 迁移到使用 OraclePageTemplate
- 将 chronicle/page.tsx 迁移到使用 OraclePageTemplate
- 将 dia/page.tsx 迁移到使用 OraclePageTemplate
- 将 pyth-network/page.tsx 迁移到使用 OraclePageTemplate
- 将 redstone/page.tsx 迁移到使用 OraclePageTemplate
- 将 tellor/page.tsx 迁移到使用 OraclePageTemplate
- 将 winklink/page.tsx 迁移到使用 OraclePageTemplate
- 完善各 Oracle 的 PanelConfig 配置以支持特定 Tab 渲染

## Impact
- Affected specs: Oracle 页面组件
- Affected code:
  - `src/app/[locale]/api3/page.tsx`
  - `src/app/[locale]/chainlink/page.tsx`
  - `src/app/[locale]/chronicle/page.tsx`
  - `src/app/[locale]/dia/page.tsx`
  - `src/app/[locale]/pyth-network/page.tsx`
  - `src/app/[locale]/redstone/page.tsx`
  - `src/app/[locale]/tellor/page.tsx`
  - `src/app/[locale]/winklink/page.tsx`
  - `src/components/oracle/common/oraclePanels/*.ts` (PanelConfig 配置文件)

## ADDED Requirements

### Requirement: Oracle 页面模板化
所有 Oracle 页面 SHALL 使用 `OraclePageTemplate` 组件进行渲染，通过配置驱动的方式实现页面功能。

#### Scenario: API3 页面迁移
- **WHEN** 用户访问 /api3 页面
- **THEN** 页面应通过 OraclePageTemplate 渲染，显示所有原有功能（market, network, airnode, dapi, staking, advantages, analytics, gas, risk, cross-oracle, ecosystem tabs）

#### Scenario: Chainlink 页面迁移
- **WHEN** 用户访问 /chainlink 页面
- **THEN** 页面应通过 OraclePageTemplate 渲染，显示所有原有功能（market, network, nodes, data-feeds, services, ecosystem, risk, cross-oracle tabs）

#### Scenario: Chronicle 页面迁移
- **WHEN** 用户访问 /chronicle 页面
- **THEN** 页面应通过 OraclePageTemplate 渲染，显示所有原有功能

#### Scenario: DIA 页面迁移
- **WHEN** 用户访问 /dia 页面
- **THEN** 页面应通过 OraclePageTemplate 渲染，显示所有原有功能

#### Scenario: Pyth Network 页面迁移
- **WHEN** 用户访问 /pyth-network 页面
- **THEN** 页面应通过 OraclePageTemplate 渲染，显示所有原有功能

#### Scenario: RedStone 页面迁移
- **WHEN** 用户访问 /redstone 页面
- **THEN** 页面应通过 OraclePageTemplate 渲染，显示所有原有功能

#### Scenario: Tellor 页面迁移
- **WHEN** 用户访问 /tellor 页面
- **THEN** 页面应通过 OraclePageTemplate 渲染，显示所有原有功能

#### Scenario: WINkLink 页面迁移
- **WHEN** 用户访问 /winklink 页面
- **THEN** 页面应通过 OraclePageTemplate 渲染，显示所有原有功能（market, network, tron, staking, gaming, risk tabs）

### Requirement: PanelConfig 配置完善
每个 Oracle 的 PanelConfig SHALL 包含完整的 Tab 渲染配置，以支持特定功能。

#### Scenario: Stats 配置
- **WHEN** OraclePageTemplate 渲染 stats 区域
- **THEN** 应使用 PanelConfig.getStats() 获取特定 Oracle 的统计数据

#### Scenario: 特定 Tab 渲染
- **WHEN** 用户切换到特定 Tab
- **THEN** 应调用 PanelConfig 中对应的 render 方法（如 renderMarketTab, renderNetworkTab 等）

## MODIFIED Requirements
无

## REMOVED Requirements
无
