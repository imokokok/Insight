# Oracle Integration Documentation

## Overview

The Insight Oracle Data Analytics Platform integrates with multiple leading blockchain oracle providers to deliver comprehensive price data, network analytics, and cross-chain data verification capabilities.

### Supported Providers

| Provider  | Symbol   | Default Chain | Description                                           |
| --------- | -------- | ------------- | ----------------------------------------------------- |
| Chainlink | LINK     | Ethereum      | Decentralized oracle network                          |
| Pyth      | PYTH     | Solana        | Low-latency high-frequency price oracle               |
| API3      | API3     | Ethereum      | First-party oracle infrastructure                     |
| RedStone  | REDSTONE | Ethereum      | Modular oracle design                                 |
| DIA       | DIA      | Ethereum      | Open-source cross-chain oracle                        |
| WINkLink  | WINKLINK | BNB Chain     | TRON ecosystem oracle                                 |
| Supra     | SUPRA    | Ethereum      | High-performance oracle with verifiable randomness    |
| TWAP      | UNI      | Ethereum      | Uniswap V3 Time-Weighted Average Price oracle         |
| Reflector | XLM      | Stellar       | Stellar ecosystem oracle with Soroban smart contracts |
| Flare     | FLR      | Flare         | FTSO-based oracle with on-chain data feeds            |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Oracle Client Layer                          │
├─────────────┬─────────┬─────────┬──────────┬──────────┬─────────┬─────────┬─────────┬─────────┬──────────┐
│ Chainlink   │ Pyth    │ API3    │ RedStone │ DIA      │ WINkLink │ Supra   │ TWAP    │ Reflector│ Flare    │
│ Client      │ Client  │ Client  │ Client   │ Client   │ Client   │ Client  │ Client  │ Client   │ Client   │
└──────┬──────┴────┬────┴────┬────┴─────┬────┴─────┬────┴────┬────┴────┬────┴────┬────┴────┬────┴────┬────┘
       │           │         │          │          │         │
       └───────────┴─────────┴──────────┴──────────┴─────────┴─────────┘
                             │
                    ┌────────▼────────┐
                    │ BaseOracleClient│
                    │   (Abstract)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Storage Layer  │
                    │ (Database/TTL)  │
                    └─────────────────┘
```

---

## Base Oracle Client

The [BaseOracleClient](src/lib/oracles/base.ts) provides the foundation for all oracle implementations.

### Interface

```typescript
export abstract class BaseOracleClient {
  abstract name: OracleProvider;
  abstract supportedChains: Blockchain[];
  abstract getPrice(symbol: string, chain?: Blockchain): Promise<PriceData>;
  abstract getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number
  ): Promise<PriceData[]>;
}
```

### Configuration

```typescript
interface OracleClientConfig {
  useDatabase?: boolean; // Enable database caching (default: true)
  fallbackToMock?: boolean; // Fallback to mock data (default: true)
}
```

### Storage Layer

The storage layer provides database caching with TTL support via [storage.ts](src/lib/oracles/storage.ts):

```typescript
interface OracleStorageConfig {
  enabled: boolean;
  defaultExpirationHours: number; // Default: 24 hours
}
```

---

## Chainlink Integration

**Provider:** `chainlink`  
**Symbol:** LINK  
**Default Chain:** Ethereum

### Supported Chains

| Chain     | Chain ID | Status |
| --------- | -------- | ------ |
| Ethereum  | 1        | Active |
| Arbitrum  | 42161    | Active |
| Optimism  | 10       | Active |
| Polygon   | 137      | Active |
| Avalanche | 43114    | Active |
| Base      | 8453     | Active |
| BNB Chain | 56       | Active |
| Fantom    | 250      | Active |
| Starknet  | -        | Active |
| Blast     | -        | Active |
| Moonbeam  | -        | Active |
| Kava      | -        | Active |
| Polkadot  | -        | Active |

### Features

- **Node Analytics**: Monitor node performance, uptime, and response times
- **Market Data**: Real-time market cap, volume, and supply information
- **Network Data**: Active nodes, data feeds, and hourly activity metrics

### Implementation

```typescript
import { ChainlinkClient } from '@/lib/oracles';

const client = new ChainlinkClient();

const priceData = await client.getPrice('LINK', Blockchain.ETHEREUM);
const history = await client.getHistoricalPrices('LINK', Blockchain.ETHEREUM, 24);
```

### Network Metrics

| Metric            | Value           |
| ----------------- | --------------- |
| Active Nodes      | 1,847           |
| Node Uptime       | 99.9%           |
| Avg Response Time | 245ms           |
| Update Frequency  | 60s             |
| Data Feeds        | 1,243           |
| Total Staked      | 45,000,000 LINK |

### Market Data

| Metric             | Value   |
| ------------------ | ------- |
| Market Cap         | $13.85B |
| 24h Volume         | $485M   |
| Circulating Supply | 608.1M  |
| Total Supply       | 1B      |
| Market Cap Rank    | #12     |

---

## Pyth Network Integration

**Provider:** `pyth`  
**Symbol:** PYTH  
**Default Chain:** Solana

### Supported Chains

| Chain     | Chain ID     | Status |
| --------- | ------------ | ------ |
| Solana    | mainnet-beta | Active |
| Ethereum  | 1            | Active |
| Arbitrum  | 42161        | Active |
| Polygon   | 137          | Active |
| Optimism  | 10           | Active |
| Avalanche | 43114        | Active |
| Base      | 8453         | Active |
| Starknet  | -            | Active |
| Blast     | -            | Active |
| Sui       | -            | Active |
| Aptos     | -            | Active |
| Injective | -            | Active |
| Sei       | -            | Active |

### Features

- **Publisher Analytics**: Monitor data publisher performance and reliability
- **High-Frequency Updates**: 1-second update intervals
- **Confidence Intervals**: Real-time bid/ask spreads with width percentages
- **Pyth Hermes Client**: Direct integration with Pyth's Hermes API

### Implementation

```typescript
import { PythClient, PythHermesClient } from '@/lib/oracles';

