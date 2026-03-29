# DIA 预言机页面代码问题修复

## Why
根据代码审查发现的18个问题，需要按优先级进行修复，主要包括：修复历史数据逻辑错误、统一类型定义、移除硬编码数据、优化性能等。

## What Changes
- **P0**: 修复 `getHistoricalPrices` 逻辑错误，生成真实历史数据
- **P1**: 统一 `DIANetworkStats` 类型定义，移除组件中的硬编码统计数据
- **P2**: 提取重复的工具函数，修复全局单例问题
- **P3**: 清理未使用的变量

## Impact
- Affected specs: DIA预言机页面代码质量
- Affected code: 
  - `src/lib/oracles/dia.ts`
  - `src/lib/oracles/diaDataService.ts`
  - `src/hooks/oracles/dia.ts`
  - `src/app/[locale]/dia/types.ts`
  - `src/app/[locale]/dia/components/*.tsx`

---

## 修复计划

### P0 紧急修复

#### 修复1: getHistoricalPrices逻辑错误
**文件**: `src/lib/oracles/diaDataService.ts`

**当前问题代码**:
```typescript
async getHistoricalPrices(symbol: string, chain?: Blockchain, periodHours: number = 24): Promise<PriceData[]> {
  for (let i = 0; i < dataPoints; i++) {
    const priceData = await this.getAssetPrice(symbol, chain);  // 每次获取当前价格
    if (priceData) {
      prices.push({ ...priceData, timestamp });  // 只是修改时间戳
    }
  }
}
```

**修复方案**: 使用价格波动模拟生成更真实的历史数据，基于当前价格添加随机波动

---

### P1 高优先级修复

#### 修复2: 统一DIANetworkStats类型定义
**问题**: `src/app/[locale]/dia/types.ts` 和 `src/lib/oracles/dia.ts` 中有同名但内容不同的接口

**修复方案**: 
1. 删除 `src/app/[locale]/dia/types.ts` 中的 `DIANetworkStats` 定义
2. 从 `src/lib/oracles/dia.ts` 导入统一的类型

#### 修复3: 移除组件中的硬编码统计数据
**涉及文件**:
- `DIAMarketView.tsx` - 移除硬编码的交易量、流动性数据
- `DIAHero.tsx` - 移除硬编码的核心统计数据
- `DIAEcosystemView.tsx` - 移除硬编码的TVL数据

**修复方案**: 从API获取或使用config中的动态数据

---

### P2 中优先级修复

#### 修复4: 提取重复的工具函数
**涉及函数**:
- `formatTVL` - 在多个组件中重复定义
- `getChainLabel` / `getChainBadgeColor` - 链相关函数重复

**修复方案**: 创建 `src/lib/utils/oracle-helpers.ts` 统一存放

#### 修复5: 修复全局单例问题
**文件**: `src/hooks/oracles/dia.ts`

**当前问题代码**:
```typescript
const diaClient = new DIAClient();  // 模块顶层创建
```

**修复方案**: 在hook内部创建实例或使用依赖注入

---

### P3 低优先级修复

#### 修复6: 清理未使用的变量
**文件**: `src/app/[locale]/dia/hooks/useDIAPage.ts`

**涉及变量**:
- `client` - 创建但未使用
- `dataFreshnessStatus` - 计算但未完全使用

---

## ADDED Requirements

### Requirement: 历史数据真实性
系统 SHALL 生成具有合理波动的历史价格数据，而非简单的当前价格复制。

#### Scenario: 历史数据生成
- **WHEN** 用户查看价格历史图表
- **THEN** 系统应生成具有随机波动的模拟历史数据
- **AND** 波动范围应在合理范围内（如±5%）

### Requirement: 类型定义一致性
系统 SHALL 使用统一的类型定义，避免同名不同内容的接口。

#### Scenario: 类型导入
- **WHEN** 组件需要使用DIANetworkStats类型
- **THEN** 应从单一源文件导入
- **AND** 不应在本地重复定义

### Requirement: 数据动态化
系统 SHALL 尽可能使用动态数据源，减少硬编码值。

#### Scenario: 统计数据展示
- **WHEN** 显示统计数据
- **THEN** 应优先从API或config获取
- **AND** 仅在无数据源时使用合理的默认值
