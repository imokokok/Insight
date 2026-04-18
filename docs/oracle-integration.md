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
| WINkLink  | WINKLINK | TRON          | TRON ecosystem oracle                                 |
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
  abstract getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: PriceFetchOptions
  ): Promise<PriceData>;
  abstract getSupportedSymbols(): string[];

  getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number,
    options?: PriceFetchOptions
  ): Promise<PriceData[]>;
  isSymbolSupported(symbol: string, chain?: Blockchain): boolean;
  getSupportedChainsForSymbol(symbol: string): Blockchain[];
  getUpdateInterval(chain?: Blockchain): number;
}
```

### Configuration

```typescript
interface OracleClientConfig {
  useDatabase?: boolean; // Enable database caching (default: true)
  validateData?: boolean; // Validate price data (default: true)
  useRealData?: boolean; // Use real data vs mock (default: true)
}
```

### Storage Layer

The storage layer provides database caching with TTL support via [utils/storage.ts](src/lib/oracles/utils/storage.ts):

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
| BNB Chain | 56       | Active |
| Base      | 8453     | Active |

### Features

- **On-Chain Data**: Direct Chainlink Data Feeds integration via on-chain contract calls
- **Node Analytics**: Monitor node performance, uptime, and response times
- **Market Data**: Real-time market cap, volume, and supply information
- **Network Data**: Active nodes, data feeds, and hourly activity metrics
- **Per-Chain Quality Config**: Reliability scores per chain

### Implementation

```typescript
import { ChainlinkClient } from '@/lib/oracles';

const client = new ChainlinkClient({ useRealData: true });

const priceData = await client.getPrice('LINK', Blockchain.ETHEREUM);
const history = await client.getHistoricalPrices('LINK', Blockchain.ETHEREUM, 24);
const isSupported = client.isSymbolSupported('BTC', Blockchain.ETHEREUM);
const symbolsForChain = client.getSupportedSymbolsForChain(Blockchain.ETHEREUM);
```

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
| BNB Chain | 56           | Active |
| Aptos     | -            | Active |
| Sui       | -            | Active |
| Base      | 8453         | Active |

### Features

- **Publisher Analytics**: Monitor data publisher performance and reliability
- **High-Frequency Updates**: 1-second update intervals
- **Confidence Intervals**: Real-time bid/ask spreads with width percentages
- **Pyth Data Service**: Modular Pyth data service with caching, WebSocket, and parser

### Implementation

```typescript
import { PythClient } from '@/lib/oracles';

const client = new PythClient();

const priceData = await client.getPrice('PYTH', Blockchain.SOLANA);
const isSupported = client.isSymbolSupported('BTC', Blockchain.ETHEREUM);
const chainsForSymbol = client.getSupportedChainsForSymbol('BTC');
```

### Confidence Interval

```typescript
interface ConfidenceInterval {
  bid: number; // Lower bound price
  ask: number; // Upper bound price
  widthPercentage: number; // Spread as percentage
}
```

### Pyth Module Architecture

```
src/lib/oracles/pyth/
├── PythDataService.ts    # Main data service
├── calculations.ts       # Price calculations
├── crossChain.ts         # Cross-chain logic
├── metadataFetching.ts   # Metadata fetching
├── priceFetching.ts      # Price fetching
├── pythCache.ts          # Caching layer
├── pythParser.ts         # Data parser
├── pythWebSocket.ts      # WebSocket client
├── types.ts              # Type definitions
└── index.ts
```

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
| BNB Chain | 56       | Active |
| Base      | 8453     | Active |
| Optimism  | 10       | Active |

### Features

- **First-Party Oracle**: Direct data from source providers
- **Quantifiable Security**: Coverage pools and insurance mechanisms
- **Airnode Network**: Decentralized first-party oracle nodes
- **dAPIs**: Decentralized API price feeds
- **On-Chain Data**: Real price data via API3 network service

### Implementation

```typescript
import { API3Client } from '@/lib/oracles';

const client = new API3Client({ useRealData: true });

const priceData = await client.getPrice('API3', Blockchain.ETHEREUM);
```

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
  STELLAR = 'stellar',
  FLARE = 'flare',
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
import { getOracleClient, getAllOracleClients, OracleProvider } from '@/lib/oracles';

const client = getOracleClient(OracleProvider.CHAINLINK);
const priceData = await client.getPrice('ETH');

const allClients = getAllOracleClients();
const prices = await Promise.all(
  Object.entries(allClients).map(async ([provider, client]) => {
    const data = await client.getPrice('ETH');
    return { provider, price: data.price, confidence: data.confidence };
  })
);
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

### Features

- **Modular Oracle Design** - Flexible data delivery mechanisms
- **Data Streams** - Real-time streaming data feeds
- **Cross-Chain Support** - Multi-chain data availability
- **Cost Efficiency** - Optimized gas usage for data updates
- **REST API** - Direct RedStone Rapid API integration

### Implementation

```typescript
import { RedStoneClient } from '@/lib/oracles';

