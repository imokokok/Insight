# 市场概览页面添加预言机代币价格显示功能

## Why

当前市场概览页面只显示预言机的TVS（总担保价值）、链支持数量等宏观数据，但没有展示各个预言机平台代币的实时价格信息。用户希望在同一个页面就能看到每个预言机代币的当前价格、24小时涨跌幅等市场数据，以便更好地评估各个预言机的市场表现。

项目已经通过 `binanceMarketService.ts` 提供了使用 Binance API 获取代币价格的能力，需要将其集成到市场概览页面中。

## What Changes

- 在市场概览页面添加预言机代币价格展示区域
- 创建一个可复用的 `OracleTokenPrices` 组件，显示9个预言机的代币价格
- 集成现有的 Binance API 服务获取实时价格数据
- 添加自动刷新机制，保持价格数据实时性
- 支持中英文国际化

## Impact

- 影响页面: `/market-overview`
- 新增组件: `OracleTokenPrices`
- 修改文件: `useMarketOverviewData.ts`, `page.tsx`, 国际化文件
- 使用现有服务: `binanceMarketService.ts`

## ADDED Requirements

### Requirement: 预言机代币价格展示

系统 SHALL 在市场概览页面展示9个预言机平台的代币实时价格信息。

#### Scenario: 成功加载价格数据

- **GIVEN** 用户访问市场概览页面
- **WHEN** 页面加载完成
- **THEN** 显示9个预言机（Chainlink、Band Protocol、UMA、Pyth、API3、RedStone、DIA、Tellor、WINkLink）的代币价格卡片
- **AND** 每个卡片显示: 代币符号、当前价格、24小时涨跌幅、代币Logo
- **AND** 价格数据通过 Binance API 获取

#### Scenario: 价格数据自动刷新

- **GIVEN** 用户正在查看市场概览页面
- **WHEN** 到达设定的刷新间隔（默认30秒）
- **THEN** 自动重新获取价格数据
- **AND** 更新显示而不刷新整个页面

#### Scenario: 价格数据加载失败

- **GIVEN** Binance API 暂时不可用
- **WHEN** 价格数据获取失败
- **THEN** 显示上次成功获取的价格数据
- **AND** 显示离线状态指示器
- **AND** 继续尝试定期重新获取

#### Scenario: 移动端适配

- **GIVEN** 用户在移动设备访问
- **WHEN** 页面渲染
- **THEN** 价格卡片以横向滚动或网格布局显示
- **AND** 保持信息清晰可读

## 预言机代币映射

| 预言机        | 代币符号 | Binance交易对 |
| ------------- | -------- | ------------- |
| Chainlink     | LINK     | LINKUSDT      |
| Band Protocol | BAND     | BANDUSDT      |
| UMA           | UMA      | UMAUSDT       |
| Pyth          | PYTH     | PYTHUSDT      |
| API3          | API3     | API3USDT      |
| RedStone      | RED      | REDUSDT       |
| DIA           | DIA      | DIAUSDT       |
| Tellor        | TRB      | TRBUSDT       |
| WINkLink      | WIN      | WINUSDT       |

## UI设计建议

### 布局方案

将价格展示区域放置在 `MarketStats` 组件下方，作为一个独立的横向滚动卡片列表：

```
┌─────────────────────────────────────────────────────────────┐
│  MarketStats (现有)                                          │
├─────────────────────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ LINK   │ │ BAND   │ │ PYTH   │ │ API3   │ │ RED    │ ... │
│  │ $14.52 │ │ $1.23  │ │ $0.45  │ │ $2.10  │ │ $0.89  │     │
│  │ +2.5%  │ │ -1.2%  │ │ +5.3%  │ │ +0.8%  │ │ -3.1%  │     │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘     │
│                    ← 横向滚动 →                              │
└─────────────────────────────────────────────────────────────┘
```

### 卡片设计

- 背景: 白色卡片，带轻微阴影
- 边框: 根据涨跌显示绿色(涨)/红色(跌)左边框
- 内容: Logo + 代币符号 + 价格 + 涨跌幅
- 交互: 悬停显示更多详情（如24h最高/最低价）
