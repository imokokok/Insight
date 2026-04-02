# 多预言机对比页面数据质量Tab完全重做 Spec

## Why
当前数据质量Tab存在以下问题：
1. **过多卡片堆叠** - 综合评分、三维度卡片、数据源状态、改进建议等多个卡片，视觉混乱
2. **文案建议无价值** - "建议缩短数据刷新间隔"等建议过于笼统，缺乏实际指导意义
3. **缺乏专业数据** - 评分算法不透明，缺乏可量化的专业指标
4. **信息密度低** - 大量空间被进度条、环形图等装饰元素占据，实际数据展示不足

需要重新设计一个专业、简洁、高价值的数据质量分析界面。

## What Changes
- **全新数据质量视图**：采用专业数据分析工具风格，类似数据监控仪表盘
- **核心质量指标**：展示真正有价值的专业指标（置信区间、变异系数、Z-Score分布等）
- **数据源对比矩阵**：横向对比各预言机的实时质量指标
- **历史趋势图表**：展示质量指标的时间序列变化
- **异常检测面板**：突出显示数据质量问题
- **移除冗余元素**：删除评分卡片、改进建议、装饰性进度条

## Impact
- Affected files:
  - `src/app/[locale]/cross-oracle/components/tabs/SimpleQualityAnalysisTab.tsx` - 完全重写
  - `src/app/[locale]/cross-oracle/hooks/useDataQualityScore.ts` - 扩展专业指标计算
  - `src/i18n/messages/zh-CN/crossOracle.json` - 新增专业指标文案
  - `src/i18n/messages/en/crossOracle.json` - 新增专业指标文案

## ADDED Requirements

### Requirement: 专业质量指标展示
The system SHALL 展示数据质量的专业量化指标

#### Scenario: 展示核心统计指标
- **GIVEN** 价格数据已返回
- **THEN** 显示变异系数(CV)、标准误差(SEM)、置信区间
- **AND** 显示各预言机的Z-Score分布
- **AND** 显示数据更新延迟统计(P50/P95/P99)

#### Scenario: 展示数据源质量对比
- **GIVEN** 多个预言机数据
- **THEN** 以表格形式横向对比各预言机
- **AND** 包含：价格、偏差、Z-Score、更新延迟、置信度
- **AND** 自动标记异常数据源

### Requirement: 质量趋势可视化
The system SHALL 提供质量指标的时间序列图表

#### Scenario: 展示一致性趋势
- **GIVEN** 历史数据可用
- **THEN** 展示标准差/变异系数随时间变化
- **AND** 标注异常时间点

#### Scenario: 展示延迟分布
- **GIVEN** 多时间点数据
- **THEN** 展示各预言机更新延迟的箱线图/分布图

### Requirement: 异常数据检测面板
The system SHALL 突出展示数据质量问题

#### Scenario: 检测离群值
- **GIVEN** 价格数据存在离群值
- **THEN** 以醒目标识展示离群值
- **AND** 显示离群程度(Z-Score)
- **AND** 提供数据点详情

#### Scenario: 检测延迟异常
- **GIVEN** 某预言机更新延迟过高
- **THEN** 标记该数据源为延迟异常
- **AND** 显示实际延迟与预期延迟对比

## MODIFIED Requirements

### Requirement: 数据质量评分算法
**原设计**: 简单的0-100综合评分 + 三维度评分
**新设计**:
- 移除综合评分概念
- 改为展示原始统计指标
- 变异系数(CV) = 标准差 / 平均值
- 标准误差(SEM) = 标准差 / √n
- 95%置信区间 = 平均值 ± 1.96 × SEM

### Requirement: 数据质量界面布局
**原设计**: 
- 顶部综合评分环形图
- 三维度评分卡片(一致性/新鲜度/完整性)
- 数据源状态网格
- 改进建议列表

**新设计**:
- 顶部核心指标行（紧凑展示CV、SEM、置信区间、样本数）
- 左侧质量趋势图表（标准差时间序列）
- 右侧数据源质量对比表格（详细指标）
- 底部异常检测面板（如有异常）

### Requirement: 数据源状态展示
**原设计**: 卡片网格展示各预言机价格和状态图标
**新设计**: 
- 统一在对比表格中展示
- 增加Z-Score、延迟、置信度列
- 使用颜色编码标识异常

## REMOVED Requirements

### Requirement: 综合评分展示
**Reason**: 单一评分过于简化，无法反映真实数据质量状况
**Migration**: 使用原始统计指标替代

### Requirement: 改进建议功能
**Reason**: 当前建议过于笼统，缺乏实际价值
**Migration**: 直接展示异常数据，让用户自行判断

### Requirement: 三维度评分(一致性/新鲜度/完整性)
**Reason**: 评分算法不透明，用户无法验证
**Migration**: 展示可验证的原始指标

### Requirement: 环形进度图和装饰性进度条
**Reason**: 占用空间但信息密度低
**Migration**: 使用简洁的数字和表格展示
