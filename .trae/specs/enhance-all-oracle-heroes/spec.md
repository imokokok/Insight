# 所有预言机页面 Hero 区域统一优化规格

## Why
除了 Chainlink 之外，其他九个预言机页面（Pyth、API3、Band Protocol、Chronicle、DIA、RedStone、Tellor、UMA、WINkLink）的 Hero 区域也存在同样的问题：有效信息显示太少，留白过多，信息密度低。需要统一优化这些页面的 Hero 区域，提升信息密度和用户体验。

## What Changes
- **统一 Hero 组件架构**: 创建一个可复用的 OracleHero 基础组件
- **扩展统计数据**: 从4个扩展到8个关键指标（根据各预言机特性定制）
- **添加迷你图表**: 价格走势迷你图、网络趋势图
- **增加链上数据卡片**: Gas费、响应时间、成功率等实时指标
- **添加网络健康度**: 评分和子系统状态
- **添加快速操作区**: 常用功能快捷入口
- **添加多链支持展示**: 紧凑展示支持的区块链
- **添加最新动态滚动条**: 实时更新和事件通知

## Impact
- 受影响文件:
  - `src/components/oracle/common/OracleHero.tsx` - 新增通用 Hero 组件
  - `src/app/[locale]/pyth/page.tsx` - Pyth 页面集成
  - `src/app/[locale]/api3/page.tsx` - API3 页面集成
  - `src/app/[locale]/band-protocol/page.tsx` - Band Protocol 页面集成
  - `src/app/[locale]/chronicle/page.tsx` - Chronicle 页面集成
  - `src/app/[locale]/dia/page.tsx` - DIA 页面集成
  - `src/app/[locale]/redstone/page.tsx` - RedStone 页面集成
  - `src/app/[locale]/tellor/page.tsx` - Tellor 页面集成
  - `src/app/[locale]/uma/page.tsx` - UMA 页面集成
  - `src/app/[locale]/winklink/page.tsx` - WINkLink 页面集成

## ADDED Requirements

### Requirement: 通用 OracleHero 组件
The system SHALL provide a reusable OracleHero component that can be used across all oracle pages with the following features:

#### Scenario: 通用组件接口
- **GIVEN** 任意预言机页面需要 Hero 区域
- **WHEN** 使用 OracleHero 组件
- **THEN** 组件接受统一的 props 接口（config, price, stats, themeColor等）
- **AND** 支持各预言机的定制化数据展示

#### Scenario: 8个统计指标展示
- **GIVEN** 预言机数据已加载
- **WHEN** 组件渲染
- **THEN** 显示8个关键指标卡片
- **AND** 指标根据预言机类型动态调整（如Pyth显示Publisher数量，Tellor显示Reporter数量）
- **AND** 每个指标显示当前值、变化率、趋势方向

#### Scenario: 价格走势迷你图
- **GIVEN** 历史价格数据已加载
- **WHEN** 用户查看 Hero 区域
- **THEN** 在价格卡片旁显示24小时价格走势迷你图
- **AND** 图表使用 Sparkline 形式
- **AND** 涨跌颜色与价格变化一致

#### Scenario: 链上实时指标区
- **GIVEN** 网络统计数据已加载
- **WHEN** 用户查看 Hero 区域中部
- **THEN** 显示链上实时指标卡片
- **AND** 包括：Gas费水平、响应时间分布、数据更新频率
- **AND** 指标带实时状态指示器

#### Scenario: 网络健康度概览
- **GIVEN** 网络健康数据已加载
- **WHEN** 用户查看 Hero 区域
- **THEN** 显示网络健康度评分（0-100）
- **AND** 显示关键子系统状态
- **AND** 显示最近24小时事件统计

#### Scenario: 快速操作入口
- **GIVEN** Hero 组件已渲染
- **WHEN** 用户查看右上角区域
- **THEN** 显示快速操作按钮组
- **AND** 包括：添加监控、设置提醒、查看文档、切换网络

#### Scenario: 多链支持展示
- **GIVEN** 预言机支持多链
- **WHEN** 用户查看 Hero 区域
- **THEN** 以紧凑图标形式展示支持的主要区块链
- **AND** 显示当前活跃链数/总支持链数

#### Scenario: 最新动态滚动条
- **GIVEN** 系统有最新动态数据
- **WHEN** 用户查看 Hero 区域底部
- **THEN** 显示最新动态滚动条
- **AND** 展示最近的价格更新、网络事件、系统公告

## MODIFIED Requirements
无

## REMOVED Requirements
无
