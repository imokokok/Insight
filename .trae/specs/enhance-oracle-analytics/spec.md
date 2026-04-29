# Oracle Analytics Enhancement Spec

## Why

Insight 当前已经具备了 7 维度风险评分、IQR/Z-Score 异常检测、价格新鲜度监控等分析能力，但这些能力分散在不同页面，且核心交互模式仍以"查价格 → 看偏差"为主。用户很容易将产品定位为"多预言机价格查询工具"而非"预言机分析平台"。核心问题：

1. **Divergence 信号不够突出**：偏差只展示为百分比数字，缺乏"谁先偏、偏多久、是否在扩大"的时序分析
2. **Confidence/Volatility 仅停留在展示层面**：置信度只做颜色标记，波动率只做指数计算，没有基于 Feed 行为（更新频率变化、置信区间收窄/扩张、心跳异常）的深度分析
3. **Freshness/Stability 检查过于被动**：新鲜度只做"当前状态评分"，缺乏趋势预警和稳定性衰减检测

## What Changes

- 新增 **Divergence Signal Engine**：跨预言机偏差时序追踪、偏差方向分析、偏差加速度检测、领先/滞后预言机识别
- 新增 **Feed Behavior Analytics**：基于预言机 Feed 行为（非价格本身）的置信度分析、更新节奏异常检测、置信区间动态追踪
- 新增 **Stability Score & Decay Detection**：稳定性评分体系、稳定性衰减预警、数据质量趋势追踪
- 新增 **Oracle Divergence Dashboard**：跨预言机偏差信号专用 Tab 页，整合偏差时序图、领先/滞后排名、偏差热力图
- 新增 **Feed Health Dashboard**：Feed 健康度专用 Tab 页，整合更新节奏图、置信区间追踪、心跳检测
- 改造 **Cross-Oracle Risk Analysis Tab**：增加偏差加速度、稳定性衰减、Feed 行为异常等新维度
- 改造 **首页 HomeDashboard**：增加实时偏差信号和 Feed 健康摘要卡片

## Impact

- Affected specs: cross-oracle 页面、price-query 页面、首页
- Affected code:
  - `src/lib/analytics/riskMetrics.ts` — 新增偏差加速度、稳定性衰减计算
  - `src/app/cross-oracle/hooks/` — 新增 useDivergenceSignals、useFeedBehavior、useStabilityScore
  - `src/app/cross-oracle/components/tabs/` — 新增 DivergenceSignalTab、FeedHealthTab
  - `src/app/cross-oracle/CrossOracleContent.tsx` — 增加 Tab
  - `src/app/price-query/components/PriceFreshnessMonitor.tsx` — 增强为 Feed 行为分析
  - `src/app/home-components/HomeDashboard.tsx` — 增加分析摘要卡片

---

## ADDED Requirements

### Requirement: Divergence Signal Engine

系统 SHALL 提供跨预言机偏差信号引擎，追踪每个预言机与市场共识的偏差随时间的变化。

#### Scenario: 偏差时序追踪

- **WHEN** 用户查询某交易对的跨预言机数据且数据更新次数 >= 3
- **THEN** 系统计算每个预言机相对于中位数共识价格的偏差百分比时间序列
- **AND** 记录偏差方向（正偏/负偏）和偏差幅度

#### Scenario: 偏差加速度检测

- **WHEN** 某预言机的偏差在连续 3 次更新中持续扩大
- **THEN** 系统标记该预言机为"偏差加速"状态
- **AND** 计算偏差加速度（偏差变化的二阶导数）
- **AND** 当加速度超过阈值时发出预警

#### Scenario: 领先/滞后预言机识别

- **WHEN** 跨预言机数据可用
- **THEN** 系统基于价格变化时间戳识别哪个预言机最先反映价格变动
- **AND** 计算每个预言机相对于最早预言机的延迟（秒）
- **AND** 生成领先/滞后排名

#### Scenario: 偏差方向一致性检测

