# API3 页面数据可视化优化 Spec

## Why

基于对 API3 页面的专业数据可视化分析，当前存在数据流分散、实时性不足、高级图表类型有限等问题。本优化旨在提升数据可视化质量，增强用户体验，使平台达到专业数据分析平台标准。

## What Changes

- 统一数据层管理，引入 React Query/SWR 优化数据获取
- 增强价格图表功能，添加专业技术指标（RSI、MACD、布林带）
- 实现图表联动功能，支持多图表时间轴同步
- 添加实时数据推送支持（WebSocket）
- 优化延迟分布可视化，增加 CDF 累积分布曲线
- 增强跨预言机对比分析功能
- 改进移动端响应式体验

## Impact

- Affected specs: API3 页面数据展示、预言机对比分析
- Affected code: 
  - `src/app/api3/API3PageContent.tsx`
  - `src/components/oracle/PriceChart.tsx`
  - `src/components/oracle/LatencyDistributionHistogram.tsx`
  - `src/components/oracle/DataQualityTrend.tsx`
  - `src/components/oracle/GasFeeComparison.tsx`
  - `src/lib/oracles/api3.ts`

## ADDED Requirements

### Requirement: 统一数据层管理
The system SHALL provide a unified data fetching layer for API3 page components.

#### Scenario: 数据获取优化
- **WHEN** 用户访问 API3 页面
- **THEN** 系统使用 React Query/SWR 统一管理数据获取、缓存和重验证
- **AND** 避免重复 API 调用
- **AND** 支持数据预取和乐观更新

### Requirement: 价格图表技术指标增强
The system SHALL provide professional technical indicators in PriceChart component.

#### Scenario: RSI 指标显示
- **WHEN** 用户在高级分析 Tab 查看价格图表
- **THEN** 系统显示 RSI（相对强弱指数）副图指标
- **AND** 支持 14 周期标准计算
- **AND** 显示超买（>70）/超卖（<30）区域

#### Scenario: MACD 指标显示
- **WHEN** 用户在高级分析 Tab 查看价格图表
- **THEN** 系统显示 MACD 副图指标
- **AND** 包含 DIF、DEA、MACD 柱状图
- **AND** 支持金叉/死叉信号标记

#### Scenario: 布林带指标
- **WHEN** 用户启用布林带指标
- **THEN** 系统显示上轨、中轨、下轨三条线
- **AND** 支持 20 周期、2 倍标准差计算
- **AND** 价格触及轨道时显示视觉提示

### Requirement: 图表联动功能
The system SHALL provide chart linkage functionality for time-based synchronization.

#### Scenario: 时间轴联动
- **WHEN** 用户在热力图选择特定时间段
- **THEN** 价格图表自动跳转到对应时间范围
- **AND** 有过渡动画效果
- **AND** 选中时间段高亮显示

#### Scenario: 多图表缩放同步
- **WHEN** 用户缩放价格图表时间轴
- **THEN** 其他时间序列图表（如数据质量趋势）同步缩放
- **AND** 保持时间范围一致

### Requirement: 实时数据推送
The system SHALL support real-time data updates via WebSocket.

#### Scenario: 价格实时更新
- **WHEN** 用户打开 API3 页面
- **THEN** 系统建立 WebSocket 连接
- **AND** 价格数据实时推送更新
- **AND** 更新时有视觉闪烁提示
- **AND** 断线后自动重连

### Requirement: 延迟分布可视化增强
The system SHALL provide enhanced latency distribution visualization.

#### Scenario: CDF 曲线显示
- **WHEN** 用户查看网络健康 Tab
- **THEN** 延迟分布图显示 CDF 累积分布曲线
- **AND** 显示 P50/P95/P99 分位线
- **AND** 支持直方图与 CDF 视图切换

#### Scenario: 延迟趋势时间序列
- **WHEN** 用户查看延迟分析
- **THEN** 显示延迟随时间变化的趋势图
- **AND** 支持识别延迟恶化时段

### Requirement: 跨预言机对比增强
The system SHALL provide enhanced cross-oracle comparison features.

#### Scenario: 多预言机价格对比
- **WHEN** 用户在高级分析 Tab 选择对比模式
- **THEN** 系统显示 API3 与其他预言机价格对比
- **AND** 显示价格偏离度
- **AND** 计算并显示相关性系数

#### Scenario: 质量指标对比
- **WHEN** 用户查看数据质量趋势
- **THEN** 支持多预言机质量评分对比
- **AND** 显示各维度（延迟、准确性、可用性）对比

### Requirement: 移动端响应式优化
The system SHALL provide optimized mobile experience.

#### Scenario: 移动端图表适配
- **WHEN** 用户在移动设备访问
- **THEN** 图表高度自适应屏幕
- **AND** 简化默认显示指标
- **AND** 支持手势缩放和滑动

#### Scenario: 移动端布局优化
- **WHEN** 用户在移动设备访问
- **THEN** 卡片布局调整为单列
- **AND** 字体大小适配移动端
- **AND** 触摸目标最小 44px

## MODIFIED Requirements

### Requirement: PriceChart 组件
**Current**: 支持基础技术指标（MA、标准差）
**Modified**: 增加 RSI、MACD、布林带专业指标，支持副图显示

### Requirement: LatencyDistributionHistogram 组件
**Current**: 仅显示直方图
**Modified**: 增加 CDF 视图、时间趋势图，支持视图切换

### Requirement: DataQualityTrend 组件
**Current**: 单预言机质量趋势
**Modified**: 支持多预言机对比，增加相关性分析

## REMOVED Requirements

### Requirement: 分散的 useState 管理
**Reason**: 迁移到 React Query 统一管理
**Migration**: 逐步替换为 useQuery/useMutation