const client = new RedStoneClient();

const priceData = await client.getPrice('ETH', Blockchain.ETHEREUM);
const onChainData = await client.getTokenOnChainData('ETH');
client.clearCache();
```

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

### Features

- **Open-Source** - Fully transparent oracle infrastructure
- **Cross-Chain** - Native multi-chain support
- **NFT Data Feeds** - Specialized NFT floor price data
- **Transparent Methodology** - Public data sourcing methods
- **Comprehensive Token Data** - On-chain data including supply, market cap, exchange volume

### Implementation

```typescript
import { getDIADataService } from '@/lib/oracles/services/diaDataService';
import { Blockchain } from '@/types/oracle';

const diaService = getDIADataService();

const priceData = await diaService.getAssetPrice('BTC', Blockchain.ETHEREUM);
const nftFloorPrice = await diaService.getNFTFloorPrice('0x...', Blockchain.ETHEREUM);
const tokenData = await diaService.getTokenOnChainData('DIA', Blockchain.ETHEREUM);
```

### Service Architecture

DIA uses a modular service architecture:

```
src/lib/oracles/services/
├── diaDataService.ts      # Main service entry
├── diaPriceService.ts     # Price data service
├── diaNFTService.ts       # NFT floor price service
└── diaNetworkService.ts   # Network statistics service
```

---

## WINkLink Integration

**Provider:** `winklink`  
**Symbol:** WINKLINK  
**Default Chain:** TRON

### Supported Chains

| Chain | Chain ID | Status |
| ----- | -------- | ------ |
| TRON  | -        | Active |

### Features

- **TRON Ecosystem** - Native integration with TRON network
- **On-Chain Contract Price** - Direct contract price fetching via WINkLink real data service
- **Symbol Aliases** - Flexible symbol resolution for alternate token names

### Implementation

```typescript
import { WINkLinkClient } from '@/lib/oracles';

const client = new WINkLinkClient();

const priceData = await client.getPrice('TRX', Blockchain.TRON);
```

---

## Supra Integration

**Provider:** `supra`  
**Symbol:** SUPRA  
**Default Chain:** Ethereum

### Supported Chains

| Chain     | Chain ID | Status |
| --------- | -------- | ------ |
| Ethereum  | 1        | Active |
| Arbitrum  | 42161    | Active |
| Optimism  | 10       | Active |
| Polygon   | 137      | Active |
| Base      | 8453     | Active |
| Solana    | -        | Active |
| BNB Chain | 56       | Active |
| Avalanche | 43114    | Active |
| zkSync    | -        | Active |
| Scroll    | -        | Active |
| Mantle    | -        | Active |
| Linea     | -        | Active |

### Features

- **DORA Price Feeds** - Supra DORA (Decentralized Oracle Ring Architecture) price data
- **Verifiable Randomness** - High-performance oracle with verifiable randomness
- **Cross-Chain Data Feeds** - Multi-chain data availability
- **Supra Oracle SDK** - Integration with `supra-oracle-sdk`
- **Pair Index Mapping** - Symbol-to-index mapping for efficient lookups

### Implementation

```typescript
import { SupraClient } from '@/lib/oracles';

const client = new SupraClient();

const priceData = await client.getPrice('ETH', Blockchain.ETHEREUM);
const onChainData = await client.getTokenOnChainData('ETH');
client.clearCache();
```

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
// - poolAddress, feeTier, sqrtPriceX96, tick
// - twapInterval, twapPrice, spotPrice, liquidity

const isSupported = client.isSymbolSupported('BTC', Blockchain.ETHEREUM);
const chains = client.getSupportedChainsForSymbol('ETH');
```

### On-Chain Service

```typescript
import { twapOnChainService } from '@/lib/oracles/services/twapOnChainService';

const twapData = await twapOnChainService.getTwapPrice('ETH', Blockchain.ETHEREUM);
const spotData = await twapOnChainService.getSpotPrice('ETH', Blockchain.ETHEREUM);
const poolInfo = await twapOnChainService.getPoolInfo(poolAddress, Blockchain.ETHEREUM);
const prices = await twapOnChainService.getPrices(['BTC', 'ETH'], Blockchain.ETHEREUM);
```

### React Hook

```typescript
import { useTwapOnChainData } from '@/hooks/oracles/useTwapOnChainData';

function TwapPriceDisplay({ symbol, chain }) {
  const { data, isLoading, error } = useTwapOnChainData({ symbol, chain });
  // ...
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
const isSupported = client.isSymbolSupported('BTC', Blockchain.STELLAR);
const symbols = client.getSupportedSymbols();
```

