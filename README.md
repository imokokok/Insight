# Insight - Oracle Data Analytics Platform

Insight is a professional oracle data analytics platform that provides comprehensive analysis and comparison of mainstream oracle protocols including Chainlink, Pyth, API3, RedStone, DIA, WINkLink, Supra, TWAP, Reflector, and Flare.

## Key Features

- **Real-time Price Monitoring** - Live price feeds from multiple oracle providers with real-time updates
- **Cross-Oracle Price Comparison** - Compare prices across different oracles for the same asset with consensus price calculation, divergence signal detection, and risk analysis
- **Cross-Chain Performance Analysis** - Analyze oracle performance across multiple blockchain networks with price spread heatmap and chain reliability ranking
- **Oracle Reputation System** - Persistent 7-day rolling reputation scores with accuracy, uptime, reliability, latency, and freshness metrics
- **Price Alerts & Notifications** - Configure custom price alerts with multiple trigger conditions and real-time event push
- **Price Snapshots** - Save and compare price snapshots across time with detailed comparison analytics
- **User Favorites** - Save oracle configurations and apply them with one click
- **Data Export** - Export data in CSV, JSON, Excel, PDF, and PNG formats
- **Anomaly Detection** - Automatic detection of price anomalies and outliers
- **Consensus Price** - Multiple consensus algorithms (median, trimmed mean, weighted median, confidence-weighted, reliability-weighted, IQR-filtered)
- **Data Transparency** - Data source indicators and update time tracking
- **Accessibility Support** - Keyboard navigation, colorblind mode, screen reader support

## Technology Stack

- **Framework**: Next.js 16.2.4 (App Router) + React 19.2.3 + TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **State Management**: React Query 5.99.0, Zustand 5.0.11
- **Charts**: Recharts 3.8.0
- **Database & Auth**: Supabase 2.98.0 (PostgreSQL + RLS + Realtime)
- **Error Tracking**: Sentry 10.43.0

## Getting Started

```bash
npm install
```

Set up environment variables (see `src/lib/config/env.ts` and `src/lib/config/serverEnv.ts` for reference), then:

```bash
npm run dev
```

## Supported Oracles

### Chainlink

- **Supported Chains**: Ethereum, Arbitrum, Optimism, Polygon, Avalanche, BNB Chain, Base
- **Features**: Node analytics, extensive data feeds, high reliability, on-chain data via Chainlink Data Feeds

### Pyth

- **Supported Chains**: Solana, Ethereum, Arbitrum, Polygon, Avalanche, BNB Chain, Aptos, Sui, Base, Optimism
- **Features**: Publisher analytics, high-frequency updates, confidence intervals, Pyth Hermes Client integration

### API3

- **Supported Chains**: Ethereum, Arbitrum, Polygon, Avalanche, BNB Chain, Base, Optimism
- **Features**: First-party oracle, quantifiable security, Airnode deployments, dAPI price feeds

### RedStone

- **Supported Chains**: Ethereum, Arbitrum, Optimism, Polygon, Avalanche, Base, BNB Chain, Fantom, Linea, Mantle, Scroll, zkSync
- **Features**: Modular oracle design, data streams, cross-chain support

### DIA

- **Supported Chains**: Ethereum, Arbitrum, Polygon, Avalanche, BNB Chain, Base
- **Features**: Open-source cross-chain oracle, NFT floor price data feeds, transparent methodology, comprehensive token on-chain data (supply, market cap, exchange volume)
- **Data Services**: DIADataService with dedicated PriceService, NFTService, and NetworkService modules

### WINkLink

- **Supported Chains**: TRON
- **Features**: TRON ecosystem integration, on-chain contract price fetching, gaming data feeds

### Supra

- **Supported Chains**: Ethereum, Arbitrum, Optimism, Polygon, Base, Solana, BNB Chain, Avalanche, zkSync, Scroll, Mantle, Linea
- **Features**: High-performance oracle with verifiable randomness, cross-chain data feeds, Supra Oracle SDK integration, DORA price feeds

### TWAP

- **Supported Chains**: Ethereum, Arbitrum, Optimism, Polygon, Base, BNB Chain
- **Features**: Uniswap V3 Time-Weighted Average Price oracle, on-chain TWAP data from liquidity pools, spot price and TWAP price comparison, confidence scoring based on liquidity and deviation, RPC with automatic fallback and health tracking

### Reflector

- **Supported Chains**: Stellar
- **Features**: Stellar ecosystem oracle with Soroban smart contracts, first-party oracle with direct data from source providers, support for both cryptocurrency and forex assets, on-chain data via smart contract calls

### Flare

- **Supported Chains**: Flare
- **Features**: FTSO-based oracle with on-chain data feeds, validator analytics, confidence intervals with real-time bid/ask spreads, first-party oracle secured by Flare network consensus

## API Endpoints

### V1 REST API (API Key Authentication)

All V1 endpoints require an API key passed via `x-api-key` header or `Authorization: Bearer` header.

#### Price

- `GET /api/v1/price/[symbol]` - Get aggregated price across all oracles
- `GET /api/v1/price/[symbol]/sources` - Get all oracle sources for a symbol
- `GET /api/v1/price/[symbol]/history` - Get historical price data (requires `provider` parameter)

#### Consensus

- `GET /api/v1/consensus/[symbol]` - Get consensus price with configurable aggregation method

#### Oracles

- `GET /api/v1/oracles/[provider]` - Get price from a specific oracle (requires `symbol` parameter)

#### API Keys

- `GET /api/v1/api-keys` - List your API keys
- `POST /api/v1/api-keys` - Create new API key
- `GET /api/v1/api-keys/[id]` - Get API key details
- `PATCH /api/v1/api-keys/[id]` - Update API key
- `DELETE /api/v1/api-keys/[id]` - Delete API key

#### Documentation

- `GET /api/v1/docs` - OpenAPI 3.1.0 specification

### Internal API (Session Authentication)

#### Authentication

- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/delete-account` - Delete user account

#### Alerts

- `GET /api/alerts` - List user alerts
- `POST /api/alerts` - Create new alert
- `GET /api/alerts/[id]` - Get specific alert
- `PUT /api/alerts/[id]` - Update alert
- `DELETE /api/alerts/[id]` - Delete alert
- `GET /api/alerts/events` - List alert events
- `POST /api/alerts/events/[id]/acknowledge` - Acknowledge alert event
- `POST /api/alerts/batch` - Batch alert operations

#### Favorites

- `GET /api/favorites` - List user favorites
- `POST /api/favorites` - Create favorite
- `GET /api/favorites/[id]` - Get specific favorite
- `PUT /api/favorites/[id]` - Update favorite
- `DELETE /api/favorites/[id]` - Delete favorite

#### Oracles

- `GET /api/oracles` - List all oracle providers
- `POST /api/oracles` - Batch price query
- `GET /api/oracles/[provider]` - Get specific oracle data
- `GET /api/oracles/consensus` - Get consensus price

#### Reputation

- `GET /api/reputation` - List oracle reputation scores
- `POST /api/reputation` - Trigger reputation calculation
- `GET /api/reputation/[provider]` - Get specific provider reputation
- `GET /api/reputation/calculate` - Calculate reputation scores

#### Snapshots

- `GET /api/snapshots` - List user snapshots
- `POST /api/snapshots` - Create snapshot
- `GET /api/snapshots/[id]` - Get specific snapshot
- `DELETE /api/snapshots/[id]` - Delete snapshot

#### System

- `GET /api/health` - Health check
- `GET /api/cron/reputation` - Cron job for reputation recalculation
