# TWAP 预言机集成规格说明

## 1. 概述

将 Uniswap V3 TWAP（时间加权平均价格）预言机作为第 8 个预言机提供商集成到 Insight 项目中，获取真实链上数据（通过 Alchemy RPC），遵循现有 7 个预言机的集成架构模式，确保所有功能页面完整支持 TWAP 数据展示。

## 2. 技术背景

### 2.1 TWAP 预言机原理

Uniswap V3 TWAP 通过读取链上 Pool 合约的观察数据（Observation）来计算时间加权平均价格：

- **数据源**：Uniswap V3 Pool 合约的 `observe()` 和 `slot0` 方法
- **计算方式**：基于累积 tick 值（cumulative tick）在时间区间内的差值计算几何平均价格
- **精度**：使用 Q64.96 格式的 sqrtPriceX96，转换为人类可读价格
- **优势**：完全链上、无需信任、抗操纵性强

### 2.2 支持的链

Uniswap V3 已部署在以下链上，且项目已配置 Alchemy RPC：
| 链 | Chain ID | Alchemy RPC 配置 |
|---|---|---|
| Ethereum | 1 | ALCHEMY_ETHEREUM_RPC |
| Arbitrum | 42161 | ALCHEMY_ARBITRUM_RPC |
| Optimism | 10 | ALCHEMY_OPTIMISM_RPC |
| Polygon | 137 | ALCHEMY_POLYGON_RPC |
| Base | 8453 | ALCHEMY_BASE_RPC |
| BNB Chain | 56 | ALCHEMY_BNB_RPC (PancakeSwap V3) |

### 2.3 核心合约

- **UniswapV3Factory**: `0x1F98431c8aD98523631AE4a59f267346ea31F984` (Ethereum/Arbitrum/Optimism/Polygon/Base)
- **BNB Chain PancakeSwapV3Factory**: `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865`
- **Pool 合约 ABI**: 需要以下方法
  - `slot0()`: 返回当前 sqrtPriceX96、tick 等
  - `observe(secondsAgos[])`: 返回累积 tick 值和秒值流动性
  - `token0()`, `token1()`: 返回代币地址
  - `fee()`: 返回费率

## 3. 架构设计

### 3.1 遵循现有架构模式

TWAP 集成完全遵循现有 7 个预言机的架构模式：

```
应用层 (React Components + Hooks)
    ↓
API 路由层 (/api/oracles/twap)
    ↓
工厂层 (OracleClientFactory) — 新增 TWAP case
    ↓
抽象基类 (BaseOracleClient) — 继承
    ↓
具体客户端 (TWAPClient) — 新增
    ↓
服务层 (TwapOnChainService) — 新增，通过 Alchemy RPC 读取链上数据
    ↓
数据源层 (Alchemy RPC → Uniswap V3 Pool 合约)
```

### 3.2 新增文件清单

| 文件路径                                                      | 用途                                             |
| ------------------------------------------------------------- | ------------------------------------------------ |
| `src/lib/oracles/clients/twap.ts`                             | TWAP 客户端，继承 BaseOracleClient               |
| `src/lib/oracles/services/twapOnChainService.ts`              | TWAP 链上数据服务，通过 RPC 读取 Uniswap V3 Pool |
| `src/lib/oracles/constants/twapConstants.ts`                  | TWAP 常量（Pool 地址、Token 地址、Fee Tier 等）  |
| `src/hooks/oracles/useTwapOnChainData.ts`                     | TWAP 链上数据 React Hook                         |
| `src/app/[locale]/price-query/components/stats/TwapStats.tsx` | TWAP 统计卡片组件                                |
| `public/logos/oracles/uniswap.svg`                            | TWAP/Uniswap 图标                                |

### 3.3 修改文件清单

