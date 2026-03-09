# UMA 页面重构 Spec

## Why
现有的UMA页面采用简单的卡片式布局，缺乏专业数据分析平台的深度和洞察力。需要参照Chainlink页面的专业仪表板架构，为UMA的乐观预言机特性提供更全面的数据可视化、实时监控和专业分析能力，帮助用户深入了解UMA的争议解决机制、数据验证流程和生态系统状态。

## What Changes
- 参照Chainlink页面架构，重新设计UMA页面为专业数据分析仪表板
- 增加UMA代币的实时市场数据面板（价格、市值、交易量等）
- 添加乐观预言机网络健康度监控指标（活跃验证者、争议率、响应时间等）
- 实现多维度数据可视化（价格趋势、争议活动、数据验证统计）
- 增加预言机数据质量分析模块（验证准确性、争议解决效率）
- 提供历史数据对比和趋势分析
- 集成风险评估和安全指标（验证者集中度、争议机制健康度）
- **BREAKING**: 页面布局从简单卡片设计改为专业仪表板风格

## Impact
- Affected specs: UMA 页面展示能力、乐观预言机数据可视化能力、用户分析能力
- Affected code: src/app/uma/page.tsx, src/app/uma/components/*.tsx, src/i18n/*.json

## ADDED Requirements

### Requirement: 实时市场数据面板
The system SHALL provide comprehensive real-time market data display for UMA token.

#### Scenario: 市场概览展示
- **WHEN** 用户访问 UMA 页面
- **THEN** 系统显示 UMA 的实时价格、24h涨跌、市值、交易量、流通供应量、完全稀释估值

#### Scenario: 价格变动提醒
- **WHEN** 价格变动超过设定阈值
- **THEN** 显示视觉提示（颜色变化/动画效果）

### Requirement: 乐观预言机网络健康度监控
The system SHALL display UMA Optimistic Oracle network health and performance metrics.

#### Scenario: 网络状态监控
- **WHEN** 页面加载完成
- **THEN** 显示：活跃验证者数、验证者在线率、平均响应时间、争议提出频率、质押总量

#### Scenario: 数据新鲜度指示
- **WHEN** 数据更新时
- **THEN** 显示最后更新时间戳和数据新鲜度状态

### Requirement: 争议解决分析面板
The system SHALL provide dispute resolution analytics for the Optimistic Oracle.

#### Scenario: 争议统计展示
- **WHEN** 用户查看争议数据
- **THEN** 显示：总争议数、争议成功率、平均解决时间、活跃争议数

#### Scenario: 争议活动趋势
- **WHEN** 用户选择时间范围
- **THEN** 显示争议提出和解决的历史趋势图表

### Requirement: 高级数据可视化
The system SHALL provide professional-grade data visualization components.

#### Scenario: 多时间周期价格图表
- **WHEN** 用户选择不同时间周期（1H/24H/7D/30D/90D/1Y）
- **THEN** 图表动态更新显示对应数据，支持蜡烛图和折线图切换

#### Scenario: 数据验证活动热力图
- **WHEN** 用户查看网络活动
- **THEN** 显示 24h 数据验证请求分布热力图（按小时）

### Requirement: 数据验证质量分析
The system SHALL provide data verification and accuracy analysis for UMA Optimistic Oracle.

#### Scenario: 验证准确性监控
- **WHEN** 系统获取验证数据
- **THEN** 显示验证准确率、争议率、验证者参与度

#### Scenario: 验证者性能排名
- **WHEN** 用户查看验证者信息
- **THEN** 显示验证者性能排名、历史准确率、质押金额

### Requirement: 验证者分析
The system SHALL provide detailed validator analytics.

#### Scenario: 验证者分布可视化
- **WHEN** 用户查看验证者信息
- **THEN** 显示地理分布图、验证者类型分布、性能排名

#### Scenario: 验证者收益分析
- **WHEN** 用户查看验证者经济模型
- **THEN** 显示平均收益、质押奖励趋势、惩罚记录

### Requirement: 生态集成展示
The system SHALL display UMA ecosystem integration status.

#### Scenario: DeFi 集成展示
- **WHEN** 用户查看生态数据
- **THEN** 显示集成的 DeFi 协议列表、使用UMA预言机的主要项目

#### Scenario: 合约类型分布
- **WHEN** 用户查看合约数据
- **THEN** 显示各类金融合约（合成资产、衍生品等）的分布情况

### Requirement: 竞品深度对比
The system SHALL provide in-depth competitive analysis with other oracle providers.

#### Scenario: 多维度对比矩阵
- **WHEN** 用户查看对比分析
- **THEN** 显示技术架构、市场份额、争议机制效率、成本效率对比

#### Scenario: 乐观预言机特性对比
- **WHEN** 用户选择对比预言机
- **THEN** 显示争议解决机制、验证时间、经济模型对比

### Requirement: 风险评估模块
The system SHALL provide risk assessment and security analysis.

#### Scenario: 安全指标展示
- **WHEN** 用户查看风险分析
- **THEN** 显示：验证者集中度风险、争议机制健康度、数据操纵风险评估

#### Scenario: 历史安全事件
- **WHEN** 用户查看安全记录
- **THEN** 显示历史争议事件时间线、响应时间、影响范围

## MODIFIED Requirements

### Requirement: 页面布局结构
**原需求**: 扁平化设计，简单的上下布局，渐变背景
**修改后**: 专业仪表板布局，采用网格系统，标签页导航，主内容区分区块展示

#### Scenario: 响应式仪表板
- **WHEN** 用户在不同设备访问
- **THEN** 布局自动适配：桌面端多列网格，平板端双列，移动端单列堆叠

### Requirement: 数据展示密度
**原需求**: 简洁展示，大量留白，渐变卡片
**修改后**: 信息密度优化，支持数据钻取，关键指标突出显示，专业数据面板风格

## REMOVED Requirements

### Requirement: 渐变背景设计
**Reason**: 被更专业的数据分析仪表板风格替代
**Migration**: 采用统一的白色/灰色背景，符合专业数据平台设计规范

### Requirement: 简单功能卡片
**Reason**: 被更专业的数据分析模块替代
**Migration**: 功能特性整合到网络健康度和生态集成模块中
