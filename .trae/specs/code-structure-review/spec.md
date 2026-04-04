# 代码结构审查与优化建议 Spec

## Why

当前项目代码结构存在多处不一致和潜在问题，影响代码可维护性、可扩展性和开发效率。需要进行系统性的结构优化，建立清晰的架构边界和规范。

## What Changes

* 统一状态管理目录结构

* 整合分散的工具函数目录

* 规范化 hooks 组织方式

* 优化组件目录结构

* 统一类型定义位置

* 完善依赖注入系统

* 补充国际化支持

## Impact

* Affected specs: 整体项目架构

* Affected code: src/ 目录下大部分文件

## 发现的问题

### 1. 状态管理目录缺失

**问题描述**: 架构文档中提到了 Zustand stores（authStore, uiStore, realtimeStore, crossChainStore），但项目中未找到对应的 store 文件。

**当前状态**:

```
src/
├── hooks/          # 大量 hooks，但缺少 store
├── lib/            # 工具库
├── providers/      # 只有 ReactQueryProvider
└── (无 store 目录)
```

**建议结构**:

```
src/
├── store/
│   ├── index.ts
│   ├── authStore.ts
│   ├── uiStore.ts
│   ├── realtimeStore.ts
│   ├── crossChainStore.ts
│   └── selectors/
│       └── index.ts
```

### 2. 工具函数目录分散

**问题描述**: `src/utils` 和 `src/lib/utils` 同时存在，职责边界不清晰。

**当前状态**:

```
src/
├── utils/              # 只有 3 个文件
│   ├── chartExport.ts
│   ├── downsampling.ts
│   └── urlParams.ts
└── lib/
    └── utils/          # 大量工具函数
        ├── format.ts
        ├── timestamp.ts
        ├── statistics.ts
        └── ...
```

**建议**: 合并到 `src/lib/utils/`，删除 `src/utils/` 目录。

### 3. Hooks 组织混乱

**问题描述**: hooks 数量过多（50+），组织方式不一致，根目录和子目录都有 hooks。

**当前状态**:

```
src/hooks/
├── index.ts                    # 334 行导出
├── useOracleData.ts           # 根目录
├── usePriceHistory.ts         # 根目录
├── oracles/                   # 子目录
│   ├── chainlink.ts
│   ├── pyth.ts
│   └── ...
├── queries/                   # 子目录
│   ├── useOracleData.ts       # 与根目录重名
│   └── ...
└── realtime/                  # 子目录
    └── ...
```

**问题点**:

1. `useOracleData.ts` 在根目录和 `queries/` 目录都存在
2. `usePriceHistory.ts` 在根目录和 `queries/` 目录都存在
3. 缺少清晰的分类标准

**建议结构**:

```
src/hooks/
├── index.ts                    # 统一导出
├── data/                       # 数据获取相关
│   ├── useOracleData.ts
│   ├── usePriceHistory.ts
│   └── index.ts
├── oracles/                    # Oracle 特定 hooks
│   ├── chainlink/
│   ├── pyth/
│   ├── api3/
│   └── index.ts
├── ui/                         # UI 相关 hooks
│   ├── useChartZoom.ts
│   ├── useKeyboardShortcuts.ts
│   └── index.ts
├── realtime/                   # 实时数据 hooks
│   ├── useWebSocket.ts
│   ├── useRealtimePrice.ts
│   └── index.ts
└── utils/                      # 工具 hooks
    ├── useDebounce.ts
    ├── usePreferences.ts
    └── index.ts
```

### 4. 组件目录结构问题

**问题描述**: 页面级组件与路由耦合，导致组件重复和难以复用。

**当前状态**:

```
src/app/[locale]/
├── chainlink/
│   ├── components/             # Chainlink 专属组件
│   │   ├── ChainlinkHero.tsx
│   │   ├── ChainlinkSidebar.tsx
│   │   └── ...
│   └── page.tsx
├── pyth/
│   ├── components/             # Pyth 专属组件
│   │   ├── PythHero.tsx
│   │   ├── PythSidebar.tsx
│   │   └── ...
│   └── page.tsx
└── ... (每个 oracle 都有类似结构)
```

**问题点**:

1. Hero、Sidebar 等组件模式高度相似，但各自实现
2. 组件难以跨 oracle 复用
3. 违反 DRY 原则

**建议**: 创建统一的 Oracle 页面模板组件

```
src/components/oracle/
├── templates/
│   ├── OraclePageTemplate.tsx
│   ├── OracleHero.tsx
│   ├── OracleSidebar.tsx
│   └── index.ts
├── charts/
├── panels/
└── index.ts
```

### 5. 类型定义分散

**问题描述**: 类型定义分布在 `src/types/` 和 `src/lib/oracles/` 等多个位置。

**当前状态**:

```
src/
├── types/
│   ├── api/
│   ├── auth/
│   ├── oracle/
│   └── ui/
└── lib/
    └── oracles/
        ├── types.ts            # API3 types
        ├── types.ts            # DIA types
        └── ...
```

**建议**: 集中管理类型定义

```
src/types/
├── index.ts
├── api/
│   ├── requests.ts
│   └── responses.ts
├── oracle/
│   ├── common.ts
│   ├── chainlink.ts
│   ├── pyth.ts
│   └── ...
├── ui/
└── store/
```

### 6. Performance 组件目录内容单薄

