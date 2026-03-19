# 统一跨预言机分析功能规范

## Why
跨预言机分析功能应该只在具有**可对比共性**的预言机之间进行。基于 `CrossOracleComparison` 组件的设计，它主要对比的是**标准价格数据喂价**（Price Feeds）。

需要分析各个预言机的核心业务模式，只有提供标准价格喂价服务的预言机才适合进行跨预言机对比。

## 分析结果

### 可以与 Chainlink 进行跨预言机对比的预言机（提供标准价格喂价）

| 预言机 | 适合对比 | 原因 |
|--------|----------|------|
| **Pyth** | ✅ | 提供高频金融数据喂价，与 Chainlink 直接竞争 |
| **Band Protocol** | ✅ | 提供跨链数据喂价，与 Chainlink 类似 |
| **API3** | ✅ | 第一方预言机，提供 dAPI 价格数据 |
| **RedStone** | ✅ | 模块化预言机，支持价格数据流 |
| **DIA** | ✅ | 提供透明金融数据喂价 |
| **Tellor** | ✅ | 去中心化预言机，提供价格数据 |

### 不适合与 Chainlink 进行跨预言机对比的预言机（非标准价格喂价）

| 预言机 | 不适合对比 | 原因 |
|--------|------------|------|
| **UMA** | ❌ | 乐观预言机，主打争议解决和合成资产，不是标准价格喂价 |
| **Chronicle** | ❌ | MakerDAO 原生预言机，主要服务 Maker 生态，不是通用价格喂价 |
| **WINkLink** | ❌ | TRON 生态预言机，主打游戏和 VRF，不是标准价格喂价 |

## What Changes

### 保留跨预言机分析的预言机（已添加或已有）
1. **Chainlink** - 基准预言机
2. **Pyth** - 已有
3. **Band Protocol** - 已有
4. **RedStone** - 已有
5. **DIA** - 已添加
6. **Tellor** - 已添加
7. **API3** - 已统一

### 移除跨预言机分析的预言机
1. **UMA** - 移除 cross-oracle Tab
2. **Chronicle** - 移除 cross-oracle Tab
3. **WINkLink** - 移除 cross-oracle Tab

## Impact
- 受影响文件：
  - `src/lib/config/oracles.tsx` - 移除 UMA、Chronicle、WINkLink 的 cross-oracle Tab 配置
  - `src/app/[locale]/winklink/page.tsx` - 移除 cross-oracle 处理逻辑
  - `src/app/[locale]/chronicle/page.tsx` - 移除 cross-oracle 处理逻辑
  - `src/components/oracle/common/oraclePanels/UMAPanelConfig.tsx` - 移除 renderCrossOracleTab

## ADDED Requirements
无新增功能

## MODIFIED Requirements
无修改功能

## REMOVED Requirements

### Requirement: UMA 跨预言机分析
**Reason**: UMA 是乐观预言机，主打争议解决和合成资产，不是标准价格喂价服务，与 Chainlink 不具有直接可比性。
**Migration**: 从 UMA 页面移除 cross-oracle Tab

### Requirement: Chronicle 跨预言机分析
**Reason**: Chronicle 是 MakerDAO 原生预言机，主要服务 Maker 生态，不是通用价格喂价服务，与 Chainlink 不具有直接可比性。
**Migration**: 从 Chronicle 页面移除 cross-oracle Tab

### Requirement: WINkLink 跨预言机分析
**Reason**: WINkLink 是 TRON 生态预言机，主打游戏和 VRF，不是标准价格喂价服务，与 Chainlink 不具有直接可比性。
**Migration**: 从 WINkLink 页面移除 cross-oracle Tab
