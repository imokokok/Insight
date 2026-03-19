# 删除多余重复无用代码 Spec

## Why
代码库中存在大量重复的类型定义、函数、常量，以及可能未使用的模块。这些冗余代码增加了维护成本，降低了代码可读性，并可能导致不一致的行为。

## What Changes
- 统一重复的类型定义到 `src/types/` 目录
- 统一重复的工具函数到 `src/lib/utils/` 目录
- 统一重复的常量定义到 `src/lib/constants/` 目录
- 删除未使用的模块和导出文件
- 清理未使用的导入语句

## Impact
- Affected specs: 无
- Affected code: 
  - `src/types/` - 类型定义整合
  - `src/lib/utils/` - 工具函数整合
  - `src/lib/constants/` - 常量整合
  - `src/components/` - 组件清理
  - `src/app/` - 页面组件更新导入

## ADDED Requirements

### Requirement: 统一类型定义
系统 SHALL 将所有重复的类型定义统一到 `src/types/` 目录下的适当文件中。

#### Scenario: ChartDataPoint 类型统一
- **WHEN** 多个文件定义了相同的 ChartDataPoint 接口
- **THEN** 应从 `src/types/ui/index.ts` 导出，其他文件应导入使用

#### Scenario: ApiResponse 类型统一
- **WHEN** 多个文件定义了相同的 ApiResponse 接口
- **THEN** 应从 `src/types/api/responses.ts` 导出，其他文件应导入使用

### Requirement: 统一工具函数
系统 SHALL 将所有重复的工具函数统一到 `src/lib/utils/` 目录下。

#### Scenario: formatNumber 函数统一
- **WHEN** 多个组件中存在相同的 formatNumber 函数
- **THEN** 应创建 `src/lib/utils/format.ts` 并从该处导出

#### Scenario: getTimeAgo 函数统一
- **WHEN** 多个文件中存在相同的 getTimeAgo 函数
- **THEN** 应统一到 `src/lib/utils/date.ts` 并从该处导出

### Requirement: 统一常量定义
系统 SHALL 将所有重复的常量定义统一到 `src/lib/constants/` 目录下。

#### Scenario: ORACLE_COLORS 常量统一
- **WHEN** 多个文件定义了相同的 ORACLE_COLORS 常量
- **THEN** 应从 `src/lib/constants/index.ts` 导出，其他文件应导入使用

### Requirement: 删除未使用代码
系统 SHALL 删除未使用的模块、文件和导出。

#### Scenario: 删除未使用的模块导出文件
- **WHEN** 一个 index.ts 文件仅包含导出但没有外部使用
- **THEN** 应评估并删除该文件或其内容

## MODIFIED Requirements
无

## REMOVED Requirements

### Requirement: 重复的类型定义
**Reason**: 类型定义应在统一位置管理，避免重复和不一致
**Migration**: 将重复定义替换为从统一位置导入

### Requirement: 重复的工具函数
**Reason**: 工具函数应在统一位置管理，便于维护和测试
**Migration**: 将重复函数替换为从统一位置导入

### Requirement: 重复的常量定义
**Reason**: 常量应在统一位置管理，确保一致性
**Migration**: 将重复常量替换为从统一位置导入

---

## 详细问题清单

### 一、重复类型定义

| 类型名称 | 重复次数 | 主要位置 | 建议保留位置 |
|---------|---------|---------|-------------|
| ChartDataPoint | 13处 | 多个组件和hooks | src/types/ui/index.ts |
| TimeRange | 9处 | 多个页面组件 | src/types/ui/index.ts |
| ORACLE_COLORS | 6处 | 多个组件 | src/lib/constants/index.ts |
| ExportConfig | 7处 | 多个导出相关文件 | src/types/export/index.ts |
| ApiResponse | 3处 | api相关文件 | src/types/api/responses.ts |
| PaginatedResponse | 3处 | api相关文件 | src/types/api/responses.ts |
| PriceData | 4处 | 价格相关文件 | src/types/oracle/price.ts |
| OracleData | 3处 | oracle相关文件 | src/types/oracle/index.ts |
| PricePoint | 3处 | 价格图表文件 | src/types/oracle/price.ts |

### 二、重复工具函数

| 函数名称 | 重复次数 | 位置文件 | 建议保留位置 |
|---------|---------|---------|-------------|
| formatNumber | 8处 | 多个Panel组件 | src/lib/utils/format.ts |
| getTimeAgo | 3处 | qualityUtils.ts, DataUpdateTime.tsx, timestamps.ts | src/lib/utils/date.ts |
| formatPrice | 2处 | 多个价格组件 | src/lib/utils/format.ts |
| formatDate | 2处 | 多个日期处理文件 | src/lib/utils/date.ts |
| formatTimestamp | 2处 | 时间戳处理文件 | src/lib/utils/date.ts |

### 三、重复常量定义

| 常量名称 | 重复次数 | 位置文件 | 建议保留位置 |
|---------|---------|---------|-------------|
| oracleColors | 7处 | 多个组件 | src/lib/constants/index.ts |
| chainColors | 3处 | 多个组件 | src/lib/constants/index.ts |
| providerNames/PROVIDER_NAMES | 4处 | 多个组件 | src/lib/constants/index.ts |

### 四、可能未使用的模块

| 模块路径 | 问题类型 | 建议处理 |
|---------|---------|---------|
| src/components/features/index.ts | 仅导出，无外部导入 | 检查并删除 |
| src/components/layout/index.ts | 仅导出 Navbar 和 Footer | 检查使用情况 |
| src/components/charts/index.ts | 导出 LazyCharts，无外部使用 | 检查并删除 |
| src/lib/export/index.ts | 无外部导入 | 检查并删除 |
| src/lib/api/validation/index.ts | 无外部导入 | 检查并删除 |
| src/lib/api/response/index.ts | 无外部导入 | 检查并删除 |
