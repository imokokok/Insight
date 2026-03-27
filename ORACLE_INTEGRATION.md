# Oracle Integration Documentation

## Overview

The Insight Oracle Data Analytics Platform integrates with multiple leading blockchain oracle providers to deliver comprehensive price data, network analytics, and cross-chain data verification capabilities.

### Supported Providers

| Provider      | Symbol    | Default Chain | Description                               |
| ------------- | --------- | ------------- | ----------------------------------------- |
| Chainlink     | LINK      | Ethereum      | Decentralized oracle network              |
| Band Protocol | BAND      | Cosmos        | Cross-chain data oracle platform          |
| UMA           | UMA       | Ethereum      | Optimistic oracle and dispute arbitration |
| Pyth          | PYTH      | Solana        | Low-latency high-frequency price oracle   |
| API3          | API3      | Ethereum      | First-party oracle infrastructure         |
| RedStone      | REDSTONE  | Ethereum      | Modular oracle design                     |
| DIA           | DIA       | Ethereum      | Open-source cross-chain oracle            |
| Tellor        | TRB       | Ethereum      | Stake-based reporting oracle              |
| Chronicle     | CHRONICLE | Ethereum      | MakerDAO native oracle                    |
| WINkLink      | WINKLINK  | BNB Chain     | TRON ecosystem oracle                     |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Oracle Client Layer                          │
├─────────────┬─────────────┬─────────┬──────────┬───────────────┤
│ Chainlink   │ Band        │ UMA     │ Pyth     │ API3          │
│ Client      │ Protocol    │ Client  │ Client   │ Client        │
└──────┬──────┴──────┬──────┴────┬────┴────┬─────┴───────┬───────┘
       │             │           │         │             │
       └─────────────┴───────────┴─────────┴─────────────┘
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

## Band Protocol Integration

**Provider:** `band-protocol`  
**Symbol:** BAND  
**Default Chain:** Cosmos

### Supported Chains

| Chain     | Chain ID    | Status |
| --------- | ----------- | ------ |
| Cosmos    | cosmoshub-4 | Active |
| Osmosis   | osmosis-1   | Active |
| Juno      | juno-1      | Active |
| Ethereum  | 1           | Active |
| Polygon   | 137         | Active |
| Avalanche | 43114       | Active |
| Fantom    | 250         | Active |
| Cronos    | 25          | Active |
| Injective | -           | Active |
| Sei       | -           | Active |
| Kava      | -           | Active |

### Features

- **Validator Analytics**: Comprehensive validator monitoring and performance tracking
- **Cross-Chain Stats**: Multi-chain request statistics and latency metrics
- **Technical Indicators**: Moving averages, standard deviations, and price bands

### Implementation

```typescript
import { BandProtocolClient } from '@/lib/oracles';

const client = new BandProtocolClient();

const priceData = await client.getPrice('BAND', Blockchain.COSMOS);
const marketData = await client.getBandMarketData();
const validators = await client.getValidators(50);
const networkStats = await client.getNetworkStats();
const crossChainStats = await client.getCrossChainStats();
```

### Extended Types

```typescript
interface BandMarketData {
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number;
  stakingRatio: number;
  stakingApr: number;
  timestamp: number;
}

interface ValidatorInfo {
  operatorAddress: string;
  moniker: string;
  tokens: number;
  commissionRate: number;
  uptime: number;
  jailed: boolean;
  rank: number;
}

interface BandNetworkStats {
  activeValidators: number;
  totalValidators: number;
  bondedTokens: number;
  totalSupply: number;
  stakingRatio: number;
  blockTime: number;
  latestBlockHeight: number;
  inflationRate: number;
  communityPool: number;
}
```

### Network Metrics

| Metric            | Value    |
| ----------------- | -------- |
| Active Validators | 65-75    |
| Total Validators  | 72-87    |
| Bonded Tokens     | 85M BAND |
| Staking Ratio     | ~51.5%   |
| Block Time        | 2.8s     |
| Inflation Rate    | 7-10%    |

---

## UMA Integration

**Provider:** `uma`  
**Symbol:** UMA  
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
| Avalanche | 43114    | Active |
| Fantom    | 250      | Active |
| Gnosis    | -        | Active |

### Features

