# Chainlink 页面数据深度优化方案

## Why

根据之前的专业分析，Chainlink 详情页面虽然达到了 B+ 评级（8.225/10），但在技术指标、链上数据深度、对比分析等方面仍有改进空间。本优化方案旨在按照优先级建议，系统性地提升页面数据深度，使其达到行业领先水平。

## What Changes

- 添加多周期移动平均线（MA14/MA30/MA60）
- 集成 RSI 和 MACD 技术指标
- 在 Chainlink 页面启用布林带和 ATR 组件
- 添加 Gas 费用历史趋势图
- 集成链上延迟分布直方图
- 扩展对比分析功能

## Impact

- Affected specs: chainlink-data-depth-analysis
- Affected code: 
  - src/components/oracle/PriceChart.tsx
  - src/components/oracle/OraclePageTemplate.tsx
  - src/components/oracle/KPIDashboard.tsx
  - src/components/oracle/NetworkHealthPanel.tsx

## ADDED Requirements

### Requirement: 多周期移动平均线
系统 SHALL 在 PriceChart 中添加 MA14、MA30、MA60 移动平均线。

#### Scenario: 多周期 MA 显示
- **WHEN** 用户查看价格趋势图
- **THEN** 应显示 MA7（黄色虚线）
- **AND** 应显示 MA14（蓝色虚线）
- **AND** 应显示 MA30（紫色虚线）
- **AND** 应显示 MA60（绿色虚线）
- **AND** 用户可通过图例开关控制各 MA 线的显示/隐藏

#### Scenario: MA 计算准确性
- **WHEN** 计算移动平均线
- **THEN** MA14 应基于14个数据点的滑动窗口
- **AND** MA30 应基于30个数据点的滑动窗口
- **AND** MA60 应基于60个数据点的滑动窗口
- **AND** 数据点不足时应使用当前价格填充

### Requirement: RSI 技术指标
系统 SHALL 添加 RSI（相对强弱指标）面板。

#### Scenario: RSI 计算与显示
- **WHEN** 计算 RSI 指标
- **THEN** 使用14日周期作为默认参数
- **AND** RSI 值范围应在 0-100 之间
- **AND** 在独立面板中显示 RSI 曲线

#### Scenario: RSI 信号提示
- **WHEN** RSI > 70
- **THEN** 显示超买信号（红色区域）
- **WHEN** RSI < 30
- **THEN** 显示超卖信号（绿色区域）
- **AND** 在价格图上标记 RSI 信号点

### Requirement: MACD 技术指标
系统 SHALL 添加 MACD（指数平滑异同平均线）面板。

#### Scenario: MACD 计算与显示
- **WHEN** 计算 MACD
- **THEN** 快线（DIF）= EMA12 - EMA26
- **AND** 慢线（DEA）= EMA9(DIF)
- **AND** 柱状图（MACD）= 2 × (DIF - DEA)
- **AND** 在独立面板中显示 MACD 曲线和柱状图

#### Scenario: MACD 金叉死叉信号
- **WHEN** DIF 上穿 DEA
- **THEN** 标记金叉信号（买入）
- **WHEN** DIF 下穿 DEA
- **THEN** 标记死叉信号（卖出）

### Requirement: 启用现有技术指标组件
系统 SHALL 在 Chainlink 页面启用已存在但未集成的布林带和 ATR 组件。

#### Scenario: 布林带集成
- **WHEN** 启用布林带
- **THEN** 中轨 = MA20
- **AND** 上轨 = MA20 + 2×标准差
- **AND** 下轨 = MA20 - 2×标准差
- **AND** 在价格图上显示三条轨道线

#### Scenario: ATR 指标集成
- **WHEN** 启用 ATR 指标
- **THEN** 使用14日周期作为默认参数
- **AND** 在独立面板中显示 ATR 值
- **AND** 提供 ATR 百分比和绝对值两种显示方式

### Requirement: Gas 费用历史趋势
系统 SHALL 添加 Gas 费用历史趋势图。

#### Scenario: Gas 费用数据展示
- **WHEN** 查看网络健康面板
- **THEN** 显示 Gas 费用历史趋势图
- **AND** 支持多时间范围（24H/7D/30D/90D）
- **AND** 显示平均 Gas 费用、最高/最低 Gas 费用

#### Scenario: Gas 费用统计
- **WHEN** 分析 Gas 费用
- **THEN** 计算 Gas 费用平均值
- **AND** 计算 Gas 费用标准差
- **AND** 提供 Gas 费用趋势分析（上升/下降/稳定）

### Requirement: 链上延迟分布
系统 SHALL 在 Chainlink 页面集成延迟分布直方图。

#### Scenario: 延迟分布展示
- **WHEN** 查看网络健康面板
- **THEN** 显示链上更新延迟分布直方图
- **AND** X轴为延迟时间区间（ms）
- **AND** Y轴为频次

#### Scenario: 延迟统计
- **WHEN** 分析延迟数据
- **THEN** 计算平均延迟
- **AND** 计算 P50/P95/P99 延迟百分位
- **AND** 显示延迟分布的标准差

### Requirement: 技术指标控制面板
系统 SHALL 添加统一的技术指标控制面板。

#### Scenario: 指标开关控制
- **WHEN** 用户打开指标控制面板
- **THEN** 提供所有技术指标的开关
- **AND** 包括 MA7/MA14/MA30/MA60、RSI、MACD、布林带、ATR
- **AND** 设置应保存到本地存储

#### Scenario: 指标参数配置
- **WHEN** 用户配置指标参数
- **THEN** 可修改 MA 周期
- **AND** 可修改 RSI 周期
- **AND** 可修改 MACD 参数（快线/慢线/信号线）
- **AND** 可修改布林带标准差倍数

## MODIFIED Requirements

### Requirement: PriceChart 组件扩展
**修改内容**: 扩展 PriceChart 组件以支持多技术指标
**原因**: 当前仅支持 MA7 和预测区间，需要扩展以支持更多技术指标
**迁移**: 保持向后兼容，新增功能通过配置项启用

### Requirement: OraclePageTemplate 布局调整
**修改内容**: 调整 Chainlink 页面布局以容纳新的技术指标面板
**原因**: 新增 RSI、MACD、ATR 等需要独立面板展示
**迁移**: 使用响应式布局，确保移动端和桌面端都能正常显示

## REMOVED Requirements

无移除的需求。