const client = new PythClient();
const priceData = await client.getPrice('PYTH', Blockchain.SOLANA);

const hermesClient = new PythHermesClient('https://hermes.pyth.network');
const latestPrice = await hermesClient.getLatestPrice('BTC/USD');

const unsubscribe = hermesClient.subscribeToPriceUpdates('BTC/USD', (update) => {
  console.log('Price update:', update.price, 'Confidence:', update.confidence);
});
```

### Confidence Interval

```typescript
interface ConfidenceInterval {
  bid: number; // Lower bound price
  ask: number; // Upper bound price
  widthPercentage: number; // Spread as percentage
}
```

### Spread Percentages by Asset

| Asset | Spread % |
| ----- | -------- |
| BTC   | 0.02%    |
| ETH   | 0.03%    |
| SOL   | 0.05%    |
| PYTH  | 0.10%    |
| USDC  | 0.01%    |

### Pyth Hermes Client

The [PythHermesClient](src/lib/oracles/pythHermesClient.ts) provides direct integration with Pyth's price feed:

```typescript
import { PythHermesClient, getPythHermesClient } from '@/lib/oracles';

const client = getPythHermesClient();

const price = await client.getLatestPrice('BTC/USD');

client.subscribeToPriceUpdates('ETH/USD', (update) => {
  console.log({
    price: update.price,
    confidence: update.confidence,
    timestamp: update.timestamp,
  });
});
```

### Price Feed IDs

| Symbol   | Price Feed ID                                                        |
| -------- | -------------------------------------------------------------------- |
| BTC/USD  | `0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43` |
| ETH/USD  | `0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace` |
| SOL/USD  | `0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d` |
| PYTH/USD | `0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996` |

### Network Metrics

| Metric            | Value |
| ----------------- | ----- |
| Active Nodes      | 100   |
| Node Uptime       | 99.9% |
| Avg Response Time | 100ms |
| Update Frequency  | 1s    |
| Data Feeds        | 500   |
| Latency           | 50ms  |

---

## API3 Integration

**Provider:** `api3`  
**Symbol:** API3  
**Default Chain:** Ethereum

### Supported Chains

| Chain     | Chain ID | Status |
| --------- | -------- | ------ |
| Ethereum  | 1        | Active |
| Arbitrum  | 42161    | Active |
| Polygon   | 137      | Active |
| Avalanche | 43114    | Active |
| Base      | 8453     | Active |
| BNB Chain | 56       | Active |
| Optimism  | 10       | Active |
| Moonbeam  | -        | Active |
| Kava      | -        | Active |
| Fantom    | 250      | Active |
| Gnosis    | -        | Active |
| Linea     | -        | Active |
| Scroll    | -        | Active |

### Features

- **First-Party Oracle**: Direct data from source providers
- **Quantifiable Security**: Coverage pools and insurance mechanisms
- **Airnode Network**: Decentralized first-party oracle nodes
- **dAPIs**: Decentralized API price feeds

### Implementation

```typescript
import { API3Client } from '@/lib/oracles';

const client = new API3Client();

const priceData = await client.getPrice('API3', Blockchain.ETHEREUM);
const airnodeStats = await client.getAirnodeNetworkStats();
const dapiCoverage = await client.getDapiCoverage();
const stakingData = await client.getStakingData();
const deviations = await client.getDapiPriceDeviations();
const sources = await client.getDataSourceTraceability();
```

### Extended Types

```typescript
interface AirnodeNetworkStats {
  activeAirnodes: number;
  nodeUptime: number;
  avgResponseTime: number;
  dapiUpdateFrequency: number;
  totalStaked: number;
  dataFeeds: number;
  hourlyActivity: number[];
  status: 'online' | 'warning' | 'offline';
  latency: number;
}

interface DapiCoverage {
  totalDapis: number;
  byAssetType: {
    crypto: number;
    forex: number;
    commodities: number;
    stocks: number;
  };
  byChain: {
    ethereum: number;
    arbitrum: number;
    polygon: number;
  };
}

interface StakingData {
  totalStaked: number;
  stakingApr: number;
  stakerCount: number;
  coveragePool: {
    totalValue: number;
    coverageRatio: number;
    historicalPayouts: number;
  };
}

