# 修复价格趋势图表无趋势显示问题 Spec

## Why
价格查询页面中的价格趋势图表显示了时间轴和图例，但价格线条都是水平的直线，没有显示出价格波动趋势。这是因为生成历史价格数据的模拟函数每次生成价格都是独立随机的，没有基于前一个价格来模拟真实的价格走势。

## What Changes
- 修改 `BaseOracleClient.generateMockHistoricalPrices` 方法，使生成的历史价格数据具有连续性和趋势性
- 使用随机游走模型（Random Walk）来生成更真实的价格趋势
- 添加可选的趋势方向参数，使价格可以呈现上涨、下跌或震荡趋势

## Impact
- Affected specs: 价格查询页面、预言机客户端
- Affected code: 
  - `src/lib/oracles/base.ts` - `generateMockHistoricalPrices` 和 `generateMockPrice` 方法
  - 所有继承 `BaseOracleClient` 的预言机客户端

## ADDED Requirements
### Requirement: 真实价格趋势模拟
The system SHALL 生成具有连续性和趋势性的历史价格数据

#### Scenario: 生成历史价格数据
- **WHEN** 调用 `getHistoricalPrices` 方法
- **THEN** 返回的价格数据应该呈现连续的价格走势，而非独立的随机值
- **AND** 相邻时间点的价格变化应该在合理范围内（基于波动率）
- **AND** 价格趋势应该反映随机游走模型

#### Scenario: 价格范围合理性
- **WHEN** 生成历史价格数据
- **THEN** 所有价格应该在基准价格的合理范围内（±20%）
- **AND** 价格波动应该平滑，避免突兀的跳变

## MODIFIED Requirements
### Requirement: BaseOracleClient 价格生成
[修改现有方法以支持趋势生成]

#### Scenario: 连续价格生成
- **GIVEN** 基准价格为 $100
- **WHEN** 生成 24 小时的历史价格数据
- **THEN** 每个时间点的价格基于前一个价格计算
- **AND** 价格变化幅度由波动率参数控制
- **AND** 最终价格数据集呈现自然的波动趋势

## REMOVED Requirements
无
