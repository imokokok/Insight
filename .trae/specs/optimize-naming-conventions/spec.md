# 项目命名规范优化 Spec

## Why
项目当前存在命名不一致、不规范的问题，包括：中英文混用、缩写不一致、命名风格不统一等。这些问题会降低代码可读性、增加维护成本、影响团队协作效率。

## What Changes
- 统一变量命名规范：采用 camelCase，布尔值使用 is/has/should 前缀
- 统一函数命名规范：采用 camelCase，动词开头，语义清晰
- 统一接口/类型命名规范：采用 PascalCase，接口使用 I 前缀（可选）
- 统一常量命名规范：采用 UPPER_SNAKE_CASE
- 统一文件命名规范：组件使用 PascalCase，工具函数使用 camelCase
- 修复缩写不一致问题（如 API3、DIA、WINkLink 等）
- 修复语义不清晰的命名

## Impact
- Affected specs: 所有模块
- Affected code: 
  - `src/lib/` - 工具库、配置、服务
  - `src/hooks/` - React Hooks
  - `src/components/` - UI 组件
  - `src/types/` - 类型定义
  - `src/app/` - 页面组件

## ADDED Requirements

### Requirement: 变量命名规范
系统 SHALL 遵循以下变量命名规范：
- 使用 camelCase 驼峰命名法
- 布尔值变量使用 is/has/should/can 等前缀
- 避免使用单字母变量名（循环变量除外）
- 避免使用无意义的缩写
- 集合类型使用复数形式

#### Scenario: 布尔变量命名
- **WHEN** 定义布尔类型变量
- **THEN** 使用 is/has/should/can 前缀，如 `isLoading`、`hasError`、`shouldUpdate`

#### Scenario: 集合变量命名
- **WHEN** 定义数组或集合类型变量
- **THEN** 使用复数形式，如 `nodes`、`prices`、`providers`

### Requirement: 函数命名规范
系统 SHALL 遵循以下函数命名规范：
- 使用 camelCase 驼峰命名法
- 以动词开头，表示函数的行为
- 异步函数可选择性添加 async 后缀（不强制）
- 事件处理函数使用 handle 前缀
- 获取数据函数使用 get/fetch 前缀
- 设置数据函数使用 set/update 前缀
- 转换函数使用 to/convert 前缀
- 验证函数使用 validate/check 前缀

#### Scenario: 数据获取函数
- **WHEN** 定义数据获取函数
- **THEN** 使用 get/fetch 前缀，如 `getPrice`、`fetchHistoricalPrices`

#### Scenario: 事件处理函数
- **WHEN** 定义事件处理函数
- **THEN** 使用 handle 前缀，如 `handleClick`、`handleSubmit`

### Requirement: 接口和类型命名规范
系统 SHALL 遵循以下接口和类型命名规范：
- 使用 PascalCase 帕斯卡命名法
- 接口名称应描述其代表的实体或概念
- Props 接口使用 ComponentNameProps 格式
- 配置接口使用 Config 后缀
- 选项接口使用 Options 后缀
- 返回值接口使用 Return 或 Result 后缀
- 枚举使用 PascalCase，成员使用 UPPER_SNAKE_CASE

#### Scenario: 组件 Props 接口
- **WHEN** 定义组件 Props 接口
- **THEN** 使用 ComponentNameProps 格式，如 `NodeReputationPanelProps`

#### Scenario: 枚举命名
- **WHEN** 定义枚举类型
- **THEN** 枚举名使用 PascalCase，成员使用 UPPER_SNAKE_CASE，如 `OracleProvider.CHAINLINK`

### Requirement: 常量命名规范
系统 SHALL 遵循以下常量命名规范：
- 全局常量使用 UPPER_SNAKE_CASE 大写下划线命名法
- 模块内部常量可使用 camelCase
- 配置对象使用 camelCase
- 颜色常量使用语义化命名

#### Scenario: 全局常量
- **WHEN** 定义全局常量
- **THEN** 使用 UPPER_SNAKE_CASE，如 `DEFAULT_CLIENT_CONFIG`、`TIME_RANGES`