interface DataSourceInfo {
  id: string;
  name: string;
  type: 'exchange' | 'traditional_finance' | 'other';
  credibilityScore: number;
  accuracy: number;
  responseSpeed: number;
  availability: number;
  airnodeAddress: string;
  dapiContract: string;
  chain: string;
}
```

### dAPI Price Deviation Tracking

| Symbol  | dAPI Price | Market Price | Deviation | Status   |
| ------- | ---------- | ------------ | --------- | -------- |
| BTC/USD | $68,050.25 | $68,120.50   | 0.10%     | Normal   |
| ETH/USD | $3,505.80  | $3,498.20    | 0.22%     | Normal   |
| SOL/USD | $180.45    | $182.30      | 1.02%     | Warning  |
| UNI/USD | $9.45      | $9.12        | 3.62%     | Critical |

### Network Metrics

| Metric            | Value    |
| ----------------- | -------- |
| Active Airnodes   | 156      |
| Node Uptime       | 99.7%    |
| Avg Response Time | 180ms    |
| Data Feeds        | 168      |
| Total Staked      | 25M API3 |
| Staking APR       | 12.5%    |
| Coverage Pool     | $8.5M    |

### Data Source Categories

| Type                | Count | Avg Credibility |
| ------------------- | ----- | --------------- |
| Exchanges           | 68    | 95%             |
| Traditional Finance | 52    | 98%             |
| Others              | 36    | 92%             |

---

## Common Features

### Price Data Interface

All oracle clients return standardized price data:

```typescript
interface PriceData {
  provider: OracleProvider;
  chain?: Blockchain;
  symbol: string;
  price: number;
  timestamp: number;
  decimals: number;
  confidence?: number;
  source?: string;
  change24h?: number;
  change24hPercent?: number;
  confidenceInterval?: ConfidenceInterval;
}
```

### Blockchain Enum

```typescript
enum Blockchain {
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
  MOONRIVER = 'moonriver',
  METIS = 'metis',
  STARKEX = 'starkex',
}
```

### Oracle Provider Enum

```typescript
enum OracleProvider {
  CHAINLINK = 'chainlink',
  PYTH = 'pyth',
  API3 = 'api3',
  REDSTONE = 'redstone',
  DIA = 'dia',
  WINKLINK = 'winklink',
  SUPRA = 'supra',
  TWAP = 'twap',
  REFLECTOR = 'reflector',
  FLARE = 'flare',
}
```

### Database Caching

All oracle clients support database caching with configurable TTL:

```typescript
import { configureStorage, shouldUseDatabase } from '@/lib/oracles';

configureStorage({
  enabled: true,
  defaultExpirationHours: 24,
});

if (shouldUseDatabase()) {
  const cachedPrice = await getPriceFromDatabase(provider, symbol, chain);
}
```

---

## Client Usage Examples

### Basic Price Query

```typescript
import { ChainlinkClient, Blockchain } from '@/lib/oracles';

const client = new ChainlinkClient();

const priceData = await client.getPrice('LINK', Blockchain.ETHEREUM);
console.log(`LINK Price: $${priceData.price}`);
console.log(`24h Change: ${priceData.change24hPercent}%`);
```

### Historical Prices

```typescript
import { PythClient, Blockchain } from '@/lib/oracles';

const client = new PythClient();

const history = await client.getHistoricalPrices('BTC', Blockchain.ETHEREUM, 24);
history.forEach((point) => {
  console.log(`${new Date(point.timestamp)}: $${point.price}`);
});
```

### Multi-Provider Comparison

```typescript
import { ChainlinkClient, PythClient, API3Client, OracleProvider } from '@/lib/oracles';

const clients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.PYTH]: new PythClient(),
  [OracleProvider.API3]: new API3Client(),
};

const prices = await Promise.all(
  Object.entries(clients).map(async ([provider, client]) => {
    const data = await client.getPrice('ETH');
    return { provider, price: data.price, confidence: data.confidence };
  })
);
```

### Real-time Updates (Pyth)

```typescript
import { getPythHermesClient } from '@/lib/oracles';

const client = getPythHermesClient();

const unsubscribe = client.subscribeToPriceUpdates('BTC/USD', (update) => {
  console.log(`BTC: $${update.price} ± $${update.confidence}`);
});

setTimeout(() => unsubscribe(), 60000);
```

---

## RedStone Integration

**Provider:** `redstone`  
**Symbol:** REDSTONE  
**Default Chain:** Ethereum

### Supported Chains

| Chain     | Chain ID | Status |
| --------- | -------- | ------ |
| Ethereum  | 1        | Active |
| Arbitrum  | 42161    | Active |
| Optimism  | 10       | Active |
| Polygon   | 137      | Active |
| Avalanche | 43114    | Active |
| Base      | 8453     | Active |
| BNB Chain | 56       | Active |
| Fantom    | 250      | Active |
| Linea     | -        | Active |
| Mantle    | -        | Active |
| Scroll    | -        | Active |
| zkSync    | -        | Active |
| Blast     | -        | Active |
| Starknet  | -        | Active |
| Aptos     | -        | Active |
| Sui       | -        | Active |

### Features

- **Modular Oracle Design** - Flexible data delivery mechanisms
- **Data Streams** - Real-time streaming data feeds
- **Cross-Chain Support** - Multi-chain data availability
- **Cost Efficiency** - Optimized gas usage for data updates

### Implementation

```typescript
import { RedStoneClient } from '@/lib/oracles';

const client = new RedStoneClient();