| 文件路径                                                               | 修改内容                                                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/types/oracle/enums.ts`                                            | 新增 `TWAP = 'twap'` 到 OracleProvider 枚举                                    |
| `src/types/oracle/price.ts`                                            | 新增 TWAP 元数据字段（poolAddress, feeTier, sqrtPriceX96, tick, twapInterval） |
| `src/lib/oracles/factory.ts`                                           | 新增 TWAP case 到 createClient switch                                          |
| `src/lib/oracles/index.ts`                                             | 新增 TWAP 相关导出                                                             |
| `src/lib/oracles/constants/supportedSymbols.ts`                        | 新增 twapSymbols 和 TWAP_AVAILABLE_PAIRS                                       |
| `src/lib/oracles/colors.ts`                                            | 新增 TWAP 颜色映射                                                             |
| `src/lib/config/oracles.tsx`                                           | 新增 TWAP 配置                                                                 |
| `src/lib/config/env.ts`                                                | 新增 USE_REAL_TWAP_DATA 特性开关                                               |
| `src/lib/config/serverEnv.ts`                                          | 新增 TWAP 相关缓存配置                                                         |
| `src/lib/constants/index.ts`                                           | 新增 TWAP 到 providerNames、oracleColors、oracleI18nKeys                       |
| `src/hooks/oracles/useOnChainDataByProvider.ts`                        | 新增 TWAP case                                                                 |
| `src/app/[locale]/price-query/components/stats/StatsCardsSelector.tsx` | 新增 TWAP case                                                                 |
| `src/app/[locale]/price-query/components/stats/index.ts`               | 导出 TwapStats                                                                 |
| `src/app/[locale]/cross-oracle/constants.tsx`                          | 新增 TWAP 颜色和名称                                                           |
| `src/app/[locale]/cross-oracle/hooks/useCommonSymbols.ts`              | 支持 TWAP 币种交集                                                             |
| `src/i18n/messages/en/navigation.json`                                 | 新增 TWAP 导航翻译                                                             |
| `src/i18n/messages/en/priceQuery.json`                                 | 新增 TWAP 价格查询翻译                                                         |
| `src/i18n/messages/en/crossOracle.json`                                | 新增 TWAP 跨预言机翻译                                                         |
| `src/i18n/messages/en/home.json`                                       | 新增 TWAP 首页翻译                                                             |
| `src/i18n/messages/zh-CN/navigation.json`                              | 新增 TWAP 导航翻译（中文）                                                     |
| `src/i18n/messages/zh-CN/priceQuery.json`                              | 新增 TWAP 价格查询翻译（中文）                                                 |
| `src/i18n/messages/zh-CN/crossOracle.json`                             | 新增 TWAP 跨预言机翻译（中文）                                                 |
| `src/i18n/messages/zh-CN/home.json`                                    | 新增 TWAP 首页翻译（中文）                                                     |
| `src/lib/config/colors.ts`                                             | 新增 TWAP 颜色配置                                                             |
| `src/lib/api/oracleHandlers.ts`                                        | 支持 TWAP provider 验证                                                        |

## 4. 核心实现细节

### 4.1 TWAPClient (`src/lib/oracles/clients/twap.ts`)

```typescript
class TWAPClient extends BaseOracleClient {
  name = OracleProvider.TWAP;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
  ];
  defaultUpdateIntervalMinutes = 1; // TWAP 每分钟更新

  // 核心方法
  async getPrice(symbol, chain?, options?): Promise<PriceData> {
    // 1. 参数校验
    // 2. 通过 twapOnChainService.getTwapPrice() 获取链上 TWAP 价格
    // 3. 使用 withOracleRetry 包装，ORACLE_RETRY_PRESETS.standard
    // 4. 转换为 PriceData 格式，包含 TWAP 特有元数据
    // 5. 计算 confidence 基于 pool 流动性和 twap 间隔
  }

  async getHistoricalPrices(symbol, chain?, period?, options?): Promise<PriceData[]> {
    // 使用 binanceMarketService.getHistoricalPricesByHours()
    // 与其他预言机保持一致
  }

  getSupportedSymbols(): string[] {
    return [...twapSymbols];
  }
}
```

### 4.2 TwapOnChainService (`src/lib/oracles/services/twapOnChainService.ts`)

```typescript
class TwapOnChainService {
  // RPC 调用（参照 ChainlinkOnChainService 模式）
  private async rpcCallWithFallback<T>(chainId, method, params, signal?): Promise<T>;

  // 获取 TWAP 价格
  async getTwapPrice(
    symbol: string,
    chainId: number,
    twapInterval: number = 1800,
    signal?: AbortSignal
  ): Promise<TwapPriceData> {
    // 1. 获取 Pool 地址（从 TWAP_POOL_ADDRESSES 常量或通过 Factory 计算）
    // 2. 调用 Pool.observe([twapInterval, 0]) 获取累积 tick
    // 3. 计算 TWAP: tickCumulative 差值 / 时间间隔 = 平均 tick
    // 4. 从 tick 转换为价格: price = 1.0001^tick
    // 5. 调用 Pool.slot0() 获取当前价格和流动性
    // 6. 返回 TwapPriceData
  }

  // 获取当前现货价格
  async getSpotPrice(symbol: string, chainId: number, signal?: AbortSignal): Promise<TwapPriceData>;

  // 获取 Pool 信息
  async getPoolInfo(poolAddress: string, chainId: number, signal?: AbortSignal): Promise<PoolInfo>;

