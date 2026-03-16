# 预言机页面功能规格文档

## 背景与问题

当前项目中有10个预言机页面，每个页面的功能配置不一致。

### 现有预言机页面清单

| 预言机 | 风险评估 | 跨预言机对比 | 当前状态 |
|--------|----------|--------------|----------|
| Chainlink | ✅ 有 | ✅ 有 | 完整 |
| API3 | ✅ 有 | ✅ 有 | 完整 |
| Pyth | ❌ 无 | ❌ 无 | 缺失风险评估 |
| RedStone | ✅ 简单 | ❌ 无 | 需完善风险评估 |
| Chronicle | ✅ 有 | ❌ 无 | 缺失跨预言机对比 |
| Band Protocol | ❌ 无 | ❌ 无 | 使用模板 |
| UMA | ❌ 无 | ❌ 无 | 使用模板 |
| DIA | ✅ 有(通用) | ❌ 无 | 缺失跨预言机对比 |
| Tellor | ✅ 有 | ❌ 无 | 缺失跨预言机对比 |
| WINkLink | ✅ 有 | ✅ 有 | 完整 |

### 发现的问题

1. **风险评估功能缺失**: Pyth、Band Protocol、UMA 页面缺少风险评估
2. **RedStone 风险评估过于简单**: 需要更完善的风险评估面板
3. **跨预言机对比功能选择性缺失**: 只在部分页面需要

## 目标

1. **所有预言机页面统一具备风险评估功能**
2. **选择性添加跨预言机对比功能**（根据业务需求）

## 需求分析

### 风险评估功能（所有页面必需）

每个预言机页面必须提供风险评估面板，包含：

| 风险维度 | 说明 |
|----------|------|
| 去中心化程度 | 节点/验证者分布、集中度风险 |
| 安全性 | 安全机制、审计记录、漏洞历史 |
| 稳定性 | 正常运行时间、故障恢复能力 |
| 数据质量 | 价格偏差、更新频率、数据源多样性 |
| 综合评分 | 总体风险评估 |

### 跨预言机对比功能（选择性添加）

根据业务需求，以下页面需要跨预言机对比功能：

| 预言机 | 是否需要跨预言机对比 | 理由 |
|--------|---------------------|------|
| Chainlink | ✅ 是 | 头部预言机，用户需要对比 |
| API3 | ✅ 是 | 第一方预言机，有对比价值 |
| Pyth | ✅ 是 | 高频更新，需要对比 |
| RedStone | ✅ 是 | 数据流模式，有对比价值 |
| Chronicle | ❌ 否 | MakerDAO 专用，对比意义不大 |
| Band Protocol | ❌ 否 | Cosmos 生态，对比需求低 |
| UMA | ❌ 否 | 乐观预言机，模式不同 |
| DIA | ❌ 否 | 透明数据源为主，对比需求低 |
| Tellor | ❌ 否 | 争议解决模式，对比意义不大 |
| WINkLink | ✅ 是 | TRON 生态，已有功能保留 |

## 变更内容

### 1. 统一添加风险评估标签

为以下预言机在 `oracleConfigs` 中添加 `risk` 标签：
- Pyth
- Band Protocol
- UMA

### 2. 完善 RedStone 风险评估

替换 RedStone 页面中的简单风险评估实现，使用专门的风险评估面板组件。

### 3. 选择性添加跨预言机对比标签

为以下预言机添加 `cross-oracle` 标签：
- RedStone
- Pyth

### 4. 创建缺失的风险评估面板

- PythRiskAssessmentPanel
- BandRiskAssessmentPanel
- UMARiskAssessmentPanel
- RedStoneRiskAssessmentPanel（替换简单实现）

## ADDED Requirements

### Requirement: 统一风险评估功能

每个预言机页面 SHALL 提供风险评估面板：

#### Scenario: 风险评估标签页
- **WHEN** 用户点击 "risk" 标签
- **THEN** 显示该预言机的综合风险评估
- **AND** 包含去中心化程度、安全性、稳定性、数据质量评分
- **AND** 提供风险缓解措施说明

### Requirement: 选择性跨预言机对比功能

特定预言机页面 SHALL 提供跨预言机对比功能：

#### Scenario: 跨预言机对比标签页
- **GIVEN** 预言机在需要对比的列表中
- **WHEN** 用户点击 "cross-oracle" 标签
- **THEN** 显示 CrossOracleComparison 组件
- **AND** 支持与其他预言机进行价格和性能对比

## 影响范围

### 需要修改的文件

1. **配置文件**: `/src/lib/config/oracles.tsx`
   - 为 Pyth、Band Protocol、UMA 添加 `risk` 标签
   - 为 RedStone、Pyth 添加 `cross-oracle` 标签

2. **页面文件**:
   - `/src/app/pyth-network/page.tsx` - 添加风险评估和跨预言机对比
   - `/src/app/redstone/page.tsx` - 完善风险评估，添加跨预言机对比
   - `/src/app/band-protocol/page.tsx` - 重构为独立页面，添加风险评估
   - `/src/app/uma/page.tsx` - 重构为独立页面，添加风险评估

3. **新增组件**:
   - `PythRiskAssessmentPanel`
   - `BandRiskAssessmentPanel`
   - `UMARiskAssessmentPanel`
   - `RedStoneRiskAssessmentPanel`

## 实施策略

### 阶段一: 配置更新
1. 更新 `oracleConfigs`，添加必要的标签配置

### 阶段二: 页面更新
1. 更新 Pyth 页面 - 添加风险评估和跨预言机对比
2. 更新 RedStone 页面 - 完善风险评估，添加跨预言机对比
3. 重构 Band Protocol 页面 - 创建独立页面，添加风险评估
4. 重构 UMA 页面 - 创建独立页面，添加风险评估

### 阶段三: 创建风险评估面板
1. 创建各预言机专用的风险评估面板组件

### 阶段四: 验证测试
1. 验证所有页面的风险评估功能正常
2. 验证跨预言机对比功能正常
