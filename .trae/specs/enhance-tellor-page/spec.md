# Tellor 页面改造 Spec - 充分展示特性

## Why

根据评估报告，Tellor 页面虽然核心功能完整，但缺少 Ecosystem Tab、Network Tab 使用通用面板、缺少争议机制展示。本次改造旨在：

1. 添加 Ecosystem Tab 展示 Tellor 集成的协议和生态系统
2. 创建 Tellor 定制化的 Network 面板替换通用面板
3. 添加争议机制展示到 Reporters Tab
4. 添加质押计算器功能
5. 优化 Tab 顺序提升用户体验

## What Changes

### 新增功能

- **Ecosystem Tab**: 展示 Tellor 集成的 DeFi 协议、合作伙伴、数据使用统计
- **TellorNetworkPanel**: 替换通用 NetworkHealthPanel，展示 Tellor 特定的网络统计
- **争议机制展示**: 在 Reporters Tab 添加争议流程说明和统计数据
- **质押计算器**: 让用户计算质押收益和 ROI

### 优化改进

- **Tab 顺序调整**: market → network → reporters → disputes → staking → price-stream → market-depth → multi-chain → risk → ecosystem
- **Reporters Panel 增强**: 添加争议统计、Reporter 详情弹窗
- **Risk Panel 增强**: 添加争议风险评估

### 数据层扩展

- **TellorClient 扩展**: 添加生态系统数据、争议数据、质押计算 API
- **useTellorData Hook 扩展**: 新增生态系统、争议、质押计算等数据获取

## Impact

- **Affected files**:
  - `src/app/tellor/page.tsx` - Tab 顺序调整，新增 Tab 处理
  - `src/lib/config/oracles.tsx` - 添加新的 Tab 配置
  - `src/lib/oracles/tellor.ts` - 扩展客户端 API
  - `src/hooks/useTellorData.ts` - 扩展数据 Hook
  - `src/components/oracle/panels/TellorNetworkPanel.tsx` - 新建
  - `src/components/oracle/panels/TellorEcosystemPanel.tsx` - 新建
  - `src/components/oracle/panels/TellorStakingCalculator.tsx` - 新建
  - `src/components/oracle/panels/TellorReportersPanel.tsx` - 增强
  - `src/components/oracle/panels/TellorRiskPanel.tsx` - 增强
  - `src/i18n/en.json`, `src/i18n/zh-CN.json` - 添加翻译

## ADDED Requirements

### Requirement: Ecosystem Tab

**Scenario: 展示 Tellor 生态系统**

- **GIVEN** 用户访问 Tellor 页面并切换到 Ecosystem Tab
- **WHEN** 数据加载完成
- **THEN** 应该展示：
  - 集成的 DeFi 协议列表（Aave、Compound、MakerDAO 等）
  - 合作伙伴和集成统计
  - 数据馈送使用情况
  - 生态系统增长趋势

### Requirement: Tellor 定制化 Network Panel

**Scenario: 展示 Tellor 网络统计**

- **GIVEN** 用户访问 Network Tab
- **WHEN** 页面加载完成
- **THEN** 应该展示 Tellor 特定的网络数据：
  - 活跃 Reporter 节点地图/分布
  - 网络健康度指标（自定义算法）
  - 数据更新频率热力图
  - 链上活动统计

### Requirement: 争议机制展示

**Scenario: 展示争议流程和统计**

- **GIVEN** 用户访问 Reporters Tab 或 Disputes Tab
- **WHEN** 页面加载完成
- **THEN** 应该展示：
  - 争议流程图解
  - 争议统计数据（成功率、平均解决时间）
  - 最近争议列表
  - 争议奖励/惩罚统计

### Requirement: 质押计算器

**Scenario: 计算质押收益**

- **GIVEN** 用户在 Staking Tab 输入质押参数
- **WHEN** 用户修改参数
- **THEN** 应该实时计算并展示：
  - 预估年化收益
  - 考虑 Reporter 活跃度的收益调整
  - 争议参与额外收益
  - ROI 计算

## MODIFIED Requirements

### Requirement: Tab 顺序优化

**Current**: market → price-stream → reporters → network → multi-chain → risk → market-depth

**Modified**: market → network → reporters → disputes → staking → price-stream → market-depth → multi-chain → risk → ecosystem

**Reason**:

- 基础数据（market + network）放前面
- Tellor 核心特性（reporters + disputes + staking）紧随其后
- 高级功能（price-stream + market-depth + multi-chain）随后
- 辅助功能（risk + ecosystem）放最后

### Requirement: Reporters Panel 增强

**Current**: 展示 Reporter 列表、质押分布、活动趋势

**Modified**:

- 添加争议统计卡片（参与争议次数、成功率）
- 添加 Reporter 详情弹窗（点击 Reporter 查看详细历史）
- 添加 Reporter 收益归因（报告收益 vs 争议收益）

## REMOVED Requirements

无
