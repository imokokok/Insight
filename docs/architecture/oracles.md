# 预言机系统架构

> Insight 平台的多预言机集成架构设计

## 目录

- [系统概览](#系统概览)
- [架构图](#架构图)
- [核心组件](#核心组件)
- [数据流](#数据流)
- [扩展指南](#扩展指南)

## 系统概览

Insight 平台支持多种区块链预言机提供商，采用统一的抽象层设计，使得不同预言机的集成变得简单且一致。

### 支持的预言机

| 预言机        | 标识符          | 文件位置                      | 主要链                      | 特点           |
| ------------- | --------------- | ---------------------------- | --------------------------- | -------------- |
| Chainlink     | `chainlink`     | `src/lib/oracles/chainlink.ts` | Ethereum, Arbitrum, Polygon | 市场领导者     |
| Band Protocol | `band_protocol` | `src/lib/oracles/bandProtocol.ts` | Cosmos, Ethereum            | 跨链数据       |
| Pyth Network  | `pyth`          | `src/lib/oracles/pythNetwork.ts` | Solana, Ethereum            | 低延迟金融数据 |
| API3          | `api3`          | `src/lib/oracles/api3.ts` | Ethereum, Polygon           | 第一方预言机   |
| UMA           | `uma`           | `src/lib/oracles/uma/` (完整模块) | Ethereum                    | 乐观预言机     |
| RedStone      | `redstone`      | `src/lib/oracles/redstone.ts` | Arbitrum, Ethereum          | 高效数据推送   |
| DIA           | `dia`           | `src/lib/oracles/dia.ts` | 多链                        | 透明数据源     |
| Tellor        | `tellor`        | `src/lib/oracles/tellor.ts` | Ethereum                    | 去中心化报告   |
| Chronicle     | `chronicle`     | `src/lib/oracles/chronicle.ts` | Ethereum                    | MakerDAO 生态  |
| WINkLink      | `winklink`      | `src/lib/oracles/winklink.ts` | Tron                        | 波场生态       |

## 架构图

### 整体架构

```mermaid
graph TB
    subgraph Application["应用层"]
        A[React Components]
        B[Hooks]
        C[API Routes]
    end

    subgraph OracleLayer["预言机抽象层"]
        D[OracleClientFactory]
        E[BaseOracleClient]
        F[IOracleClient Interface]
    end

    subgraph Implementations["具体实现"]
        G[ChainlinkClient]
        H[PythClient]
        I[BandProtocolClient]
        J[API3Client]
        K[UMAClient]
        L[RedStoneClient]
        M[DiAClient]
        N[TellorClient]
        O[ChronicleClient]
        P[WINkLinkClient]
    end

    subgraph DataSources["数据源"]
        Q[Supabase DB]
        R[External APIs]
        S[Mock Data]
    end

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    E --> G
    E --> H
    E --> I
    E --> J
    E --> K
    E --> L
    E --> M
    E --> N
    E --> O
    E --> P
    G --> Q
    G --> R
    G --> S
```

### 类层次结构

```mermaid
classDiagram
    class IOracleClient {
        <<interface>>
        +name: OracleProvider
        +supportedChains: Blockchain[]
        +getPrice(symbol, chain): Promise~PriceData~
        +getHistoricalPrices(symbol, chain, period): Promise~PriceData[]~
    }

    class BaseOracleClient {
        <<abstract>>
        #config: OracleClientConfig
        +constructor(config?)
        +getPrice(symbol, chain)*: Promise~PriceData~
        +getHistoricalPrices(symbol, chain, period)*: Promise~PriceData[]~
        #createError(message, code): OracleError
        #generateMockPrice(symbol, basePrice, chain): PriceData
        #generateMockHistoricalPrices(symbol, basePrice, chain, period): PriceData[]
        #fetchPriceWithDatabase(symbol, chain, mockGenerator): Promise~PriceData~
        #fetchHistoricalPricesWithDatabase(symbol, chain, period, mockGenerator): Promise~PriceData[]~
    }

    class OracleClientFactory {
        -instances: Map~OracleProvider, BaseOracleClient~
        -config: OracleClientConfig
        +configure(config): void
        +getClient(provider): BaseOracleClient
        +getAllClients(): Record~OracleProvider, BaseOracleClient~
        +clearInstances(): void
        -createClient(provider): BaseOracleClient
    }

    class ChainlinkClient {
        +name: OracleProvider.CHAINLINK
        +supportedChains: Blockchain[]
        +getPrice(symbol, chain): Promise~PriceData~
        +getHistoricalPrices(symbol, chain, period): Promise~PriceData[]~
    }

    class BandProtocolClient {
        +name: OracleProvider.BAND_PROTOCOL
        +supportedChains: Blockchain[]
        +getPrice(symbol, chain): Promise~PriceData~
        +getHistoricalPrices(symbol, chain, period): Promise~PriceData[]~
    }

    class PythClient {
        +name: OracleProvider.PYTH
        +supportedChains: Blockchain[]
        +getPrice(symbol, chain): Promise~PriceData~
        +getHistoricalPrices(symbol, chain, period): Promise~PriceData[]~
    }

    class API3Client {
        +name: OracleProvider.API3
        +supportedChains: Blockchain[]
        +getPrice(symbol, chain): Promise~PriceData~
        +getHistoricalPrices(symbol, chain, period): Promise~PriceData[]~
    }

    class UMAClient {
        +name: OracleProvider.UMA
        +supportedChains: Blockchain[]
        +getPrice(symbol, chain): Promise~PriceData~
        +getHistoricalPrices(symbol, chain, period): Promise~PriceData[]~
    }

    class RedStoneClient {
        +name: OracleProvider.REDSTONE
        +supportedChains: Blockchain[]
        +getPrice(symbol, chain): Promise~PriceData~
        +getHistoricalPrices(symbol, chain, period): Promise~PriceData[]~
    }

    class DIAClient {
        +name: OracleProvider.DIA
        +supportedChains: Blockchain[]
        +getPrice(symbol, chain): Promise~PriceData~
        +getHistoricalPrices(symbol, chain, period): Promise~PriceData[]~
    }

    class TellorClient {
        +name: OracleProvider.TELLOR
        +supportedChains: Blockchain[]
        +getPrice(symbol, chain): Promise~PriceData~
        +getHistoricalPrices(symbol, chain, period): Promise~PriceData[]~
    }

    class ChronicleClient {
        +name: OracleProvider.CHRONICLE
        +supportedChains: Blockchain[]
        +getPrice(symbol, chain): Promise~PriceData~
        +getHistoricalPrices(symbol, chain, period): Promise~PriceData[]~
    }

    class WINkLinkClient {
        +name: OracleProvider.WINKLINK
        +supportedChains: Blockchain[]
        +getPrice(symbol, chain): Promise~PriceData~
        +getHistoricalPrices(symbol, chain, period): Promise~PriceData[]~
    }

    IOracleClient <|.. BaseOracleClient
    BaseOracleClient <|-- ChainlinkClient
    BaseOracleClient <|-- BandProtocolClient
    BaseOracleClient <|-- PythClient
    BaseOracleClient <|-- API3Client
    BaseOracleClient <|-- UMAClient
    BaseOracleClient <|-- RedStoneClient
    BaseOracleClient <|-- DIAClient
    BaseOracleClient <|-- TellorClient
    BaseOracleClient <|-- ChronicleClient
    BaseOracleClient <|-- WINkLinkClient
    OracleClientFactory ..> BaseOracleClient : creates
```

## 核心组件

### 1. BaseOracleClient (抽象基类)

`BaseOracleClient` 是所有预言机客户端的抽象基类，定义了统一的接口和通用功能。

```typescript
// src/lib/oracles/base.ts
export abstract class BaseOracleClient {
  abstract name: OracleProvider;
  abstract supportedChains: Blockchain[];
  abstract getPrice(symbol: string, chain?: Blockchain): Promise<PriceData>;
  abstract getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number
  ): Promise<PriceData[]>;

  protected config: OracleClientConfig;

  constructor(config?: OracleClientConfig) {
    this.config = { ...DEFAULT_CLIENT_CONFIG, ...config };
  }

  protected createError(message: string, code?: string): OracleError {
    return {
      message,
      provider: this.name,
      code,
    };
  }

  protected generateMockPrice(
    symbol: string,
    basePrice: number,
    chain?: Blockchain,
    timestamp?: number
  ): PriceData {
    // 实现细节...
  }

  protected async fetchPriceWithDatabase(
    symbol: string,
    chain: Blockchain | undefined,
    mockGenerator: () => PriceData
  ): Promise<PriceData> {
    // 先查数据库，再生成 Mock
    // 实现细节...
  }
}
```

**关键特性：**

- **抽象方法**：`getPrice` 和 `getHistoricalPrices` 必须由子类实现
- **Mock 数据生成**：提供基于随机游走模型的价格数据生成
- **数据库集成**：自动缓存和读取数据库中的价格数据
- **链特定波动率**：不同区块链有不同的价格波动率配置

### 2. OracleClientFactory (工厂模式)

工厂模式用于创建和管理预言机客户端实例，支持依赖注入和单例模式。

```typescript
// src/lib/oracles/factory.ts
export class OracleClientFactory {
  private static instances: Map<OracleProvider, BaseOracleClient> = new Map();
  private static config: OracleClientConfig = {
    useDatabase: true,
    fallbackToMock: true,
  };

  static configure(config: Partial<OracleClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  static getClient(provider: OracleProvider): BaseOracleClient {
    if (!this.instances.has(provider)) {
      this.instances.set(provider, this.createClient(provider));
    }
    return this.instances.get(provider)!;
  }

  static getAllClients(): Record<OracleProvider, BaseOracleClient> {
    const providers = [
      OracleProvider.CHAINLINK,
      OracleProvider.BAND_PROTOCOL,
      OracleProvider.UMA,
      OracleProvider.PYTH,
      OracleProvider.API3,
      OracleProvider.REDSTONE,
      OracleProvider.DIA,
      OracleProvider.TELLOR,
      OracleProvider.CHRONICLE,
      OracleProvider.WINKLINK,
    ];

    const clients: Partial<Record<OracleProvider, BaseOracleClient>> = {};
    providers.forEach((provider) => {
      clients[provider] = this.getClient(provider);
    });

    return clients as Record<OracleProvider, BaseOracleClient>;
  }

  private static createClient(provider: OracleProvider): BaseOracleClient {
    switch (provider) {
      case OracleProvider.CHAINLINK:
        return new ChainlinkClient(this.config);
      case OracleProvider.BAND_PROTOCOL:
        return new BandProtocolClient(this.config);
      case OracleProvider.UMA:
        return new UMAClient(this.config);
      case OracleProvider.PYTH:
        return new PythClient(this.config);
      case OracleProvider.API3:
        return new API3Client(this.config);
      case OracleProvider.REDSTONE:
        return new RedStoneClient(this.config);
      case OracleProvider.DIA:
        return new DIAClient(this.config);
      case OracleProvider.TELLOR:
        return new TellorClient(this.config);
      case OracleProvider.CHRONICLE:
        return new ChronicleClient(this.config);
      case OracleProvider.WINKLINK:
        return new WINkLinkClient(this.config);
      default:
        throw new ValidationError(`Unknown oracle provider: ${provider}`);
    }
  }
}
```

**设计优势：**

- **单例管理**：每个预言机只有一个实例，节省资源
- **延迟初始化**：首次使用时才创建实例
- **统一配置**：所有客户端共享配置

### 3. 接口定义

```typescript
// src/lib/oracles/interfaces.ts
export interface IOracleClient {
  readonly name: OracleProvider;
  readonly supportedChains: Blockchain[];
  getPrice(symbol: string, chain?: Blockchain): Promise<PriceData>;
  getHistoricalPrices(symbol: string, chain?: Blockchain, period?: number): Promise<PriceData[]>;
}

export interface IOracleClientFactory {
  getClient(provider: OracleProvider): IOracleClient;
  getAllClients(): Record<OracleProvider, IOracleClient>;
  hasClient(provider: OracleProvider): boolean;
  clearInstances(): void;
}
```

### 4. ChainlinkClient 实现

```typescript
// src/lib/oracles/chainlink.ts
export class ChainlinkClient extends BaseOracleClient {
  name = OracleProvider.CHAINLINK;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.OPTIMISM,
    Blockchain.BASE,
  ];

  async getPrice(symbol: string, chain: Blockchain = Blockchain.ETHEREUM): Promise<PriceData> {
    return this.fetchPriceWithDatabase(symbol, chain, () => {
      const basePrice = this.getBasePrice(symbol);
      return this.generateMockPrice(symbol, basePrice, chain);
    });
  }

  async getHistoricalPrices(
    symbol: string,
    chain: Blockchain = Blockchain.ETHEREUM,
    period: number = 24
  ): Promise<PriceData[]> {
    return this.fetchHistoricalPricesWithDatabase(symbol, chain, period, () => {
      const basePrice = this.getBasePrice(symbol);
      return this.generateMockHistoricalPrices(symbol, basePrice, chain, period);
    });
  }

  private getBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      BTC: 45000,
      ETH: 3000,
      LINK: 15,
    };
    return prices[symbol] || 100;
  }
}
```

### 5. UMA 客户端（完整模块）

UMA 是一个独立模块，包含完整的预言机实现：

```
src/lib/oracles/uma/
├── client.ts           # UMA 预言机客户端
├── components.tsx      # React 组件
├── crossChainTypes.ts  # 跨链类型定义
├── dataRequestTypes.ts # 数据请求类型
├── governanceTypes.ts  # 治理类型
├── index.ts           # 导出入口
├── mockDataConfig.ts   # Mock 数据配置
└── types.ts           # 类型定义
```

```typescript
// src/lib/oracles/uma/client.ts
import { BaseOracleClient } from '../base';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

export class UMAClient extends BaseOracleClient {
  name = OracleProvider.UMA;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
  ];

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    return this.fetchPriceWithDatabase(symbol, chain, () => {
      const basePrice = this.getBasePrice(symbol);
      return this.generateMockPrice(symbol, basePrice, chain);
    });
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    return this.fetchHistoricalPricesWithDatabase(symbol, chain, period, () => {
      const basePrice = this.getBasePrice(symbol);
      return this.generateMockHistoricalPrices(symbol, basePrice, chain, period);
    });
  }

  private getBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      BTC: 45000,
      ETH: 3000,
    };
    return prices[symbol] || 100;
  }
}
```

### 6. API3 客户端特性

API3 客户端包含多个专门文件：

```
src/lib/oracles/
├── api3.ts                    # 主客户端
├── api3AlertDetection.ts      # 警报检测
├── api3DataAggregator.ts     # 数据聚合
├── api3DataSources.ts         # 数据源管理
├── api3IncrementalUpdate.ts   # 增量更新
├── api3MockDataAnnotations.ts # Mock 数据注解
├── api3OfflineStorage.ts      # 离线存储
├── api3OnChainService.ts      # 链上服务
├── api3RequestManager.ts      # 请求管理
└── api3WebSocket.ts           # WebSocket 支持
```

### 7. Pyth Network 客户端特性

```
src/lib/oracles/
├── pythNetwork.ts        # 主客户端
├── pythConstants.ts      # 常量定义
├── pythDataService.ts    # 数据服务
├── pythHermesClient.ts   # Hermes 客户端
└── pythMockData.ts       # Mock 数据
```

### 8. RedStone 客户端特性

```
src/lib/oracles/
├── redstone.ts           # 主客户端
├── redstoneConstants.ts  # 常量定义
```

### 9. Tellor 客户端特性

Tellor 客户端包含多个专门文件：

```
src/lib/oracles/
├── tellor.ts                  # 主客户端
├── tellorClientSingleton.ts   # 单例模式
├── tellorDataVerification.ts  # 数据验证
├── tellorOnChainService.ts    # 链上服务
└── tellorQueryUtils.ts        # 查询工具
```

### 10. DIA 客户端特性

```
src/lib/oracles/
├── dia.ts              # 主客户端
└── diaDataService.ts  # 数据服务
```

## 数据流

### 价格数据获取流程

```mermaid
sequenceDiagram
    participant Client as React Component
    participant Hook as useOraclePrice
    participant API as API Route
    participant Factory as OracleClientFactory
    participant Oracle as ChainlinkClient
    participant DB as Supabase

    Client->>Hook: 请求价格数据
    Hook->>API: GET /api/oracles/chainlink?symbol=BTC
    API->>Factory: getClient(CHAINLINK)
    Factory-->>API: ChainlinkClient 实例
    API->>Oracle: getPrice("BTC", "ethereum")
    Oracle->>DB: 查询缓存价格
    alt 缓存命中
        DB-->>Oracle: 返回缓存数据
        Oracle-->>API: PriceData
    else 缓存未命中
        Oracle->>Oracle: 生成 Mock 数据
        Oracle->>DB: 保存到数据库
        Oracle-->>API: PriceData
    end
    API-->>Hook: JSON 响应
    Hook-->>Client: 返回数据
```

### 数据存储策略

```typescript
// src/lib/oracles/storage.ts
export interface OracleStorageConfig {
  useDatabase: boolean;
  cacheDuration: number;
}

export async function getPriceFromDatabase(
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain
): Promise<PriceData | null> {
  const { data, error } = await supabase
    .from('oracle_prices')
    .select('*')
    .eq('provider', provider)
    .eq('symbol', symbol)
    .eq('chain', chain || 'ethereum')
    .gt('timestamp', Date.now() - CACHE_DURATION)
    .single();

  if (error || !data) return null;
  return transformDatabaseRecord(data);
}

export async function savePriceToDatabase(price: PriceData): Promise<void> {
  await supabase.from('oracle_prices').upsert({
    provider: price.provider,
    symbol: price.symbol,
    chain: price.chain || 'ethereum',
    price: price.price,
    timestamp: price.timestamp,
    confidence: price.confidence,
    change_24h: price.change24h,
    change_24h_percent: price.change24hPercent,
  });
}
```

## 扩展指南

### 添加新的预言机支持

#### 步骤 1：创建客户端类

```typescript
// src/lib/oracles/newOracle.ts
import { BaseOracleClient } from './base';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

export class NewOracleClient extends BaseOracleClient {
  name = OracleProvider.NEW_ORACLE;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.POLYGON,
  ];

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    return this.fetchPriceWithDatabase(symbol, chain, () => {
      const basePrice = this.getBasePrice(symbol);
      return this.generateMockPrice(symbol, basePrice, chain);
    });
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    return this.fetchHistoricalPricesWithDatabase(symbol, chain, period, () => {
      const basePrice = this.getBasePrice(symbol);
      return this.generateMockHistoricalPrices(symbol, basePrice, chain, period);
    });
  }

  private getBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      BTC: 45000,
      ETH: 3000,
    };
    return prices[symbol] || 100;
  }
}
```

#### 步骤 2：更新工厂

```typescript
// src/lib/oracles/factory.ts
import { NewOracleClient } from './newOracle';

private static createClient(provider: OracleProvider): BaseOracleClient {
  switch (provider) {
    case OracleProvider.NEW_ORACLE:
      return new NewOracleClient(this.config);
    // ... 现有 case
  }
}
```

#### 步骤 3：更新枚举和类型

```typescript
// src/types/oracle.ts
export const enum OracleProvider {
  NEW_ORACLE = 'new_oracle',
}
```

#### 步骤 4：添加颜色配置

```typescript
// src/lib/oracles/colors.ts
export const ORACLE_COLORS: Record<OracleProvider, OracleColorScheme> = {
  [OracleProvider.NEW_ORACLE]: {
    primary: '#FF6B6B',
    secondary: '#FF8787',
    light: '#FFF5F5',
    dark: '#C92A2A',
    gradient: ['#FF6B6B', '#FF8787'],
  },
};
```

#### 步骤 5：创建页面组件

```typescript
// src/app/[locale]/new-oracle/page.tsx
import { OraclePageTemplate } from '@/components/oracle/shared';
import { OracleProvider } from '@/types/oracle';

export default function NewOraclePage() {
  return (
    <OraclePageTemplate
      provider={OracleProvider.NEW_ORACLE}
      title="New Oracle"
      description="Description of the new oracle"
    />
  );
}
```

### 最佳实践

1. **始终继承 BaseOracleClient**：确保接口一致性
2. **使用数据库缓存**：通过 `fetchPriceWithDatabase` 方法
3. **定义基础价格**：为常用资产提供合理的基准价格
4. **支持多链**：明确定义 `supportedChains`
5. **添加测试**：为新客户端编写单元测试
6. **文档化**：更新相关文档和类型定义

### 测试预言机

```typescript
// src/lib/oracles/__tests__/newOracle.test.ts
import { NewOracleClient } from '../newOracle';
import { OracleProvider, Blockchain } from '@/types/oracle';

describe('NewOracleClient', () => {
  let client: NewOracleClient;

  beforeEach(() => {
    client = new NewOracleClient();
  });

  it('should have correct name', () => {
    expect(client.name).toBe(OracleProvider.NEW_ORACLE);
  });

  it('should support expected chains', () => {
    expect(client.supportedChains).toContain(Blockchain.ETHEREUM);
    expect(client.supportedChains).toContain(Blockchain.POLYGON);
  });

  it('should fetch price for BTC', async () => {
    const price = await client.getPrice('BTC', Blockchain.ETHEREUM);
    expect(price.symbol).toBe('BTC');
    expect(price.provider).toBe(OracleProvider.NEW_ORACLE);
    expect(price.price).toBeGreaterThan(0);
    expect(price.timestamp).toBeGreaterThan(0);
  });

  it('should fetch historical prices', async () => {
    const prices = await client.getHistoricalPrices('ETH', Blockchain.ETHEREUM, 24);
    expect(prices.length).toBeGreaterThan(0);
    expect(prices[0].symbol).toBe('ETH');
  });
});
```

## 性能优化

### 1. 连接池

工厂模式确保每个预言机只有一个实例，避免重复创建连接。

### 2. 数据缓存

- **数据库缓存**：自动缓存价格数据到 Supabase
- **React Query 缓存**：前端数据缓存和重新验证

### 3. 批量获取

```typescript
async function getMultiplePrices(
  provider: OracleProvider,
  symbols: string[]
): Promise<PriceData[]> {
  const client = OracleClientFactory.getClient(provider);
  const promises = symbols.map((symbol) =>
    client.getPrice(symbol).catch((error) => {
      console.error(`Failed to fetch ${symbol}:`, error);
      return null;
    })
  );
  const results = await Promise.all(promises);
  return results.filter((price): price is PriceData => price !== null);
}
```

## 故障处理

### 错误类型

```typescript
// src/lib/errors/index.ts
export class PriceFetchError extends AppError {
  constructor(
    message: string,
    details: {
      provider: OracleProvider;
      symbol: string;
      chain?: Blockchain;
      retryable: boolean;
    },
    cause?: Error
  ) {
    super({
      message,
      code: 'PRICE_FETCH_ERROR',
      statusCode: 502,
      details,
      cause,
    });
  }
}
```

### 重试策略

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    },
  },
});
```