**问题描述**: `src/components/performance/` 只有一个组件。

**当前状态**:

```
src/components/performance/
├── index.ts
└── OptimizedImage.tsx
```

**建议**:

* 要么扩展该目录，添加更多性能优化组件

* 要么将 OptimizedImage 移至 `src/components/ui/`

### 7. 服务层组织问题

**问题描述**: 服务层分布在多个位置，缺乏统一组织。

**当前状态**:

```
src/
├── lib/
│   ├── services/              # 通用服务
│   │   ├── marketData/
│   │   └── oracle/
│   └── oracles/               # Oracle 客户端（也是服务）
│       ├── chainlink.ts
│       ├── pyth.ts
│       └── ...
└── (无顶层 services 目录)
```

**建议**: 统一服务层结构

```
src/lib/services/
├── index.ts
├── oracle/
│   ├── clients/
│   │   ├── BaseOracleClient.ts
│   │   ├── ChainlinkClient.ts
│   │   └── ...
│   ├── OracleClientFactory.ts
│   └── index.ts
├── market/
│   ├── MarketDataService.ts
│   └── index.ts
├── alert/
│   ├── AlertService.ts
│   └── index.ts
└── websocket/
    ├── WebSocketManager.ts
    └── index.ts
```

### 8. 依赖注入系统不完整

**问题描述**: DI Container 已实现，但服务注册分散。

**当前状态**:

```typescript
// Container 已实现
export class Container implements ContainerInterface {
  register<T>(token: string, factory: ServiceFactory<T>, singleton: boolean): void;
  resolve<T>(token: string): T;
}

// 但缺少统一的服务注册
```

**建议**: 创建统一的服务注册文件

```typescript
// src/lib/di/registerServices.ts
export function registerServices(container: Container) {
  container.register(TOKENS.OracleClientFactory, () => new OracleClientFactory());
  container.register(TOKENS.AlertService, () => new AlertService());
  // ...
}
```

### 9. 国际化支持不完整

**问题描述**: 只有英文翻译，缺少其他语言支持。

**当前状态**:

```
src/i18n/messages/
└── en/                        # 只有英文
    ├── common.json
    └── ...
```

**建议**: 添加更多语言支持

```
src/i18n/messages/
├── en/
├── zh/
├── ja/
└── ko/
```

### 10. API 层缺少统一封装使用

**问题描述**: API Client 已实现，但页面中直接使用 fetch 或 axios。

**建议**: 统一使用 ApiClient

```typescript
// 推荐
import { apiClient } from '@/lib/api';

const data = await apiClient.get('/api/oracles/chainlink');
```

## 优化建议总结

### 高优先级

1. **创建 store 目录**：实现文档中描述的 Zustand stores
2. **整合 utils 目录**：合并 `src/utils` 到 `src/lib/utils`
3. **重构 hooks 组织**：按功能分类，消除重名文件

### 中优先级

1. **创建 Oracle 页面模板**：减少组件重复
2. **统一类型定义位置**：集中管理类型
3. **完善服务层结构**：统一服务组织

### 低优先级

1. **完善依赖注入系统**：统一服务注册
2. **扩展国际化支持**：添加更多语言
3. **统一 API 调用方式**：使用 ApiClient

## 架构优化建议图

```
优化后的目录结构:

src/
├── app/                    # Next.js App Router
│   ├── [locale]/
│   └── api/
├── components/             # 组件
│   ├── ui/                 # 基础 UI 组件
│   ├── oracle/             # Oracle 相关组件
│   │   ├── templates/      # 页面模板
│   │   ├── charts/
│   │   └── panels/
│   ├── charts/
│   ├── navigation/
│   └── ...
├── hooks/                  # 自定义 Hooks
│   ├── data/
│   ├── oracles/
│   ├── ui/
│   ├── realtime/
│   └── utils/
├── lib/                    # 核心库
│   ├── api/               # API 层
│   ├── di/                # 依赖注入
│   ├── services/          # 服务层
│   ├── utils/             # 工具函数
│   └── config/            # 配置
├── store/                  # Zustand Stores
│   ├── authStore.ts
│   ├── uiStore.ts
│   └── ...
├── types/                  # 类型定义
│   ├── api/
│   ├── oracle/
│   ├── ui/
│   └── store/
├── i18n/                   # 国际化
│   ├── messages/
│   │   ├── en/
│   │   ├── zh/
│   │   └── ...
│   └── config.ts
└── providers/              # React Providers
    ├── ReactQueryProvider.tsx
    ├── StoreProvider.tsx
    └── index.ts
```

## ADDED Requirements

### Requirement: 统一的目录结构规范

系统 SHALL 遵循清晰的目录结构规范，每个目录职责明确。

#### Scenario: 新增功能模块

* **WHEN** 开发者需要添加新的功能模块

* **THEN** 能够根据目录结构快速定位应该放置的位置

### Requirement: 一致的命名规范

系统 SHALL 使用一致的文件和目录命名规范。

#### Scenario: 创建新组件

* **WHEN** 创建新的 React 组件

* **THEN** 文件名使用 PascalCase，目录名使用 kebab-case

### Requirement: 清晰的模块边界

系统 SHALL 保持模块间的清晰边界，避免循环依赖。

#### Scenario: 模块间依赖

* **WHEN** 一个模块需要依赖另一个模块

* **THEN** 依赖关系应该是单向的，从高层模块指向低层模块

