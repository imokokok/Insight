# 跨链比较页面数据可视化优化规格

## Why
跨链比较页面已达到专业金融数据分析平台的基础水准，但在时序分析、统计图表标准化、风险指标展示等方面存在提升空间。本次优化旨在增强页面的专业性和实用性，提升用户对跨链价格差异的深度分析能力。

## What Changes
- 新增滚动相关性时序图组件，检测相关性结构变化
- 重构箱线图为标准实现，提升统计准确性
- 添加协整残差诊断图，验证模型假设
- 增加色盲友好模式，提升可访问性
- 优化热力图信息密度，增加绝对价差展示
- 添加波动率曲面视图，实现多维度风险评估

## Impact
- Affected specs: 跨链比较页面所有可视化组件
- Affected code:
  - `src/app/cross-chain/components/CorrelationMatrix.tsx`
  - `src/app/cross-chain/components/PriceSpreadHeatmap.tsx`
  - `src/app/cross-chain/components/CointegrationAnalysis.tsx`
  - `src/app/cross-chain/page.tsx`
  - `src/app/cross-chain/utils.ts`
  - 新增组件文件

## ADDED Requirements

### Requirement: 滚动相关性时序图
The system SHALL provide a rolling correlation time series chart to detect correlation structure changes over time.

#### Scenario: 用户查看相关性变化趋势
- **WHEN** 用户访问跨链比较页面
- **THEN** 系统显示各链对之间的滚动相关系数时序图
- **AND** 支持自定义滚动窗口大小（默认30个数据点）
- **AND** 当相关系数突破阈值（|r| > 0.8 或 |r| < 0.2）时高亮显示

### Requirement: 标准箱线图实现
The system SHALL replace the custom box plot with a standard implementation showing complete statistical information.

#### Scenario: 用户查看价格分布统计
- **WHEN** 用户查看价格分布分析区域
- **THEN** 箱线图正确显示最小值、Q1、中位数、Q3、最大值
- **AND** 异常点(outliers)使用独立标记显示
- **AND** 支持悬停查看精确数值

### Requirement: 协整残差诊断图
The system SHALL provide cointegration residual diagnostic plots to validate model assumptions.

#### Scenario: 用户验证协整模型
- **WHEN** 用户展开协整分析详情
- **THEN** 显示残差序列的自相关函数(ACF)图
- **AND** 显示残差分布直方图与正态分布对比
- **AND** 提供Ljung-Box检验统计量

### Requirement: 色盲友好模式
The system SHALL provide a colorblind-friendly mode for all visualizations.

#### Scenario: 色盲用户访问页面
- **WHEN** 用户开启色盲友好模式
- **THEN** 热力图使用蓝-黄配色替代绿-红
- **AND** 所有图表增加纹理/图案辅助区分
- **AND** 相关性矩阵使用形状大小编码辅助颜色编码

### Requirement: 热力图增强
The system SHALL enhance the heatmap with additional information density.

#### Scenario: 用户分析价格差异
- **WHEN** 用户悬停热力图单元格
- **THEN** Tooltip同时显示百分比差异和绝对价差
- **AND** 显示该差异相对于历史数据的位置百分位
- **AND** 提供"固定该对比"功能，便于持续监控

### Requirement: 波动率曲面视图
The system SHALL provide a volatility surface view for multi-dimensional risk assessment.

#### Scenario: 用户评估跨链风险
- **WHEN** 用户切换到波动率分析视图
- **THEN** 显示各链的滚动波动率时序图
- **AND** 展示链间波动率相关性矩阵
- **AND** 提供波动率锥(Volatility Cone)分析

## MODIFIED Requirements

### Requirement: 价格分布分析区域
The existing price distribution section SHALL be enhanced with standard statistical charts.

**Current**: 使用Scatter模拟箱线图，whisker显示不完整
**Modified**: 
- 使用Recharts ComposedChart实现标准箱线图
- 增加小提琴图(Violin Plot)选项切换
- 添加核密度估计(KDE)曲线

### Requirement: 主价格走势图
The main price chart SHALL support advanced interaction controls.

**Current**: Brush组件过于简单
**Modified**:
- 添加缩放/平移控制按钮
- 支持框选放大
- 添加参考线快速添加功能

## REMOVED Requirements

### Requirement: 简化箱线图实现
**Reason**: 被标准箱线图实现替代
**Migration**: 新实现完全兼容旧数据接口
