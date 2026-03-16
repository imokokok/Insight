# 预言机风险评估系统完善规范

## Why

当前各预言机页面的风险评估实现质量参差不齐，需要为每个预言机打造完善、专业、一致的风险评估体验，提升产品的可信度和专业形象。

## What Changes

* 为全部10个预言机建立统一且完善的风险评估标准

* 每个预言机风险评估包含6大核心模块

* 建立数据新鲜度指示和自动刷新机制

* 创建可复用的风险组件库

## Impact

* 受影响组件：10个预言机的风险面板组件

* 新增组件：DataFreshnessIndicator、RiskScoreCard、RiskTrendChart、SecurityTimeline

* 更新工具库：riskUtils.ts

## 统一风险评估架构

每个预言机的风险评估 SHALL 包含以下6大模块：

### Module 1: 综合风险概览 (Overall Risk Overview)

* 总体风险评分 (0-100)

* 风险等级标签 (Low/Medium/High/Critical)

* 评分趋势指示器

* 最后更新时间

### Module 2: 四维度风险评分 (Four-Dimension Scores)

1. **去中心化程度** (Decentralization) - 权重30%

   * 节点/验证者/发布者数量和分布

   * 基尼系数或赫芬达尔指数

   * 地理分布多样性

2. **安全性** (Security) - 权重25%

   * 密码学验证机制

   * 审计历史和评分

   * 安全事件记录

   * 质押/罚没机制

3. **稳定性** (Stability) - 权重25%

   * 历史正常运行时间

   * 故障恢复能力

   * 服务可用性百分比

4. **数据质量** (Data Quality) - 权重20%

   * 价格准确性/偏离度

   * 更新频率

   * 数据源多样性

### Module 3: 风险指标详情 (Risk Metrics Detail)

* 预言机特有的风险指标

* 关键运营数据展示

* 对比基准数据

### Module 4: 安全事件时间线 (Security Timeline)

* 历史安全事件记录

* 事件类型分类 (upgrade/vulnerability/response/maintenance)

* 事件处理状态

* 时间线可视化

### Module 5: 跨链风险评估 (Cross-Chain Risk)

* 各支持链的风险评分

* 链可用性和延迟指标

* 跨链依赖风险

### Module 6: 风险缓解措施 (Mitigation Measures)

* 当前启用的安全措施

* 措施有效性评分

* 措施类型分类 (technical/governance/operational)

***

## 各预言机风险评估详细规范

### Chainlink 风险评估