const priceData = await client.getPrice('ETH', Blockchain.ETHEREUM);
const streamData = await client.getDataStreamInfo();
const modularStats = await client.getModularStats();
```

### Extended Types

```typescript
interface DataStreamInfo {
  streamId: string;
  symbol: string;
  updateFrequency: number;
  lastUpdate: number;
  sources: string[];
  confidence: number;
}

interface ModularStats {
  activeStreams: number;
  totalDataPoints: number;
  avgDeliveryTime: number;
  costEfficiency: number;
}
```

### Network Metrics

| Metric            | Value |
| ----------------- | ----- |
| Active Streams    | 285   |
| Data Points/Day   | 2.5M  |
| Avg Delivery Time | 120ms |
| Cost Efficiency   | 85%   |
| Supported Assets  | 150+  |

---

## DIA Integration

**Provider:** `dia`  
**Symbol:** DIA  
**Default Chain:** Ethereum

### Supported Chains

| Chain     | Chain ID | Status |
| --------- | -------- | ------ |
| Ethereum  | 1        | Active |
| Arbitrum  | 42161    | Active |
| Polygon   | 137      | Active |
| Avalanche | 43114    | Active |
| BNB Chain | 56       | Active |
| Base      | 8453     | Active |
| Optimism  | 10       | Active |
| Fantom    | 250      | Active |
| Cronos    | 25       | Active |
| Moonbeam  | -        | Active |
| Gnosis    | -        | Active |
| Kava      | -        | Active |
| Solana    | -        | Active |
| Sui       | -        | Active |
| Aptos     | -        | Active |
| Injective | -        | Active |
| Sei       | -        | Active |
| Cosmos    | -        | Active |
| Osmosis   | -        | Active |
| Juno      | -        | Active |
| Celestia  | -        | Active |
| Tron      | -        | Active |
| TON       | -        | Active |
| Near      | -        | Active |
| Aurora    | -        | Active |
| Celo      | -        | Active |
| Starknet  | -        | Active |
| Blast     | -        | Active |
| Cardano   | -        | Active |
| Polkadot  | -        | Active |
| Mantle    | -        | Active |
| Linea     | -        | Active |
| Scroll    | -        | Active |
| zkSync    | -        | Active |
| Moonriver | -        | Active |
| Metis     | -        | Active |
| StarkEx   | -        | Active |

### Features

- **Open-Source** - Fully transparent oracle infrastructure
- **Cross-Chain** - Native multi-chain support (35+ blockchains)
- **NFT Data Feeds** - Specialized NFT floor price data
- **Transparent Methodology** - Public data sourcing methods
- **Comprehensive Token Data** - On-chain data including supply, market cap, exchange volume

### Implementation

```typescript
import { DIADataService, getDIADataService } from '@/lib/oracles/diaDataService';
import { Blockchain } from '@/types/oracle';

// Get service instance (singleton pattern)
const diaService = getDIADataService();

// Get asset price
const priceData = await diaService.getAssetPrice('BTC', Blockchain.ETHEREUM);

// Get historical prices
const historicalData = await diaService.getHistoricalPrices('ETH', Blockchain.ETHEREUM, 24);

// Get NFT floor price
const nftFloorPrice = await diaService.getNFTFloorPrice('0x...', Blockchain.ETHEREUM);

// Get token full on-chain data
const tokenData = await diaService.getTokenOnChainData('DIA', Blockchain.ETHEREUM);
```

### Service Architecture

DIA uses a modular service architecture:

```
src/lib/oracles/
├── diaDataService.ts      # Main service entry
├── diaPriceService.ts     # Price data service
├── diaNFTService.ts       # NFT floor price service
├── diaNetworkService.ts   # Network statistics service
├── diaTypes.ts            # Type definitions
├── diaUtils.ts            # Utility functions
└── constants/
    ├── chainMapping.ts    # Blockchain name mapping
    └── assetAddresses.ts  # Asset contract addresses
```

### Extended Types

```typescript
// NFT floor price data
interface DIANFTQuotation {
  Symbol: string;
  Address: string;
  Blockchain: string;
  Price: number;
  PriceYesterday: number;
  Time: string;
  Source: string;
}

// Token supply data
interface DIASupply {
  Symbol: string;
  CirculatingSupply: number;
  TotalSupply: number;
  MaxSupply: number | null;
  Source: string;
  Time: string;
}

// Exchange data
interface DIAExchange {
  Name: string;
  Centralized: boolean;
  ScraperActive: boolean;
  Volume24h: number;
  Pairs: number;
}

