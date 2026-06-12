# Insight - Oracle Transparency & Risk Infrastructure

Insight is an oracle transparency and risk infrastructure platform that serves both professional researchers and everyday DeFi users. It provides real-time price monitoring, cross-oracle comparison, risk analysis, and position safety checks across 10+ oracle protocols and 54 blockchains.

**See through every oracle. Trust with clarity.**

## Key Features

### For DeFi Users

- **Safety Check (Position Critical Deviation)** - Enter your DeFi lending position to calculate the exact oracle price deviation that would trigger liquidation. Supports multi-asset positions across Aave V3, Compound V3, Spark, Morpho Blue, Venus, BENQI, and more. Provides health factor gauge, safety buffer analysis, and oracle reliability warnings.
- **Price Query** - Query real-time prices from any oracle provider with a simple interface. View on-chain data, confidence intervals, and price freshness at a glance.
- **Price Alerts** - Set custom price alerts and get notified when oracle prices deviate beyond your threshold. Supports real-time event push.

### For Researchers & Analysts

- **Price Insight** - Unified cross-oracle and cross-chain price analysis with dimension switching. Compare prices across providers and blockchains with 6 consensus algorithms, risk analysis, divergence signal detection, and feed health monitoring.
- **Cross-Oracle Price Comparison** - Deep-dive comparison across multiple oracles for the same asset with consensus price calculation, anomaly detection, stability scoring, and performance metrics.
- **Cross-Chain Performance Analysis** - Analyze oracle performance across blockchain networks with price spread heatmaps, chain reliability rankings, and 10-dimension risk analysis.
- **Oracle Reputation System** - Persistent 7-day rolling reputation scores with accuracy, uptime, reliability, latency, and freshness metrics. Detailed provider profiles with trend charts and score breakdowns.

### Shared Features

- **Price Snapshots** - Save and compare price snapshots across time with detailed comparison analytics and public sharing.
- **Data Export** - Export data in CSV, JSON, Excel, PDF, and PNG formats.
- **Anomaly Detection** - Automatic detection of price anomalies and outliers.
- **Consensus Price** - Multiple consensus algorithms (median, trimmed mean, weighted median, confidence-weighted, reliability-weighted, IQR-filtered).
- **Data Transparency** - Data source indicators and update time tracking.
- **Accessibility Support** - Keyboard navigation, colorblind mode, screen reader support.
- **REST API** - V1 API with API key authentication for programmatic access.

## Safety Check - Supported Protocols

| Protocol       | Chain     | TVL   | Supported Assets                               |
| -------------- | --------- | ----- | ---------------------------------------------- |
| Aave V3        | Ethereum  | $12B  | ETH, WBTC, USDC, USDT, LINK                    |
| Compound V3    | Ethereum  | $2.5B | ETH, WBTC, USDC, USDT                          |
| Uniswap V3     | Ethereum  | $4B   | ETH, WBTC, USDC, USDT, LINK                    |
| Aave V3        | Arbitrum  | $3B   | ETH, WBTC, USDC, USDT, ARB                     |
| Compound V3    | Arbitrum  | $800M | ETH, WBTC, USDC, USDT                          |
| Aave V3        | Base      | $2B   | ETH, WBTC, USDC, USDT, cbETH                   |
| Compound V3    | Base      | $1B   | ETH, WBTC, USDC, USDT                          |
| Spark Protocol | Ethereum  | $3.5B | ETH, WBTC, USDC, USDT, DAI, wstETH             |
| Morpho Blue    | Ethereum  | $8B   | ETH, WBTC, wstETH, USDC, USDT, DAI             |
| Venus Protocol | BNB Chain | $1.7B | BNB, BTCB, ETH, USDT, USDC                     |
| BENQI          | Avalanche | $500M | AVAX, WETH, BTC.b, WBTC, USDC, USDt, DAI, LINK |

Safety Check calculates: critical deviation percentage, liquidation trigger price, health factor (with circular gauge), safety buffer level (safe/moderate/risky/dangerous), per-asset bidirectional deviation analysis, collateral ratio curve chart, and oracle reliability warnings.

## Technology Stack

- **Framework**: Next.js 16.2.4 (App Router) + React 19.2.3 + TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **State Management**: React Query 5.99.0, Zustand 5.0.11
- **Charts**: Recharts 3.8.0
- **Database & Auth**: Supabase 2.98.0 (PostgreSQL + RLS + Realtime)
- **Blockchain**: viem 2.47.6, @pythnetwork/hermes-client 2.0.0, @api3/contracts 27.0.0, supra-oracle-sdk 1.0.4, @stellar/stellar-sdk 15.0.1
- **Error Tracking**: Sentry 10.43.0
- **Monitoring**: Vercel Analytics, Vercel Speed Insights, web-vitals 5.1.0

## Getting Started

```bash
npm install
```

Set up environment variables (see `src/lib/config/env.ts` for reference), then:

```bash
npm run dev
```

### Key Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side)
- `CSRF_SECRET` - CSRF protection secret
- `JWT_SECRET` - JWT signing secret
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN (optional, enables error tracking)

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

#### Oracles

- `GET /api/oracles/[provider]` - Get specific oracle data
- `POST /api/oracles/batch` - Batch price query

#### Reputation

- `GET /api/reputation` - List oracle reputation scores
- `POST /api/reputation` - Trigger reputation calculation
- `GET /api/reputation/[provider]` - Get specific provider reputation

#### Snapshots

- `GET /api/snapshots` - List user snapshots
- `POST /api/snapshots` - Create snapshot
- `GET /api/snapshots/[id]` - Get specific snapshot
- `DELETE /api/snapshots/[id]` - Delete snapshot

#### Protocol Health

- `POST /api/protocol-health` - Calculate critical deviation and liquidation risk for a DeFi position (supports multi-asset positions with `protocolId`, `collaterals[{symbol,amount}]`, `borrows[{symbol,amount}]`)

#### System

- `GET /api/cron/reputation` - Cron job for reputation recalculation

## Navigation

| Page             | Path             | Description                                                                        | Auth Required |
| ---------------- | ---------------- | ---------------------------------------------------------------------------------- | ------------- |
| Home             | `/`              | Real-time dashboard with consensus prices, oracle health status, and quick actions | No            |
| Price Query      | `/price-query`   | Single oracle price query with on-chain data and confidence intervals              | No            |
| Safety Check     | `/safety-check`  | Position critical deviation calculator with liquidation risk analysis              | No            |
| Price Insight    | `/price-insight` | Unified cross-oracle and cross-chain price analysis                                | No            |
| Oracle Directory | `/reputation`    | Oracle provider profiles and 7-day rolling reputation scores                       | No            |
| Price Snapshots  | `/snapshots`     | Save, compare, and share price snapshots                                           | Yes           |
| Price Alerts     | `/alerts`        | Custom price alerts with real-time notifications                                   | Yes           |
| Settings         | `/settings`      | Profile, preferences, notifications, data management, API keys                     | Yes           |
| Documentation    | `/docs`          | Quick start, feature guides, and developer resources                               | No            |
