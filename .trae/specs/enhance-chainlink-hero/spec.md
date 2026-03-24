# Chainlink 页面 Hero 区域优化规格

## Why
当前 Chainlink 预言机页面的 Hero 区域有效信息显示太少，留白过多。用户反馈"素"是指信息密度低、内容单薄。通过增加更多有价值的链上数据、市场指标和可视化元素，提升 Hero 区域的信息密度和实用性，让用户一眼获取 Chainlink 网络的核心状态。

## What Changes
- **扩展统计数据**: 从4个扩展到8个关键指标（添加TVS、质押量、节点数趋势、数据更新频率等）
- **添加迷你图表**: 在 Hero 区域直接展示价格走势迷你图、节点增长趋势图
- **增加链上数据卡片**: 展示实时链上指标（Gas费、响应时间分布、成功率热力图）
- **添加快速操作区**: 常用功能快捷入口（添加监控、设置提醒、查看文档）
- **优化信息布局**: 采用更紧凑的多栏布局，减少留白
- **添加数据标签**: 为统计数据添加趋势指示、对比基准、更新时间等元信息

## Impact
- 受影响文件:
  - `src/app/[locale]/chainlink/page.tsx` - Hero 区域主要实现
  - `src/app/[locale]/chainlink/components/ChainlinkHero.tsx` - 新增 Hero 组件
  - `src/app/[locale]/chainlink/components/index.ts` - 导出新增组件

## ADDED Requirements

### Requirement: Chainlink Hero 组件
The system SHALL provide an information-dense Hero component for the Chainlink oracle page with the following features:

#### Scenario: 扩展统计数据展示
- **GIVEN** 用户访问 Chainlink 页面
- **WHEN** 页面加载完成
- **THEN** Hero 区域显示8个关键指标卡片
- **AND** 指标包括：LINK价格、24h涨跌、TVS（总担保价值）、活跃节点数、支持链数、数据喂价数量、质押量、平均响应时间
- **AND** 每个指标显示当前值、变化率、趋势方向

#### Scenario: 价格走势迷你图
- **GIVEN** 历史价格数据已加载
- **WHEN** 用户查看 Hero 区域
- **THEN** 在价格卡片旁显示24小时价格走势迷你图
- **AND** 图表使用 Sparkline 形式，不占用过多空间
- **AND** 涨跌颜色与价格变化一致

#### Scenario: 链上实时指标区
- **GIVEN** 网络统计数据已加载
- **WHEN** 用户查看 Hero 区域中部
- **THEN** 显示链上实时指标卡片
- **AND** 包括：当前Gas费水平、响应时间分布、节点在线率热力图、数据更新频率
- **AND** 指标带实时状态指示器（绿/黄/红）

#### Scenario: 网络健康度概览
- **GIVEN** 网络健康数据已加载
- **WHEN** 用户查看 Hero 区域
- **THEN** 显示网络健康度评分（0-100）
- **AND** 显示关键子系统状态（数据喂价、节点网络、跨链桥）
- **AND** 显示最近24小时事件统计（更新次数、异常事件）

#### Scenario: 快速操作入口
- **GIVEN** Hero 组件已渲染
- **WHEN** 用户查看右上角区域
- **THEN** 显示快速操作按钮组
- **AND** 包括：添加价格监控、设置价格提醒、查看API文档、切换网络
- **AND** 按钮带图标和简洁文字说明

#### Scenario: 多链支持展示
- **GIVEN** Chainlink 支持多链
- **WHEN** 用户查看 Hero 区域
- **THEN** 以紧凑图标形式展示支持的主要区块链
- **AND** 显示当前活跃链数/总支持链数
- **AND** 点击可展开查看完整链列表

#### Scenario: 最新动态滚动条
- **GIVEN** 系统有最新动态数据
- **WHEN** 用户查看 Hero 区域底部
- **THEN** 显示最新动态滚动条
- **AND** 展示最近的价格更新、节点事件、系统公告
- **AND** 支持点击查看详情

## MODIFIED Requirements
无

## REMOVED Requirements
无