- **Optimistic Oracle**: Trust-minimized data verification
- **Dispute Resolution**: Comprehensive dispute tracking and voting analytics
- **Validator Analytics**: Performance monitoring with earnings attribution
- **Staking Rewards**: APR calculation based on validator type and dispute frequency

### Implementation

```typescript
import { UMAClient } from '@/lib/oracles';

const client = new UMAClient();

const priceData = await client.getPrice('UMA', Blockchain.ETHEREUM);
const validators = await client.getValidators();
const disputes = await client.getDisputes();
const networkStats = await client.getNetworkStats();
const qualityScore = await client.getDataQualityScore();
const stakingRewards = await client.calculateStakingRewards(10000, 'institution', 'medium');
```

### Dispute Types

| Type        | Description                 | Color Code        |
| ----------- | --------------------------- | ----------------- |
| Price       | Price verification disputes | Blue (#3b82f6)    |
| State       | State assertion disputes    | Emerald (#10b981) |
| Liquidation | Liquidation verification    | Amber (#f59e0b)   |
| Other       | General disputes            | Slate (#64748b)   |

### Extended Types

```typescript
interface DisputeData {
  id: string;
  timestamp: number;
  status: 'active' | 'resolved' | 'rejected';
  type: DisputeType;
  stakeAmount: number;
  rewardAmount: number;
  totalValue: number;
  resolutionTime?: number;
  transactionHash: string;
}

interface ValidatorData {
  id: string;
  name: string;
  type: 'institution' | 'independent' | 'community';
  region: string;
  responseTime: number;
  successRate: number;
  reputation: number;
  staked: number;
  earnings: number;
  address: string;
}

interface DataQualityScore {
  overallScore: number;
  networkHealth: { score: number; trend: 'up' | 'down' | 'stable' };
  dataIntegrity: { score: number; trend: 'up' | 'down' | 'stable' };
  responseTime: { score: number; trend: 'up' | 'down' | 'stable' };
  validatorActivity: { score: number; trend: 'up' | 'down' | 'stable' };
}
```

### Network Metrics

| Metric               | Value   |
| -------------------- | ------- |
| Active Validators    | 850     |
| Validator Uptime     | 99.5%   |
| Total Staked         | 25M UMA |
| Total Disputes       | 1,250   |
| Dispute Success Rate | 78%     |
| Avg Resolution Time  | 4.2h    |
| Active Disputes      | 23      |

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
  STARKEX = 'starkex',
}
```

### Oracle Provider Enum

```typescript
enum OracleProvider {
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
import { ChainlinkClient, BandProtocolClient, PythClient, OracleProvider } from '@/lib/oracles';

const clients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.PYTH]: new PythClient(),
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
| Fantom    | 250      | Active |
| Cronos    | 25       | Active |
| Moonbeam  | -        | Active |
| Gnosis    | -        | Active |
| Kava      | -        | Active |

### Features

- **Open-Source** - Fully transparent oracle infrastructure
- **Cross-Chain** - Native multi-chain support
- **NFT Data Feeds** - Specialized NFT floor price data
- **Transparent Methodology** - Public data sourcing methods

### Implementation

```typescript
import { DIAClient } from '@/lib/oracles';

const client = new DIAClient();

const priceData = await client.getPrice('BTC', Blockchain.ETHEREUM);
const nftData = await client.getNFTFloorPrice('cryptopunks');
const methodology = await client.getMethodology();
```

### Extended Types

```typescript
interface NFTFloorPrice {
  collection: string;
  floorPrice: number;
  currency: string;
  lastUpdate: number;
  volume24h: number;
  source: string;
}

interface DIAMethodology {
  dataSource: string;
  updateFrequency: number;
  validationMethod: string;
  transparencyScore: number;
}
```

### Network Metrics

| Metric             | Value  |
| ------------------ | ------ |
| Data Feeds         | 2,000+ |
| NFT Collections    | 150+   |
| Update Frequency   | 60s    |
| Transparency Score | 98%    |
| Open Source Repos  | 25+    |

---

## Tellor Integration

**Provider:** `tellor`  
**Symbol:** TRB  
**Default Chain:** Ethereum

### Supported Chains

| Chain     | Chain ID | Status |
| --------- | -------- | ------ |
| Ethereum  | 1        | Active |
| Arbitrum  | 42161    | Active |
| Optimism  | 10       | Active |
| Polygon   | 137      | Active |
| Base      | 8453     | Active |
| Avalanche | 43114    | Active |
| BNB Chain | 56       | Active |
| Fantom    | 250      | Active |
| Moonbeam  | -        | Active |
| Gnosis    | -        | Active |

### Features

- **Stake-Based Reporting** - Reporters stake TRB to submit data
- **Dispute Mechanism** - Community-driven dispute resolution
- **Mining Rewards** - Incentivized data reporting
- **Decentralized Governance** - Community-controlled upgrades

### Implementation

```typescript
import { TellorClient } from '@/lib/oracles';

const client = new TellorClient();

const priceData = await client.getPrice('ETH', Blockchain.ETHEREUM);
const stakeInfo = await client.getStakeInfo();
const disputes = await client.getActiveDisputes();
```

### Extended Types

```typescript
interface StakeInfo {
  totalStaked: number;
  minimumStake: number;
  reporterCount: number;
  rewardRate: number;
}

interface DisputeInfo {
  id: string;
  disputedValue: number;
  proposedValue: number;
  status: 'active' | 'resolved';
  stakeAmount: number;
}
```

### Network Metrics

| Metric           | Value   |
| ---------------- | ------- |
| Total Staked TRB | 2.5M    |
| Active Reporters | 180     |
| Dispute Success  | 92%     |
| Avg Reward       | 2.5 TRB |
| Block Reward     | 2.5 TRB |

---

## Chronicle Integration

**Provider:** `chronicle`  
**Symbol:** CHRONICLE  
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
| Avalanche | 43114    | Active |
| Fantom    | 250      | Active |
| Gnosis    | -        | Active |

### Features

- **MakerDAO Native** - Official oracle for MakerDAO ecosystem
- **Scuttlebutt Protocol** - Peer-to-peer gossip protocol
- **On-Chain Verification** - Cryptographic proof of data validity
- **DAI Integration** - Native support for DAI stablecoin

### Implementation

```typescript
import { ChronicleClient } from '@/lib/oracles';

const client = new ChronicleClient();

const priceData = await client.getPrice('ETH', Blockchain.ETHEREUM);
const scuttlebuttInfo = await client.getScuttlebuttStats();
const makerDAOStats = await client.getMakerDAOIntegration();
```

### Extended Types

```typescript
interface ScuttlebuttStats {
  activeNodes: number;
  gossipMessages: number;
  networkLatency: number;
  syncRate: number;
}

interface MakerDAOIntegration {
  vaultsSecured: number;
  totalDAIIssued: number;
  collateralTypes: string[];
  stabilityFee: number;
}
```

### Network Metrics

| Metric            | Value   |
| ----------------- | ------- |
| MakerDAO Vaults   | 15,000+ |
| Total DAI Secured | $5.2B   |
| Scuttlebutt Nodes | 45      |
| Avg Sync Time     | 200ms   |
| Uptime            | 99.99%  |

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

## Oracle Comparison Table

| Feature                  | Chainlink | Band Protocol | UMA   | Pyth  | API3  | RedStone | DIA    | Tellor | Chronicle | WINkLink |
| ------------------------ | --------- | ------------- | ----- | ----- | ----- | -------- | ------ | ------ | --------- | -------- |
| **Update Frequency**     | 60s       | 30s           | 120s  | 1s    | 10s   | 5s       | 60s    | 300s   | 60s       | 30s      |
| **Avg Response Time**    | 245ms     | 150ms         | 300ms | 100ms | 180ms | 120ms    | 200ms  | 400ms  | 200ms     | 250ms    |
| **Node Uptime**          | 99.9%     | 99.85%        | 99.7% | 99.9% | 99.7% | 99.8%    | 99.5%  | 99.6%  | 99.99%    | 99.7%    |
| **Supported Chains**     | 13        | 11            | 9     | 12    | 13    | 16       | 11     | 10     | 9         | 3        |
| **Data Feeds**           | 1,243     | 180           | 50    | 500   | 168   | 285      | 2,000+ | 100    | 45        | 80       |
| **Node Analytics**       | ✅        | ❌            | ❌    | ❌    | ❌    | ❌       | ❌     | ❌     | ❌        | ❌       |
| **Validator Analytics**  | ❌        | ✅            | ✅    | ❌    | ❌    | ❌       | ❌     | ❌     | ❌        | ❌       |
| **Publisher Analytics**  | ❌        | ❌            | ❌    | ✅    | ❌    | ❌       | ❌     | ❌     | ❌        | ❌       |
| **Dispute Resolution**   | ❌        | ❌            | ✅    | ❌    | ❌    | ❌       | ❌     | ✅     | ❌        | ❌       |
| **First-Party Oracle**   | ❌        | ❌            | ❌    | ❌    | ✅    | ❌       | ❌     | ❌     | ❌        | ❌       |
| **Confidence Intervals** | ❌        | ❌            | ❌    | ✅    | ❌    | ❌       | ❌     | ❌     | ❌        | ❌       |
| **Cross-Chain Stats**    | ❌        | ✅            | ❌    | ❌    | ❌    | ✅       | ✅     | ❌     | ❌        | ❌       |
| **Coverage Pools**       | ❌        | ❌            | ❌    | ❌    | ✅    | ❌       | ❌     | ❌     | ❌        | ❌       |
| **Modular Design**       | ❌        | ❌            | ❌    | ❌    | ❌    | ✅       | ❌     | ❌     | ❌        | ❌       |
| **NFT Data**             | ❌        | ❌            | ❌    | ❌    | ❌    | ❌       | ✅     | ❌     | ❌        | ❌       |
| **Gaming Data**          | ❌        | ❌            | ❌    | ❌    | ❌    | ❌       | ❌     | ❌     | ❌        | ✅       |
| **Open Source**          | ❌        | ❌            | ❌    | ❌    | ❌    | ❌       | ✅     | ✅     | ❌        | ❌       |

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

| Code                  | Description                      |
| --------------------- | -------------------------------- |
| `CHAINLINK_ERROR`     | Chainlink price fetch failed     |
| `BAND_PROTOCOL_ERROR` | Band Protocol price fetch failed |
| `UMA_ERROR`           | UMA price fetch failed           |
| `PYTH_ERROR`          | Pyth price fetch failed          |
| `API3_ERROR`          | API3 price fetch failed          |
| `REDSTONE_ERROR`      | RedStone price fetch failed      |
| `DIA_ERROR`           | DIA price fetch failed           |
| `TELLOR_ERROR`        | Tellor price fetch failed        |
| `CHRONICLE_ERROR`     | Chronicle price fetch failed     |
| `WINKLINK_ERROR`      | WINkLink price fetch failed      |
| `*_HISTORICAL_ERROR`  | Historical data fetch failed     |
| `NETWORK_STATS_ERROR` | Network statistics fetch failed  |
| `VALIDATORS_ERROR`    | Validator data fetch failed      |

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
├── chainlink.ts          # Chainlink client implementation
├── bandProtocol.ts       # Band Protocol client implementation
├── uma/                  # UMA client implementation
│   ├── client.ts
│   ├── types.ts
│   └── components.tsx
├── pythNetwork.ts        # Pyth client implementation
├── pythHermesClient.ts   # Pyth Hermes API client
├── api3.ts               # API3 client implementation
├── redstone.ts           # RedStone client implementation
├── dia.ts                # DIA client implementation
├── tellor.ts             # Tellor client implementation
├── chronicle.ts          # Chronicle client implementation
├── winklink.ts           # WINkLink client implementation
├── storage.ts            # Database storage layer
├── factory.ts            # Oracle client factory
├── colors.ts             # Oracle color configurations
└── utils.ts              # Utility functions

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
- [Band Protocol Documentation](https://docs.bandchain.org/)
- [UMA Documentation](https://docs.umaproject.org/)
- [Pyth Network Documentation](https://docs.pyth.network/)
- [API3 Documentation](https://docs.api3.org/)
- [RedStone Documentation](https://docs.redstone.finance/)
- [DIA Documentation](https://docs.diadata.org/)
- [Tellor Documentation](https://docs.tellor.io/)
- [Chronicle Documentation](https://docs.chroniclelabs.org/)
- [WINkLink Documentation](https://doc.winklink.org/)
