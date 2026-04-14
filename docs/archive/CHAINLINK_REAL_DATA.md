# Chainlink 真实数据获取指南

## 概述

本项目现已支持通过 Alchemy RPC 获取 Chainlink 预言机的真实链上数据。

## 已配置的文件

### 1. 环境变量配置 (`.env.local`)

```env
NEXT_PUBLIC_ALCHEMY_ETHEREUM_RPC=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_ALCHEMY_ARBITRUM_RPC=https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_ALCHEMY_POLYGON_RPC=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_ALCHEMY_BASE_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

**注意**: 我已经使用了你截图中的 API Key 进行了配置。

### 2. 核心服务文件

- `src/lib/oracles/chainlinkDataSources.ts` - Chainlink 价格 Feed 合约配置
- `src/lib/oracles/chainlinkOnChainService.ts` - 链上数据获取服务
- `src/lib/oracles/chainlink.ts` - 更新后的 ChainlinkClient

### 3. 示例文件

- `src/lib/oracles/chainlinkRealDataExample.ts` - 使用示例

## 支持的代币和链

### 支持的代币

- ETH, BTC, LINK, USDC, USDT, DAI, MATIC, AVAX, BNB

### 支持的链

- Ethereum (1)
- Arbitrum (42161)
- Polygon (137)
- Base (8453)
- Avalanche (43114)
- BNB Chain (56)

## 使用方法

### 方法 1: 使用 ChainlinkOnChainService（直接获取真实数据）

```typescript
import { chainlinkOnChainService } from '@/lib/oracles';

// 获取 ETH/USD 价格
const ethPrice = await chainlinkOnChainService.getPrice('ETH', 1);
console.log(ethPrice.price); // 真实价格，例如: 3500.42

// 批量获取多个价格
const prices = await chainlinkOnChainService.getPrices(['ETH', 'BTC', 'LINK'], 1);

// 获取 LINK 代币信息
const tokenData = await chainlinkOnChainService.getTokenData(1);
```

### 方法 2: 使用 ChainlinkClient（自动降级到模拟数据）

```typescript
import { ChainlinkClient } from '@/lib/oracles';

const client = new ChainlinkClient({ useRealData: true });

// 自动尝试获取真实数据，失败时降级到模拟数据
const price = await client.getPrice('ETH', Blockchain.ETHEREUM);
```

### 方法 3: 在 React Hook 中使用

```typescript
import { useEffect, useState } from 'react';
import { chainlinkOnChainService } from '@/lib/oracles';

function useChainlinkPrice(symbol: string, chainId: number = 1) {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const data = await chainlinkOnChainService.getPrice(symbol, chainId);
        setPrice(data.price);
      } catch (error) {
        console.error('Failed to fetch price:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 30000); // 每30秒刷新
    return () => clearInterval(interval);
  }, [symbol, chainId]);

  return { price, loading };
}
```

## 数据来源

所有数据都来自 Chainlink 官方部署的价格预言机合约：

- **ETH/USD**: `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` (Ethereum)
- **BTC/USD**: `0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c` (Ethereum)
- **LINK/USD**: `0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c` (Ethereum)

## 特性

✅ **真实数据** - 直接从 Chainlink 价格 Feed 合约读取  
✅ **多链支持** - 支持 Ethereum、Arbitrum、Polygon、Base 等  
✅ **自动降级** - RPC 失败时自动使用模拟数据  
✅ **智能缓存** - 30秒缓存避免重复请求  
✅ **RPC 故障转移** - 支持多个 RPC 端点，自动切换  
✅ **无需 API Key** - 也可以直接使用公共 RPC

## 故障排除

### 如果获取不到数据

1. 检查 `.env.local` 文件中的 RPC URL 是否正确
2. 检查 Alchemy API Key 是否有效
3. 查看浏览器控制台是否有错误信息

### 切换到模拟数据

如果需要使用模拟数据，可以：

```typescript
const client = new ChainlinkClient({ useRealData: false });
```

或者在 `.env.local` 中设置：

```env
NEXT_PUBLIC_USE_REAL_CHAINLINK_DATA=false
```

## 下一步

你现在可以：

1. 启动项目测试真实数据获取
2. 在 UI 中替换模拟数据为真实数据
3. 添加更多 Chainlink 价格 Feed 支持

需要我帮你测试数据获取或集成到 UI 中吗？
