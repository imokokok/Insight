# 多预言机价格对比Tab完全重构 Spec

## Why
当前价格对比Tab存在以下问题：
1. 卡片数量过多，信息密度低，用户难以快速获取核心价值
2. 数据展示不够专业，缺乏深度的市场分析视角
3. 图表功能单一，无法提供有效的价格发现参考
4. 缺少关键的交易指标（如买卖价差、流动性深度等）

需要重构为专业的价格发现与风险评估工具，为DeFi开发者、交易员提供有价值的多源价格分析。

## What Changes
- **精简卡片布局**：从4个统计卡片精简为2个核心指标卡片（市场共识价格 + 价格离散度指数）
- **专业价格表格**：展示更多专业字段（置信度、延迟、数据源数量、更新时间）
- **多维度图表**：
  - 价格分布直方图（显示价格聚类情况）
  - 偏差分析散点图（X轴价格，Y轴偏差，气泡大小代表置信度）
  - 时间序列对比图（支持多预言机价格走势对比）
- **风险评估面板**：集成异常检测可视化
- **市场深度模拟**：基于多预言机价格模拟买卖盘深度

## Impact
- Affected files:
  - `src/app/[locale]/cross-oracle/components/tabs/SimplePriceComparisonTab.tsx` - 完全重写
  - `src/app/[locale]/cross-oracle/components/SimplePriceTable.tsx` - 增强字段
  - `src/i18n/messages/zh-CN/crossOracle.json` - 新增专业术语
  - `src/i18n/messages/en/crossOracle.json` - 新增专业术语

## ADDED Requirements

### Requirement: 核心指标卡片精简
The system SHALL 只展示2个核心指标卡片

#### Scenario: 市场共识价格卡片
- **GIVEN** 价格数据已返回
- **THEN** 显示大字号中位数价格
- **AND** 显示价格区间条（可视化min-max范围）
- **AND** 显示与上一周期对比变化率

#### Scenario: 价格离散度指数卡片
- **GIVEN** 价格数据已返回
- **THEN** 显示变异系数（CV = 标准差/均值）
- **AND** 使用仪表盘/环形图展示离散程度
- **AND** 提供市场解读文本（如"高度一致"/"存在分歧"）

### Requirement: 专业价格对比表格
The system SHALL 提供包含专业字段的价格对比表格

#### Scenario: 表格字段展示
- **GIVEN** 价格数据已返回
- **THEN** 表格包含以下列：
  - 预言机名称 + 图标
  - 价格（高亮异常值）
  - 与中位数偏差（带趋势图标）
  - 置信度分数（0-100，带颜色条）
  - 响应延迟（毫秒）
  - 数据源数量
  - 最后更新时间
  - 状态标签（正常/警告/异常）

#### Scenario: 表格排序与筛选
- **GIVEN** 表格已显示
- **THEN** 支持按价格、偏差、置信度排序
- **AND** 支持按状态筛选（只看异常）

### Requirement: 价格分布可视化
The system SHALL 提供价格分布直方图

#### Scenario: 直方图展示
- **GIVEN** 多个预言机价格数据
- **THEN** 显示价格分布直方图
- **AND** 标注中位数位置
- **AND** 标注异常值位置
- **AND** 显示正态分布拟合曲线（可选）

### Requirement: 偏差分析散点图
The system SHALL 提供偏差分析散点图

#### Scenario: 散点图展示
- **GIVEN** 价格数据已返回
- **THEN** X轴为价格，Y轴为与中位数偏差百分比
- **AND** 气泡大小代表置信度（置信度越高气泡越大）
- **AND** 颜色代表状态（绿色正常/黄色警告/红色异常）
- **AND** 标注中位数参考线

### Requirement: 多预言机价格走势对比图
The system SHALL 提供时间序列对比图

#### Scenario: 走势图展示
- **GIVEN** 历史价格数据可用
- **THEN** 显示多条线代表不同预言机价格走势
- **AND** 支持显示/隐藏特定预言机
- **AND** 标注异常点

### Requirement: 市场深度模拟图
The system SHALL 提供基于多预言机价格的市场深度模拟

#### Scenario: 深度图展示
- **GIVEN** 多个预言机价格
- **THEN** 模拟买卖盘深度曲线
- **AND** 显示最佳买卖价格
- **AND** 显示价差百分比

## MODIFIED Requirements

### Requirement: 移除冗余统计卡片
**原设计**: 4个卡片（中位数价格、价格区间、偏差率、一致性评级）
**新设计**: 2个核心卡片（市场共识价格、价格离散度指数）
**理由**: 减少视觉噪音，聚焦核心价值

### Requirement: 表格字段增强
**原设计**: 预言机、价格、偏差、状态
**新设计**: 预言机、价格、偏差、置信度、延迟、数据源、更新时间、状态
**理由**: 提供更全面的数据质量评估维度

### Requirement: 图表区域重构
**原设计**: 单一价格趋势图
**新设计**: 多图表Tab切换（分布直方图、偏差散点图、走势对比图、市场深度图）
**理由**: 满足不同分析场景需求

## REMOVED Requirements

### Requirement: 一致性评级卡片
**Reason**: 被价格离散度指数替代，信息重复
**Migration**: 离散度指数已包含一致性评估

### Requirement: 简单价格区间卡片
**Reason**: 整合到市场共识价格卡片的价格区间条中
**Migration**: 在共识价格卡片中展示价格范围

### Requirement: 数据说明文字块
**Reason**: 专业用户无需基础说明，占用空间
**Migration**: 移除，如需帮助可提供tooltip提示