- **WHEN** 某预言机持续向同一方向偏离共识（连续 >= 3 次）
- **THEN** 系统标记为"方向性偏差"，区别于随机波动
- **AND** 提示可能存在系统性数据源偏差

---

### Requirement: Feed Behavior Analytics

系统 SHALL 基于预言机 Feed 行为（非价格本身）提供深度分析能力。

#### Scenario: 更新节奏异常检测

- **WHEN** 预言机的实际更新间隔与预期更新频率偏差超过 50%
- **THEN** 系统标记为"更新节奏异常"
- **AND** 计算实际更新间隔的滑动平均值和标准差
- **AND** 检测更新频率的突变（如从每秒更新突然变为每分钟更新）

#### Scenario: 置信区间动态追踪

- **WHEN** 预言机提供置信度数据（如 Pyth 的 confidence interval）
- **THEN** 系统追踪置信区间宽度的变化趋势
- **AND** 当置信区间在短时间内扩张超过 100% 时标记为"不确定性激增"
- **AND** 计算置信区间的滑动平均和变化率

#### Scenario: 心跳检测

- **WHEN** 预言机在预期更新周期的 2 倍时间内未更新
- **THEN** 系统标记为"心跳丢失"
- **AND** 记录心跳丢失的持续时间和频率
- **AND** 计算心跳可靠性指标（预期更新次数 vs 实际更新次数）

#### Scenario: Feed 行为综合评分

- **WHEN** 跨预言机数据可用
- **THEN** 系统基于更新节奏稳定性(30%) + 置信区间稳定性(25%) + 心跳可靠性(25%) + 数据新鲜度(20%) 计算 Feed 健康度评分
- **AND** 评分范围 0-100，>=80 Healthy / >=60 Fair / >=40 Degraded / <40 Critical

---

### Requirement: Stability Score & Decay Detection

系统 SHALL 提供稳定性评分和衰减检测能力，超越简单的新鲜度检查。

#### Scenario: 稳定性评分计算

- **WHEN** 预言机有 >= 5 个历史数据点
- **THEN** 系统计算稳定性评分，基于：
  - 价格一致性（偏差波动率，权重 30%）
  - 更新频率一致性（间隔标准差/均值，权重 25%）
  - 置信度稳定性（置信度变化率，权重 25%）
  - 数据完整性（无间隙比例，权重 20%）
- **AND** 评分范围 0-100

#### Scenario: 稳定性衰减检测

- **WHEN** 预言机的稳定性评分在滑动窗口内持续下降
- **THEN** 系统计算衰减速率（评分变化的斜率）
- **AND** 当衰减速率超过阈值时发出"稳定性衰减预警"
- **AND** 预测按当前衰减速率，评分将在何时降至 Critical 水平

#### Scenario: 数据质量趋势

- **WHEN** 用户查看某预言机的历史数据
- **THEN** 系统展示数据质量趋势图，包含稳定性评分、偏差幅度、更新频率三条曲线
- **AND** 标注关键事件（偏差加速、心跳丢失、稳定性衰减等）

---

### Requirement: Oracle Divergence Dashboard

系统 SHALL 在跨预言机比较页面提供专用的偏差信号 Tab。

#### Scenario: 偏差信号总览

- **WHEN** 用户切换到 Divergence Signal Tab
- **THEN** 系统展示偏差信号总览卡片，包含：
  - 当前偏差预警数量（按严重度分类）
  - 偏差加速中的预言机数量
  - 方向性偏差的预言机数量
  - 领先预言机标识

#### Scenario: 偏差时序图

- **WHEN** 偏差信号 Tab 加载完成
- **THEN** 系统展示各预言机偏差百分比的时间序列折线图
- **AND** 以 0% 为基准线，正偏/负偏用不同颜色
- **AND** 标注偏差加速区间和方向性偏差区间

#### Scenario: 领先/滞后排名

- **WHEN** 偏差信号 Tab 加载完成
- **THEN** 系统展示预言机响应速度排名
- **AND** 显示每个预言机相对于最早预言机的延迟秒数
- **AND** 用颜色编码标识领先（绿）/ 同步（蓝）/ 滞后（红）