### On-Chain Service

```typescript
import { getReflectorDataService } from '@/lib/oracles/services/reflectorDataService';

const reflectorService = getReflectorDataService();
const priceData = await reflectorService.fetchLatestPrice('BTC');
```

### Supported Assets

**Cryptocurrencies (14):**
BTC, ETH, USDT, XRP, SOL, USDC, ADA, AVAX, DOT, LINK, ATOM, XLM, UNI, EURC

**Forex Currencies (6):**
EUR, GBP, CAD, BRL, JPY, CNY

### Contract Configuration

| Contract        | Address                                                    |
| --------------- | ---------------------------------------------------------- |
| Crypto Contract | `CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN` |
| Forex Contract  | `CBKGDQGJ7GZNK2V2LGIXPR326H7F7K2MMG6WRVZJXYHONI4GJMCJZC`   |
| RPC Endpoint    | `https://rpc.ankr.com/stellar_soroban`                     |

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
// - feedId, decimals, dataAge

const isSupported = client.isSymbolSupported('BTC', Blockchain.FLARE);
const onChainData = await client.getTokenOnChainData('BTC');
client.clearCache();
```

### On-Chain Service

```typescript
import { getFtsoDataService } from '@/lib/oracles/services/ftsoDataService';

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

---

## Oracle Comparison Table

