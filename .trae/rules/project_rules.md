# Insight 项目代码规范

> 本规范适用于 Insight 区块链预言机数据分析平台的所有代码编写工作。
> 项目基于 Next.js 16 + React 19 + TypeScript 构建。

## 目录

1. [项目概述](#1-项目概述)
2. [架构规范](#2-架构规范)
3. [TypeScript 规范](#3-typescript-规范)
4. [React 组件规范](#4-react-组件规范)
5. [状态管理规范](#5-状态管理规范)
6. [样式和 CSS 规范](#6-样式和-css-规范)
7. [API 和数据获取规范](#7-api-和数据获取规范)
8. [错误处理规范](#8-错误处理规范)
9. [性能优化规范](#9-性能优化规范)
10. [测试规范](#10-测试规范)
11. [国际化规范](#11-国际化规范)
12. [安全规范](#12-安全规范)
13. [命名约定](#13-命名约定)
14. [导入导出规范](#14-导入导出规范)
15. [注释和文档规范](#15-注释和文档规范)

**附录**
- [附录 A: 快速参考](#附录-a-快速参考)
- [附录 B: 最佳实践检查清单](#附录-b-最佳实践检查清单)
- [附录 C: Git 提交规范](#附录-c-git-提交规范)

---

## 1. 项目概述

### 1.1 技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Next.js | 16.1.6 | React 全栈框架 |
| UI 库 | React | 19.2.3 | 用户界面 |
| 语言 | TypeScript | 5.x | 类型安全 |
| 样式 | Tailwind CSS | 4.x | 原子化 CSS |
| 图表 | Recharts | 3.8.0 | 数据可视化 |
| 状态管理 | React Query | 5.90.21 | 服务端状态 |
| 客户端状态 | Zustand | 5.0.11 | UI 状态 |
| 数据库 | Supabase | 2.98.0 | PostgreSQL + Auth |
| 国际化 | next-intl | 4.8.3 | 多语言支持 |
| 动画 | Framer Motion | 12.36.0 | 交互动画 |
| 图标 | Lucide React | 0.577.0 | 图标库 |
| 监控 | Sentry | 10.43.0 | 错误监控 |
| 分析 | Vercel Analytics | 2.0.1 | 性能分析 |

### 1.2 项目特点

- **Server Components 优先** - 默认使用 React Server Components
- **类型安全** - TypeScript Strict Mode 启用
- **专业现代设计** - Insight Professional Finance 风格，使用微妙圆角（4-8px）和柔和阴影，平衡专业感与现代感
- **实时数据** - WebSocket + Supabase Realtime
- **多预言机支持** - Chainlink, Pyth, Band, API3, UMA 等

### 1.3 性能预算配置

项目在 `package.json` 中定义了性能预算，用于监控和优化应用性能：

```json
{
  "performanceBudget": {
    "webVitals": {
      "LCP": {
        "target": 2500,
        "warning": 4000,
        "unit": "ms",
        "description": "Largest Contentful Paint"
      },
      "INP": {
        "target": 200,
        "warning": 500,
        "unit": "ms",
        "description": "Interaction to Next Paint"
      },
      "CLS": {
        "target": 0.1,
        "warning": 0.25,
        "unit": "score",
        "description": "Cumulative Layout Shift"
      },
      "FCP": {
        "target": 1800,
        "warning": 3000,
        "unit": "ms",
        "description": "First Contentful Paint"
      },
      "TTFB": {
        "target": 800,
        "warning": 1800,
        "unit": "ms",
        "description": "Time to First Byte"
      }
    },
    "bundle": {
      "javascript": {
        "target": 300,
        "warning": 500,
        "unit": "KB",
        "description": "Total JavaScript bundle size"
      },
      "css": {
        "target": 100,
        "warning": 150,
        "unit": "KB",
        "description": "Total CSS bundle size"
      },
      "images": {
        "target": 500,
        "warning": 1000,
        "unit": "KB",
        "description": "Total image size"
      }
    },
    "resources": {
      "maxResourceCount": 50,
      "maxThirdPartyScripts": 10,
      "maxFonts": 5
    }
  }
}
```

---

## 2. 架构规范

### 2.1 目录结构

```
src/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # 国际化路由
│   │   ├── api3/                 # API3 预言机页面
│   │   ├── chainlink/            # Chainlink 页面
│   │   ├── cross-chain/          # 跨链分析页面
│   │   ├── cross-oracle/         # 跨预言机对比
│   │   ├── market-overview/      # 市场概览
│   │   ├── price-query/          # 价格查询
│   │   ├── band-protocol/        # Band Protocol 页面
│   │   ├── chronicle/            # Chronicle 页面
│   │   ├── dia/                  # DIA 页面
│   │   ├── pyth/                 # Pyth 页面
│   │   ├── pyth-network/         # Pyth Network 页面
│   │   ├── redstone/             # RedStone 页面
│   │   ├── tellor/               # Tellor 页面
│   │   ├── uma/                  # UMA 页面
│   │   ├── winklink/             # WINkLink 页面
│   │   ├── favorites/            # 收藏夹页面
│   │   ├── alerts/               # 警报页面
│   │   ├── settings/             # 设置页面
│   │   ├── methodology/          # 方法论页面
│   │   ├── snapshot/[id]/        # 快照详情页
│   │   ├── auth/                 # 认证相关页面
│   │   │   ├── forgot-password/
│   │   │   ├── reset-password/
│   │   │   ├── verify-email/
│   │   │   └── resend-verification/
│   │   ├── login/                # 登录页面
│   │   ├── register/             # 注册页面
│   │   └── home-components/      # 首页专用组件
│   ├── api/                      # API Routes
│   │   ├── alerts/               # 警报 API
│   │   ├── cron/cleanup/         # 定时清理任务
│   │   └── health/               # 健康检查 API
│   ├── globals.css               # 全局样式
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 首页
│   ├── error.tsx                 # 错误页面
│   ├── global-error.tsx          # 全局错误页面
│   ├── not-found.tsx             # 404 页面
│   └── middleware.ts             # Next.js 中间件
│
├── components/                   # React 组件
│   ├── oracle/                   # 预言机相关组件
│   │   ├── charts/               # 图表组件
│   │   ├── common/               # 通用预言机组件
│   │   └── panels/               # 面板组件
│   ├── alerts/                   # 警报组件
│   ├── charts/                   # 通用图表
│   ├── comparison/               # 对比组件
│   ├── export/                   # 导出组件
│   ├── navigation/               # 导航组件
│   ├── ui/                       # 基础 UI 组件
│   ├── accessibility/            # 无障碍组件
│   ├── data-transparency/        # 数据透明组件
│   ├── favorites/                # 收藏夹组件
│   ├── mobile/                   # 移动端专用组件
│   ├── performance/              # 性能优化组件
│   ├── realtime/                 # 实时数据组件
│   ├── search/                   # 搜索组件
│   └── shortcuts/                # 快捷键组件
│
├── hooks/                        # 自定义 Hooks
│   ├── api3/                     # API3 专用 hooks
│   ├── queries/                  # React Query hooks
│   ├── realtime/                 # 实时数据 hooks
│   ├── __tests__/                # Hooks 测试
│   ├── useDebounce.ts
│   ├── useChainlinkData.ts
│   ├── usePythData.ts
│   ├── useOraclePrices.ts
│   ├── useFavorites.ts
│   ├── usePriceHistory.ts
│   ├── useAPI3WebSocket.ts
│   ├── useTechnicalIndicators.ts
│   ├── useChartZoom.ts
│   ├── useUMARealtime.ts
│   ├── useKeyboardShortcuts.ts
│   └── useHoverPrefetch.ts
│
├── lib/                          # 核心库
│   ├── api/                      # API 层
│   │   ├── client/               # API 客户端
│   │   │   ├── ApiClient.ts
│   │   │   ├── ApiError.ts
│   │   │   └── types.ts
│   │   ├── middleware/           # 中间件
│   │   │   ├── authMiddleware.ts
│   │   │   ├── errorMiddleware.ts
│   │   │   ├── loggingMiddleware.ts
│   │   │   ├── rateLimitMiddleware.ts
│   │   │   └── validationMiddleware.ts
│   │   ├── validation/           # 验证逻辑
│   │   │   ├── validators.ts
│   │   │   └── schemas.ts
│   │   ├── response/             # 响应处理
│   │   │   └── ApiResponse.ts
│   │   ├── versioning/           # API 版本控制
│   │   ├── handler.ts
│   │   └── utils.ts
│   ├── oracles/                  # 预言机客户端
│   │   ├── base.ts               # 基础抽象类
│   │   ├── interfaces.ts         # 接口定义
│   │   ├── factory.ts            # 工厂模式
│   │   ├── storage.ts            # 存储层
│   │   ├── colors.ts             # 预言机颜色配置
│   │   ├── chainlink.ts          # Chainlink 实现
│   │   ├── bandProtocol.ts       # Band Protocol 实现
│   │   ├── pythNetwork.ts        # Pyth 实现
│   │   ├── pythHermesClient.ts   # Pyth Hermes 客户端
│   │   ├── api3.ts               # API3 实现
│   │   ├── redstone.ts           # RedStone 实现
│   │   ├── dia.ts                # DIA 实现
│   │   ├── tellor.ts             # Tellor 实现
│   │   ├── chronicle.ts          # Chronicle 实现
│   │   ├── winklink.ts           # WINkLink 实现
│   │   ├── uma/                  # UMA 模块
│   │   │   ├── client.ts
│   │   │   ├── types.ts
│   │   │   └── components.tsx
│   │   ├── index.ts              # 统一导出
│   │   └── __tests__/            # 测试文件
│   ├── errors/                   # 错误处理
│   │   ├── AppError.ts
│   │   ├── BusinessErrors.ts
│   │   ├── OracleError.ts
│   │   ├── errorToResponse.ts
│   │   ├── errorRecovery.ts
│   │   └── __tests__/            # 测试文件
│   │       ├── index.test.ts
│   │       ├── AppError.test.ts
│   │       └── BusinessErrors.test.ts
│   ├── di/                       # 依赖注入容器
│   │   ├── index.ts              # 统一导出
│   │   ├── Container.ts
│   │   ├── types.ts
│   │   ├── tokens.ts
│   │   ├── serviceInterfaces.ts
│   │   └── registerServices.ts
│   ├── supabase/                 # Supabase 客户端
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── auth.ts
│   │   ├── realtime.ts
│   │   ├── queries.ts
│   │   └── database.types.ts
│   ├── services/                 # 业务服务层
│   │   ├── api3WebSocket.ts      # API3 WebSocket 服务
│   │   └── marketData/           # 市场数据服务
│   │       ├── index.ts          # 统一导出
│   │       ├── defiLlamaApi.ts
│   │       ├── priceCalculations.ts
│   │       ├── riskCalculations.ts
│   │       └── anomalyCalculations.ts
│   ├── analytics/                # 分析模块
│   │   ├── riskMetrics.ts
│   │   ├── anomalyDetection.ts
│   │   └── __tests__/            # 测试文件
│   │       ├── riskMetrics.test.ts
│   │       └── anomalyDetection.test.ts
│   ├── indicators/               # 技术指标计算
│   │   ├── index.ts              # 统一导出
│   │   ├── calculations.ts
│   │   ├── types.ts
│   │   └── __tests__/            # 测试文件
│   │       └── calculations.test.ts
│   ├── queries/                  # React Query 配置
│   │   └── queryKeys.ts
│   ├── snapshots/                # 快照功能
│   │   ├── index.ts              # 统一导出
│   │   ├── database.ts
│   │   └── migration.ts          # 快照迁移
│   ├── export/                   # 导出功能
│   │   └── exportConfig.ts
│   ├── monitoring/               # 监控
│   │   ├── index.ts              # 统一导出
│   │   └── webVitals.ts
│   ├── realtime/                 # 实时数据
│   │   ├── index.ts              # 统一导出
│   │   ├── priceAlerts.ts
│   │   ├── websocket.ts          # WebSocket 连接
│   │   └── __tests__/            # 测试文件
│   │       └── websocket.test.ts
│   ├── utils/                    # 工具函数
│   │   ├── format.ts
│   │   ├── dateFormat.ts
│   │   ├── timestamp.ts
│   │   ├── chainUtils.ts
│   │   ├── riskUtils.ts
│   │   ├── statistics.ts
│   │   ├── searchHistory.ts
│   │   ├── chartSharedUtils.ts
│   │   ├── lttb.ts               # 数据降采样
│   │   └── logger.ts
│   ├── config/                   # 配置文件
│   │   ├── colors.ts             # 颜色配置
│   │   ├── env.ts                # 环境变量配置
│   │   └── basePrices.ts         # 基准价格配置
│   ├── constants/                # 常量定义
│   │   ├── index.ts              # 统一导出
│   │   └── searchConfig.ts       # 搜索配置
│   ├── chartColors.ts            # 图表颜色
│   └── utils.ts                  # 根级别工具函数 (cn 等)
│
├── types/                        # TypeScript 类型
│   ├── oracle/                   # 预言机类型
│   │   ├── enums.ts
│   │   ├── oracle.ts
│   │   ├── price.ts
│   │   ├── config.ts
│   │   ├── snapshot.ts
│   │   ├── publisher.ts
│   │   ├── constants.ts
│   │   ├── snapshotFunctions.ts
│   │   └── index.ts
│   ├── api/                      # API 类型
│   │   ├── requests.ts
│   │   └── index.ts
│   ├── ui/                       # UI 类型
│   │   ├── layout.ts
│   │   ├── theme.ts
│   │   ├── components.ts
│   │   ├── charts.ts
│   │   └── index.ts
│   ├── auth/                     # 认证类型
│   │   └── index.ts
│   ├── common/                   # 通用类型
│   │   ├── timestamps.ts
│   │   ├── pagination.ts
│   │   └── index.ts
│   ├── risk.ts                   # 风险类型
│   ├── index.ts                  # 统一导出
│   └── jspdf-autotable.d.ts      # jspdf-autotable 类型声明
│
├── stores/                       # Zustand 状态管理
│   ├── index.ts                  # 统一导出
│   ├── authStore.ts              # 认证状态
│   ├── uiStore.ts                # UI 状态
│   ├── realtimeStore.ts          # 实时数据状态
│   ├── crossChainStore.ts        # 跨链分析状态
│   └── selectors.ts              # 公共选择器
│
├── providers/                    # React Providers
│   └── ReactQueryProvider.tsx
│
├── i18n/                         # 国际化
│   ├── messages/                 # 翻译文件
│   ├── request.ts                # i18n 请求配置
│   ├── routing.ts                # 路由配置
│   ├── config.ts                 # i18n 配置
│   ├── types.ts                  # i18n 类型
│   ├── index.ts
│   └── generated-types.ts        # 生成的类型
│
└── utils/                        # 通用工具（根级别）
    └── __tests__/
```

### 2.2 设计模式

#### 2.2.1 工厂模式 - Oracle Client

```typescript
// lib/oracles/factory.ts
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
    // 优先从 DI 容器获取
    if (container.has(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY)) {
      const factory = container.resolve<IOracleClientFactory>(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
      const client = factory.getClient(provider);
      if (client instanceof BaseOracleClient) {
        return client;
      }
    }

    if (!this.instances.has(provider)) {
      this.instances.set(provider, this.createClient(provider));
    }
    const client = this.instances.get(provider);
    if (!client) {
      throw new OracleClientError(`Failed to create oracle client for provider: ${provider}`, {
        provider,
      });
    }
    return client;
  }

  static getClientFromDI(provider: OracleProvider): IOracleClient | null {
    if (container.has(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY)) {
      const factory = container.resolve<IOracleClientFactory>(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
      return factory.getClient(provider);
    }
    return null;
  }

  static getAllClients(): Record<OracleProvider, BaseOracleClient> {
    // 支持从 DI 获取所有客户端
    if (container.has(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY)) {
      const factory = container.resolve<IOracleClientFactory>(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
      const clients = factory.getAllClients();
      const result: Partial<Record<OracleProvider, BaseOracleClient>> = {};
      for (const [key, client] of Object.entries(clients)) {
        if (client instanceof BaseOracleClient) {
          result[key as OracleProvider] = client;
        }
      }
      return result as Record<OracleProvider, BaseOracleClient>;
    }
    // 默认实现...
  }

  static clearInstances(): void {
    if (container.has(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY)) {
      const factory = container.resolve<IOracleClientFactory>(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
      factory.clearInstances();
    }
    this.instances.clear();
  }

  static hasClient(provider: OracleProvider): boolean {
    if (container.has(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY)) {
      const factory = container.resolve<IOracleClientFactory>(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
      return factory.hasClient(provider);
    }
    return this.instances.has(provider);
  }

  static registerMockFactory(mockFactory: IOracleClientFactory): void {
    container.register<IOracleClientFactory>(
      SERVICE_TOKENS.ORACLE_CLIENT_FACTORY,
      () => mockFactory,
      true
    );
  }

  static unregisterMockFactory(): void {
    container.unregister(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
  }

  static isUsingDI(): boolean {
    return container.has(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
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
        throw new ValidationError(`Unknown oracle provider: ${provider}`, {
          value: provider,
        });
    }
  }
}
```

#### 2.2.2 依赖注入

```typescript
// lib/di/Container.ts
import { ContainerInterface, ServiceFactory, ServiceDescriptor } from './types';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('DIContainer');

export class Container implements ContainerInterface {
  private services: Map<string, ServiceDescriptor> = new Map();
  private static instance: Container | null = null;

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  register<T>(token: string, factory: ServiceFactory<T>, singleton: boolean = true): void {
    if (this.services.has(token)) {
      logger.warn(`Service "${token}" is already registered. Overwriting.`);
    }

    this.services.set(token, {
      factory,
      singleton,
    });

    logger.debug(`Service "${token}" registered (singleton: ${singleton})`);
  }

  resolve<T>(token: string): T {
    const descriptor = this.services.get(token);

    if (!descriptor) {
      throw new Error(`Service "${token}" not found. Did you forget to register it?`);
    }

    if (descriptor.singleton) {
      if (descriptor.instance === undefined) {
        descriptor.instance = descriptor.factory() as T;
        logger.debug(`Service "${token}" instantiated (singleton)`);
      }
      return descriptor.instance as T;
    }

    return descriptor.factory() as T;
  }

  has(token: string): boolean {
    return this.services.has(token);
  }

  clear(): void {
    this.services.clear();
    logger.debug('All services cleared');
  }

  unregister(token: string): boolean {
    const result = this.services.delete(token);
    if (result) {
      logger.debug(`Service "${token}" unregistered`);
    }
    return result;
  }

  getRegisteredTokens(): string[] {
    return Array.from(this.services.keys());
  }
}

export const container = Container.getInstance();
```

#### 2.2.3 抽象基类

```typescript
// lib/oracles/base.ts
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData, OracleError } from '@/types/oracle';
import {
  shouldUseDatabase,
  savePriceToDatabase,
  savePricesToDatabase,
  getPriceFromDatabase,
  getHistoricalPricesFromDatabase,
  configureStorage,
  getStorageConfig,
} from './storage';
import type { OracleStorageConfig } from './storage';
import { PriceFetchError, OracleClientError } from '@/lib/errors';

export { shouldUseDatabase, configureStorage, getStorageConfig };
export type { OracleStorageConfig };

export interface OracleClientConfig {
  useDatabase?: boolean;
  fallbackToMock?: boolean;
}

const DEFAULT_CLIENT_CONFIG: OracleClientConfig = {
  useDatabase: true,
  fallbackToMock: true,
};

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
    const chainVolatility: Record<Blockchain, number> = {
      [Blockchain.ETHEREUM]: 0.02,
      [Blockchain.ARBITRUM]: 0.018,
      [Blockchain.OPTIMISM]: 0.022,
      [Blockchain.POLYGON]: 0.025,
      [Blockchain.SOLANA]: 0.03,
      // ... 其他链的波动率配置
    };
    const volatility =
      chain && chainVolatility[chain] !== undefined ? chainVolatility[chain] : 0.02;
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    const price = basePrice * (1 + randomChange);

    // Generate 24h change data (-5% to +5% range)
    const change24hPercent = (Math.random() - 0.5) * 10;
    const change24h = basePrice * (change24hPercent / 100);

    return {
      provider: this.name,
      chain,
      symbol,
      price: Number(price.toFixed(4)),
      timestamp: timestamp || Date.now(),
      decimals: 8,
      confidence: 0.95 + Math.random() * 0.05,
      change24h: Number(change24h.toFixed(4)),
      change24hPercent: Number(change24hPercent.toFixed(2)),
    };
  }

  protected generateMockHistoricalPrices(
    symbol: string,
    basePrice: number,
    chain?: Blockchain,
    period: number = 24
  ): PriceData[] {
    const prices: PriceData[] = [];
    const now = Date.now();
    const dataPoints = period * 4;
    const interval = (period * 60 * 60 * 1000) / dataPoints;

    // 随机选择趋势方向：-1 下跌, 0 震荡, 1 上涨
    const trendDirection = Math.random() > 0.6 ? 1 : Math.random() > 0.6 ? -1 : 0;
    const trendStrength = 0.0003 * trendDirection;

    // 使用随机游走模型生成价格序列
    let currentPrice = basePrice * (0.95 + Math.random() * 0.1);

    for (let i = 0; i < dataPoints; i++) {
      const timestamp = now - (dataPoints - 1 - i) * interval;
      const randomWalk = (Math.random() - 0.5) * 2 * volatility;
      const trendComponent = trendStrength * (1 + Math.sin((i / dataPoints) * Math.PI) * 0.5);

      currentPrice = currentPrice * (1 + randomWalk + trendComponent);

      // 边界检查：确保价格在合理范围内（基准价格的 ±20%）
      const maxPrice = basePrice * 1.2;
      const minPrice = basePrice * 0.8;
      currentPrice = Math.max(minPrice, Math.min(maxPrice, currentPrice));

      // 计算 24h 变化（基于基准价格）
      const change24hPercent = ((currentPrice - basePrice) / basePrice) * 100;
      const change24h = currentPrice - basePrice;

      prices.push({
        provider: this.name,
        chain,
        symbol,
        price: Number(currentPrice.toFixed(4)),
        timestamp,
        decimals: 8,
        confidence: 0.95 + Math.random() * 0.05,
        change24h: Number(change24h.toFixed(4)),
        change24hPercent: Number(change24hPercent.toFixed(2)),
      });
    }

    return prices;
  }

  async fetchPriceWithDatabase(
    symbol: string,
    chain: Blockchain | undefined,
    mockGenerator: () => PriceData
  ): Promise<PriceData> {
    try {
      if (this.config.useDatabase && shouldUseDatabase()) {
        const dbPrice = await getPriceFromDatabase(this.name, symbol, chain);
        if (dbPrice) {
          return dbPrice;
        }
      }

      const priceData = mockGenerator();

      if (this.config.useDatabase && shouldUseDatabase()) {
        await savePriceToDatabase(priceData);
      }

      return priceData;
    } catch (error) {
      if (error instanceof PriceFetchError || error instanceof OracleClientError) {
        throw error;
      }
      throw new PriceFetchError(
        `Failed to fetch price for ${symbol} from ${this.name}`,
        {
          provider: this.name,
          symbol,
          chain,
          retryable: true,
        },
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async fetchHistoricalPricesWithDatabase(
    symbol: string,
    chain: Blockchain | undefined,
    period: number,
    mockGenerator: () => PriceData[]
  ): Promise<PriceData[]> {
    try {
      if (this.config.useDatabase && shouldUseDatabase()) {
        const dbPrices = await getHistoricalPricesFromDatabase(this.name, symbol, chain, period);
        if (dbPrices && dbPrices.length > 0) {
          return dbPrices;
        }
      }

      const pricesData = mockGenerator();

      if (this.config.useDatabase && shouldUseDatabase()) {
        await savePricesToDatabase(pricesData);
      }

      return pricesData;
    } catch (error) {
      if (error instanceof PriceFetchError || error instanceof OracleClientError) {
        throw error;
      }
      throw new PriceFetchError(
        `Failed to fetch historical prices for ${symbol} from ${this.name}`,
        {
          provider: this.name,
          symbol,
          chain,
          timestamp: Date.now(),
          retryable: true,
        },
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }
}
```

---

## 3. TypeScript 规范

### 3.1 严格模式配置

项目启用 TypeScript Strict Mode，必须遵守：

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 3.2 类型定义规范

#### 3.2.1 使用 interface 定义对象形状

```typescript
// ✅ 正确
interface PriceData {
  provider: OracleProvider;
  symbol: string;
  price: number;
  timestamp: number;
  confidence?: number;
}

// ❌ 避免
 type PriceData = {
  provider: OracleProvider;
  // ...
};
```

#### 3.2.2 使用 type 定义联合类型和交叉类型

```typescript
// ✅ 正确
type ExportFormat = 'csv' | 'json' | 'excel';
type TimeRange = '1H' | '24H' | '7D' | '30D';
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// 交叉类型
type PriceWithMetadata = PriceData & {
  metadata: PriceMetadata;
};
```

#### 3.2.3 避免使用 any

```typescript
// ❌ 禁止
function processData(data: any): any {
  return data.value;
}

// ✅ 正确 - 使用 unknown + 类型守卫
function processData(data: unknown): number {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    const value = (data as { value: unknown }).value;
    if (typeof value === 'number') {
      return value;
    }
  }
  throw new Error('Invalid data format');
}

// ✅ 正确 - 使用泛型
function processData<T extends { value: number }>(data: T): number {
  return data.value;
}
```

### 3.3 枚举定义

```typescript
// ✅ 使用 const enum 提高性能
export const enum OracleProvider {
  CHAINLINK = 'chainlink',
  BAND_PROTOCOL = 'band-protocol',
  UMA = 'uma',
  PYTH = 'pyth',
  API3 = 'api3',
  REDSTONE = 'redstone',
  DIA = 'dia',
  TELLOR = 'tellor',
  CHRONICLE = 'chronicle',
  WINKLINK = 'winklink',
}

export const enum Blockchain {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  SOLANA = 'solana',
  AVALANCHE = 'avalanche',
  FANTOM = 'fantom',
  CRONOS = 'cronos',
  JUNO = 'juno',
  COSMOS = 'cosmos',
  OSMOSIS = 'osmosis',
  BNB_CHAIN = 'bnb-chain',
  BASE = 'base',
  SCROLL = 'scroll',
  ZKSYNC = 'zksync',
  APTOS = 'aptos',
  SUI = 'sui',
  GNOSIS = 'gnosis',
  MANTLE = 'mantle',
  LINEA = 'linea',
  CELESTIA = 'celestia',
  INJECTIVE = 'injective',
  SEI = 'sei',
  TRON = 'tron',
  TON = 'ton',
  NEAR = 'near',
  AURORA = 'aurora',
  CELO = 'celo',
  STARKNET = 'starknet',
  BLAST = 'blast',
  CARDANO = 'cardano',
  POLKADOT = 'polkadot',
  KAVA = 'kava',
  MOONBEAM = 'moonbeam',
  STARKEX = 'starkex',
}

// 别名导出
export const BINANCE = Blockchain.BNB_CHAIN;

// 值数组导出
export const ORACLE_PROVIDER_VALUES: readonly OracleProvider[] = [
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
] as const;

export const BLOCKCHAIN_VALUES: readonly Blockchain[] = [
  Blockchain.ETHEREUM,
  Blockchain.ARBITRUM,
  Blockchain.OPTIMISM,
  Blockchain.POLYGON,
  Blockchain.SOLANA,
  Blockchain.AVALANCHE,
  Blockchain.FANTOM,
  Blockchain.CRONOS,
  Blockchain.JUNO,
  Blockchain.COSMOS,
  Blockchain.OSMOSIS,
  Blockchain.BNB_CHAIN,
  Blockchain.BASE,
  Blockchain.SCROLL,
  Blockchain.ZKSYNC,
  Blockchain.APTOS,
  Blockchain.SUI,
  Blockchain.GNOSIS,
  Blockchain.MANTLE,
  Blockchain.LINEA,
  Blockchain.CELESTIA,
  Blockchain.INJECTIVE,
  Blockchain.SEI,
  Blockchain.TRON,
  Blockchain.TON,
  Blockchain.NEAR,
  Blockchain.AURORA,
  Blockchain.CELO,
  Blockchain.STARKNET,
  Blockchain.BLAST,
  Blockchain.CARDANO,
  Blockchain.POLKADOT,
  Blockchain.KAVA,
  Blockchain.MOONBEAM,
  Blockchain.STARKEX,
] as const;
```

### 3.4 泛型使用

```typescript
// ✅ 组件 Props 泛型
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
}

// ✅ API 响应泛型
interface ApiResponse<T> {
  data: T;
  timestamp: number;
  status: 'success' | 'error';
}

// ✅ Hook 返回类型
type UseQueryResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};
```

### 3.5 类型守卫

```typescript
// ✅ 类型守卫函数
function isPriceData(value: unknown): value is PriceData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'provider' in value &&
    'symbol' in value &&
    'price' in value &&
    'timestamp' in value
  );
}

// ✅ 使用类型守卫
function processPrice(value: unknown): PriceData {
  if (isPriceData(value)) {
    return value; // TypeScript 知道这是 PriceData
  }
  throw new Error('Invalid price data');
}
```

---

## 4. React 组件规范

### 4.0 UI 组件库

项目使用自定义 UI 组件库，位于 `components/ui/` 目录：

```
components/ui/
├── index.ts                    # 统一导出
├── selectors/                  # 选择器组件子目录
│   ├── SegmentedControl.tsx
│   ├── DropdownSelect.tsx
│   └── MultiSelect.tsx
│
# 基础组件
├── Card.tsx                    # 卡片组件（含 CardHeader, CardTitle, CardDescription, CardContent, CardFooter, StatCard）
├── Button.tsx                  # 按钮组件（含 Button, IconButton）
├── Input.tsx                   # 输入框组件
├── Select.tsx                  # 选择框组件
├── Checkbox.tsx                # 复选框组件（含 Checkbox, CheckboxGroup）
├── Radio.tsx                   # 单选框组件（含 Radio, RadioGroup）
├── Textarea.tsx                # 文本域组件
├── FormLabel.tsx               # 表单标签组件
├── FormError.tsx               # 表单错误组件
├── Tooltip.tsx                 # 工具提示组件
├── Badge.tsx                   # 徽章组件
├── Breadcrumb.tsx              # 面包屑组件
│
# 动画组件
├── FadeIn.tsx                  # 淡入动画（含 FadeIn, StaggerContainer, StaggerItem）
├── SlideUp.tsx                 # 上滑动画（含 SlideUp, SlideIn）
│
# 加载状态组件
├── Skeleton.tsx                # 骨架屏（含 Skeleton, SkeletonText, SkeletonCard）
├── Spinner.tsx                 # 加载 spinner（含 Spinner, LoadingOverlay）
├── ChartSkeleton.tsx           # 图表骨架屏（含 ChartSkeleton, MiniChartSkeleton, MetricCardSkeleton, HeroSkeleton, LivePriceTickerSkeleton, BentoGridSkeleton, CTASkeleton）
├── LoadingProgress.tsx         # 加载进度条（含 ProgressBar, DataLoadingProgress）
│
# 状态展示组件
├── EmptyState.tsx              # 空状态组件
├── EmptyStateEnhanced.tsx      # 增强空状态组件
├── ErrorState.tsx              # 错误状态组件
├── ErrorDisplay.tsx            # 错误展示组件
├── LiveStatusBar.tsx           # 实时状态栏组件
│
# 图标组件
├── Icon.tsx                    # 图标组件（含 Icon, IconWrapper）
│
# 图表组件
├── ChartToolbar.tsx            # 图表工具栏组件
├── SparklineChart.tsx          # 迷你图表组件
│
# 数据展示组件
├── DataTablePro.tsx            # 高级数据表格组件
├── CompactStatCard.tsx         # 紧凑统计卡片
├── EnhancedStatCard.tsx        # 增强统计卡片
│
# 反馈组件
├── Toast.tsx                   # Toast 通知组件（含 ToastProvider）
```

### 4.1 组件文件结构

```typescript
// components/oracle/PriceCard.tsx

// 1. 导入（按类型分组）
import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { usePriceData } from '@/hooks/usePriceData';
import type { PriceData } from '@/types/oracle';

// 2. Props 接口定义
interface PriceCardProps {
  symbol: string;
  provider: OracleProvider;
  showChange?: boolean;
  onClick?: (data: PriceData) => void;
}

// 3. 组件实现
export function PriceCard({
  symbol,
  provider,
  showChange = true,
  onClick,
}: PriceCardProps) {
  // 4. Hooks
  const { data, isLoading } = usePriceData(provider, symbol);
  const [isExpanded, setIsExpanded] = useState(false);

  // 5. 回调函数
  const handleClick = useCallback(() => {
    if (data && onClick) {
      onClick(data);
    }
  }, [data, onClick]);

  // 6. 渲染
  if (isLoading) {
    return <PriceCardSkeleton />;
  }

  return (
    <Card onClick={handleClick}>
      {/* ... */}
    </Card>
  );
}

// 7. 默认导出（可选）
export default PriceCard;
```

### 4.2 Server Components vs Client Components

#### Server Components（默认）

```typescript
// ✅ Server Component - 用于静态内容、数据获取
import { OracleClientFactory } from '@/lib/oracles/factory';

export default async function OraclePage({
  params,
}: {
  params: { locale: string };
}) {
  const client = OracleClientFactory.getClient(OracleProvider.CHAINLINK);
  const price = await client.getPrice('BTC');

  return (
    <div>
      <h1>Oracle Data</h1>
      <PriceDisplay data={price} />
    </div>
  );
}
```

#### Client Components

```typescript
// ✅ Client Component - 用于交互式组件
'use client';

import { useState, useEffect } from 'react';

export function InteractiveChart({ symbol }: { symbol: string }) {
  const [data, setData] = useState<ChartData[]>([]);

  useEffect(() => {
    // 客户端数据获取
  }, [symbol]);

  return <Chart data={data} />;
}
```

### 4.3 Props 命名和类型

```typescript
// ✅ Props 接口命名
interface ButtonProps { }
interface PriceChartProps { }
interface OracleComparisonSectionProps { }

// ✅ Props 解构
function Button({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
}: ButtonProps) {
  // ...
}

// ✅ 使用 React.ComponentProps 扩展
interface IconButtonProps extends React.ComponentProps<'button'> {
  icon: React.ReactNode;
  iconPosition?: 'left' | 'right';
}
```

### 4.4 事件处理

```typescript
// ✅ 事件处理器命名
// 使用 handle + EventName 命名
function PriceCard({ onPriceUpdate }: PriceCardProps) {
  const handleClick = useCallback(() => {
    // ...
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // ...
  }, []);

  const handlePriceChange = useCallback((newPrice: number) => {
    // ...
  }, []);

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      {/* ... */}
    </div>
  );
}
```

### 4.5 Ref 转发

```typescript
// ✅ 使用 React.forwardRef
import { forwardRef } from 'react';

interface InputProps extends React.ComponentProps<'input'> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ...props }, ref) => {
    return (
      <div>
        <label>{label}</label>
        <input ref={ref} {...props} />
        {error && <span className="error">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

### 4.6 组件组合模式

```typescript
// ✅ Compound Component 模式
import { createContext, useContext } from 'react';

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({ children, defaultValue }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="tabs-list" role="tablist">{children}</div>;
}

export function TabsTrigger({ value, children }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  return (
    <button
      role="tab"
      aria-selected={context.activeTab === value}
      onClick={() => context.setActiveTab(value)}
    >
      {children}
    </button>
  );
}

// 使用
<Tabs defaultValue="prices">
  <TabsList>
    <TabsTrigger value="prices">Prices</TabsTrigger>
    <TabsTrigger value="charts">Charts</TabsTrigger>
  </TabsList>
</Tabs>
```

---

## 5. 状态管理规范

### 5.1 React Query 规范

#### Query Keys 管理

```typescript
// lib/queries/queryKeys.ts
export const oracleKeys = {
  all: ['oracles'] as const,
  lists: () => [...oracleKeys.all, 'list'] as const,
  list: (params: { provider?: string; symbols?: string[]; chain?: string }) =>
    [...oracleKeys.lists(), params] as const,
  details: () => [...oracleKeys.all, 'detail'] as const,
  detail: (provider: string) => [...oracleKeys.details(), provider] as const,
};

export const priceKeys = {
  all: ['prices'] as const,
  lists: () => [...priceKeys.all, 'list'] as const,
  list: (params: { provider?: string; symbols?: string[]; chain?: string }) =>
    [...priceKeys.lists(), params] as const,
  histories: () => [...priceKeys.all, 'history'] as const,
  history: (params: { symbol: string; provider?: string; chain?: string; period?: number }) =>
    [...priceKeys.histories(), params] as const,
};

export const networkKeys = {
  all: ['network'] as const,
  status: () => [...networkKeys.all, 'status'] as const,
  stats: () => [...networkKeys.all, 'stats'] as const,
};

export const favoritesKeys = {
  all: ['favorites'] as const,
  list: (userId: string) => [...favoritesKeys.all, userId] as const,
  byType: (userId: string, configType: string) =>
    [...favoritesKeys.list(userId), configType] as const,
};

export const alertsKeys = {
  all: ['alerts'] as const,
  list: (userId: string) => [...alertsKeys.all, userId] as const,
  events: (userId: string) => [...alertsKeys.all, 'events', userId] as const,
};

export const api3Keys = {
  all: ['api3'] as const,
  price: (symbol: string, chain?: string) =>
    [...api3Keys.all, 'price', symbol, chain ?? 'default'] as const,
  historical: (symbol: string, timeRange: string, chain?: string) =>
    [...api3Keys.all, 'historical', symbol, timeRange, chain ?? 'default'] as const,
  dapiCoverage: () => [...api3Keys.all, 'dapi-coverage'] as const,
  stakingData: () => [...api3Keys.all, 'staking-data'] as const,
  airnodeStats: () => [...api3Keys.all, 'airnode-stats'] as const,
  qualityMetrics: () => [...api3Keys.all, 'quality-metrics'] as const,
  latencyDistribution: () => [...api3Keys.all, 'latency-distribution'] as const,
};

export const queryKeys = {
  oracle: oracleKeys,
  price: priceKeys,
  network: networkKeys,
  favorites: favoritesKeys,
  alerts: alertsKeys,
  api3: api3Keys,
} as const;

export type OracleListParams = Parameters<typeof oracleKeys.list>[0];
export type PriceHistoryParams = Parameters<typeof priceKeys.history>[0];
export type PriceListParams = Parameters<typeof priceKeys.list>[0];
```

#### Query Hooks

```typescript
// hooks/queries/useOraclePrices.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/queryKeys';

export function useOraclePrice(
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain
) {
  return useQuery({
    queryKey: queryKeys.oracles.price(provider, symbol, chain),
    queryFn: () => fetchOraclePrice(provider, symbol, chain),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });
}

export function useRefreshOraclePrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: refreshPrice,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.oracles.price(
          variables.provider,
          variables.symbol,
          variables.chain
        ),
      });
    },
  });
}
```

### 5.2 Zustand Store 规范

#### 5.2.1 Cross Chain Store

```typescript
// stores/crossChainStore.ts
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { OracleProvider, Blockchain, PriceData } from '@/lib/oracles';

interface SelectorState {
  selectedProvider: OracleProvider;
  selectedSymbol: string;
  selectedTimeRange: number;
  selectedBaseChain: Blockchain | null;
}

interface UIState {
  visibleChains: Blockchain[];
  showMA: boolean;
  maPeriod: number;
  chartKey: number;
  hiddenLines: Set<string>;
  focusedChain: Blockchain | null;
  tableFilter: 'all' | 'abnormal' | 'normal';
  hoveredCell: { xChain: Blockchain; yChain: Blockchain; x: number; y: number } | null;
  selectedCell: { xChain: Blockchain; yChain: Blockchain } | null;
  tooltipPosition: { x: number; y: number };
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
}

interface DataState {
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  loading: boolean;
  refreshStatus: 'idle' | 'refreshing' | 'success' | 'error';
  showRefreshSuccess: boolean;
  lastUpdated: Date | null;
  prevStats: {
    avgPrice: number;
    maxPrice: number;
    minPrice: number;
    priceRange: number;
    standardDeviationPercent: number;
  } | null;
  recommendedBaseChain: Blockchain | null;
}

interface ConfigState {
  refreshInterval: number;
  thresholdConfig: ThresholdConfig;
  colorblindMode: boolean;
}

interface CrossChainStore extends SelectorState, UIState, DataState, ConfigState {
  // Selectors Actions
  setSelectedProvider: (provider: OracleProvider) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeRange: (range: number) => void;
  setSelectedBaseChain: (chain: Blockchain | null) => void;

  // UI Actions
  setVisibleChains: (chains: Blockchain[]) => void;
  setShowMA: (show: boolean) => void;
  setMaPeriod: (period: number) => void;
  setChartKey: (key: number) => void;
  setHiddenLines: (lines: Set<string>) => void;
  setFocusedChain: (chain: Blockchain | null) => void;
  setTableFilter: (filter: 'all' | 'abnormal' | 'normal') => void;
  setHoveredCell: (cell: { xChain: Blockchain; yChain: Blockchain; x: number; y: number } | null) => void;
  setSelectedCell: (cell: { xChain: Blockchain; yChain: Blockchain } | null) => void;
  setTooltipPosition: (position: { x: number; y: number }) => void;
  setSortColumn: (column: string) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;

  // Data Actions
  setCurrentPrices: (prices: PriceData[]) => void;
  setHistoricalPrices: (prices: Partial<Record<Blockchain, PriceData[]>>) => void;
  setLoading: (loading: boolean) => void;
  setRefreshStatus: (status: 'idle' | 'refreshing' | 'success' | 'error') => void;
  setShowRefreshSuccess: (show: boolean) => void;
  setLastUpdated: (date: Date | null) => void;
  setPrevStats: (stats: DataState['prevStats']) => void;
  setRecommendedBaseChain: (chain: Blockchain | null) => void;

  // Config Actions
  setRefreshInterval: (interval: number) => void;
  setThresholdConfig: (config: ThresholdConfig) => void;
  setColorblindMode: (enabled: boolean) => void;

  // Utility Actions
  toggleChain: (chain: Blockchain) => void;
  handleSort: (column: string) => void;
}

const initialState: SelectorState & UIState & DataState & ConfigState = {
  selectedProvider: OracleProvider.CHAINLINK,
  selectedSymbol: 'BTC',
  selectedTimeRange: 24,
  selectedBaseChain: null,

  visibleChains: [],
  showMA: false,
  maPeriod: 7,
  chartKey: 0,
  hiddenLines: new Set(),
  focusedChain: null,
  tableFilter: 'all',
  hoveredCell: null,
  selectedCell: null,
  tooltipPosition: { x: 0, y: 0 },
  sortColumn: 'chain',
  sortDirection: 'asc',

  currentPrices: [],
  historicalPrices: {},
  loading: true,
  refreshStatus: 'idle',
  showRefreshSuccess: false,
  lastUpdated: null,
  prevStats: null,
  recommendedBaseChain: null,

  refreshInterval: 0,
  thresholdConfig: defaultThresholdConfig,
  colorblindMode: false,
};

export const useCrossChainStore = create<CrossChainStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        setSelectedProvider: (provider) => set({ selectedProvider: provider }),
        setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
        setSelectedTimeRange: (range) => set({ selectedTimeRange: range }),
        setSelectedBaseChain: (chain) => set({ selectedBaseChain: chain }),

        setVisibleChains: (chains) => set({ visibleChains: chains }),
        setShowMA: (show) => set({ showMA: show }),
        setMaPeriod: (period) => set({ maPeriod: period }),
        setChartKey: (key) => set({ chartKey: key }),
        setHiddenLines: (lines) => set({ hiddenLines: lines }),
        setFocusedChain: (chain) => set({ focusedChain: chain }),
        setTableFilter: (filter) => set({ tableFilter: filter }),
        setHoveredCell: (cell) => set({ hoveredCell: cell }),
        setSelectedCell: (cell) => set({ selectedCell: cell }),
        setTooltipPosition: (position) => set({ tooltipPosition: position }),
        setSortColumn: (column) => set({ sortColumn: column }),
        setSortDirection: (direction) => set({ sortDirection: direction }),

        setCurrentPrices: (prices) => set({ currentPrices: prices }),
        setHistoricalPrices: (prices) => set({ historicalPrices: prices }),
        setLoading: (loading) => set({ loading }),
        setRefreshStatus: (status) => set({ refreshStatus: status }),
        setShowRefreshSuccess: (show) => set({ showRefreshSuccess: show }),
        setLastUpdated: (date) => set({ lastUpdated: date }),
        setPrevStats: (stats) => set({ prevStats: stats }),
        setRecommendedBaseChain: (chain) => set({ recommendedBaseChain: chain }),

        setRefreshInterval: (interval) => set({ refreshInterval: interval }),
        setThresholdConfig: (config) => set({ thresholdConfig: config }),
        setColorblindMode: (enabled) => set({ colorblindMode: enabled }),

        toggleChain: (chain) => {
          const { visibleChains } = get();
          if (visibleChains.includes(chain)) {
            set({ visibleChains: visibleChains.filter((c) => c !== chain) });
          } else {
            set({ visibleChains: [...visibleChains, chain] });
          }
        },

        handleSort: (column) => {
          const { sortColumn, sortDirection } = get();
          if (sortColumn === column) {
            set({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' });
          } else {
            set({ sortColumn: column, sortDirection: 'asc' });
          }
        },
      }),
      {
        name: 'cross-chain-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          selectedProvider: state.selectedProvider,
          selectedSymbol: state.selectedSymbol,
          selectedTimeRange: state.selectedTimeRange,
          refreshInterval: state.refreshInterval,
          thresholdConfig: state.thresholdConfig,
          colorblindMode: state.colorblindMode,
          showMA: state.showMA,
          maPeriod: state.maPeriod,
          tableFilter: state.tableFilter,
          sortColumn: state.sortColumn,
          sortDirection: state.sortDirection,
        }),
      }
    ),
    { name: 'CrossChainStore' }
  )
);

// 选择器 Hooks
export const useSelectedProvider = () => useCrossChainStore((state) => state.selectedProvider);
export const useSelectedSymbol = () => useCrossChainStore((state) => state.selectedSymbol);
export const useVisibleChains = () => useCrossChainStore((state) => state.visibleChains);
export const useLoading = () => useCrossChainStore((state) => state.loading);
// ... 更多选择器
```

#### 5.2.2 Store 文件结构

```
src/stores/
├── index.ts              # 统一导出
├── authStore.ts          # 认证状态
├── uiStore.ts            # UI 状态
├── realtimeStore.ts      # 实时数据状态
├── crossChainStore.ts    # 跨链分析状态
└── selectors.ts          # 公共选择器
```

### 5.3 Context 使用规范

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useState, useCallback } from 'react';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await authService.signIn(email, password);
      setUser(user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
  }, []);

  const value = {
    user,
    isLoading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

// Custom hook for consuming context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## 6. 样式和 CSS 规范

### 6.1 圆角使用规范

项目采用专业的微小圆角设计系统，保持专业感与现代感的平衡。

#### 圆角值标准

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--radius-none` | 0 | 数据表格、分割线 |
| `--radius-sm` | 0.25rem (4px) | 小按钮、标签、状态指示器 |
| `--radius-md` | 0.375rem (6px) | 标准按钮、输入框 |
| `--radius-lg` | 0.5rem (8px) | 卡片、面板、模态框 |
| `--radius-xl` | 0.75rem (12px) | 大卡片、弹窗 |
| `--radius-2xl` | 1rem (16px) | 特殊容器 |
| `--radius-full` | 9999px | 圆形元素（头像、徽章） |

#### 组件圆角应用规范

```typescript
// ✅ 按钮使用 --radius-md (6px)
<button className="rounded-md ...">Click me</button>

// ✅ 卡片使用 --radius-lg (8px)
<div className="rounded-lg ...">Card content</div>

// ✅ 输入框使用 --radius-md (6px)
<input className="rounded-md ..." />

// ✅ 表格容器使用 --radius-lg (8px)，内部无圆角
<div className="rounded-lg overflow-hidden">
  <table className="rounded-none">...</table>
</div>

// ✅ 徽章/标签使用 --radius-full (完全圆角)
<span className="rounded-full ...">Badge</span>

// ✅ 模态框/弹窗使用 --radius-xl (12px)
<div className="rounded-xl ...">Modal content</div>
```

#### 设计原则

- **保持克制**：圆角值不超过 12px（除圆形元素外）
- **层次分明**：交互元素使用较小圆角，容器使用较大圆角
- **统一协调**：同一类组件使用相同的圆角值
- **专业感**：避免过大的圆角导致"卡通感"

### 6.2 Tailwind CSS 使用规范

#### 类名顺序

```typescript
// ✅ 按以下顺序组织 Tailwind 类名：
// 1. 布局 (display, position, flex, grid)
// 2. 尺寸 (width, height, padding, margin)
// 3. 背景 (background-color, background-image)
// 4. 边框 (border, border-radius)
// 5. 文字 (font-size, font-weight, color)
// 6. 效果 (shadow, opacity, transition)
// 7. 交互 (hover, focus, active)
// 8. 响应式 (sm:, md:, lg:)

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        /* 布局 */
        flex flex-col
        /* 尺寸 */
        w-full p-4
        /* 背景 */
        bg-white
        /* 边框 */
        rounded-lg border border-gray-200
        /* 文字 */
        text-sm text-gray-900
        /* 效果 */
        shadow-sm transition-all duration-200
        /* 交互 */
        hover:border-gray-300 hover:shadow-md
        /* 响应式 */
        sm:p-6 md:p-8
      "
    >
      {children}
    </div>
  );
}
```

#### 使用 clsx 和 tailwind-merge

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ✅ 工具函数
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ✅ 使用示例
function Button({
  variant = 'primary',
  size = 'medium',
  className,
  children,
}: ButtonProps) {
  return (
    <button
      className={cn(
        // 基础样式 - 使用 rounded-md (6px) 保持专业感
        'inline-flex items-center justify-center font-medium rounded-md transition-all',
        // 变体样式
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
        variant === 'secondary' && 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300',
        variant === 'ghost' && 'bg-transparent text-gray-600 hover:bg-gray-100',
        // 尺寸样式
        size === 'small' && 'px-3 py-1.5 text-sm',
        size === 'medium' && 'px-4 py-2 text-base',
        size === 'large' && 'px-6 py-3 text-lg',
        // 外部传入的类名
        className
      )}
    >
      {children}
    </button>
  );
}
```

### 6.2 CSS 变量使用

```typescript
// globals.css 中定义的变量
:root {
  /* 品牌色 */
  --finance-primary: #1e40af;
  --finance-secondary: #3b82f6;
  --finance-accent: #60a5fa;

  /* 状态色 */
  --finance-success: #10b981;
  --finance-warning: #f59e0b;
  --finance-danger: #ef4444;
  --finance-neutral: #64748b;

  /* 背景 */
  --bg-insight: #fafafa;
  --border-insight-separator: #e5e7eb;
}

// ✅ 组件中使用 - 徽章使用 rounded-full 完全圆角
function StatusBadge({ status }: { status: 'success' | 'warning' | 'error' }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full"
      style={{
        backgroundColor:
          status === 'success'
            ? 'var(--finance-success-light)'
            : status === 'warning'
              ? 'var(--finance-warning-light)'
              : 'var(--finance-danger-light)',
        color:
          status === 'success'
            ? 'var(--finance-success)'
            : status === 'warning'
              ? 'var(--finance-warning)'
              : 'var(--finance-danger)',
      }}
    >
      {status}
    </span>
  );
}
```

### 6.3 响应式设计

```typescript
// ✅ 移动优先设计 - 表格容器使用 rounded-lg，内部表格无圆角
function PriceTable({ data }: { data: PriceData[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full rounded-none">
        <thead>
          <tr className="hidden md:table-row">
            {/* 桌面端显示所有列 */}
            <th className="text-left">Symbol</th>
            <th className="text-right">Price</th>
            <th className="text-right">24h Change</th>
            <th className="text-right">Volume</th>
          </tr>
          <tr className="md:hidden">
            {/* 移动端简化 */}
            <th className="text-left">Asset</th>
            <th className="text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.symbol}>
              <td className="flex items-center gap-2">
                <span className="font-medium">{item.symbol}</span>
                <span className="hidden text-sm text-gray-500 sm:inline">
                  {item.name}
                </span>
              </td>
              <td className="text-right font-tabular">${item.price}</td>
              <td className="hidden text-right md:table-cell">
                {item.change24h}%
              </td>
              <td className="hidden text-right lg:table-cell">
                ${item.volume}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 7. API 和数据获取规范

### 7.1 API Route 结构

```typescript
// app/api/oracles/[provider]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OracleClientFactory } from '@/lib/oracles/factory';
import { validateProvider } from '@/lib/api/validation';
import { createCachedJsonResponse } from '@/lib/api/response';
import { withErrorHandler } from '@/lib/api/middleware';

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { provider: string } }
) => {
  // 1. 验证 provider
  const validationError = validateProvider(params.provider);
  if (validationError) return validationError;

  // 2. 获取查询参数
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const chain = searchParams.get('chain');

  if (!symbol) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAMS', message: 'Symbol is required' } },
      { status: 400 }
    );
  }

  // 3. 获取数据
  const client = OracleClientFactory.getClient(params.provider as OracleProvider);
  const price = await client.getPrice(symbol, chain as Blockchain);

  // 4. 返回缓存响应
  return createCachedJsonResponse(price, {
    maxAge: 30,
    staleWhileRevalidate: 60,
  });
});
```

### 7.2 API 客户端

```typescript
// lib/api/client/ApiClient.ts
import { ApiResponse, RequestConfig } from './types';
import { ApiError } from './ApiError';

type RequestInterceptor = (config: RequestInit) => RequestInit;
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

class ApiClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    let init: RequestInit = {
      method,
      headers: { ...this.defaultHeaders, ...config?.headers },
    };

    // 应用请求拦截器
    for (const interceptor of this.requestInterceptors) {
      init = interceptor(init);
    }

    if (data) {
      init.body = JSON.stringify(data);
    }

    const fullUrl = this.baseURL + url;
    let response = await fetch(fullUrl, init);

    // 应用响应拦截器
    for (const interceptor of this.responseInterceptors) {
      response = await interceptor(response);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new ApiError({
        code: error.code || 'API_ERROR',
        message: error.message || 'Request failed',
        statusCode: response.status,
        details: error.details,
      });
    }

    const result = await response.json();
    return {
      data: result,
      meta: {
        timestamp: Date.now(),
        source: 'api',
      },
    };
  }

  async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T>(url: string, data: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T>(url: string, data: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }
}

export const apiClient = new ApiClient();
export { ApiClient };
```

#### API 错误类

```typescript
// lib/api/client/ApiError.ts
import { ApiErrorBody } from './types';

export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor({ code, message, statusCode, details }: ApiErrorBody) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  static fromError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }
    if (error instanceof Error) {
      return new ApiError({
        code: 'UNKNOWN_ERROR',
        message: error.message,
        statusCode: 500,
      });
    }
    return new ApiError({
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      statusCode: 500,
    });
  }
}
```

### 7.3 数据验证

> **注意**: 如需使用 Zod 进行运行时验证，请先安装: `npm install zod`

```typescript
// lib/api/validation/schemas.ts
import { z } from 'zod';

export const PriceQuerySchema = z.object({
  symbol: z.string().min(1).max(20).toUpperCase(),
  chain: z.enum(Object.values(Blockchain) as [string, ...string[]]).optional(),
  period: z.coerce.number().int().min(1).max(365).default(24),
});

export const AlertConfigSchema = z.object({
  symbol: z.string().min(1),
  provider: z.enum(Object.values(OracleProvider) as [string, ...string[]]),
  conditionType: z.enum(['above', 'below', 'change_percent']),
  targetValue: z.number().positive(),
});

// 类型推断
export type PriceQueryInput = z.infer<typeof PriceQuerySchema>;
export type AlertConfigInput = z.infer<typeof AlertConfigSchema>;
```

#### 替代方案：手动验证

如果不需要引入 Zod，可以使用 TypeScript 类型守卫进行验证：

```typescript
// lib/api/validation/manual.ts
export function validatePriceQuery(input: unknown): { symbol: string; chain?: string; period: number } {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Invalid input: expected object');
  }
  
  const { symbol, chain, period } = input as Record<string, unknown>;
  
  if (typeof symbol !== 'string' || symbol.length === 0 || symbol.length > 20) {
    throw new Error('Invalid symbol');
  }
  
  return {
    symbol: symbol.toUpperCase(),
    chain: typeof chain === 'string' ? chain : undefined,
    period: typeof period === 'number' ? Math.min(Math.max(period, 1), 365) : 24,
  };
}
```

---

## 8. 错误处理规范

### 8.1 错误类层次结构

#### 8.1.1 基础错误类

```typescript
// lib/errors/AppError.ts
export interface AppErrorDetails {
  [key: string]: unknown;
}

export interface AppErrorOptions {
  message: string;
  code: string;
  statusCode: number;
  isOperational?: boolean;
  details?: AppErrorDetails;
  i18nKey?: string;
  cause?: Error;
}

export abstract class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: AppErrorDetails;
  public readonly i18nKey?: string;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;
    this.i18nKey = options.i18nKey;

    if (options.cause) {
      this.cause = options.cause;
    }

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      details: this.details,
      i18nKey: this.i18nKey,
    };
  }

  toApiResponse(): {
    error: { code: string; message: string; retryable: boolean; details?: AppErrorDetails };
  } {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: !this.isOperational,
        details: this.details,
      },
    };
  }
}
```

#### 8.1.2 业务错误类

```typescript
// lib/errors/BusinessErrors.ts
import { AppError, AppErrorDetails } from './AppError';

export interface ValidationErrorDetails extends AppErrorDetails {
  field?: string;
  value?: unknown;
  constraints?: Record<string, unknown>;
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ValidationErrorDetails, i18nKey?: string) {
    super({
      message,
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details,
      i18nKey: i18nKey ?? 'errors.validation',
    });
  }
}

export interface NotFoundErrorDetails extends AppErrorDetails {
  resource?: string;
  identifier?: string | number;
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: NotFoundErrorDetails, i18nKey?: string) {
    super({
      message,
      code: 'NOT_FOUND',
      statusCode: 404,
      details,
      i18nKey: i18nKey ?? 'errors.notFound',
    });
  }
}

export interface AuthenticationErrorDetails extends AppErrorDetails {
  reason?: string;
}

export class AuthenticationError extends AppError {
  constructor(message: string, details?: AuthenticationErrorDetails, i18nKey?: string) {
    super({
      message,
      code: 'AUTHENTICATION_ERROR',
      statusCode: 401,
      details,
      i18nKey: i18nKey ?? 'errors.authentication',
    });
  }
}

export interface AuthorizationErrorDetails extends AppErrorDetails {
  resource?: string;
  action?: string;
  requiredPermission?: string;
}

export class AuthorizationError extends AppError {
  constructor(message: string, details?: AuthorizationErrorDetails, i18nKey?: string) {
    super({
      message,
      code: 'AUTHORIZATION_ERROR',
      statusCode: 403,
      details,
      i18nKey: i18nKey ?? 'errors.authorization',
    });
  }
}

export interface ConflictErrorDetails extends AppErrorDetails {
  resource?: string;
  conflictingValue?: unknown;
}

export class ConflictError extends AppError {
  constructor(message: string, details?: ConflictErrorDetails, i18nKey?: string) {
    super({
      message,
      code: 'CONFLICT',
      statusCode: 409,
      details,
      i18nKey: i18nKey ?? 'errors.conflict',
    });
  }
}

export interface RateLimitErrorDetails extends AppErrorDetails {
  retryAfter?: number;
  limit?: number;
  remaining?: number;
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string, details?: RateLimitErrorDetails, i18nKey?: string) {
    super({
      message,
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      details,
      i18nKey: i18nKey ?? 'errors.rateLimit',
    });
    this.retryAfter = details?.retryAfter;
  }
}

export interface InternalErrorDetails extends AppErrorDetails {
  operation?: string;
  originalError?: string;
}

export class InternalError extends AppError {
  constructor(message: string, details?: InternalErrorDetails, i18nKey?: string, cause?: Error) {
    super({
      message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      isOperational: false,
      details,
      i18nKey: i18nKey ?? 'errors.internal',
      cause,
    });
  }
}

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}
```

#### 8.1.3 预言机错误类

```typescript
// lib/errors/OracleError.ts
import { AppError, AppErrorDetails } from './AppError';

export interface OracleErrorDetails extends AppErrorDetails {
  provider?: string;
  symbol?: string;
  chain?: string;
}

export class OracleClientError extends AppError {
  constructor(message: string, details?: OracleErrorDetails, i18nKey?: string) {
    super({
      message,
      code: 'ORACLE_CLIENT_ERROR',
      statusCode: 500,
      isOperational: false,
      details,
      i18nKey: i18nKey ?? 'errors.oracle.client',
    });
  }
}

export interface PriceFetchErrorDetails extends OracleErrorDetails {
  timestamp?: number;
  retryable?: boolean;
}

export class PriceFetchError extends AppError {
  public readonly retryable: boolean;

  constructor(message: string, details?: PriceFetchErrorDetails, i18nKey?: string, cause?: Error) {
    super({
      message,
      code: 'PRICE_FETCH_ERROR',
      statusCode: 502,
      isOperational: true,
      details,
      i18nKey: i18nKey ?? 'errors.oracle.priceFetch',
      cause,
    });
    this.retryable = details?.retryable ?? false;
  }

  toApiResponse(): {
    error: { code: string; message: string; retryable: boolean; details?: AppErrorDetails };
  } {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        details: this.details,
      },
    };
  }
}

export interface UnsupportedChainErrorDetails extends OracleErrorDetails {
  supportedChains?: string[];
}

export class UnsupportedChainError extends AppError {
  constructor(message: string, details?: UnsupportedChainErrorDetails, i18nKey?: string) {
    super({
      message,
      code: 'UNSUPPORTED_CHAIN',
      statusCode: 400,
      details,
      i18nKey: i18nKey ?? 'errors.oracle.unsupportedChain',
    });
  }
}

export interface UnsupportedSymbolErrorDetails extends OracleErrorDetails {
  supportedSymbols?: string[];
}

export class UnsupportedSymbolError extends AppError {
  constructor(message: string, details?: UnsupportedSymbolErrorDetails, i18nKey?: string) {
    super({
      message,
      code: 'UNSUPPORTED_SYMBOL',
      statusCode: 400,
      details,
      i18nKey: i18nKey ?? 'errors.oracle.unsupportedSymbol',
    });
  }
}
```

### 8.2 错误边界

```typescript
// components/ErrorBoundaries.tsx
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <ErrorFallback
            error={this.state.error}
            onReset={() => this.setState({ hasError: false, error: null })}
          />
        )
      );
    }

    return this.props.children;
  }
}

function ErrorFallback({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h2 className="text-xl font-semibold text-red-600">Something went wrong</h2>
      <p className="mt-2 text-gray-600">
        {error?.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={onReset}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Try again
      </button>
    </div>
  );
}
```

### 8.3 异步错误处理

```typescript
// ✅ 使用 try-catch 处理异步错误
async function fetchPriceData(
  provider: OracleProvider,
  symbol: string
): Promise<PriceData | null> {
  try {
    const client = OracleClientFactory.getClient(provider);
    return await client.getPrice(symbol);
  } catch (error) {
    if (error instanceof PriceFetchError) {
      // 已知错误类型
      logger.warn('Price fetch failed:', error.details);
      return null;
    }

    // 未知错误，重新抛出
    throw error;
  }
}

// ✅ 使用 Result 模式
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function fetchPriceSafe(
  provider: OracleProvider,
  symbol: string
): Promise<Result<PriceData, PriceFetchError>> {
  try {
    const client = OracleClientFactory.getClient(provider);
    const data = await client.getPrice(symbol);
    return { success: true, data };
  } catch (error) {
    if (error instanceof PriceFetchError) {
      return { success: false, error };
    }
    throw error;
  }
}

// 使用
const result = await fetchPriceSafe(OracleProvider.CHAINLINK, 'BTC');
if (result.success) {
  console.log(result.data.price);
} else {
  console.error(result.error.message);
}
```

---

## 9. 性能优化规范

### 9.1 组件优化

```typescript
// ✅ 使用 React.memo 避免不必要的重渲染
import { memo, useMemo, useCallback } from 'react';

interface PriceListProps {
  prices: PriceData[];
  onSelect: (price: PriceData) => void;
}

export const PriceList = memo(function PriceList({
  prices,
  onSelect,
}: PriceListProps) {
  // 使用 useMemo 缓存计算结果
  const sortedPrices = useMemo(() => {
    return [...prices].sort((a, b) => b.price - a.price);
  }, [prices]);

  // 使用 useCallback 缓存回调函数
  const handleSelect = useCallback(
    (price: PriceData) => {
      onSelect(price);
    },
    [onSelect]
  );

  return (
    <ul>
      {sortedPrices.map((price) => (
        <PriceItem
          key={price.symbol}
          price={price}
          onSelect={handleSelect}
        />
      ))}
    </ul>
  );
});

// ✅ 使用 useMemo 缓存复杂对象
function useChartConfig(data: ChartData[]) {
  return useMemo(
    () => ({
      xAxis: { data: data.map((d) => d.timestamp) },
      yAxis: { min: Math.min(...data.map((d) => d.price)) },
      series: [{ data: data.map((d) => d.price) }],
    }),
    [data]
  );
}
```

### 9.2 懒加载和代码分割

```typescript
// ✅ 使用 dynamic import 进行代码分割
import dynamic from 'next/dynamic';

const PriceChart = dynamic(
  () => import('@/components/oracle/charts/PriceChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // 对于依赖浏览器 API 的组件
  }
);

// ✅ 预加载关键组件
const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  {
    loading: () => <Loading />,
  }
);

// 在需要时预加载
function Dashboard() {
  const handleMouseEnter = () => {
    // 预加载组件
    const HeavyComponentPreload = import('@/components/HeavyComponent');
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      <HeavyComponent />
    </div>
  );
}
```

### 9.3 数据获取优化

```typescript
// ✅ 使用 React Query 的 staleTime 和 cacheTime
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟
      gcTime: 10 * 60 * 1000, // 10 分钟
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

// ✅ 使用 prefetchQuery 预取数据
function PriceTable() {
  const queryClient = useQueryClient();

  const handleHover = (symbol: string) => {
    queryClient.prefetchQuery({
      queryKey: ['price', symbol],
      queryFn: () => fetchPrice(symbol),
      staleTime: 60 * 1000,
    });
  };

  return (
    <table>
      {symbols.map((symbol) => (
        <tr key={symbol} onMouseEnter={() => handleHover(symbol)}>
          <td>{symbol}</td>
        </tr>
      ))}
    </table>
  );
}

// ✅ 使用 select 转换数据
function usePriceStats(symbol: string) {
  return useQuery({
    queryKey: ['prices', symbol],
    queryFn: () => fetchPriceHistory(symbol),
    select: (data) => ({
      min: Math.min(...data.map((p) => p.price)),
      max: Math.max(...data.map((p) => p.price)),
      avg: data.reduce((sum, p) => sum + p.price, 0) / data.length,
    }),
  });
}
```

### 9.4 列表渲染优化

```typescript
// ✅ 使用 react-window 或 react-virtualized 处理大数据列表
import { FixedSizeList as List } from 'react-window';

function VirtualPriceList({ prices }: { prices: PriceData[] }) {
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => (
      <div style={style}>
        <PriceItem price={prices[index]} />
      </div>
    ),
    [prices]
  );

  return (
    <List
      height={600}
      itemCount={prices.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </List>
  );
}

// ✅ 使用 @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ data }: { data: unknown[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {data[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 10. 测试规范

### 5.4 Hooks 目录结构

```
src/hooks/
├── index.ts                          # 统一导出
├── __tests__/                        # Hooks 测试
│   ├── useOracleData.test.ts
│   ├── useTechnicalIndicators.test.ts
│   ├── useRoutePrefetch.test.ts
│   └── useHoverPrefetch.test.ts
│
# DI Hooks
├── useDependencyInjection.ts         # 依赖注入 Hooks
│
# Oracle Data Hooks
├── useOracleData.ts                  # 预言机数据获取
├── useOraclePrices.ts                # 预言机价格
├── usePriceHistory.ts                # 价格历史
├── useChainlinkData.ts               # Chainlink 数据
├── usePythData.ts                    # Pyth 数据
├── useAPI3WebSocket.ts               # API3 WebSocket
├── useUMARealtime.ts                 # UMA 实时数据
│
# Feature Hooks
├── useFavorites.ts                   # 收藏夹功能
├── useAlerts.ts                      # 警报功能
├── useRealtimeAlerts.ts              # 实时警报
│
# Chart Hooks
├── useChartZoom.ts                   # 图表缩放
├── useChartExport.ts                 # 图表导出
├── useTechnicalIndicators.ts         # 技术指标
├── useAdaptiveDownsampling.ts        # 自适应降采样
│
# Performance Hooks
├── usePerformanceMetrics.ts          # 性能指标
├── usePerformanceOptimizer.ts        # 性能优化
│
# Utility Hooks
├── useUtils.ts                       # 通用工具
├── useDebounce.ts                    # 防抖
├── usePreferences.ts                 # 用户偏好
├── useKeyboardShortcuts.ts           # 键盘快捷键
├── useHoverPrefetch.ts               # 悬停预加载
├── useRoutePrefetch.ts               # 路由预加载
│
# API3 Hooks
├── api3/
│   ├── useAPI3Price.ts
│   ├── useAPI3HistoricalPrices.ts
│   ├── useAPI3StakingData.ts
│   ├── useAPI3DapiCoverage.ts
│   ├── useAPI3AirnodeStats.ts
│   ├── useAPI3QualityMetrics.ts
│   └── useAPI3LatencyDistribution.ts
│
# Oracle-specific Hooks
├── oracles/
│   ├── api3/                         # API3 hooks
│   ├── tellor/                       # Tellor hooks
│   ├── chainlink/                    # Chainlink hooks
│   ├── chronicle/                    # Chronicle hooks
│   ├── dia/                          # DIA hooks
│   ├── pyth/                         # Pyth hooks
│   ├── redstone/                     # RedStone hooks
│   └── winklink/                     # WINkLink hooks
```

### 10.1 测试文件位置

```
# 方案 1: __tests__ 目录
src/
├── hooks/
│   ├── usePriceData.ts
│   └── __tests__/
│       └── usePriceData.test.ts

# 方案 2: 与源文件同目录
src/
├── lib/
│   └── utils/
│       ├── format.ts
│       └── format.test.ts
```

### 10.2 单元测试

```typescript
// hooks/__tests__/usePriceData.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePriceData } from '../usePriceData';

// Mock 依赖
jest.mock('@/lib/oracles/factory', () => ({
  OracleClientFactory: {
    getClient: jest.fn(() => ({
      getPrice: jest.fn(),
    })),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

describe('usePriceData', () => {
  it('should fetch price data successfully', async () => {
    const mockPrice = {
      symbol: 'BTC',
      price: 50000,
      timestamp: Date.now(),
    };

    const { result } = renderHook(
      () => usePriceData(OracleProvider.CHAINLINK, 'BTC'),
      { wrapper: createWrapper() }
    );

    // 初始状态
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // 等待数据加载
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockPrice);
    expect(result.current.error).toBeNull();
  });

  it('should handle error state', async () => {
    const { result } = renderHook(
      () => usePriceData(OracleProvider.CHAINLINK, 'INVALID'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});
```

### 10.3 组件测试

```typescript
// components/__tests__/PriceCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PriceCard } from '../PriceCard';

describe('PriceCard', () => {
  const mockPrice: PriceData = {
    symbol: 'BTC',
    price: 50000,
    change24h: 5.5,
    timestamp: Date.now(),
    provider: OracleProvider.CHAINLINK,
  };

  it('renders price information correctly', () => {
    render(<PriceCard data={mockPrice} />);

    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('$50,000.00')).toBeInTheDocument();
    expect(screen.getByText('+5.50%')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<PriceCard data={mockPrice} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledWith(mockPrice);
  });

  it('shows loading state', () => {
    render(<PriceCard data={null} isLoading />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });
});
```

### 10.4 集成测试

```typescript
// app/api/oracles/__tests__/route.test.ts
import { NextRequest } from 'next/server';
import { GET } from '../[provider]/route';

describe('/api/oracles/[provider]', () => {
  it('returns price data for valid provider and symbol', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/oracles/chainlink?symbol=BTC'
    );

    const response = await GET(request, {
      params: { provider: 'chainlink' },
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('symbol', 'BTC');
    expect(data).toHaveProperty('price');
    expect(data).toHaveProperty('timestamp');
  });

  it('returns 400 for missing symbol', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/oracles/chainlink'
    );

    const response = await GET(request, {
      params: { provider: 'chainlink' },
    });

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid provider', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/oracles/invalid?symbol=BTC'
    );

    const response = await GET(request, {
      params: { provider: 'invalid' },
    });

    expect(response.status).toBe(400);
  });
});
```

---

## 11. 国际化规范

### 11.1 i18n 配置

#### config.ts

```typescript
// i18n/config.ts
import { Pathnames } from 'next-intl/routing';

export const locales = ['en', 'zh-CN'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const pathnames: Pathnames<typeof locales> = {
  '/': '/',
};

export const localePrefix = 'always';

export interface MessageFileConfig {
  name: string;
  directory?: string;
  namespace?: string;
}

export const messageFilesConfig: MessageFileConfig[] = [
  { name: 'common' },
  { name: 'navigation' },
  { name: 'home' },
  { name: 'ui' },
  { name: 'marketOverview' },
  { name: 'priceQuery' },
  { name: 'comparison' },
  { name: 'crossOracle' },
  { name: 'crossChain' },
  { name: 'dataQuality' },
  { name: 'dataTransparency' },
  { name: 'chainlink', directory: 'oracles', namespace: 'chainlink' },
  { name: 'pyth', directory: 'oracles' },
  { name: 'api3', directory: 'oracles' },
  { name: 'band', directory: 'oracles' },
  { name: 'tellor', directory: 'oracles' },
  { name: 'uma', directory: 'oracles' },
  { name: 'dia', directory: 'oracles' },
  { name: 'redstone', directory: 'oracles' },
  { name: 'chronicle', directory: 'oracles' },
  { name: 'winklink', directory: 'oracles' },
  { name: 'charts', directory: 'components' },
  { name: 'alerts', directory: 'components' },
  { name: 'export', directory: 'components', namespace: 'export' },
  { name: 'favorites', directory: 'components' },
  { name: 'search', directory: 'components' },
  { name: 'settings', directory: 'features' },
  { name: 'auth', directory: 'features' },
  { name: 'methodology', directory: 'features' },
];
```

#### routing.ts

```typescript
// i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh-CN'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];

// 检测是否为中文语言
export function isChineseLocale(locale: string): boolean {
  return locale === 'zh-CN' || locale.startsWith('zh');
}

// 获取有效的语言（只有中文或非中文两种）
export function getValidLocale(locale: string | undefined): Locale {
  if (!locale) return 'en';
  // 如果是中文相关语言，返回中文
  if (isChineseLocale(locale)) return 'zh-CN';
  // 其他所有语言都返回英文
  return 'en';
}
```

#### request.ts

```typescript
// i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { getValidLocale } from './routing';
import { messageFilesConfig } from './config';
import type { Locale } from './config';

async function loadMessageFile(
  locale: string,
  fileName: string,
  directory?: string
): Promise<Record<string, unknown> | null> {
  const path = directory ? `${directory}/${fileName}` : fileName;
  try {
    const module = await import(`./messages/${locale}/${path}.json`);
    return module.default;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Failed to load messages: ${locale}/${path}.json`, error);
    }
    return null;
  }
}

async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  const messages: Record<string, unknown> = {};

  for (const config of messageFilesConfig) {
    const fileMessages = await loadMessageFile(locale, config.name, config.directory);
    if (fileMessages) {
      // 如果配置了 namespace，将文件内容放到对应的命名空间下
      if (config.namespace) {
        messages[config.namespace] = fileMessages;
      } else {
        Object.assign(messages, fileMessages);
      }
    }
  }

  return messages;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = getValidLocale(requestedLocale);
  const messages = await loadMessages(locale);

  return {
    locale,
    messages,
  };
});
```

### 11.2 翻译文件结构

```
src/i18n/messages/
├── en/                         # 英文翻译
│   ├── common.json
│   ├── home.json
│   ├── navigation.json
│   ├── marketOverview.json
│   ├── ui.json
│   ├── priceQuery.json
│   ├── comparison.json
│   ├── crossOracle.json
│   ├── crossChain.json
│   ├── dataQuality.json
│   ├── dataTransparency.json
│   ├── oracles/               # 预言机专用翻译
│   │   ├── chainlink.json
│   │   ├── pyth.json
│   │   ├── api3.json
│   │   ├── band.json
│   │   ├── tellor.json
│   │   ├── uma.json
│   │   ├── dia.json
│   │   ├── redstone.json
│   │   ├── chronicle.json
│   │   └── winklink.json
│   ├── components/            # 组件翻译
│   │   ├── charts.json
│   │   ├── alerts.json
│   │   ├── export.json
│   │   ├── favorites.json
│   │   └── search.json
│   └── features/              # 功能翻译
│       ├── settings.json
│       ├── auth.json
│       └── methodology.json
│
└── zh-CN/                      # 中文翻译（结构与 en 相同）
    ├── common.json
    └── ...
```

### 11.2 翻译键命名

```json
// ✅ 使用层级命名
{
  "oracle": {
    "title": "Oracle Analytics",
    "description": "Real-time oracle data analysis",
    "actions": {
      "refresh": "Refresh Data",
      "export": "Export Data",
      "filter": "Filter Results"
    },
    "status": {
      "loading": "Loading...",
      "error": "Failed to load data",
      "empty": "No data available"
    }
  },
  "chart": {
    "timeRange": {
      "1h": "1 Hour",
      "24h": "24 Hours",
      "7d": "7 Days"
    }
  }
}
```

### 11.3 组件中使用

```typescript
// ✅ 使用 next-intl
'use client';

import { useTranslations } from 'next-intl';

function PriceCard({ symbol, price }: PriceCardProps) {
  const t = useTranslations('oracle');

  return (
    <div>
      <h3>{t('title')}</h3>
      <p>{t('description')}</p>
      <button>{t('actions.refresh')}</button>
    </div>
  );
}

// ✅ 带参数的翻译
function PriceDisplay({ price, change }: PriceDisplayProps) {
  const t = useTranslations('price');

  return (
    <div>
      <span>{t('current', { value: price.toFixed(2) })}</span>
      <span>
        {t('change', {
          value: change.toFixed(2),
          direction: change >= 0 ? 'up' : 'down',
        })}
      </span>
    </div>
  );
}

// messages/en.json
{
  "price": {
    "current": "Current Price: ${value}",
    "change": "{direction, select, up {+} down {-}}{value}%"
  }
}
```

### 11.4 服务端组件中使用

```typescript
// app/[locale]/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale, namespace: 'home' });

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

---

## 12. 安全规范

### 12.1 输入验证

```typescript
// ✅ 始终验证用户输入
import { z } from 'zod';

const UserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100).optional(),
});

export async function createUser(input: unknown) {
  const validated = UserInputSchema.parse(input);

  // 使用验证后的数据
  return db.user.create({
    data: validated,
  });
}
```

### 12.2 XSS 防护

```typescript
// ✅ 不要直接渲染用户输入
function Comment({ text }: { text: string }) {
  // ❌ 危险
  return <div dangerouslySetInnerHTML={{ __html: text }} />;

  // ✅ 安全
  return <div>{text}</div>;
}

// ✅ 使用 DOMPurify 清理 HTML
import DOMPurify from 'isomorphic-dompurify';

function RichContent({ html }: { html: string }) {
  const cleanHtml = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}
```

### 12.3 环境变量安全

```typescript
// ✅ 服务端环境变量
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ✅ 客户端环境变量（必须以 NEXT_PUBLIC_ 开头）
const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;

// ❌ 不要在客户端暴露敏感信息
// process.env.DATABASE_URL // 这不会在客户端可用
```

### 12.4 API 安全

```typescript
// ✅ 使用中间件进行认证
import { withAuth } from '@/lib/api/middleware';

export const POST = withAuth(async (request, { user }) => {
  // 只有认证用户才能访问
  const data = await request.json();
  return createAlert(user.id, data);
});

// ✅ 速率限制
import { withRateLimit } from '@/lib/api/middleware';

export const GET = withRateLimit(
  async (request) => {
    return fetchData();
  },
  { limit: 100, window: 60 } // 每分钟 100 次请求
);
```

---

## 13. 命名约定

### 13.1 文件命名

| 类型 | 命名方式 | 示例 |
|------|----------|------|
| 组件 | PascalCase | `PriceCard.tsx`, `OracleComparison.tsx` |
| Hooks | camelCase + use 前缀 | `usePriceData.ts`, `useChartZoom.ts` |
| 工具函数 | camelCase | `formatPrice.ts`, `calculateAverage.ts` |
| 类型定义 | PascalCase | `OracleTypes.ts`, `PriceData.ts` |
| 常量 | SCREAMING_SNAKE_CASE | `ORACLE_PROVIDERS.ts`, `API_ENDPOINTS.ts` |
| 配置文件 | camelCase 或 kebab-case | `next.config.ts`, `tailwind.config.js` |
| 测试文件 | 同被测文件 + .test | `PriceCard.test.tsx` |

### 13.2 变量命名

```typescript
// ✅ 布尔值使用 is/has/should 前缀
const isLoading = true;
const hasError = false;
const shouldRefresh = true;

// ✅ 数组使用复数形式
const prices: PriceData[] = [];
const users: User[] = [];

// ✅ 函数使用动词开头
function fetchPrice() {}
function handleClick() {}
function validateInput() {}

// ✅ 常量使用大写下划线
const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT = 5000;
const ORACLE_PROVIDERS = ['chainlink', 'pyth'] as const;

// ✅ 接口使用描述性名称
interface PriceData { }
interface OracleConfig { }
interface ApiResponse<T> { }

// ✅ 类型别名使用描述性名称
type PriceMap = Map<string, PriceData>;
type LoadingState = 'idle' | 'loading' | 'success' | 'error';
```

### 13.3 组件 Props 命名

```typescript
// ✅ Props 接口使用 ComponentName + Props
interface ButtonProps { }
interface PriceChartProps { }

// ✅ 回调函数使用 on + EventName
interface Props {
  onClick: () => void;
  onPriceUpdate: (price: PriceData) => void;
  onError: (error: Error) => void;
}

// ✅ 布尔 Props 使用描述性名称
interface Props {
  isLoading: boolean;
  isDisabled: boolean;
  showHeader: boolean;
}
```

---

## 14. 导入导出规范

### 14.1 导入顺序

```typescript
// 1. React 和 Next.js 内置
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// 2. 第三方库
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

// 3. 项目内部绝对导入
import { Button } from '@/components/ui/Button';
import { usePriceData } from '@/hooks/usePriceData';
import { OracleProvider } from '@/types/oracle';

// 4. 相对导入
import { utils } from './utils';
import styles from './styles.module.css';

// 5. 类型导入（使用 type 关键字）
import type { PriceData } from '@/types/oracle';
import type { ButtonProps } from '@/components/ui/Button';
```

### 14.2 导出模式

```typescript
// ✅ 命名导出（推荐）
export function Button() { }
export const ORACLE_PROVIDERS = ['chainlink', 'pyth'];
export interface ButtonProps { }

// ✅ 默认导出（仅用于页面和主要组件）
export default function HomePage() { }

// ✅ 重新导出
export { Button } from './Button';
export type { ButtonProps } from './Button';

// ✅ 索引文件导出
// components/ui/index.ts
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';
export type { ButtonProps } from './Button';
export type { CardProps } from './Card';

// ✅ 条件导出
export { PriceChart as default } from './PriceChart';
```

### 14.3 路径别名

```typescript
// ✅ 使用路径别名
import { Button } from '@/components/ui/Button';
import { usePriceData } from '@/hooks/usePriceData';
import { OracleProvider } from '@/types/oracle';
import { cn } from '@/lib/utils';

// ❌ 避免深层相对路径
import { Button } from '../../../components/ui/Button';
```

---

## 15. 注释和文档规范

### 15.1 文件头注释

```typescript
/**
 * @fileoverview 价格数据卡片组件
 * @description 显示单个资产的价格信息，支持实时更新和交互
 * @author Insight Team
 * @since 2024-01-01
 */

import { useState } from 'react';
// ...
```

### 15.2 函数和组件文档

```typescript
/**
 * 获取指定预言机和资产的价格数据
 *
 * @param provider - 预言机提供商
 * @param symbol - 资产符号（如 BTC, ETH）
 * @param chain - 可选的区块链网络
 * @returns 价格数据对象，包含当前价格、24小时变化等信息
 * @throws {PriceFetchError} 当获取价格失败时抛出
 *
 * @example
 * ```typescript
 * const price = await getPrice(OracleProvider.CHAINLINK, 'BTC');
 * console.log(price.price); // 50000
 * ```
 */
export async function getPrice(
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain
): Promise<PriceData> {
  // ...
}

/**
 * 价格数据展示卡片
 *
 * @param symbol - 资产符号
 * @param provider - 预言机提供商
 * @param showChange - 是否显示 24 小时变化，默认为 true
 * @param onClick - 点击回调函数
 */
export function PriceCard({
  symbol,
  provider,
  showChange = true,
  onClick,
}: PriceCardProps) {
  // ...
}
```

### 15.3 行内注释

```typescript
function calculateMetrics(data: PriceData[]) {
  // 过滤无效数据
  const validData = data.filter((d) => d.price > 0);

  // 计算平均值
  const average =
    validData.reduce((sum, d) => sum + d.price, 0) / validData.length;

  // TODO: 添加更多指标计算
  return { average };
}
```

### 15.4 TODO 和 FIXME 标记

```typescript
// TODO: 添加缓存机制以提高性能
// FIXME: 处理边界情况当数据为空时
// HACK: 临时解决方案，需要重构
// NOTE: 这个逻辑依赖于外部 API 的响应格式
// WARNING: 修改此代码可能影响其他模块
```

---

## 附录 A: 快速参考

### A.1 常用 ESLint 规则

```javascript
// eslint.config.mjs
export default [
  // ...
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
```

### A.2 Prettier 配置

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### A.3 TypeScript 配置要点

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### A.4 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器
npm run clean:dev        # 清除 .next 缓存后启动开发服务器

# 构建
npm run build            # 构建生产版本
npm run start            # 启动生产服务器
npm run clean:start      # 清除缓存后构建并启动生产服务器

# 代码检查
npm run lint             # 运行 ESLint 检查
npm run lint:fix         # 自动修复 ESLint 问题
npm run typecheck        # 运行 TypeScript 类型检查
npm run validate         # 运行 lint + typecheck + test

# 格式化
npm run format           # 格式化代码
npm run format:check     # 检查代码格式

# 测试
npm run test             # 运行单元测试
npm run test:watch       # 运行单元测试（监视模式）
npm run test:coverage    # 运行单元测试并生成覆盖率报告
npm run test:e2e         # 运行 E2E 测试（Playwright）
npm run test:e2e:ui      # 运行 E2E 测试（UI 模式）

# 性能测试
npm run perf:test        # 运行性能测试
npm run perf:quick       # 快速性能测试

# 国际化
npm run i18n:types       # 生成 i18n 类型
npm run i18n:check       # 检查 i18n 翻译完整性
npm run i18n:validate    # 验证 i18n 翻译（JSON 输出）

# 代码规范
npm run naming:check     # 检查命名规范
```

---

## 附录 B: 最佳实践检查清单

### 代码提交前检查

- [ ] 代码通过 ESLint 检查
- [ ] 代码通过 TypeScript 类型检查
- [ ] 所有测试通过
- [ ] 没有 `console.log` 或 `debugger` 语句
- [ ] 没有硬编码的敏感信息
- [ ] 组件有适当的加载和错误状态
- [ ] 新功能有对应的测试

### 代码审查检查

- [ ] 遵循命名约定
- [ ] 类型定义完整
- [ ] 错误处理完善
- [ ] 性能考虑（memo, useMemo, useCallback）
- [ ] 可访问性（ARIA 属性、键盘导航）
- [ ] 国际化（翻译键完整）
- [ ] 文档和注释清晰

---

## 附录 C: Git 提交规范

### C.1 Conventional Commits

项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### C.2 提交类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(oracles): add Pyth Network support` |
| `fix` | 修复 bug | `fix(charts): resolve tooltip positioning issue` |
| `docs` | 文档更新 | `docs(readme): update installation guide` |
| `style` | 代码格式 | `style(components): format with prettier` |
| `refactor` | 重构 | `refactor(hooks): simplify usePriceData logic` |
| `perf` | 性能优化 | `perf(queries): add caching for price data` |
| `test` | 测试相关 | `test(api): add unit tests for oracle handlers` |
| `chore` | 构建/工具 | `chore(deps): update dependencies` |
| `ci` | CI/CD | `ci(github): add automated testing workflow` |

### C.3 提交范围

常用范围：
- `oracles` - 预言机相关
- `components` - 组件
- `hooks` - Hooks
- `api` - API 路由
- `lib` - 核心库
- `styles` - 样式
- `i18n` - 国际化
- `tests` - 测试
- `docs` - 文档

### C.4 提交示例

```bash
# 新功能
feat(oracles): add real-time price updates for Chainlink

# 修复
fix(ui): resolve mobile navigation overlap issue

# 重构
refactor(queries): migrate from SWR to React Query

# 性能优化
perf(charts): implement virtual scrolling for large datasets

# 带作用域的提交
feat(api/oracles): add batch price query endpoint

# 带破坏性变更
feat(auth)!: remove legacy login method

BREAKING CHANGE: The old OAuth flow is no longer supported.
```

### C.5 提交信息规范

- **subject** 使用现在时态，首字母小写，不加句号
- **body** 详细说明变更原因和实现方式
- **footer** 用于引用 issue 或说明破坏性变更

```bash
# 好的提交信息
feat(alerts): add email notification support

Implement email notifications for price alerts using SendGrid.
Supports HTML templates and multi-language content.

Closes #123

# 不好的提交信息
update code
fixed bug
```

---

**最后更新**: 2026-03-26
**版本**: 1.5.0
**维护者**: Insight Team

## 更新日志

### v1.5.0 (2026-03-26)
- 更新 lib/services 目录结构（添加 api3WebSocket.ts 和 marketData/index.ts）
- 更新 lib/analytics 目录结构（添加 __tests__ 目录）
- 更新 lib/snapshots 目录结构（添加 migration.ts）
- 更新 lib/realtime 目录结构（添加 websocket.ts 和 __tests__）
- 更新 lib/constants 目录结构（添加 searchConfig.ts）
- 更新 lib/di 目录结构（添加 index.ts）
- 更新 lib/errors 目录结构（添加 __tests__ 目录）
- 更新 stores 目录结构（添加 uiStore.ts, authStore.ts, realtimeStore.ts, selectors.ts）

### v1.4.0 (2026-03-26)
- 修复 lib/config 目录结构（移除不存在的 oracles.tsx）
- 更新 package.json scripts 文档（添加所有实际可用的命令）
- 添加 performanceBudget 配置文档（Web Vitals 和 Bundle 预算）
- 更新 types 目录结构（添加 auth/index.ts, common/index.ts 等）
- 添加详细的 UI 组件库列表（components/ui/ 完整组件清单）

### v1.3.0 (2026-03-26)
- 修复 lib/utils 目录结构（实际为分散文件，添加 lib/utils.ts 根级别文件）
- 更新 i18n 配置文档（添加 config.ts、routing.ts、request.ts 完整内容）
- 更新翻译文件结构（添加 en/ 和 zh-CN/ 子目录）
- 添加 types/oracle/constants.ts 到目录结构
- 添加 lib/oracles/index.ts 统一导出说明

### v1.2.0 (2026-03-26)
- 更新 Query Keys 结构与实际代码一致
- 更新 API Client 实现（添加拦截器支持）
- 添加完整的 Zustand Store 文档
- 添加 Hooks 目录结构文档
- 修复枚举值（BAND_PROTOCOL 使用连字符而非下划线）
- 添加枚举值数组导出文档

### v1.1.0 (2026-03-26)
- 更新目录结构与实际代码一致
- 更新 OracleClientFactory（添加 DI 支持）
- 更新 DI Container（添加完整方法）
- 更新 BaseOracleClient（添加 Mock 生成和数据库方法）
- 更新错误处理类（添加业务错误和预言机错误）