#### Scenario: 偏差热力图

- **WHEN** 偏差信号 Tab 加载完成
- **THEN** 系统展示预言机间两两偏差的热力图矩阵
- **AND** 悬停显示详细偏差数据
- **AND** 高偏差对用红色标注

---

### Requirement: Feed Health Dashboard

系统 SHALL 在跨预言机比较页面提供专用的 Feed 健康度 Tab。

#### Scenario: Feed 健康度总览

- **WHEN** 用户切换到 Feed Health Tab
- **THEN** 系统展示 Feed 健康度总览，包含：
  - 各预言机 Feed 健康度评分卡片
  - 更新节奏异常数量
  - 心跳丢失数量
  - 置信区间异常数量

#### Scenario: 更新节奏图

- **WHEN** Feed Health Tab 加载完成
- **THEN** 系统展示各预言机实际更新间隔的时间序列图
- **AND** 叠加预期更新频率参考线
- **AND** 标注更新节奏异常区间

#### Scenario: 置信区间追踪图

- **WHEN** Feed Health Tab 加载完成且有置信度数据
- **THEN** 系统展示各预言机置信区间宽度的变化趋势
- **AND** 标注不确定性激增事件
- **AND** 叠加价格变化曲线以展示相关性

#### Scenario: 心跳监控面板

- **WHEN** Feed Health Tab 加载完成
- **THEN** 系统展示各预言机的心跳状态面板
- **AND** 显示预期更新次数 vs 实际更新次数
- **AND** 心跳丢失事件时间线

---

### Requirement: Enhanced Risk Analysis

系统 SHALL 增强现有风险分析 Tab，整合新的分析维度。

#### Scenario: 风险评分增加新维度

- **WHEN** 风险分析 Tab 加载完成
- **THEN** 综合风险评分增加以下维度权重调整：
  - 偏差加速度风险（新增，权重 10%）
  - Feed 行为健康度（新增，权重 10%）
  - 稳定性衰减风险（新增，权重 5%）
  - 原有 7 维度权重相应调整（各 10%，共享依赖 5%）

#### Scenario: 风险归因分析

- **WHEN** 综合风险评分升高
- **THEN** 系统展示风险归因分析，标识哪个维度的贡献最大
- **AND** 提供可操作的建议（如"Chainlink 偏差加速中，建议关注其数据源状态"）

---

### Requirement: Home Dashboard Enhancement

系统 SHALL 在首页增加分析摘要卡片。

#### Scenario: 实时偏差信号摘要

- **WHEN** 首页加载完成
- **THEN** 系统展示实时偏差信号摘要卡片
- **AND** 显示当前偏差预警数量和最严重的偏差事件
- **AND** 点击可跳转到跨预言机偏差信号 Tab

#### Scenario: Feed 健康摘要

- **WHEN** 首页加载完成
- **THEN** 系统展示 Feed 健康度摘要卡片
- **AND** 显示各预言机 Feed 健康度评分概览
- **AND** 点击可跳转到 Feed Health Tab

---

## MODIFIED Requirements

### Requirement: Cross-Oracle Page Tab Structure

跨预言机比较页面的 Tab 结构从 3 个扩展为 5 个：

- Tab 1: Price Comparison（保持不变）
- Tab 2: Divergence Signals（新增）
- Tab 3: Feed Health（新增）
- Tab 4: Risk Analysis（增强，新增 3 个维度）
- Tab 5: Oracle Ranking（保持不变）

### Requirement: PriceFreshnessMonitor Enhancement

PriceFreshnessMonitor 组件 SHALL 增加以下能力：

- 更新节奏异常检测（实际间隔 vs 预期间隔的偏差追踪）
- 心跳丢失检测和计数
- 稳定性评分趋势指示器（上升/稳定/下降箭头）

---

## REMOVED Requirements

无移除需求。所有现有功能保持不变，仅在现有基础上增强。
