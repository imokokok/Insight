# WINkLINK页面优化实施 Spec

## Why
根据之前的分析，WINkLINK页面的tab分类整体合理，但存在以下可优化点：
1. 缺少Risk Tab，与其他预言机不一致
2. Gaming Tab内容可以更丰富，添加VRF使用案例
3. TRON Tab内容可以更丰富，添加网络增长趋势

## What Changes
- **添加Risk Tab**: 与其他预言机保持一致，展示数据质量、价格偏差等风险指标
- **丰富Gaming Tab**: 添加VRF使用案例、游戏类型分布统计
- **丰富TRON Tab**: 添加TRON网络增长趋势、WINkLINK市场份额数据
- **更新OraclePageTemplate**: 添加WINkLINK特定tab的处理逻辑

## Impact
- 受影响文件:
  - `/src/lib/config/oracles.tsx` - 添加risk tab配置
  - `/src/lib/oracles/winklink.ts` - 扩展数据模型
  - `/src/components/oracle/common/OraclePageTemplate.tsx` - 添加WINkLINK tab渲染逻辑
  - `/src/components/oracle/panels/WINkLinkGamingDataPanel.tsx` - 丰富内容
  - `/src/components/oracle/panels/WINkLinkTRONEcosystemPanel.tsx` - 丰富内容
  - `/src/components/oracle/panels/WINkLinkRiskPanel.tsx` - 新增风险面板

## ADDED Requirements

### Requirement 1: 添加Risk Tab
系统应为WINkLINK添加Risk Tab，与其他预言机保持一致。

#### Scenario: Risk Tab显示
- **GIVEN** 用户访问WINkLINK页面
- **WHEN** 点击Risk Tab
- **THEN** 显示数据质量、价格偏差、节点风险等风险指标

### Requirement 2: 丰富Gaming Tab
Gaming Tab应展示更多VRF使用案例和游戏类型分布。

#### Scenario: Gaming Tab增强
- **GIVEN** 用户访问WINkLINK Gaming Tab
- **WHEN** 页面加载
- **THEN** 显示游戏类型分布、VRF使用统计、热门游戏排行

### Requirement 3: 丰富TRON Tab
TRON Tab应展示TRON网络增长趋势和WINkLINK市场份额。

#### Scenario: TRON Tab增强
- **GIVEN** 用户访问WINkLINK TRON Tab
- **WHEN** 页面加载
- **THEN** 显示TRON网络增长图表、WINkLINK生态市场份额

## MODIFIED Requirements

### Requirement: WINkLINK数据模型
扩展WINkLINK数据模型以支持新功能。

**修改内容：**
- 添加`VRFUseCase`类型
- 添加`GamingCategoryDistribution`类型
- 添加`TRONNetworkGrowth`类型
- 添加`WINkLinkRiskMetrics`类型

## 实施计划

### Phase 1: 添加Risk Tab
1. 在oracles.tsx中添加risk tab配置
2. 在winklink.ts中添加风险指标数据模型
3. 创建WINkLinkRiskPanel组件
4. 在OraclePageTemplate中添加risk tab渲染逻辑

### Phase 2: 丰富Gaming Tab
1. 扩展winklink.ts中的GamingData模型
2. 更新WINkLinkGamingDataPanel组件
3. 添加游戏类型分布图表
4. 添加VRF使用案例展示

### Phase 3: 丰富TRON Tab
1. 扩展winklink.ts中的TRONEcosystem模型
2. 更新WINkLinkTRONEcosystemPanel组件
3. 添加TRON网络增长趋势图表
4. 添加WINkLINK市场份额数据
