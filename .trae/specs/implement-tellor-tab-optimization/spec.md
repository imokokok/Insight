# Tellor Tab 优化实施 Spec

## Why

根据之前的分析，Tellor 页面当前缺少 Risk Tab 和 Reporter 相关 Tab，与其他预言机相比不够完整。本次优化目标是：
1. 添加 Risk Tab 以与其他预言机保持一致
2. 添加 Reporters Tab 展示 Tellor 核心机制（报告者统计）
3. 优化 Tab 顺序，突出 Tellor 特色功能

## What Changes

- **新增 Risk Tab**: 添加风险评估功能，展示数据质量、价格偏差等风险指标
- **新增 Reporters Tab**: 添加报告者分析面板，展示活跃 Reporter 数量、质押分布、收益统计等
- **调整 Tab 顺序**: 优化 Tab 排列，突出 Tellor 核心特色
- **更新配置**: 修改 `/src/lib/config/oracles.tsx` 中的 tabs 定义
- **更新页面**: 修改 `/src/app/tellor/page.tsx` 添加新 Tab 的内容渲染
- **新增组件**: 创建 `TellorReportersPanel` 和 `TellorRiskPanel` 组件
- **更新类型**: 扩展 Tellor 数据类型定义
- **更新 Hook**: 扩展 `useTellorData` 以支持新数据获取

## Impact

- 受影响文件:
  - `/src/lib/config/oracles.tsx` - 更新 tabs 配置
  - `/src/app/tellor/page.tsx` - 添加新 Tab 渲染逻辑
  - `/src/components/oracle/panels/TellorReportersPanel.tsx` - 新增（报告者面板）
  - `/src/components/oracle/panels/TellorRiskPanel.tsx` - 新增（风险面板）
  - `/src/hooks/useTellorData.ts` - 扩展数据获取
  - `/src/lib/oracles/tellor.ts` - 扩展客户端方法
  - `/src/types/oracle/tellor.ts` - 扩展类型定义

## ADDED Requirements

### Requirement: Risk Tab 功能

系统应提供 Risk Tab 展示 Tellor 的风险评估数据。

#### Scenario: 展示风险指标

- **WHEN** 用户切换到 Risk Tab
- **THEN** 应展示：
  - 数据质量指标（Data Quality Score）
  - 价格偏差监控（Price Deviation Monitor）
  - 质押风险分析（Staking Risk Analysis）
  - 网络健康风险评估

### Requirement: Reporters Tab 功能

系统应提供 Reporters Tab 展示 Tellor 报告者网络的统计数据。

#### Scenario: 展示报告者统计

- **WHEN** 用户切换到 Reporters Tab
- **THEN** 应展示：
  - 活跃 Reporter 数量和趋势
  - Reporter 质押分布图表
  - Reporter 收益统计
  - 最新报告者活动列表

### Requirement: Tab 顺序优化

系统应优化 Tab 顺序以突出 Tellor 核心特色。

#### Scenario: Tab 导航

- **WHEN** 用户查看 Tellor 页面
- **THEN** Tab 顺序应为：
  1. Market（市场数据）
  2. Price Stream（价格流）- Tellor 核心特色
  3. Reporters（报告者）- Tellor 核心机制
  4. Network（网络健康）
  5. Multi-Chain（多链聚合）
  6. Risk（风险评估）
  7. Market Depth（市场深度）

## MODIFIED Requirements

### Requirement: Tellor 配置更新

**原配置**（5个 Tab）:
```typescript
tabs: [
  { id: 'market', labelKey: 'tellor.tabs.market' },
  { id: 'network', labelKey: 'tellor.tabs.network' },
  { id: 'price-stream', labelKey: 'tellor.tabs.priceStream' },
  { id: 'market-depth', labelKey: 'tellor.tabs.marketDepth' },
  { id: 'multi-chain', labelKey: 'tellor.tabs.multiChain' },
]
```

**新配置**（7个 Tab）:
```typescript
tabs: [
  { id: 'market', labelKey: 'tellor.tabs.market' },
  { id: 'price-stream', labelKey: 'tellor.tabs.priceStream' },
  { id: 'reporters', labelKey: 'tellor.tabs.reporters' },
  { id: 'network', labelKey: 'tellor.tabs.network' },
  { id: 'multi-chain', labelKey: 'tellor.tabs.multiChain' },
  { id: 'risk', labelKey: 'tellor.tabs.risk' },
  { id: 'market-depth', labelKey: 'tellor.tabs.marketDepth' },
]
```