| Feature                   | Chainlink | Pyth | API3 | RedStone | DIA | WINkLink | Supra | TWAP | Reflector | Flare |
| ------------------------- | --------- | ---- | ---- | -------- | --- | -------- | ----- | ---- | --------- | ----- |
| **Update Frequency**      | 60s       | 1s   | 1s   | 10s      | 5s  | 60s      | 5s    | 1s   | 5min      | 1.5s  |
| **Supported Chains**      | 7         | 10   | 7    | 12       | 6   | 1        | 12    | 6    | 1         | 1     |
| **First-Party Oracle**    | ❌        | ❌   | ✅   | ❌       | ❌  | ❌       | ❌    | ❌   | ✅        | ✅    |
| **Confidence Intervals**  | ❌        | ✅   | ❌   | ✅       | ❌  | ❌       | ❌    | ✅   | ❌        | ✅    |
| **Cross-Chain Stats**     | ✅        | ✅   | ✅   | ❌       | ❌  | ❌       | ❌    | ❌   | ❌        | ❌    |
| **Coverage Pools**        | ❌        | ❌   | ✅   | ❌       | ❌  | ❌       | ❌    | ❌   | ❌        | ❌    |
| **Modular Design**        | ❌        | ❌   | ❌   | ✅       | ❌  | ❌       | ❌    | ❌   | ❌        | ❌    |
| **NFT Data**              | ❌        | ❌   | ❌   | ❌       | ✅  | ❌       | ❌    | ❌   | ❌        | ❌    |
| **Open Source**           | ❌        | ❌   | ❌   | ❌       | ✅  | ❌       | ❌    | ❌   | ✅        | ❌    |
| **Verifiable Randomness** | ❌        | ❌   | ❌   | ❌       | ❌  | ❌       | ✅    | ❌   | ❌        | ❌    |
| **On-Chain TWAP**         | ❌        | ❌   | ❌   | ❌       | ❌  | ❌       | ❌    | ✅   | ❌        | ❌    |
| **Spot Price**            | ❌        | ❌   | ❌   | ❌       | ❌  | ❌       | ❌    | ✅   | ❌        | ❌    |
| **Liquidity Data**        | ❌        | ❌   | ❌   | ❌       | ❌  | ❌       | ❌    | ✅   | ❌        | ❌    |
| **Data Streams**          | ❌        | ❌   | ❌   | ✅       | ❌  | ❌       | ❌    | ❌   | ❌        | ❌    |
| **Stellar Ecosystem**     | ❌        | ❌   | ❌   | ❌       | ❌  | ❌       | ❌    | ❌   | ✅        | ❌    |
| **Flare Ecosystem**       | ❌        | ❌   | ❌   | ❌       | ❌  | ❌       | ❌    | ❌   | ❌        | ✅    |

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
| `SUPRA_ERROR`                 | Supra price fetch failed             |
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
| `SYMBOL_NOT_SUPPORTED`        | Symbol not supported by provider     |
| `NO_DATA_AVAILABLE`           | No data available for the request    |
| `PROVIDER_UNAVAILABLE`        | Oracle provider is unavailable       |

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
  validateData: true,
  useRealData: true,
});
```

---

## File Structure

```
src/lib/oracles/
├── index.ts                  # Public exports
├── base.ts                   # BaseOracleClient abstract class
├── factory.ts                # OracleClientFactory (singleton)
├── interfaces.ts             # IOracleClient, IOracleClientFactory
├── api3CrossChain.ts         # API3 cross-chain comparison
├── chainlinkCrossChain.ts    # Chainlink cross-chain comparison
├── pythCrossChain.ts         # Pyth cross-chain comparison
├── crossChainComparison.ts   # Cross-chain comparison utilities
├── diaTypes.ts               # DIA type definitions
├── diaUtils.ts               # DIA utility functions
│
├── base/
│   └── databaseOperations.ts # Database operations for oracle data
│
├── clients/
│   ├── chainlink.ts          # Chainlink client
│   ├── PythClient.ts         # Pyth client
│   ├── api3.ts               # API3 client
│   ├── redstone.ts           # RedStone client
│   ├── dia.ts                # DIA client
│   ├── winklink.ts           # WINkLink client
│   ├── supra.ts              # Supra client
│   ├── twap.ts               # TWAP client
│   ├── reflector.ts          # Reflector client
│   └── flare.ts              # Flare client
│
├── constants/
│   ├── assetAddresses.ts     # Multi-chain asset addresses
│   ├── chainMapping.ts       # Blockchain name mapping (DIA)
│   ├── flareConstants.ts     # Flare FTSO constants
│   ├── nftCollections.ts     # NFT collection addresses
│   ├── pythConstants.ts      # Pyth price feed IDs
│   ├── pythPublishersData.ts # Pyth publisher data
│   ├── redstoneConstants.ts  # RedStone API constants
│   ├── reflectorConstants.ts # Reflector Soroban constants
│   ├── supportedSymbols.ts   # Supported symbol lists
│   ├── supraConstants.ts     # Supra pair index map
│   └── twapConstants.ts      # TWAP pool/factory addresses
│
├── pyth/
│   ├── PythDataService.ts    # Pyth data service
│   ├── calculations.ts       # Pyth price calculations
│   ├── crossChain.ts         # Pyth cross-chain logic
│   ├── metadataFetching.ts   # Pyth metadata fetching
│   ├── priceFetching.ts      # Pyth price fetching
│   ├── pythCache.ts          # Pyth caching layer
│   ├── pythParser.ts         # Pyth data parser
│   ├── pythWebSocket.ts      # Pyth WebSocket client
│   ├── types.ts              # Pyth types
│   └── index.ts
│
├── services/
│   ├── api3NetworkService.ts       # API3 network data service
│   ├── chainlinkDataSources.ts     # Chainlink data source config
│   ├── chainlinkOnChainService.ts  # Chainlink on-chain data
│   ├── diaDataService.ts           # DIA main service entry
│   ├── diaNFTService.ts            # DIA NFT floor price service
│   ├── diaNetworkService.ts        # DIA network stats service
│   ├── diaPriceService.ts          # DIA price data service
│   ├── ftsoDataService.ts          # Flare FTSO data service
│   ├── marketDataDefaults.ts       # Market data defaults
│   ├── pythDataService.ts          # Pyth data service
│   ├── reflectorDataService.ts     # Reflector Soroban service
│   ├── supraDataService.ts         # Supra DORA service
│   ├── twapOnChainService.ts       # TWAP Uniswap V3 service
│   └── winklinkRealDataService.ts  # WINkLink on-chain service
│
└── utils/
    ├── memoryManager.ts              # Memory management
    ├── oracleDataUtils.ts            # Oracle data utilities
    ├── performanceMetricsCalculator.ts # Performance metrics
    ├── performanceMetricsConfig.ts   # Metrics configuration
    ├── retry.ts                      # Retry logic
    └── storage.ts                    # Database storage layer

src/types/oracle/           # Oracle types
├── index.ts                # Core oracle types
├── enums.ts                # Oracle enums (OracleProvider, Blockchain)
├── price.ts                # Price types
├── api3.ts                 # API3-specific types
├── publisher.ts            # Publisher types
├── snapshot.ts             # Snapshot types
├── snapshotFunctions.ts    # Snapshot utility types
└── constants.ts            # Oracle constants

src/lib/config/             # Configuration
├── colors.ts               # Color configurations
├── env.ts                  # Environment variables
├── serverEnv.ts            # Server environment variables
├── basePrices.ts           # Base price configurations
└── oracles/                # Oracle UI configurations
    ├── api3.tsx
    ├── chainlink.tsx
    ├── dia.tsx
    ├── flare.tsx
    ├── helpers.ts
    ├── index.ts
    ├── pyth.tsx
    ├── redstone.tsx
    ├── reflector.tsx
    ├── supra.tsx
    ├── twap.tsx
    ├── types.ts
    └── winklink.tsx
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
