# RedStone 页面 Tab 分类审查规格

## Why
RedStone 作为一个模块化预言机解决方案，其页面 tab 分类需要准确反映其核心功能特性。当前 tab 分类可能存在与 RedStone 实际特性不匹配的问题，需要进行审查和优化。

## What Changes
- 分析当前 RedStone 页面的 tab 分类结构
- 对比 RedStone 实际功能特性与 tab 分类的匹配度
- 识别缺失或冗余的 tab
- 提出 tab 分类优化建议

## Impact
- 影响页面: `/src/app/redstone/page.tsx`
- 影响配置: `/src/lib/config/oracles.tsx`
- 影响国际化: `/src/i18n/zh-CN.json`, `/src/i18n/en.json`

## ADDED Requirements
### Requirement: Tab 分类合理性审查
系统 SHALL 对 RedStone 页面的 tab 分类进行全面审查，确保分类符合 RedStone 的产品特性。

#### Scenario: 当前 Tab 结构分析
- **GIVEN** RedStone 页面当前的 tab 配置
- **WHEN** 审查每个 tab 的内容和目的
- **THEN** 能够识别分类是否合理

#### Scenario: 与产品特性匹配度评估
- **GIVEN** RedStone 作为模块化预言机的核心特性
- **WHEN** 对比 tab 分类与功能特性
- **THEN** 能够评估匹配度并提出改进建议

## 当前 Tab 分类分析

### 现有 Tabs (5个)
1. **market** (市场数据) - `redstone.tabs.market`
2. **network** (网络健康) - `redstone.tabs.network`
3. **ecosystem** (生态系统) - `redstone.tabs.ecosystem`
4. **risk** (风险评估) - `redstone.tabs.risk`
5. **cross-oracle** (跨预言机对比) - `redstone.tabs.crossOracle`

### RedStone 核心特性
根据代码分析，RedStone 具有以下特性标识：
- `hasPriceFeeds: true` - 支持价格源
- `hasCoreFeatures: true` - 具有核心功能
- 支持 12 条链 (Ethereum, Arbitrum, Optimism, Polygon, Avalanche, Base, BNB, Fantom, Linea, Mantle, Scroll, zkSync)
- 模块化架构

### 问题识别

#### 问题 1: 缺少数据提供者 Tab
- **现状**: RedStone 有 `hasPriceFeeds: true` 特性，但没有专门的 "数据提供者" 或 "数据源" tab
- **对比**: Pyth 有 `publishers` tab，API3 有 `airnode` tab
- **建议**: 考虑添加 "数据提供者" tab 展示 RedStone 的数据源信息

#### 问题 2: Ecosystem Tab 内容单薄
- **现状**: ecosystem tab 只显示简单的集成列表，信息有限
- **建议**: 可以丰富内容，或考虑与其他 tab 合并

#### 问题 3: Cross-Oracle Tab 内容为空
- **现状**: cross-oracle tab 只显示占位文本，没有实际功能
- **代码**: 
  ```tsx
  {activeTab === 'cross-oracle' && (
    <DashboardCard title={t('redstone.crossOracle.title')}>
      <p className="text-gray-600">{t('redstone.crossOracle.description')}</p>
    </DashboardCard>
  )}
  ```
- **建议**: 实现跨预言机对比功能，或暂时移除该 tab

#### 问题 4: 国际化配置不完整
- **现状**: en.json 中只有 3 个 tab 的翻译 (overview, providers, feeds)，但实际使用了 5 个 tab
- **建议**: 统一国际化配置

### 优化建议

#### 建议 1: 重新设计 Tab 结构
建议的 Tab 分类：
1. **market** - 市场数据 (保留)
2. **network** - 网络健康 (保留)
3. **providers** - 数据提供者 (新增，利用 hasPriceFeeds 特性)
4. **ecosystem** - 生态系统 (保留，丰富内容)
5. **risk** - 风险评估 (保留)

#### 建议 2: 暂时隐藏 cross-oracle
- 直到功能实现完成前，暂时从 tabs 数组中移除

#### 建议 3: 统一国际化配置
- 更新 en.json 和 zh-CN.json，确保所有 tab 标签都有翻译

## MODIFIED Requirements
### Requirement: Tab 配置更新
更新 RedStone 的 tab 配置，使其更符合产品特性。

## REMOVED Requirements
### Requirement: Cross-Oracle Tab
**Reason**: 功能尚未实现，仅显示占位文本
**Migration**: 功能实现后重新添加
