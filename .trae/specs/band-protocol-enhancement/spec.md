# Band Protocol 数据分析平台优化规格

## Why
Band Protocol 作为一个跨链预言机协议，具有独特的技术特性（验证者系统、跨链数据请求、Cosmos 生态集成），但当前页面使用通用模板，未能充分展示这些核心特性。作为预言机数据分析平台，需要提供更专业的数据质量分析、跨链性能监控和验证者治理数据，以帮助用户做出更好的决策。

## What Changes
- 添加 Band Protocol 专属的验证者分析面板，展示验证者排名、质押量、佣金率等关键指标
- 新增跨链数据请求分析模块，展示各链的请求量、Gas 成本和支持的代币
- 增强数据质量分析，添加价格偏差监控、延迟分布、数据源可靠性评分
- 添加历史趋势分析功能，支持自定义时间范围的数据对比
- 实现 Ecosystem 和 Risk 标签页的内容
- 优化实时数据更新机制和状态指示
- 添加数据导出和 API 访问功能

## Impact
- Affected specs: Band Protocol 数据展示能力、预言机分析专业性、用户体验
- Affected code: 
  - `src/app/band-protocol/page.tsx` - 需要添加 Band Protocol 特有组件
  - `src/components/oracle/` - 需要新增验证者面板、跨链分析面板等组件
  - `src/lib/oracles/bandProtocol.ts` - 已有数据接口，需要在前端展示
  - `src/lib/config/oracles.tsx` - 可能需要调整配置

## ADDED Requirements

### Requirement: 验证者分析面板
系统应提供 Band Protocol 验证者的详细分析数据，帮助用户了解网络的安全性和去中心化程度。

#### Scenario: 查看验证者列表
- **WHEN** 用户访问 Band Protocol 页面的 "Network" 标签页
- **THEN** 系统应展示验证者列表，包含以下信息：
  - 验证者名称和排名
  - 质押代币数量
  - 佣金率
  - 在线率（Uptime）
  - 是否被监禁（Jailed）

#### Scenario: 验证者详情查看
- **WHEN** 用户点击某个验证者
- **THEN** 系统应展示验证者详细信息，包括：
  - 运营商地址
  - 网站链接
  - 详细描述
  - 最大佣金率和变更率

### Requirement: 跨链数据请求分析
系统应展示 Band Protocol 在各条区块链上的数据请求统计，帮助用户了解跨链使用情况。

#### Scenario: 查看跨链统计
- **WHEN** 用户访问 "Ecosystem" 标签页
- **THEN** 系统应展示跨链数据请求统计：
  - 24小时/7天/30天总请求量
  - 各链的请求量分布（柱状图）
  - 各链的平均 Gas 成本
  - 各链支持的代币符号

#### Scenario: 单链详情查看
- **WHEN** 用户点击某条链
- **THEN** 系统应展示该链的详细数据：
  - Chain ID
  - 支持的代币列表
  - 请求量趋势图

### Requirement: 数据质量分析
系统应提供预言机数据质量的专业分析指标，帮助用户评估数据的可靠性。

#### Scenario: 价格偏差监控
- **WHEN** 用户访问 "Risk" 标签页
- **THEN** 系统应展示价格偏差分析：
  - 与其他预言机的价格对比（Chainlink、Pyth 等）
  - 偏差百分比和趋势
  - 历史偏差分布图

#### Scenario: 延迟分析
- **WHEN** 用户查看数据质量指标
- **THEN** 系统应展示延迟分析：
  - 平均响应延迟
  - 延迟分布直方图
  - P50/P95/P99 延迟值
  - 延迟趋势图

#### Scenario: 数据源可靠性评分
- **WHEN** 用户查看数据源状态
- **THEN** 系统应展示可靠性评分：
  - 数据源可用性百分比
  - 数据更新频率
  - 最后成功更新时间
  - 失败次数和原因

### Requirement: 历史趋势分析
系统应支持灵活的历史数据分析功能，帮助用户识别趋势和异常。

#### Scenario: 自定义时间范围
- **WHEN** 用户选择自定义时间范围
- **THEN** 系统应允许用户选择：
  - 预设范围（1H、24H、7D、30D、90D、1Y）
  - 自定义开始和结束日期
  - 数据粒度（分钟、小时、天）

#### Scenario: 数据对比功能
- **WHEN** 用户启用对比模式
- **THEN** 系统应允许：
  - 选择两个时间段进行对比
  - 显示关键指标的变化百分比
  - 高亮显示显著变化

### Requirement: 实时更新机制
系统应提供清晰的实时数据更新状态和用户控制。

#### Scenario: 自动更新控制
- **WHEN** 用户访问页面
- **THEN** 系统应提供：
  - 自动更新开关
  - 更新间隔选择（5s、10s、30s、1min）
  - 下次更新倒计时
  - 最后更新时间戳

#### Scenario: 连接状态指示
- **WHEN** 数据连接状态变化
- **THEN** 系统应显示：
  - 连接正常（绿色）
  - 连接不稳定（黄色）
  - 连接断开（红色）
  - 重连尝试次数

### Requirement: 数据导出功能
系统应支持数据导出，方便用户进行离线分析。

#### Scenario: 导出当前数据
- **WHEN** 用户点击导出按钮
- **THEN** 系统应提供：
  - CSV 格式导出
  - JSON 格式导出
  - 包含时间戳和数据范围
  - 文件命名包含日期和参数

### Requirement: 网络统计增强
系统应展示更全面的 Band Protocol 网络统计信息。

#### Scenario: 查看网络统计
- **WHEN** 用户查看网络健康面板
- **THEN** 系统应展示：
  - 活跃验证者数 / 总验证者数
  - 质押代币总量和质押率
  - 区块高度和区块时间
  - 通胀率
  - 社区池余额

### Requirement: BAND 代币市场数据
系统应展示 BAND 代币的完整市场数据。

#### Scenario: 查看市场数据
- **WHEN** 用户查看市场数据面板
- **THEN** 系统应展示：
  - 当前价格和 24 小时变化
  - 市值和排名
  - 24 小时交易量
  - 流通供应量 / 总供应量 / 最大供应量
  - 质押率和质押 APR

## MODIFIED Requirements

### Requirement: 页面标题和描述
原有的通用标题需要修改为 Band Protocol 特定的描述。

#### Scenario: 页面标题显示
- **WHEN** 用户访问 Band Protocol 页面
- **THEN** 页面标题应为 "Band Protocol 数据分析平台"
- **AND** 副标题应说明 "跨链预言机协议 | Cosmos 生态"

### Requirement: 支持链展示
原有的支持链列表需要更新为 Band Protocol 实际支持的链。

#### Scenario: 支持链显示
- **WHEN** 用户查看支持链信息
- **THEN** 系统应展示 Band Protocol 实际支持的链：
  - Cosmos Hub
  - Osmosis
  - Juno
  - Ethereum
  - Polygon
  - Avalanche
  - Fantom
  - Cronos

## REMOVED Requirements
无移除的需求。现有功能保持不变，仅做增强。