  // 批量获取价格
  async getPrices(symbols: string[], chainId: number): Promise<TwapPriceData[]>;
}
```

### 4.3 TWAP 常量 (`src/lib/oracles/constants/twapConstants.ts`)

```typescript
// Uniswap V3 Factory 地址
export const UNISWAP_V3_FACTORY: Record<number, `0x${string}`> = {
  1: '0x1F98431c8aD98523631AE4a59f267346ea31F984',     // Ethereum
  42161: '0x1F98431c8aD98523631AE4a59f267346ea31F984',  // Arbitrum
  10: '0x1F98431c8aD98523631AE4a59f267346ea31F984',     // Optimism
  137: '0x1F98431c8aD98523631AE4a59f267346ea31F984',    // Polygon
  8453: '0x1F98431c8aD98523631AE4a59f267346ea31F984',   // Base
  56: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',     // BNB (PancakeSwap)
};

// Fee Tiers
export const TWAP_FEE_TIERS = {
  LOW: 500,      // 0.05%
  MEDIUM: 3000,  // 0.3%
  HIGH: 10000,   // 1%
} as const;

// TWAP 时间间隔
export const TWAP_INTERVALS = {
  SHORT: 600,    // 10 分钟
  MEDIUM: 1800,  // 30 分钟
  LONG: 3600,    // 1 小时
} as const;

// 预配置的 Pool 地址（主流交易对，优先使用高流动性 Pool）
export const TWAP_POOL_ADDRESSES: Record<string, Record<number, { address: `0x${string}`; feeTier: number; token0: string; token1: string }>> = {
  // BTC/ETH/USDC/USDT 等主流交易对在各链上的 Pool 地址
  // 优先选择 USDC 或 WETH 作为报价币种的高流动性 Pool
};