// Token full on-chain data
interface DIATokenOnChainData {
  symbol: string;
  price: number;
  change24hPercent: number;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  marketCap: number | null;
  exchangeCount: number;
  activeExchangeCount: number;
  totalTradingPairs: number;
  totalVolume24h: number;
  lastUpdated: number;
  dataSource: string;
}
```

### Blockchain Name Mapping

DIA uses specific blockchain name mapping:

```typescript
const DIA_BLOCKCHAIN_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  ETHEREUM: 'Ethereum',
  ARBITRUM: 'Arbitrum',
  POLYGON: 'Polygon',
  AVALANCHE: 'Avalanche',
  'BNB-CHAIN': 'BinanceSmartChain',
  BASE: 'Base',
  OPTIMISM: 'Optimism',
  FANTOM: 'Fantom',
  CRONOS: 'Cronos',
  MOONBEAM: 'Moonbeam',
  GNOSIS: 'Gnosis',
  KAVA: 'Kava',
  // ... more chains
};
```

### Network Metrics

| Metric             | Value  |
| ------------------ | ------ |
| Data Feeds         | 2,000+ |
| NFT Collections    | 150+   |
| Update Frequency   | 60s    |
| Transparency Score | 98%    |
| Open Source Repos  | 25+    |
| Supported Chains   | 35+    |

---

## WINkLink Integration

**Provider:** `winklink`  
**Symbol:** WINKLINK  
**Default Chain:** BNB Chain

### Supported Chains

| Chain     | Chain ID | Status |
| --------- | -------- | ------ |
| BNB Chain | 56       | Active |
| TRON      | -        | Active |
| Ethereum  | 1        | Active |

### Features

- **TRON Ecosystem** - Native integration with TRON network
- **Gaming Data Feeds** - Specialized data for gaming applications
- **Entertainment Focus** - Entertainment and media data
- **Cross-Platform** - Multi-platform oracle services

### Implementation

```typescript
import { WINkLinkClient } from '@/lib/oracles';

const client = new WINkLinkClient();

const priceData = await client.getPrice('TRX', Blockchain.BNB_CHAIN);
const gamingData = await client.getGamingData();
const tronStats = await client.getTRONEcosystemStats();
```

### Extended Types

```typescript
interface GamingData {
  gameId: string;
  playerCount: number;
  volume24h: number;
  avgBetSize: number;
  platformFee: number;
}

interface TRONEcosystemStats {
  totalTransactions: number;
  activeAddresses: number;
  tvl: number;
  gamingVolume: number;
}
```

### Network Metrics

| Metric             | Value |
| ------------------ | ----- |
| TRON Addresses     | 2.5M+ |
| Gaming Platforms   | 50+   |
| Daily Transactions | 1M+   |
| TVL                | $800M |
| Data Feeds         | 80+   |

---

## TWAP Integration

**Provider:** `twap`
**Symbol:** UNI
**Default Chain:** Ethereum

### Supported Chains

| Chain     | Chain ID | Status |
| --------- | -------- | ------ |
| Ethereum  | 1        | Active |
| Arbitrum  | 42161    | Active |
| Optimism  | 10       | Active |
| Polygon   | 137      | Active |
| Base      | 8453     | Active |
| BNB Chain | 56       | Active |

### Features

- **On-Chain TWAP Data** - Time-weighted average prices directly from Uniswap V3 pools
- **Spot Price Comparison** - Real-time spot price alongside TWAP for deviation analysis
- **Liquidity Monitoring** - Pool liquidity tracking with confidence scoring
- **RPC Fallback** - Multiple RPC endpoints with health tracking and automatic recovery
- **Confidence Scoring** - Based on liquidity score and TWAP-spot deviation
- **Caching** - 30-second TTL in-memory cache for performance

### Implementation

```typescript
import { TWAPClient } from '@/lib/oracles';

const client = new TWAPClient({ useRealData: true });

const priceData = await client.getPrice('ETH', Blockchain.ETHEREUM);
// Returns PriceData with TWAP-specific fields:
// - poolAddress: Uniswap V3 pool address
// - feeTier: Pool fee tier (500, 3000, 10000)
// - sqrtPriceX96: Current sqrt price
// - tick: Current tick
// - twapInterval: TWAP calculation interval
// - twapPrice: Time-weighted average price
// - spotPrice: Current spot price
// - liquidity: Pool liquidity

// Check if a symbol is supported on a specific chain
const isSupported = client.isSymbolSupported('BTC', Blockchain.ETHEREUM);

// Get supported chains for a symbol
const chains = client.getSupportedChainsForSymbol('ETH');
```

### On-Chain Service

The TWAP oracle uses a dedicated on-chain service for direct RPC calls:

```typescript
import { twapOnChainService } from '@/lib/oracles';

// Get TWAP price
const twapData = await twapOnChainService.getTwapPrice('ETH', Blockchain.ETHEREUM);

// Get spot price
const spotData = await twapOnChainService.getSpotPrice('ETH', Blockchain.ETHEREUM);

// Get pool info
const poolInfo = await twapOnChainService.getPoolInfo(poolAddress, Blockchain.ETHEREUM);

// Batch price fetching
const prices = await twapOnChainService.getPrices(['BTC', 'ETH'], Blockchain.ETHEREUM);

// Find pool address
const poolAddress = await twapOnChainService.findPoolAddress(token0, token1, Blockchain.ETHEREUM);
```

### React Hook

```typescript
import { useTwapOnChainData } from '@/hooks/oracles/useTwapOnChainData';

function TwapPriceDisplay({ symbol, chain }) {
  const { data, isLoading, error } = useTwapOnChainData({ symbol, chain });

  if (isLoading) return <TwapStatsSkeleton />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div>
      <div>TWAP Price: ${data.twapPrice}</div>
      <div>Spot Price: ${data.spotPrice}</div>
      <div>Deviation: {data.priceDeviation}%</div>
      <div>Liquidity: {data.liquidity}</div>
      <div>Confidence: {data.confidence}</div>
    </div>
  );
}
```

### Extended Types

```typescript
interface TwapPriceData {
  symbol: string;
  twapPrice: number;
  spotPrice: number;
  tick: number;
  sqrtPriceX96: string;
  liquidity: string;
  timestamp: number;
  chainId: number;
  poolAddress: string;
  feeTier: number;
  twapInterval: number;
  confidence: number;
}

