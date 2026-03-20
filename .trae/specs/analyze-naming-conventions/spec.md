# 命名规范分析与优化建议 Spec

## Why
项目的变量、函数、文件和文件夹命名存在一些不一致和不规范的地方，影响了代码的可读性和维护性。通过统一命名规范，可以提高代码专业度，降低新成员上手成本，减少沟通成本。

## What Changes
- 分析现有命名规范问题
- 提供具体的命名优化建议
- 统一文件命名风格
- 统一变量和函数命名风格
- 统一类型定义命名

## Impact
- 受影响范围：src/ 目录下所有 TypeScript/TSX 文件
- 关键系统：oracles、hooks、types、components

## ADDED Requirements

### Requirement: 命名规范分析
The system SHALL 提供全面的命名规范分析报告，包括文件命名、变量命名、函数命名、类型命名等方面的问题识别和优化建议。

#### Scenario: 文件命名分析
- **WHEN** 分析 src/ 目录下的文件命名
- **THEN** 识别出命名不一致的文件（如 camelCase vs PascalCase vs kebab-case）
- **AND** 提供统一的命名建议

#### Scenario: 变量命名分析
- **WHEN** 分析代码中的变量命名
- **THEN** 识别出不规范或模糊的变量名
- **AND** 提供更清晰的命名建议

#### Scenario: 函数命名分析
- **WHEN** 分析代码中的函数/方法命名
- **THEN** 识别出不符合语义或重复的命名
- **AND** 提供更准确的命名建议

#### Scenario: 类型定义命名分析
- **WHEN** 分析 TypeScript 类型定义
- **THEN** 识别出命名不一致或重复的类型
- **AND** 提供统一的类型命名建议

## 发现的主要问题

### 1. 文件命名不一致

| 文件 | 当前命名 | 问题 | 建议 |
|------|----------|------|------|
| `bandProtocol.ts` | camelCase | 与其他 oracle 文件不一致 | 改为 `band-protocol.ts` 或统一为 camelCase |
| `pythNetwork.ts` | camelCase | 同上 | 同上 |
| `pythHermesClient.ts` | camelCase | 同上 | 同上 |
| `winklink.ts` | 小写 | WINkLink 品牌名被简化 | 改为 `wink-link.ts` 或保持 `winklink.ts` |

### 2. 类型定义命名问题

| 位置 | 当前命名 | 问题 | 建议 |
|------|----------|------|------|
| `uma/types.ts` | `UMAMetworkStats` | 拼写错误（缺少 N） | 改为 `UMANetworkStats` |
| `bandProtocol.ts` | `BandMarketData` | 命名过于宽泛 | 改为 `BandProtocolMarketData` |
| `winklink.ts` | `TRONNetworkStats` | 使用链名而非 Oracle 名 | 改为 `WINkLinkTRONNetworkStats` 或 `WINkLinkNetworkStats` |
| `winklink.ts` | `GamingData` | 过于宽泛 | 改为 `WINkLinkGamingData` |

### 3. 变量命名问题

| 位置 | 当前命名 | 问题 | 建议 |
|------|----------|------|------|
| `api3.ts` | `DapiCoverage` | Dapi 应为 dAPI（品牌规范） | 改为 `DAPICoverage` 或 `DApiCoverage` |
| `api3.ts` | `DapiPriceDeviation` | 同上 | 改为 `DAPIPriceDeviation` |
| `bandProtocol.ts` | `CrossChainSnapshot` | 与 cross-chain 功能混淆 | 改为 `BandCrossChainSnapshot` |

### 4. 函数/Hook 命名问题

| 位置 | 当前命名 | 问题 | 建议 |
|------|----------|------|------|
| `hooks/index.ts` | `useAPI3Price` | API3 缩写大小写不一致 | 统一为 `useApi3Price` 或 `useAPI3Price` |
| `hooks/index.ts` | `useTellorPrice` | 与其他 useAPI3Price 风格一致 | 保持，但建议统一风格 |
| `hooks/index.ts` | `useUMARealtime` | UMA 全大写 | 建议统一为 `useUmaRealtime` 或保持 `useUMARealtime` |

### 5. 导出命名不一致

| 位置 | 当前命名 | 问题 | 建议 |
|------|----------|------|------|
| `oracles/index.ts` | `WINkLinkClient` | 导出名称与文件名 `winklink.ts` 不一致 | 统一为 `WINkLinkClient` 或 `WinklinkClient` |

### 6. 接口命名风格不一致

```typescript
// 有些使用 I 前缀（接口）
interface IOracleClient { }

// 有些不使用前缀
interface OracleClientConfig { }

// 建议：统一不使用 I 前缀，或统一使用
```

### 7. 常量命名不一致

```typescript
// 有些使用 UPPER_SNAKE_CASE
const SPREAD_PERCENTAGES = {}

// 有些使用 camelCase
const disputeTypeLabels = {}

// 建议：常量统一使用 UPPER_SNAKE_CASE
```

## 推荐的命名规范

### 文件命名
- **组件文件**: PascalCase (如 `PriceChart.tsx`)
- **工具/服务文件**: camelCase (如 `apiClient.ts`)
- **配置文件**: camelCase 或 kebab-case (如 `base-prices.ts`)
- **样式文件**: 与对应组件同名 (如 `PriceChart.module.css`)

### 变量命名
- **普通变量**: camelCase (如 `priceData`)
- **常量**: UPPER_SNAKE_CASE (如 `MAX_RETRY_COUNT`)
- **布尔值**: 使用 `is`、`has`、`should` 前缀 (如 `isLoading`, `hasError`)
- **数组**: 使用复数形式 (如 `prices`, `users`)

### 函数命名
- **普通函数**: camelCase，动词开头 (如 `getPrice`, `formatData`)
- **React Hooks**: 以 `use` 开头，camelCase (如 `usePriceData`)
- **事件处理**: 以 `handle` 开头 (如 `handleClick`, `handleSubmit`)
- **回调函数**: 以 `on` 开头 (如 `onChange`, `onSubmit`)

### 类型定义
- **接口**: PascalCase，不使用 I 前缀 (如 `PriceData`, `UserConfig`)
- **类型别名**: PascalCase (如 `PriceType`, `ConfigOptions`)
- **枚举**: PascalCase，单数 (如 `Status`, `Color`)
- **泛型**: 单个大写字母或 PascalCase (如 `T`, `ItemType`)

### 类命名
- **类**: PascalCase，名词 (如 `PriceService`, `DataManager`)
- **抽象类**: PascalCase，可添加 `Base` 前缀 (如 `BaseOracleClient`)

## 优先级建议

### 🔴 高优先级（立即修复）
1. 修复拼写错误：`UMAMetworkStats` → `UMANetworkStats`
2. 统一常量命名风格
3. 统一接口前缀风格

### 🟡 中优先级（逐步修复）
1. 统一文件命名风格
2. 统一 Hook 命名风格（API3 vs Api3）
3. 优化模糊的类型名

### 🟢 低优先级（可选）
1. 优化变量名语义
2. 添加更详细的 JSDoc 注释
