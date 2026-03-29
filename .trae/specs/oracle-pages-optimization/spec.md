# 预言机页面架构优化分析 Spec

## Why

当前十个预言机页面（Chainlink、Pyth、Band Protocol、UMA、API3、RedStone、DIA、Tellor、Chronicle、WINkLink）采用相同的设计模式，但存在严重的代码重复、维护成本高、扩展性差等问题。需要进行架构层面的优化建议。

## What Changes

- 识别当前架构的核心问题
- 提供专业的优化建议
- 建议采用真正的模板化架构

## Impact

- Affected code:
  - `/src/app/[locale]/chainlink/`
  - `/src/app/[locale]/pyth/`
  - `/src/app/[locale]/band-protocol/`
  - `/src/app/[locale]/uma/`
  - `/src/app/[locale]/api3/`
  - `/src/app/[locale]/redstone/`
  - `/src/app/[locale]/dia/`
  - `/src/app/[locale]/tellor/`
  - `/src/app/[locale]/chronicle/`
  - `/src/app/[locale]/winklink/`
  - `/src/components/oracle/shared/OraclePageTemplate.tsx`
  - `/src/lib/config/oracles.tsx`

---

## 问题分析

### 问题 1: 严重的代码重复

**现状：** 每个预言机页面都有几乎相同的结构代码

**示例对比：**

```tsx
// chainlink/page.tsx (第1-141行)
// pyth/page.tsx (第1-143行)
// dia/page.tsx (第1-139行)
// uma/page.tsx (第1-182行)
// api3/page.tsx (第1-172行)
// redstone/page.tsx (第1-150行)
// chronicle/page.tsx (第1-149行)
```

所有页面都包含：

- 相同的 `isInitialLoading` 判断逻辑
- 相同的 `hasCriticalError` 判断逻辑
- 相同的 `renderContent()` switch-case 结构
- 相同的布局结构（Hero + Sidebar + MobileSidebar）
- 相同的错误边界和加载状态处理

**影响：**

- 修改一个功能需要在10个文件中重复修改
- 增加bug风险和维护成本
- 新增预言机需要复制大量代码

---

### 问题 2: 组件命名和结构重复

**现状：** 每个预言机都有一套独立的组件

| 预言机    | Hero 组件     | Sidebar 组件     | MarketView 组件     | NetworkView 组件     |
| --------- | ------------- | ---------------- | ------------------- | -------------------- |
| Chainlink | ChainlinkHero | ChainlinkSidebar | ChainlinkMarketView | ChainlinkNetworkView |
| Pyth      | PythHero      | PythSidebar      | PythMarketView      | PythNetworkView      |
| DIA       | DIAHero       | DIASidebar       | DIAMarketView       | DIANetworkView       |
| UMA       | UMAHero       | UmaSidebar       | UmaMarketView       | UmaNetworkView       |
| API3      | API3Hero      | API3Sidebar      | API3MarketView      | API3NetworkView      |
| ...       | ...           | ...              | ...                 | ...                  |

**问题：**

- 10个预言机 × 平均7个组件 = 约70个组件文件
- 大部分组件功能相同，只是主题色和标签不同
- 没有充分利用配置驱动的设计

---

### 问题 3: OraclePageTemplate 未被有效使用

**现状：** 存在 `OraclePageTemplate.tsx`（761行），但实际页面都没有使用它

**原因分析：**

1. 模板功能不够灵活，无法满足各预言机的差异化需求
2. 模板与配置系统（`oracles.tsx`）集成不完善
3. 缺乏动态组件加载机制

**当前模板的问题：**

```tsx
// OraclePageTemplate.tsx 中的硬编码逻辑
const getPageTitle = useCallback(() => {
  switch (config.provider) {
    case OracleProvider.BAND_PROTOCOL:
      return t(`band.pageTitles.${key}`);
    // ... 更多 case
  }
}, [activeTab, t, config.provider]);
```

---

### 问题 4: 配置系统未被充分利用

**现状：** `oracles.tsx` 定义了丰富的配置，但页面没有根据配置动态渲染

**配置中已定义但未使用的特性：**

```tsx
features: {
  hasNodeAnalytics: boolean;
  hasValidatorAnalytics: boolean;
  hasPublisherAnalytics: boolean;
  hasDisputeResolution: boolean;
  hasPriceFeeds: boolean;
  hasQuantifiableSecurity: boolean;
  hasFirstPartyOracle: boolean;
  hasCoreFeatures: boolean;
  hasDataStreams?: boolean;
  hasCrossChain?: boolean;
  hasRiskAssessment?: boolean;
}
```

**views 配置被忽略：**

```tsx
views: [
  {
    id: 'market',
    labelKey: 'chainlink.menu.marketData',
    component: 'ChainlinkMarketView',
    default: true,
  },
  // ... 这些配置没有被使用
];
```

---

### 问题 5: 数据获取逻辑分散

**现状：** 每个预言机都有独立的 hook

```
useChainlinkPage.ts
usePythPage.ts
useDIAPage.ts
useUmaPage.ts
useAPI3Page.ts
useRedStonePage.ts
useChroniclePage.ts
useTellorPage.ts
useBandProtocolPage.ts
useWINkLinkPage.ts
```

**问题：**

- 相似的数据获取逻辑重复10次
- 错误处理逻辑不一致
- 缓存策略不统一

---

### 问题 6: 类型定义重复

**现状：** 每个预言机都有独立的 types.ts

```tsx
// chainlink/types.ts
export type ChainlinkTabId =
  | 'market'
  | 'network'
  | 'nodes'
  | 'data-feeds'
  | 'services'
  | 'ecosystem'
  | 'risk';

// pyth/types.ts
export type PythTabId = 'market' | 'network' | 'publishers' | 'validators' | 'price-feeds' | 'risk';

// dia/types.ts
export type DIATabId =
  | 'market'
  | 'network'
  | 'data-feeds'
  | 'nft-data'
  | 'staking'
  | 'ecosystem'
  | 'risk';
```