基于现有 [ChainlinkRiskPanel.tsx](file:///Users/imokokok/Documents/foresight-build/insight/src/components/oracle/panels/ChainlinkRiskPanel.tsx) 完善：

**当前状态**: ⭐⭐⭐⭐ 较完善

**需补充**:

* [ ] 添加数据新鲜度指示器

* [ ] 添加评分趋势图表

* [ ] 将静态数据改为动态生成

**特色指标**:

* 节点集中度 (Top 50 节点份额 38.2%)

* 服务级别风险 (CCIP、Data Feeds、Functions等)

* 关键节点冗余度 (3x)

### Pyth Network 风险评估

基于现有 [PythRiskAssessmentPanel.tsx](file:///Users/imokokok/Documents/foresight-build/insight/src/components/oracle/panels/PythRiskAssessmentPanel.tsx) 完善：

**当前状态**: ⭐⭐⭐⭐ 较完善

**需补充**:

* [ ] 添加数据新鲜度指示器

* [ ] 添加第一方数据源可信度评分

**特色指标**:

* 发布者集中度 (Top 10 发布者份额 42.8%)

* 置信区间监控 (±0.1%)

* 亚秒级更新频率 (\~400ms)

### UMA 风险评估

基于现有 [UMARiskPanel/index.tsx](file:///Users/imokokok/Documents/foresight-build/insight/src/components/oracle/panels/UMARiskPanel/index.tsx) 完善：

**当前状态**: ⭐⭐⭐⭐⭐ 最完善

**需补充**:

* [ ] 添加数据新鲜度指示器

* [ ] 添加四维度评分卡片

**特色指标**:

* 经济安全指标 (总质押价值、平均验证者质押)

* 争议解决效率 (平均解决时间、成功率趋势)

* 验证者类型分布 (机构/独立/社区)

### Tellor 风险评估

基于现有 [TellorRiskPanel.tsx](file:///Users/imokokok/Documents/foresight-build/insight/src/components/oracle/panels/TellorRiskPanel.tsx) 完善：

**当前状态**: ⭐⭐⭐⭐ 较完善

**需补充**:

* [ ] 添加数据新鲜度指示器

* [ ] 添加安全事件时间线

* [ ] 添加风险缓解措施展示

**特色指标**:

* 数据质量评分动态展示

* 价格偏离度监控 (当前/24h平均/24h最大)

* 风险趋势图 (12小时历史)

* 三级告警系统 (critical/warning/info)

### API3 风险评估

基于现有 [API3RiskAssessmentPanel.tsx](file:///Users/imokokok/Documents/foresight-build/insight/src/components/oracle/panels/API3RiskAssessmentPanel.tsx) 完善：

**当前状态**: ⭐⭐⭐ 中等

**需补充**:

* [ ] 添加数据新鲜度指示器

* [ ] 添加四维度评分卡片

* [ ] 添加安全事件时间线

* [ ] 添加风险缓解措施展示

**特色指标**:

* 覆盖池抵押率 (Coverage Ratio)

* 数据源集中度分析

* Airnode 网络健康度

* 质押收益率风险评估

### Band Protocol 风险评估

基于现有 [BandRiskAssessmentPanel.tsx](file:///Users/imokokok/Documents/foresight-build/insight/src/components/oracle/panels/BandRiskAssessmentPanel.tsx) 完善：

**当前状态**: ⭐⭐⭐⭐ 较完善

**需补充**:

* [ ] 添加数据新鲜度指示器

* [ ] 添加评分趋势图表

**特色指标**:

* Tendermint 共识安全性

* IBC 跨链指标 (连接链数、中继器数)

* 验证者集中度 (基尼系数 0.45)

### RedStone 风险评估

基于现有 [RedStoneRiskAssessmentPanel.tsx](file:///Users/imokokok/Documents/foresight-build/insight/src/components/oracle/panels/RedStoneRiskAssessmentPanel.tsx) 完善：

**当前状态**: ⭐⭐⭐⭐ 较完善

**需补充**:

* [ ] 添加数据新鲜度指示器

* [ ] 添加评分趋势图表

**特色指标**:

* 数据流新鲜度评分 (98.5/100)

* Arweave 永久存储集成

* 模块化架构组件风险

### Chronicle 风险评估

基于现有 [ChronicleRiskAssessmentPanel.tsx](file:///Users/imokokok/Documents/foresight-build/insight/src/components/oracle/panels/ChronicleRiskAssessmentPanel.tsx) 完善：

**当前状态**: ⭐⭐⭐⭐ 较完善

**需补充**:

* [ ] 添加数据新鲜度指示器

* [ ] 添加四维度评分卡片

* [ ] 添加风险缓解措施展示

**特色指标**:

* Scuttlebutt 安全协议集成

* 审计评分 (98/100)

* MakerDAO 依赖风险评估

### DIA 风险评估 (新增)

当前仅有 [DIADataTransparencyPanel.tsx](file:///Users/imokokok/Documents/foresight-build/insight/src/components/oracle/panels/DIADataTransparencyPanel.tsx)

**当前状态**: ⭐⭐ 需新建

**需实现**:

* [ ] 创建 DIARiskAssessmentPanel 组件

* [ ] 添加四维度评分卡片

* [ ] 添加数据源可信度评分

* [ ] 添加数据聚合风险分析

* [ ] 添加安全事件时间线

* [ ] 添加跨链覆盖风险评估

* [ ] 添加风险缓解措施展示

**特色指标**:

* 数据源可信度平均分

* 开源透明度评分

* 数据溯源验证

### WINkLink 风险评估

基于现有 [WINkLinkRiskPanel.tsx](file:///Users/imokokok/Documents/foresight-build/insight/src/components/oracle/panels/WINkLinkRiskPanel.tsx) 完善：

**当前状态**: ⭐⭐ 过于简化

**需补充**:

* [ ] 添加数据新鲜度指示器

* [ ] 添加四维度评分卡片

* [ ] 添加风险趋势图表

* [ ] 添加安全事件时间线

* [ ] 添加跨链风险评估 (TRON生态)

* [ ] 添加风险缓解措施展示

* [ ] 添加游戏数据专项风险

**特色指标**:

* TRON 生态依赖风险

* 游戏数据延迟风险

* 节点地理分布

***

## 新增通用组件规范

### DataFreshnessIndicator 组件

```typescript
interface DataFreshnessIndicatorProps {
  lastUpdated: Date;
  threshold?: number; // 过期阈值（分钟），默认60
  onRefresh?: () => void;
}
```

### RiskScoreCard 组件

```typescript
interface RiskScoreCardProps {
  title: string;
  score: number;
  description: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
}
```

### SecurityTimeline 组件

```typescript
interface SecurityTimelineProps {
  events: RiskEvent[];
  maxItems?: number;
}
```

### MitigationMeasuresGrid 组件

```typescript
interface MitigationMeasuresGridProps {
  measures: MitigationMeasure[];
}
```

***

## 数据模型扩展

### 扩展 RiskMetric 接口

```typescript
interface RiskMetric {
  name: string;
  value: number;
  maxValue: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
  trend?: 'up' | 'down' | 'stable'; // 新增
  trendValue?: number; // 新增
  weight?: number; // 新增：权重
}
```

### 新增 RiskAssessmentData 接口

```typescript
interface RiskAssessmentData {
  overallScore: number;
  overallLevel: RiskLevel;
  dimensions: {
    decentralization: RiskMetric;
    security: RiskMetric;
    stability: RiskMetric;
    dataQuality: RiskMetric;
  };
  metrics: Record<string, number | string>;
  events: RiskEvent[];
  crossChainRisks: CrossChainRisk[];
  mitigationMeasures: MitigationMeasure[];
  lastUpdated: Date;
}
```

***

## REMOVED Requirements

无移除需求。
