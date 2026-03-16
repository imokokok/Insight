# UMA页面Tab结构优化 Spec

## Why
基于之前的审查分析，UMA页面的tab分类存在以下需要优化的问题：
1. Network tab与Validators tab内容重叠，在UMA中"验证者"比"节点"更重要
2. Ecosystem tab内容较浅，未能充分展示UMA的Optimistic Oracle用例
3. Tab顺序未能突出UMA的核心特色（Disputes、Validators）
4. 缺少专门的Staking tab来展示UMA的经济模型

通过优化tab结构，让页面能更完整、更准确地展示UMA作为乐观预言机的独特特性。

## What Changes
- **移除** Network tab，将其内容整合到Validators tab
- **调整** Tab顺序：Market → Disputes → Validators → Staking → Risk → Ecosystem
- **新增** Staking tab，展示UMA质押经济模型
- **丰富** Ecosystem tab内容，添加Optimistic Oracle用例展示
- **优化** Validators tab，整合原Network的健康指标

## Impact
- 受影响文件:
  - `/src/lib/config/oracles.tsx` - 修改UMA的tabs配置
  - `/src/components/oracle/common/OraclePageTemplate.tsx` - 调整tab内容渲染逻辑
  - `/src/components/oracle/common/TabNavigation.tsx` - 可能需要调整（如需要）
  - **新增** `/src/components/oracle/panels/StakingPanel/index.tsx` - Staking面板组件
  - **新增** `/src/components/oracle/panels/UMADashboardPanel/index.tsx` - 整合Network健康指标的面板

## MODIFIED Requirements
### Requirement: UMA Tab配置
**当前配置:**
```typescript
tabs: [
  { id: 'market', labelKey: 'uma.menu.marketData' },
  { id: 'network', labelKey: 'uma.menu.networkHealth' },
  { id: 'validators', labelKey: 'uma.menu.validatorAnalytics' },
  { id: 'disputes', labelKey: 'uma.menu.disputeResolution' },
  { id: 'ecosystem', labelKey: 'uma.menu.ecosystem' },
  { id: 'risk', labelKey: 'uma.menu.riskAssessment' },
],
```

**优化后配置:**
```typescript
tabs: [
  { id: 'market', labelKey: 'uma.menu.marketData' },
  { id: 'disputes', labelKey: 'uma.menu.disputeResolution' },
  { id: 'validators', labelKey: 'uma.menu.validatorAnalytics' },
  { id: 'staking', labelKey: 'uma.menu.staking' },
  { id: 'risk', labelKey: 'uma.menu.riskAssessment' },
  { id: 'ecosystem', labelKey: 'uma.menu.ecosystem' },
],
```

### Requirement: Validators Tab内容整合
将原Network tab的健康指标整合到Validators tab顶部：
- 活跃验证者数（原Validators已有）
- 网络响应时间（从Network迁移）
- 网络正常运行时间（从Network迁移）
- 数据源状态（从Network迁移）

### Requirement: 新增Staking Tab
创建独立的Staking面板，包含：
- 质押统计概览（总质押量、质押率、平均APY）
- 质押收益计算器（从原Validators迁移并增强）
- 质押历史图表
- 质押教程和指南
- 质押风险提示

### Requirement: 丰富Ecosystem Tab
增强Ecosystem面板内容：
- 使用UMA的协议/项目列表
- Optimistic Oracle用例统计
- 价格请求类型分布图表
- 成功案例展示
- 跨链部署情况

## ADDED Requirements
### Requirement: StakingPanel组件
系统应提供专门的Staking面板组件展示UMA质押经济模型。

#### Scenario: 显示质押概览
- **WHEN** 用户访问Staking tab
- **THEN** 应显示质押统计卡片（总质押量、质押率、平均APY、验证者数）

#### Scenario: 质押收益计算
- **WHEN** 用户输入质押数量
- **THEN** 应计算并显示预估日/月/年收益

#### Scenario: 质押历史展示
- **WHEN** 用户查看Staking tab
- **THEN** 应显示质押量历史趋势图表

### Requirement: UMADashboardPanel组件
系统应在Validators tab顶部提供网络健康指标仪表板。

#### Scenario: 显示网络健康指标
- **WHEN** 用户访问Validators tab
- **THEN** 应在验证者列表上方显示网络健康指标卡片

### Requirement: UMAEcosystemPanel组件增强
系统应增强Ecosystem面板，展示Optimistic Oracle生态。

#### Scenario: 显示OO用例
- **WHEN** 用户访问Ecosystem tab
- **THEN** 应显示Optimistic Oracle用例统计和案例

## REMOVED Requirements
### Requirement: Network Tab
**Reason**: 内容与Validators tab重叠，在UMA中"验证者"概念比"节点"更重要
**Migration**: 将Network健康指标整合到Validators tab顶部的仪表板中