interface TwapOnChainData {
  poolAddress: string;
  feeTier: number;
  liquidity: string;
  twapInterval: number;
  twapPrice: number;
  spotPrice: number;
  priceDeviation: number;
  tick: number;
  sqrtPriceX96: string;
  confidence: number;
}

interface PoolInfo {
  address: string;
  token0: string;
  token1: string;
  fee: number;
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
}
```

### TWAP Intervals

| Interval | Seconds | Description    |
| -------- | ------- | -------------- |
| SHORT    | 600     | 10-minute TWAP |
| MEDIUM   | 1800    | 30-minute TWAP |
| LONG     | 3600    | 1-hour TWAP    |

### Fee Tiers

| Tier   | Value | Description |
| ------ | ----- | ----------- |
| LOW    | 500   | 0.05% fee   |
| MEDIUM | 3000  | 0.3% fee    |
| HIGH   | 10000 | 1% fee      |

### Supported Symbols (22 tokens)

BTC, ETH, USDC, USDT, DAI, WBTC, LINK, UNI, AAVE, ARB, OP, MATIC, SNX, CRV, COMP, MKR, SUSHI, 1INCH, BAL, BNB, STETH, FRAX

### Network Metrics

| Metric            | Value  |
| ----------------- | ------ |
| Supported Chains  | 6      |
| Supported Tokens  | 22     |
| Pool Configs      | 15+    |
| Avg Response Time | 500ms  |
| Update Frequency  | 60s    |
| Cache TTL         | 30s    |
| Chain Reliability | 95-99% |

---

## Reflector Integration

**Provider:** `reflector`  
**Symbol:** XLM  
**Default Chain:** Stellar

### Supported Chains

| Chain   | Chain ID | Status |
| ------- | -------- | ------ |
| Stellar | -        | Active |

### Features

- **Stellar Ecosystem** - Native integration with Stellar network via Soroban smart contracts
- **First-Party Oracle** - Direct data from source providers
- **Crypto & Forex Assets** - Support for both cryptocurrency and foreign exchange price feeds
- **On-Chain Data** - Direct smart contract calls for price data
- **Quantifiable Security** - Transparent on-chain verification

### Implementation

```typescript
import { ReflectorClient } from '@/lib/oracles';

const client = new ReflectorClient({ useRealData: true });

const priceData = await client.getPrice('BTC', Blockchain.STELLAR);
// Returns PriceData with Reflector-specific fields

const isSupported = client.isSymbolSupported('BTC', Blockchain.STELLAR);
const symbols = client.getSupportedSymbols();
```

### On-Chain Service

Reflector uses the Soroban smart contract platform for on-chain data:

```typescript
import { getReflectorDataService } from '@/lib/oracles';

const reflectorService = getReflectorDataService();
const priceData = await reflectorService.fetchLatestPrice('BTC');
```

### Supported Assets

**Cryptocurrencies (15):**
BTC, ETH, USDT, XRP, SOL, USDC, ADA, AVAX, DOT, LINK, ATOM, XLM, UNI, EURC

**Forex Currencies (6):**
EUR, GBP, CAD, BRL, JPY, CNY

### Contract Configuration

| Contract        | Address                                                    |
| --------------- | ---------------------------------------------------------- |
| Crypto Contract | `CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN` |
| Forex Contract  | `CBKGDQGJ7GZNK2V2LGIXPR326H7F7K2MMG6WRVZJXYHONI4GJMCJZC`   |
| RPC Endpoint    | `https://rpc.ankr.com/stellar_soroban`                     |

### Network Metrics

| Metric            | Value |
| ----------------- | ----- |
| Supported Assets  | 21    |
| Update Frequency  | 5 min |
| Cache TTL         | 30s   |
| Default Decimals  | 14    |
| Avg Response Time | 500ms |

---

## Flare Integration

**Provider:** `flare`  
**Symbol:** FLR  
**Default Chain:** Flare

### Supported Chains

| Chain    | Chain ID | Status  |
| -------- | -------- | ------- |
| Flare    | 14       | Active  |
| Songbird | 19       | Testnet |
| Coston2  | 114      | Testnet |

### Features

- **FTSO V2** - Flare Time Series Oracle with on-chain data feeds
- **Validator Analytics** - Monitor validator node performance
- **On-Chain Price Feeds** - Direct FTSO contract calls for price data
- **Confidence Intervals** - Real-time bid/ask spreads
- **First-Party Oracle** - Direct data from Flare network validators
- **Quantifiable Security** - Secured by Flare network consensus

### Implementation

```typescript
import { FlareClient } from '@/lib/oracles';

const client = new FlareClient({ useRealData: true });

const priceData = await client.getPrice('BTC', Blockchain.FLARE);
// Returns PriceData with Flare-specific fields:
// - feedId: Encoded feed identifier
// - decimals: Price decimals
// - dataAge: Age of the price data

const isSupported = client.isSymbolSupported('BTC', Blockchain.FLARE);
const onChainData = await client.getTokenOnChainData('BTC');
```

