# 多预言机对比页面风险预警 Tab 完全重构 Spec

## Why

当前风险预警 Tab 存在以下问题：

1. 信息展示过于分散，使用大量卡片堆砌
2. 缺乏专业的风险指标和可视化图表
3. 没有提供可操作的风险洞察和建议
4. 界面显得不够专业，难以体现平台的数据质量检测能力

需要完全重做一个专业、简洁、有价值的风险预警功能，让用户能够：

- 快速识别关键风险点
- 理解风险的严重程度和影响
- 获得可操作的应对建议
- 通过专业图表直观理解风险分布

## What Changes

- **完全重做风险预警 Tab**：从布局到组件全部重新设计
- **精简信息架构**：减少卡片数量，聚焦核心风险指标
- **专业数据可视化**：添加风险热力图、趋势图、分布图等专业图表
- **智能风险洞察**：基于算法提供风险分析和建议
- **统一视觉风格**：采用专业的金融风控界面设计语言

## Impact

- Affected files:
  - `src/app/[locale]/cross-oracle/components/tabs/RiskAlertTab.tsx` - 完全重写
  - `src/app/[locale]/cross-oracle/components/RiskAlertDashboard.tsx` - 优化增强
  - `src/i18n/messages/` - 新增专业术语文案

## ADDED Requirements

### Requirement: 风险概览仪表盘

The system SHALL 在 Tab 顶部展示简洁的风险概览

#### Scenario: 有风险时

- **GIVEN** 检测到价格异常
- **THEN** 显示风险等级指示器（高/中/低）
- **AND** 显示关键指标：异常数量、最大偏差、风险评分
- **AND** 采用紧凑的单行布局，不占用过多空间

#### Scenario: 无风险时

- **GIVEN** 数据正常
- **THEN** 显示绿色安全状态指示
- **AND** 显示数据一致性评分

### Requirement: 风险热力图

The system SHALL 提供风险热力图可视化

#### Scenario: 展示风险分布

- **GIVEN** 多个预言机存在风险
- **THEN** 以矩阵热力图形式展示各预言机的风险等级
- **AND** 颜色编码：红色=高风险、橙色=中风险、黄色=低风险、绿色=正常
- **AND** 支持悬停查看详细信息

### Requirement: 风险趋势图表

The system SHALL 展示风险趋势变化

#### Scenario: 展示历史趋势

- **GIVEN** 有时间序列数据
- **THEN** 显示风险评分随时间变化的趋势线
- **AND** 标注关键风险事件点
- **AND** 提供时间范围选择（1H/24H/7D）

### Requirement: 风险详情列表

The system SHALL 以专业表格形式展示风险详情

#### Scenario: 展示异常详情

- **GIVEN** 存在价格异常
- **THEN** 使用紧凑表格展示：预言机、价格、偏差、风险等级、原因
- **AND** 按风险等级排序（高→中→低）
- **AND** 支持展开查看完整分析

### Requirement: 智能风险建议

The system SHALL 基于风险分析提供智能建议

#### Scenario: 生成建议

- **GIVEN** 检测到特定风险模式
- **THEN** 自动生成针对性的风险应对建议
- **AND** 按优先级排序（立即处理/建议关注/持续监控）
- **AND** 提供建议的操作按钮（如"导出报告"）

### Requirement: 风险指标卡片组

The system SHALL 展示关键风险指标

#### Scenario: 展示指标

- **GIVEN** 风险数据已加载
- **THEN** 在一行内展示3-4个核心指标卡片：
  - 价格波动率
  - 数据一致性评分
  - 异常检测敏感度
  - 系统健康度
- **AND** 每个卡片包含指标值和趋势指示

## MODIFIED Requirements

### Requirement: 移除冗余卡片

**原设计**: 多个独立的风险分布卡片、异常列表卡片、建议卡片
**新设计**:

- 合并为紧凑的风险概览栏
- 使用表格替代列表展示异常
- 建议整合为智能建议面板

### Requirement: 优化视觉层次

**原设计**: 平铺展示所有信息，缺乏重点
**新设计**:

1. **第一视觉层**：风险概览仪表盘（1行）
2. **第二视觉层**：风险热力图 + 趋势图（左右布局）
3. **第三视觉层**：风险详情表格（全宽）
4. **第四视觉层**：智能建议面板（底部）

### Requirement: 专业术语和文案

**新增专业术语**：

- 风险敞口（Risk Exposure）
- 价格偏离度（Price Deviation）
- 数据一致性指数（Data Consistency Index）
- 异常检测阈值（Anomaly Detection Threshold）
- 风险热力图（Risk Heatmap）

## REMOVED Requirements

### Requirement: 分散的风险分布卡片

**Reason**: 占用空间过多，信息密度低
**Migration**: 整合为紧凑的风险概览栏

### Requirement: 独立的建议卡片

**Reason**: 与风险详情分离，缺乏上下文
**Migration**: 整合为智能建议面板，与风险详情关联

### Requirement: 过多的图标装饰

**Reason**: 影响专业感，分散注意力
**Migration**: 精简图标使用，仅在关键位置使用
