# 预言机页面模板化架构实施 Spec

## Why

根据分析结果，当前十个预言机页面存在严重的代码重复（约1500行重复代码）、70个功能相似的组件、配置系统未被充分利用等问题。需要实施模板化架构来消除重复、提高可维护性、降低新增预言机的成本。

## What Changes

- 创建真正可配置的通用页面模板 `OraclePageTemplate`
- 实现配置驱动的 Tab 和组件渲染
- 创建统一的数据获取 Hook `useOraclePage`
- 合并重复组件，创建通用组件
- 重构现有预言机页面使用新模板

## Impact

- Affected specs: oracle-pages-optimization（分析已完成）
- Affected code:
  - `/src/components/oracle/shared/OraclePageTemplate.tsx` - 重构
  - `/src/hooks/useOraclePage.ts` - 新建
  - `/src/lib/config/oracles.tsx` - 扩展配置
  - `/src/app/[locale]/chainlink/page.tsx` - 重构
  - `/src/app/[locale]/pyth/page.tsx` - 重构
  - `/src/app/[locale]/band-protocol/page.tsx` - 重构
  - `/src/app/[locale]/uma/page.tsx` - 重构
  - `/src/app/[locale]/api3/page.tsx` - 重构
  - `/src/app/[locale]/redstone/page.tsx` - 重构
  - `/src/app/[locale]/dia/page.tsx` - 重构
  - `/src/app/[locale]/tellor/page.tsx` - 重构
  - `/src/app/[locale]/chronicle/page.tsx` - 重构
  - `/src/app/[locale]/winklink/page.tsx` - 重构

---

## ADDED Requirements

### Requirement: 统一的预言机页面模板

系统 SHALL 提供一个可配置的通用页面模板，支持所有预言机共用。

#### Scenario: 使用模板渲染预言机页面

- **WHEN** 用户访问任意预言机页面
- **THEN** 系统使用 `OraclePageTemplate` 根据 `oracleConfig` 动态渲染页面
- **AND** 页面包含 Hero、Sidebar、Content 三个核心区域
- **AND** 加载状态、错误处理、刷新逻辑统一处理

### Requirement: 配置驱动的 Tab 渲染

系统 SHALL 根据配置动态渲染 Tab 导航。

#### Scenario: 根据 features 生成 Tab

- **WHEN** `config.features.hasPublisherAnalytics` 为 true
- **THEN** 显示 "发布者" Tab
- **WHEN** `config.features.hasValidatorAnalytics` 为 true
- **THEN** 显示 "验证者" Tab
- **WHEN** `config.features.hasDisputeResolution` 为 true
- **THEN** 显示 "争议解决" Tab

### Requirement: 动态组件加载

系统 SHALL 支持根据配置动态加载预言机特定组件。

#### Scenario: 加载特定视图组件

- **WHEN** 用户切换到某个 Tab
- **THEN** 系统根据 `config.views` 配置动态加载对应组件
- **AND** 组件懒加载以优化性能

### Requirement: 统一的数据获取 Hook

系统 SHALL 提供统一的 `useOraclePage` Hook。

#### Scenario: 使用统一 Hook 获取数据

- **WHEN** 预言机页面调用 `useOraclePage(provider)`
- **THEN** 返回统一格式的数据结构
- **AND** 包含 price、historicalData、networkStats 等
- **AND** 包含 isLoading、isError、refresh 等状态和方法

### Requirement: 通用组件库

系统 SHALL 提供通用组件替代重复的预言机特定组件。

#### Scenario: 使用通用 Hero 组件

- **WHEN** 渲染预言机 Hero 区域
- **THEN** 使用 `OracleHero` 组件
- **AND** 根据 `config.themeColor` 和 `config.icon` 定制外观

---

## MODIFIED Requirements

### Requirement: OracleConfig 扩展

配置 SHALL 包含完整的视图映射和组件定义。

```tsx
interface OracleConfig {
  // ... 现有字段

  // 新增：视图组件映射
  viewComponents: {
    [viewId: string]: {
      component: React.ComponentType;
      loader?: () => Promise<React.ComponentType>;
    };
  };

  // 新增：默认数据获取器
  dataFetcher?: (config: OracleConfig) => Promise<OraclePageData>;
}
```

### Requirement: 页面文件简化

每个预言机页面文件 SHALL 简化为配置传递。

```tsx
// 重构后的页面示例
export default function ChainlinkPage() {
  return <OraclePageTemplate provider={OracleProvider.CHAINLINK} />;
}
```

---

## REMOVED Requirements

### Requirement: 独立的页面 Hook 文件

**Reason**: 统一使用 `useOraclePage` 替代
**Migration**:

- 删除 `useChainlinkPage.ts`、`usePythPage.ts` 等
- 迁移特定逻辑到配置或组件中

### Requirement: 重复的 Hero/Sidebar 组件

**Reason**: 使用通用组件替代
**Migration**:

- 保留 `ChainlinkHero` 等作为可选的特定组件
- 默认使用 `OracleHero` 通用组件