#### Scenario: 配置对象
- **WHEN** 定义配置对象
- **THEN** 使用 camelCase，如 `chartColors`、`baseColors`

### Requirement: 文件命名规范
系统 SHALL 遵循以下文件命名规范：
- React 组件文件使用 PascalCase，如 `NodeReputationPanel.tsx`
- Hook 文件使用 camelCase 并以 use 开头，如 `useOracleData.ts`
- 工具函数文件使用 camelCase，如 `format.ts`
- 类型定义文件使用 camelCase，如 `oracle.ts`
- 常量文件使用 camelCase，如 `constants.ts`
- 配置文件使用 camelCase，如 `config.ts`
- 测试文件与源文件同名，添加 .test 后缀

#### Scenario: 组件文件命名
- **WHEN** 创建 React 组件文件
- **THEN** 使用 PascalCase，如 `PriceChart.tsx`

#### Scenario: Hook 文件命名
- **WHEN** 创建 React Hook 文件
- **THEN** 使用 camelCase 并以 use 开头，如 `usePriceHistory.ts`

### Requirement: 缩写规范
系统 SHALL 统一以下缩写的使用：
- API3：保持大写 API3（如 `API3Client`、`useAPI3Data`）
- DIA：保持大写 DIA（如 `DIAClient`、`useDIAData`）
- WINkLink：保持首字母大写 WINkLink（如 `WINkLinkClient`）
- UMA：保持大写 UMA（如 `UMAClient`）
- API：保持小写 api（如 `api/` 目录）
- URL：保持小写 url（如 `urlParams.ts`）
- ID：保持小写 id（如 `nodeId`）

#### Scenario: 预言机客户端命名
- **WHEN** 定义预言机客户端类
- **THEN** 使用 Provider + Client 格式，如 `ChainlinkClient`、`API3Client`、`DIAClient`

#### Scenario: Hook 命名中的缩写
- **WHEN** 定义包含缩写的 Hook
- **THEN** 保持缩写一致性，如 `useAPI3Data`、`useDIAData`

### Requirement: 特定模块命名修正
系统 SHALL 修正以下具体命名问题：

#### 文件重命名
| 当前名称 | 修正名称 | 原因 |
|---------|---------|------|
| `useDI.ts` | `useDependencyInjection.ts` | DI 缩写不够清晰 |
| `tellar.ts` | `teller.ts` | Tellar 应为 Teller（拼写错误） |
| `TellarClient` | `TellerClient` | 拼写错误修正 |
| `useTellarData.ts` | `useTellerData.ts` | 拼写错误修正 |
| `TellarPageContent.tsx` | `TellerPageContent.tsx` | 拼写错误修正 |

#### 变量重命名
| 当前名称 | 修正名称 | 原因 |
|---------|---------|------|
| `t` | `translate` 或 `t`（保持） | i18n 翻译函数可保持简写 |
| `COLORS` | `SCORE_COLORS` | 语义更清晰 |
| `COLORS_MAP` | `NODE_TYPE_COLORS_MAP` | 语义更清晰 |
| `NODE_TYPE_COLORS` | 保持不变 | 已符合规范 |
| `formatCompactNumberV2` | `formatCompactNumberWithDecimals` | 避免版本号命名 |

#### 函数重命名
| 当前名称 | 修正名称 | 原因 |
|---------|---------|------|
| `loadData` | `fetchNodeReputationData` | 更具体的命名 |
| `generateMockNodes` | `generateMockNodeReputationData` | 更具体的命名 |

## MODIFIED Requirements

### Requirement: 现有良好命名保持不变
以下命名已符合规范，保持不变：
- `chartColors` - 配置对象，语义清晰
- `semanticColors` - 配置对象，语义清晰
- `baseColors` - 配置对象，语义清晰
- `OracleProvider` 枚举 - 符合 PascalCase 和 UPPER_SNAKE_CASE
- `Blockchain` 枚举 - 符合规范
- `PriceData` 接口 - 符合 PascalCase
- `useOracleData` 等 Hooks - 符合 use 前缀规范
- `getPrice`、`getHistoricalPrices` - 符合动词开头规范