### On-Chain Service

Flare uses the FTSO (Flare Time Series Oracle) system:

```typescript
import { getFtsoDataService } from '@/lib/oracles';

const ftsoService = getFtsoDataService();
const priceData = await ftsoService.fetchPrice('BTC', 'flare');
```

### Supported Symbols (38)

BTC, ETH, FLR, XRP, SOL, DOGE, ADA, BNB, AVAX, LINK, DOT, MATIC, ARB, UNI, ATOM, LTC, USDT, USDC, DAI, AAVE, NEAR, APT, OP, TRX, SHIB, TON, HBAR, FIL, XLM, SGB, ALGO, XDC, ICP, RUNE, FTM, QNT

### Contract Configuration

| Contract          | Address                                      |
| ----------------- | -------------------------------------------- |
| FTSOv2 Contract   | `0x7BDE3Df0624114eDB3A67dFe6753e62f4e7c1d20` |
| Registry Contract | `0xaD67FE6667226235497ED7B6E0e2416C2E40771B` |

### RPC Endpoints

| Network  | Endpoints                                                                 |
| -------- | ------------------------------------------------------------------------- |
| Flare    | `https://flare-api.flare.network/ext/C/rpc`, `https://rpc.ankr.com/flare` |
| Songbird | `https://songbird-api.flare.network/ext/C/rpc`                            |
| Coston2  | `https://coston2-api.flare.network/ext/C/rpc`                             |

### Network Metrics

| Metric            | Value |
| ----------------- | ----- |
| Supported Symbols | 38    |
| Update Frequency  | 90s   |
| Cache TTL         | 30s   |
| Avg Response Time | 300ms |
| Confidence Score  | 95%   |

---

## Oracle Comparison Table

| Feature                   | Chainlink | Pyth  | API3  | RedStone | DIA    | WINkLink | Supra | TWAP  | Reflector | Flare |
| ------------------------- | --------- | ----- | ----- | -------- | ------ | -------- | ----- | ----- | --------- | ----- |
| **Update Frequency**      | 60s       | 1s    | 10s   | 5s       | 60s    | 30s      | 15s   | 60s   | 5min      | 90s   |
| **Avg Response Time**     | 245ms     | 100ms | 180ms | 120ms    | 200ms  | 250ms    | 150ms | 500ms | 500ms     | 300ms |
| **Node Uptime**           | 99.9%     | 99.9% | 99.7% | 99.8%    | 99.5%  | 99.7%    | 99.8% | 99.5% | 99.5%     | 99.8% |
| **Supported Chains**      | 13        | 12    | 13    | 16       | 11     | 3        | 1     | 6     | 1         | 1     |
| **Data Feeds**            | 1,243     | 500   | 168   | 285      | 2,000+ | 80       | 200+  | 22    | 21        | 38    |
| **Node Analytics**        | ✅        | ❌    | ❌    | ❌       | ❌     | ❌       | ❌    | ❌    | ❌        | ✅    |
| **Publisher Analytics**   | ❌        | ✅    | ❌    | ❌       | ❌     | ❌       | ❌    | ❌    | ❌        | ❌    |
| **First-Party Oracle**    | ❌        | ❌    | ✅    | ❌       | ❌     | ❌       | ❌    | ❌    | ✅        | ✅    |
| **Confidence Intervals**  | ❌        | ✅    | ❌    | ❌       | ❌     | ❌       | ✅    | ✅    | ❌        | ✅    |
| **Cross-Chain Stats**     | ❌        | ❌    | ❌    | ✅       | ✅     | ❌       | ✅    | ❌    | ❌        | ❌    |
| **Coverage Pools**        | ❌        | ❌    | ✅    | ❌       | ❌     | ❌       | ❌    | ❌    | ❌        | ❌    |
| **Modular Design**        | ❌        | ❌    | ❌    | ✅       | ❌     | ❌       | ❌    | ❌    | ❌        | ❌    |
| **NFT Data**              | ❌        | ❌    | ❌    | ❌       | ✅     | ❌       | ❌    | ❌    | ❌        | ❌    |
| **Gaming Data**           | ❌        | ❌    | ❌    | ❌       | ❌     | ✅       | ❌    | ❌    | ❌        | ❌    |
| **Open Source**           | ❌        | ❌    | ❌    | ❌       | ✅     | ❌       | ❌    | ❌    | ✅        | ❌    |
| **Verifiable Randomness** | ❌        | ❌    | ❌    | ❌       | ❌     | ❌       | ✅    | ❌    | ❌        | ❌    |
| **On-Chain TWAP**         | ❌        | ❌    | ❌    | ❌       | ❌     | ❌       | ❌    | ✅    | ❌        | ❌    |
| **Spot Price**            | ❌        | ❌    | ❌    | ❌       | ❌     | ❌       | ❌    | ✅    | ❌        | ❌    |
| **Liquidity Data**        | ❌        | ❌    | ❌    | ❌       | ❌     | ❌       | ❌    | ✅    | ❌        | ❌    |
| **Data Streams**          | ❌        | ❌    | ❌    | ✅       | ❌     | ❌       | ❌    | ❌    | ❌        | ❌    |
| **Stellar Ecosystem**     | ❌        | ❌    | ❌    | ❌       | ❌     | ❌       | ❌    | ❌    | ✅        | ❌    |
| **Flare Ecosystem**       | ❌        | ❌    | ❌    | ❌       | ❌     | ❌       | ❌    | ❌    | ❌        | ✅    |