**问题：**

- 类型定义分散，难以维护
- 没有统一的类型基础

---

### 问题 7: 国际化键值重复

**现状：** 每个预言机都有独立的翻译命名空间

```
chainlink.menu.marketData
pyth.menu.marketData
dia.menu.marketData
uma.menu.marketData
api3.menu.marketData
redstone.menu.marketData
```

**问题：**

- 大量重复的翻译内容
- 维护成本高

---

### 问题 8: 缺乏真正的差异化展示

**现状：** 虽然配置中定义了不同的 features，但页面展示没有体现这些差异

**示例：**

- Pyth 的 `hasPublisherAnalytics: true` 应该展示发布者相关内容
- UMA 的 `hasDisputeResolution: true` 应该突出争议解决机制
- API3 的 `hasFirstPartyOracle: true` 应该强调第一方预言机特性

---

## 优化建议

### 建议 1: 采用真正的模板化架构

**目标：** 创建一个可配置的通用页面模板，所有预言机共用

**实现方案：**

```tsx
// 统一的页面模板
<OraclePageTemplate config={oracleConfig}>
  <OracleHero />
  <OracleSidebar />
  <OracleContent />
</OraclePageTemplate>
```

**关键改进：**

1. 根据 `config.features` 动态渲染不同的 Tab
2. 根据 `config.views` 动态加载对应的组件
3. 统一的加载、错误、刷新逻辑

---

### 建议 2: 组件配置化

**目标：** 减少组件数量，通过配置驱动渲染

**实现方案：**

```tsx
// 通用组件 + 配置
<OracleHero
  config={config}
  themeColor={config.themeColor}
  icon={config.icon}
/>

// 而不是
<ChainlinkHero ... />
<PythHero ... />
<DIAHero ... />
```

---

### 建议 3: 动态组件加载

**目标：** 根据配置动态加载预言机特定的组件

**实现方案：**

```tsx
// 组件映射表
const componentRegistry = {
  ChainlinkMarketView: lazy(() => import('./chainlink/ChainlinkMarketView')),
  PythPublishersView: lazy(() => import('./pyth/PythPublishersView')),
  // ...
};

// 动态渲染
const ViewComponent = componentRegistry[viewConfig.component];
```

---

### 建议 4: 统一的数据获取 Hook

**目标：** 创建通用的数据获取 hook

**实现方案：**

```tsx
function useOraclePage(provider: OracleProvider) {
  const config = getOracleConfig(provider);

  return useQuery({
    queryKey: ['oracle', provider],
    queryFn: () => fetchOracleData(config),
    // 统一的缓存和错误处理
  });
}
```

---

### 建议 5: 特性驱动的 UI

**目标：** 根据 `features` 配置动态展示内容

**实现方案：**

```tsx
// 根据 features 自动生成 tabs
const tabs = generateTabsFromFeatures(config.features);

// 根据 features 条件渲染
{
  config.features.hasPublisherAnalytics && <PublisherPanel />;
}
{
  config.features.hasDisputeResolution && <DisputePanel />;
}
```

---

### 建议 6: 统一的国际化策略

**目标：** 减少翻译键值重复

**实现方案：**

```
// 通用键
oracleCommon.marketData
oracleCommon.networkHealth
oracleCommon.riskAssessment

// 预言机特定键
chainlink.specificFeature.nodes
pyth.specificFeature.publishers
```

---

### 建议 7: 差异化内容展示

**目标：** 让每个预言机的独特特性得到突出展示

**建议的差异化内容：**

| 预言机        | 核心特性     | 应突出的内容         |
| ------------- | ------------ | -------------------- |
| Chainlink     | 节点网络     | 节点分布、收益、性能 |
| Pyth          | 发布者       | 发布者可靠性、数据源 |
| UMA           | 争议解决     | 争议投票、验证机制   |
| API3          | 第一方预言机 | Airnode、dAPI        |
| RedStone      | 数据流       | 实时数据流、跨链     |
| Band Protocol | 跨链         | Cosmos 生态、验证者  |
| DIA           | NFT 数据     | NFT 价格、数据源     |
| Tellor        | 报告者       | 质押挖矿、争议       |
| Chronicle     | MakerDAO     | Scuttlebutt 协议     |
| WINkLink      | TRON 生态    | 游戏、TRON 集成      |

---

## 优先级建议

### 高优先级（立即改进）

1. **统一页面模板** - 消除代码重复
2. **配置驱动渲染** - 利用现有配置系统
3. **统一数据获取** - 提高一致性和可维护性

### 中优先级（短期改进）

4. **组件合并** - 减少组件数量
5. **国际化优化** - 减少翻译重复
6. **类型统一** - 建立类型基础

### 低优先级（长期优化）

7. **差异化展示** - 突出各预言机特性
8. **性能优化** - 懒加载、缓存策略
9. **测试覆盖** - 统一的测试策略

---

## 预期收益

| 指标           | 当前状态                  | 优化后                       |
| -------------- | ------------------------- | ---------------------------- |
| 页面代码行数   | ~150行/页面 × 10 = 1500行 | ~30行/页面 × 10 = 300行      |
| 组件文件数     | ~70个                     | ~20个通用 + ~30个特定 = 50个 |
| Hook 文件数    | 10个                      | 1个通用 + 少量特定           |
| 新增预言机成本 | 复制整个目录 + 修改       | 添加配置 + 特定组件          |
| 维护成本       | 高（10倍重复）            | 低（单一模板）               |