// Token 地址映射
export const TWAP_TOKEN_ADDRESSES: Record<string, Record<number, `0x${string}`>> = {
  WETH: { 1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', ... },
  USDC: { 1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', ... },
  USDT: { 1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', ... },
  WBTC: { 1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', ... },
  // ... 更多代币
};

// RPC 配置（复用 Alchemy RPC，参照 Chainlink 模式）
export const TWAP_RPC_CONFIG: Record<number, { endpoints: string[]; chainId: number; name: string }>;

// Pool 合约 ABI
export const UNISWAP_V3_POOL_ABI = [...]; // slot0, observe, token0, token1, fee, liquidity
export const UNISWAP_V3_FACTORY_ABI = [...]; // getPool

// 支持的交易对（仅包含有真实流动性的 Pool）
export const twapSymbols = ['BTC', 'ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'UNI', 'AAVE', 'ARB', 'OP', 'MATIC', 'SNX', 'CRV', 'COMP', 'MKR', 'SUSHI', '1INCH', 'BAL', 'BNB', 'SOL', 'DOGE', 'AVAX', 'APE', 'LDO', 'GMX', 'FRAX', 'WETH', 'STETH', 'USDD'] as const;
```

### 4.4 PriceData 扩展

在 `PriceData` 接口中新增 TWAP 特有元数据字段：

```typescript
// TWAP 元数据
poolAddress?: string;      // Pool 合约地址
feeTier?: number;          // 费率等级 (500/3000/10000)
sqrtPriceX96?: string;     // 当前 sqrtPriceX96 值
tick?: number;             // 当前 tick
twapInterval?: number;     // TWAP 计算间隔（秒）
twapPrice?: number;        // TWAP 价格
spotPrice?: number;        // 现货价格
liquidity?: string;        // Pool 流动性
```

### 4.5 数据获取流程

```
1. 前端请求 → /api/oracles/twap?symbol=BTC&chain=ethereum
2. API 路由 → OracleClientFactory.getClient('twap')
3. TWAPClient.getPrice('BTC', 'ethereum')
4. TwapOnChainService.getTwapPrice('BTC', 1, 1800)
5. RPC 调用 Pool.observe([1800, 0]) → 获取累积 tick
6. 计算 TWAP = 1.0001^(tickCumulativeDelta / timeDelta)
7. RPC 调用 Pool.slot0() → 获取当前价格和流动性
8. 组装 PriceData 返回
```

### 4.6 价格计算公式

```
// 从 tick 转换为价格
price = 1.0001 ^ tick

// 从 sqrtPriceX96 转换为价格
price = (sqrtPriceX96 / 2^96) ^ 2

// TWAP 计算
averageTick = (tickCumulativeEnd - tickCumulativeStart) / timeDelta
twapPrice = 1.0001 ^ averageTick

// 考虑 token 排序和 decimals
// 如果 token0 是报价币种（如 USDC），需要取倒数
// 最终价格 = twapPrice * 10^(token0Decimals - token1Decimals)
```

### 4.7 置信度计算

TWAP 置信度基于以下因素：

- **Pool 流动性**：流动性越高，价格越可靠
- **TWAP 间隔**：间隔越长，抗操纵性越强
- **TWAP vs Spot 偏差**：偏差越小，数据越一致
- **链可靠性**：与 Chainlink 相同的链可靠性评分

```typescript
confidence = chainReliability * liquidityScore * (1 - twapSpotDeviation * 10);
// 最终 clamp 到 [0.85, 0.99]
```

### 4.8 支持的交易对筛选策略

**仅显示可以正确获取数据的交易对**：

1. 预配置高流动性 Pool 地址（BTC/ETH/USDC 等主流对）
2. 对于未预配置的交易对，通过 Factory.getPool() 动态查找
3. 检查 Pool 流动性 > 0 才标记为支持
4. 启动时验证所有预配置 Pool 的可用性
5. 前端只显示已验证可用的交易对

## 5. 历史数据策略

**所有预言机历史数据统一使用 Binance API**，与现有 7 个预言机保持一致：

- `getHistoricalPrices()` 调用 `binanceMarketService.getHistoricalPricesByHours()`
- 数据来源标记为 `binance-api`
- 支持所有 Binance 支持的交易对历史数据

## 6. 功能页面集成

### 6.1 价格查询页面 (Price Query)

- **Selectors**: 新增 TWAP 作为可选预言机
- **Stats Cards**: 新增 TwapStats 组件，展示 TWAP 特有指标：
  - TWAP 价格 vs 现货价格
  - Pool 流动性
  - Fee Tier
  - TWAP 计算间隔
  - 价格偏差（TWAP vs Spot）
- **Chart**: 复用现有图表组件
- **On-chain Data**: 通过 useTwapOnChainData Hook 展示链上数据

### 6.2 跨预言机对比页面 (Cross Oracle)

- TWAP 作为第 8 个预言机参与对比
- 自动计算与其他 7 个预言机的价格偏差
- 参与一致性评级计算
- 在价格表中显示 TWAP 特有列（Pool 流动性、TWAP 间隔）

### 6.3 跨链对比页面 (Cross Chain)

- 支持 TWAP 在 6 条链上的价格对比
- 展示不同链上 TWAP 价格的差异
- 参与跨链统计计算

### 6.4 首页 (Home)

- 预言机卡片新增 TWAP
- 热门代币价格来源包含 TWAP

### 6.5 导航栏 (Navbar)

- 新增 TWAP 导航项

## 7. 错误处理

### 7.1 新增错误码

```typescript
'TWAP_ERROR'; // TWAP 通用错误
'TWAP_POOL_NOT_FOUND'; // Pool 不存在
'TWAP_INSUFFICIENT_LIQUIDITY'; // 流动性不足
'TWAP_OBSERVATION_ERROR'; // 观察数据读取失败
'TWAP_HISTORICAL_ERROR'; // 历史数据获取失败
```

### 7.2 错误恢复策略

- RPC 故障转移：与 Chainlink 相同的 Alchemy 优先 + 公共节点备用策略
- 重试机制：使用 `ORACLE_RETRY_PRESETS.standard`（3次，1s基础延迟）
- Pool 不可用时：尝试其他 Fee Tier 的 Pool
- 数据验证：价格 > 0、时间戳合理、流动性 > 0

## 8. 性能考虑

- **缓存**：TWAP 价格缓存 TTL = 30s（与其他预言机一致）
- **批量请求**：支持 `getPrices()` 批量获取多个代币价格
- **并发控制**：使用现有的 `getRequestQueue` 管理请求优先级
- **内存管理**：使用现有的 `MemoryManager` 定期清理
- **RPC 优化**：合并多个合约调用为 multicall（如果 Alchemy 支持）

## 9. 安全考虑

- **价格验证**：TWAP 价格必须在合理范围内（与 basePrices 对比偏差 < 50%）
- **流动性检查**：只使用流动性 > 阈值的 Pool
- **时间戳验证**：确保观察数据的时间戳合理
- **RPC 安全**：使用 Alchemy RPC，避免公共节点的中间人攻击风险

## 10. 测试策略

- **单元测试**：TWAPClient、TwapOnChainService、价格计算函数
- **集成测试**：API 路由测试
- **端到端验证**：使用 Alchemy RPC 获取真实数据并验证
- **数据验证**：对比 TWAP 价格与 Binance 现货价格，偏差应 < 1%

## 11. 验证数据真实性的方法

1. **TWAP vs Binance 现货价格对比**：偏差应 < 1%（主流交易对）
2. **TWAP vs 其他预言机价格对比**：偏差应 < 2%
3. **链上数据验证**：通过 Etherscan 等区块浏览器验证 Pool 合约数据
4. **时间戳验证**：确保数据是近期的（< 5 分钟）
5. **流动性验证**：确保 Pool 有足够的流动性支撑价格