---

## Error Handling

All oracle clients use standardized error handling:

```typescript
interface OracleError {
  message: string;
  provider: OracleProvider;
  code?: string;
}
```

### Error Codes

| Code                          | Description                          |
| ----------------------------- | ------------------------------------ |
| `CHAINLINK_ERROR`             | Chainlink price fetch failed         |
| `PYTH_ERROR`                  | Pyth price fetch failed              |
| `API3_ERROR`                  | API3 price fetch failed              |
| `REDSTONE_ERROR`              | RedStone price fetch failed          |
| `DIA_ERROR`                   | DIA price fetch failed               |
| `WINKLINK_ERROR`              | WINkLink price fetch failed          |
| `REFLECTOR_ERROR`             | Reflector price fetch failed         |
| `REFLECTOR_CONTRACT_ERROR`    | Reflector contract call failed       |
| `REFLECTOR_ASSET_NOT_FOUND`   | Reflector asset not found            |
| `FLARE_ERROR`                 | Flare price fetch failed             |
| `FLARE_FTSO_ERROR`            | Flare FTSO data fetch failed         |
| `FLARE_FEED_NOT_FOUND`        | Flare feed not found for symbol      |
| `TWAP_ERROR`                  | TWAP price fetch failed              |
| `TWAP_POOL_NOT_FOUND`         | TWAP pool not found for symbol       |
| `TWAP_INSUFFICIENT_LIQUIDITY` | TWAP pool has insufficient liquidity |
| `TWAP_OBSERVATION_ERROR`      | TWAP on-chain observation failed     |
| `TWAP_HISTORICAL_ERROR`       | TWAP historical data fetch failed    |
| `*_HISTORICAL_ERROR`          | Historical data fetch failed         |
| `NETWORK_STATS_ERROR`         | Network statistics fetch failed      |
| `VALIDATORS_ERROR`            | Validator data fetch failed          |

---

## Configuration

### Environment Variables

```bash
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
```

### Storage Configuration

```typescript
import { configureStorage } from '@/lib/oracles';

configureStorage({
  enabled: true,
  defaultExpirationHours: 24,
});
```

### Client Configuration

```typescript
import { ChainlinkClient } from '@/lib/oracles';

const client = new ChainlinkClient({
  useDatabase: true,
  fallbackToMock: true,
});
```

---

## File Structure

```
src/lib/oracles/
├── index.ts              # Public exports
├── base.ts               # BaseOracleClient abstract class
├── clients/
│   ├── chainlink.ts      # Chainlink client implementation
│   ├── PythClient.ts     # Pyth client implementation
│   ├── api3.ts           # API3 client implementation
│   ├── redstone.ts       # RedStone client implementation
│   ├── dia.ts            # DIA client implementation
│   ├── winklink.ts       # WINkLink client implementation
│   ├── supra.ts          # Supra client implementation
│   ├── twap.ts           # TWAP client implementation
│   ├── reflector.ts      # Reflector client implementation
│   └── flare.ts          # Flare client implementation
├── services/
│   ├── chainlinkOnChainService.ts  # Chainlink on-chain data service
│   ├── pythDataService.ts          # Pyth data service
│   ├── diaDataService.ts           # DIA data service
│   ├── supraDataService.ts         # Supra data service
│   ├── twapOnChainService.ts       # TWAP on-chain data service
│   ├── reflectorDataService.ts     # Reflector data service
│   └── ftsoDataService.ts          # Flare FTSO data service
├── constants/
│   ├── chainlinkDataSources.ts     # Chainlink contract addresses and ABI
│   ├── pythConstants.ts            # Pyth constants
│   ├── twapConstants.ts            # TWAP constants and configuration
│   ├── reflectorConstants.ts       # Reflector constants and configuration
│   └── flareConstants.ts           # Flare constants and configuration
├── storage.ts            # Database storage layer
├── factory.ts            # Oracle client factory
├── colors.ts             # Oracle color configurations
├── interfaces.ts         # Oracle interfaces
├── OracleRepository.ts   # Oracle repository
└── utils/                # Utility functions
    ├── oracleDataUtils.ts
    ├── performanceMetricsCalculator.ts
    ├── retry.ts
    └── storage.ts

src/types/oracle/           # Oracle types
├── index.ts                # Core oracle types
├── enums.ts                # Oracle enums
├── price.ts                # Price types
├── config.ts               # Configuration types
└── ...

src/lib/config/             # Configuration
├── colors.ts               # Color configurations
├── env.ts                  # Environment variables
└── basePrices.ts           # Base price configurations
```

---

## References

- [Chainlink Documentation](https://docs.chain.link/)
- [Pyth Network Documentation](https://docs.pyth.network/)
- [API3 Documentation](https://docs.api3.org/)
- [RedStone Documentation](https://docs.redstone.finance/)
- [DIA Documentation](https://docs.diadata.org/)
- [WINkLink Documentation](https://doc.winklink.org/)
- [Supra Documentation](https://docs.supra.com/)
- [Reflector Documentation](https://reflector.network/)
- [Flare Documentation](https://docs.flare.network/)
