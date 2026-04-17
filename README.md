# Insight - Oracle Data Analytics Platform

Insight is a professional oracle data analytics platform that provides comprehensive analysis and comparison of mainstream oracle protocols including Chainlink, Pyth, API3, RedStone, DIA, WINkLink, Supra, and TWAP.

## Key Features

- **Real-time Price Monitoring** - Live price feeds from multiple oracle providers with real-time updates
- **Cross-Oracle Price Comparison** - Compare prices across different oracles for the same asset
- **Cross-Chain Performance Analysis** - Analyze oracle performance across multiple blockchain networks
- **Price Alerts & Notifications** - Configure custom price alerts with multiple trigger conditions
- **User Favorites & Snapshots** - Save and share price snapshots and favorite configurations
- **Data Export** - Export data in CSV, JSON, Excel, PDF, and PNG formats
- **Internationalization** - Full support for English and Chinese (zh-CN)
- **Anomaly Detection** - Automatic detection of price anomalies and outliers
- **Technical Indicators** - RSI, MACD, Bollinger Bands, ATR, and more
- **Data Transparency** - Data source indicators and update time tracking
- **Accessibility Support** - Keyboard navigation, colorblind mode, screen reader support

## Technology Stack

### Frontend

- **Framework**: Next.js 16.1.6 (App Router)
- **UI Library**: React 19.2.3
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **State Management**: React Query 5.90.21, Zustand 5.0.11
- **Charts**: Recharts 3.8.0
- **Animations**: Framer Motion 12.36.0
- **Internationalization**: next-intl 4.8.3

### Backend

- **API**: Next.js API Routes
- **Database**: Supabase 2.98.0 (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with OAuth support
- **Real-time**: WebSocket, Supabase Realtime
- **Error Tracking**: Sentry 10.43.0

### Oracle Clients

- Pyth Hermes Client (`@pythnetwork/hermes-client` 2.0.0)
- Pyth Price Service SDK (`@pythnetwork/price-service-sdk` 1.8.0)
- API3 Contracts (`@api3/contracts` 27.0.0)
- Custom oracle clients for all supported providers (Chainlink, Pyth, API3, RedStone, DIA, WINkLink, Supra, TWAP)
- Supra Oracle SDK (`supra-oracle-sdk` 1.0.4)
- TWAP On-Chain Service (Uniswap V3 TWAP via direct RPC calls)

## Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Supabase account (for database and authentication)

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd insight
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables (see `src/lib/config/env.ts` and `src/lib/config/serverEnv.ts` for reference)

4. Run the development server:
   ```bash
   npm run dev
   ```

## Available Scripts

| Command                 | Description                         |
| ----------------------- | ----------------------------------- |
| `npm run dev`           | Start development server            |
| `npm run build`         | Build for production                |
| `npm run start`         | Start production server             |
| `npm run lint`          | Run ESLint                          |
| `npm run lint:fix`      | Run ESLint with auto-fix            |
| `npm run format`        | Format code with Prettier           |
| `npm run format:check`  | Check code formatting with Prettier |
| `npm run typecheck`     | Run TypeScript type checking        |
| `npm run validate`      | Run lint, typecheck, and tests      |
| `npm run test`          | Run Jest tests                      |
| `npm run test:watch`    | Run tests in watch mode             |
| `npm run test:coverage` | Run tests with coverage report      |
| `npm run test:e2e`      | Run Playwright E2E tests            |
| `npm run test:e2e:ui`   | Run Playwright E2E tests with UI    |
| `npm run clean:dev`     | Clean .next and start dev server    |
| `npm run clean:start`   | Clean .next, build and start server |
| `npm run perf:test`     | Run performance tests               |
| `npm run perf:quick`    | Run quick performance check         |
| `npm run i18n:types`    | Generate i18n types                 |
| `npm run i18n:check`    | Check i18n translations             |
| `npm run i18n:validate` | Validate i18n translations          |
| `npm run naming:check`  | Check naming conventions            |
| `npm run prepare`       | Prepare husky git hooks             |

## Project Structure

```
insight/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── [locale]/           # Localized pages (next-intl)
│   │   │   ├── alerts/         # Alerts management page
│   │   │   ├── auth/           # Authentication pages
│   │   │   │   ├── forgot-password/
│   │   │   │   ├── resend-verification/
│   │   │   │   ├── reset-password/
│   │   │   │   └── verify-email/
│   │   │   ├── cross-chain/    # Cross-chain analysis page
│   │   │   ├── cross-oracle/   # Cross-oracle comparison page
│   │   │   ├── docs/           # Documentation page
│   │   │   ├── favorites/      # User favorites page
│   │   │   ├── home-components/# Homepage components
│   │   │   ├── login/          # Login page
│   │   │   ├── price-query/    # Price query page
│   │   │   ├── register/       # Registration page
│   │   │   └── settings/       # User settings page
│   │   ├── api/                # API endpoints
│   │   │   ├── alerts/         # Price alerts API
│   │   │   │   ├── batch/      # Batch alert operations
│   │   │   │   ├── events/     # Alert events API
│   │   │   │   └── [id]/       # Individual alert endpoints
│   │   │   ├── auth/           # Authentication callbacks
│   │   │   ├── favorites/      # User favorites API
│   │   │   ├── health/         # Health check endpoint
│   │   │   ├── oracles/        # Oracle data API
│   │   │   │   └── [provider]/ # Provider-specific endpoints
│   │   │   └── prices/         # Prices API
│   │   ├── error.tsx           # Error boundary
│   │   ├── global-error.tsx    # Global error handler
│   │   ├── layout.tsx          # Root layout
│   │   ├── not-found.tsx       # 404 page
│   │   ├── globals.css         # Global styles
│   │   └── favicon.ico         # Favicon
│   ├── components/             # React components
│   │   ├── accessibility/      # Accessibility components
│   │   ├── alerts/             # Alert components
│   │   ├── charts/             # Chart components
│   │   ├── data-transparency/  # Data transparency components
│   │   ├── error-boundary/     # Error boundary components
│   │   ├── export/             # Export components
│   │   ├── favorites/          # Favorite components
│   │   ├── navigation/         # Navigation components
│   │   ├── realtime/           # Real-time components
│   │   ├── search/             # Search components
│   │   ├── settings/           # Settings components
│   │   ├── shortcuts/          # Keyboard shortcuts
│   │   ├── ui/                 # Reusable UI components
│   │   │   ├── DataTablePro/   # Advanced data table
│   │   │   └── selectors/      # Selector components
│   │   ├── AppInitializer.tsx  # App initializer
│   │   ├── Footer.tsx          # Footer component
│   │   ├── LanguageSwitcher.tsx# Language switcher
│   │   ├── Navbar.tsx          # Navigation bar
│   │   └── PerformanceMetricsCollector.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── data/               # Data fetching hooks
│   │   ├── oracles/            # Oracle-specific hooks
│   │   ├── ui/                 # UI hooks
│   │   └── utils/              # Utility hooks
│   ├── lib/                    # Core libraries
│   │   ├── analytics/          # Analytics utilities
│   │   ├── api/                # API utilities
│   │   │   ├── client/         # API client with interceptors
│   │   │   ├── middleware/     # API middleware (auth, rate limit, validation)
│   │   │   ├── recovery/       # Error recovery
│   │   │   ├── response/       # Response builders
│   │   │   ├── retry/          # Retry logic
│   │   │   ├── types/          # API types
│   │   │   ├── validation/     # Validation schemas (Zod)
│   │   │   └── versioning/     # API versioning
│   │   ├── config/             # Configuration files
│   │   ├── constants/          # Application constants
│   │   ├── errors/             # Error handling
│   │   ├── export/             # Data export utilities
│   │   ├── i18n/               # i18n provider
│   │   ├── indicators/         # Technical indicators
│   │   ├── monitoring/         # Performance monitoring
│   │   ├── oracles/            # Oracle client implementations
│   │   │   ├── api3/           # API3 client and services
│   │   │   ├── base/           # Base oracle client
│   │   │   ├── constants/      # Oracle constants
│   │   │   ├── pyth/           # Pyth client and services
│   │   │   ├── api3.ts         # API3 client
│   │   │   ├── base.ts         # BaseOracleClient abstract class
│   │   │   ├── chainlink.ts    # Chainlink client
│   │   │   ├── colors.ts       # Oracle colors
│   │   │   ├── dia.ts          # DIA client
│   │   │   ├── diaDataService.ts
│   │   │   ├── diaNFTService.ts
│   │   │   ├── diaNetworkService.ts
│   │   │   ├── diaPriceService.ts
│   │   │   ├── factory.ts      # OracleClientFactory
│   │   │   ├── interfaces.ts   # Oracle interfaces
│   │   │   ├── memoryManager.ts
│   │   │   ├── oracle-config.ts
│   │   │   ├── oracleDataUtils.ts
│   │   │   ├── performanceMetricsCalculator.ts
│   │   │   ├── pythConstants.ts
│   │   │   ├── pythDataService.ts
│   │   │   ├── pythHermesClient.ts
│   │   │   ├── pythNetwork.ts
│   │   │   ├── pythPublishersData.ts
│   │   │   ├── redstone.ts     # RedStone client
│   │   │   ├── redstoneConstants.ts
│   │   │   ├── storage.ts
│   │   │   ├── supra.ts         # Supra client
│   │   │   ├── supportedSymbols.ts
│   │   │   └── winklink.ts     # WINkLink client
│   │   ├── queries/            # React Query keys and client
│   │   ├── realtime/           # Real-time communication
│   │   ├── security/           # Security utilities
│   │   ├── services/           # External services
│   │   │   ├── marketData/     # Market data services
│   │   │   │   ├── binanceMarketService.ts  # Binance market data
│   │   │   │   ├── coinGeckoMarketService.ts # CoinGecko market data
│   │   │   │   ├── anomalyCalculations.ts   # Anomaly detection
│   │   │   │   ├── performanceMetrics.ts    # Performance metrics
│   │   │   │   ├── priceCalculations.ts     # Price calculations
│   │   │   │   ├── riskCalculations.ts      # Risk calculations
│   │   │   │   └── defiLlamaApi/            # DeFi Llama API
│   │   │   └── oracle/         # Oracle services
│   │   ├── snapshots/          # Snapshot management
│   │   ├── supabase/           # Supabase client and utilities
│   │   ├── utils/              # Utility functions
│   │   │   └── chartExport/    # Chart export utilities
│   │   └── validation/         # Validation utilities
│   ├── stores/                 # Zustand stores
│   │   ├── authStore.ts        # Authentication state
│   │   ├── crossChainConfigStore.ts  # Cross-chain config state
│   │   ├── crossChainDataStore.ts    # Cross-chain data state
│   │   ├── crossChainSelectorStore.ts # Cross-chain selector state
│   │   ├── crossChainUIStore.ts      # Cross-chain UI state
│   │   ├── notificationStore.ts      # Notification state
│   │   ├── realtimeStore.ts    # Real-time data state
│   │   ├── timeRangeStore.ts   # Time range state
│   │   └── uiStore.ts          # UI state
│   ├── types/                  # TypeScript type definitions
│   │   ├── oracle/             # Oracle types
│   │   ├── api/                # API types
│   │   ├── ui/                 # UI types
│   │   ├── risk.ts             # Risk types
│   │   ├── guards.ts           # Type guards
│   ├── i18n/                   # Internationalization
│   │   ├── messages/           # Translation messages
│   │   │   ├── en/             # English translations
│   │   │   │   ├── components/
│   │   │   │   └── features/
│   │   │   ├── zh-CN/          # Chinese translations
│   │   │   │   ├── components/
│   │   │   │   └── features/
│   │   │   ├── en.cleaned/     # Cleaned English translations
│   │   │   └── zh-CN.cleaned/  # Cleaned Chinese translations
│   │   ├── config.ts
│   │   ├── generated-types.ts
│   │   ├── request.ts
│   │   ├── routing.ts
│   │   └── types.ts
│   └── __mocks__/              # Test mocks
├── public/                     # Static assets
│   └── logos/                  # Logo assets
│       ├── cryptos/            # Cryptocurrency logos
│       └── oracles/            # Oracle logos
├── scripts/                    # Utility scripts
│   ├── generate-i18n-types.js  # i18n type generation
│   ├── check-i18n.js           # i18n validation
│   ├── check-naming-convention.js
│   ├── performance-test.ts     # Performance testing
│   └── quick-perf.mjs          # Quick performance check
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Jest configuration
├── playwright.config.ts        # Playwright configuration
├── eslint.config.mjs           # ESLint configuration
├── .husky/                     # Husky git hooks
└── .trae/rules/                # Trae IDE rules
    ├── project_rules.md
    └── ui-redesign-rules.md
```

## Supported Oracles

### Chainlink

- **Supported Chains**: Ethereum, Arbitrum, Optimism, Polygon, Avalanche, Base, BNB Chain, Fantom, Starknet, Blast, Moonbeam, Kava, Polkadot
- **Features**: Node analytics, extensive data feeds, high reliability

### Pyth

- **Supported Chains**: Solana, Ethereum, Arbitrum, Polygon, Optimism, Avalanche, Base, Starknet, Blast, Sui, Aptos, Injective, Sei
- **Features**: Publisher analytics, high-frequency updates, confidence intervals

### API3

- **Supported Chains**: Ethereum, Arbitrum, Polygon, Avalanche, Base, BNB Chain, Optimism, Moonbeam, Kava, Fantom, Gnosis, Linea, Scroll
- **Features**: First-party oracle, quantifiable security, Airnode deployments

### RedStone

- **Supported Chains**: Ethereum, Arbitrum, Optimism, Polygon, Avalanche, Base, BNB Chain, Fantom, Linea, Mantle, Scroll, zkSync, Blast, Starknet, Aptos, Sui
- **Features**: Modular oracle design, data streams, cross-chain support

### DIA

- **Supported Chains**: Ethereum, Arbitrum, Polygon, Avalanche, BNB Chain, Base, Optimism, Fantom, Cronos, Moonbeam, Gnosis, Kava, Solana, Sui, Aptos, Injective, Sei, Cosmos, Osmosis, Juno, Celestia, Tron, TON, Near, Aurora, Celo, Starknet, Blast, Cardano, Polkadot, Mantle, Linea, Scroll, zkSync, Moonriver, Metis, StarkEx
- **Features**: Open-source cross-chain oracle, NFT floor price data feeds, transparent methodology, comprehensive token on-chain data (supply, market cap, exchange volume)
- **Data Services**: DIADataService with dedicated PriceService, NFTService, and NetworkService modules

### WINkLink

- **Supported Chains**: BNB Chain, TRON, Ethereum
- **Features**: TRON ecosystem integration, gaming data feeds, entertainment focus

### Supra

- **Supported Chains**: Ethereum
- **Features**: High-performance oracle with verifiable randomness, cross-chain data feeds, Supra Oracle SDK integration

### TWAP

- **Supported Chains**: Ethereum, Arbitrum, Optimism, Polygon, Base, BNB Chain
- **Features**: Uniswap V3 Time-Weighted Average Price oracle, on-chain TWAP data from liquidity pools, spot price and TWAP price comparison, confidence scoring based on liquidity and deviation, RPC with automatic fallback and health tracking

## Database Schema

The application uses Supabase (PostgreSQL) with the following main tables:

- `user_profiles` - User preferences and settings
- `price_records` - Historical price data from oracles
- `user_snapshots` - User-saved price snapshots
- `user_favorites` - User favorite configurations
- `price_alerts` - Price alert configurations
- `alert_events` - Alert trigger event history

All tables have Row Level Security (RLS) enabled for data protection.

## API Endpoints

### Authentication

- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/delete-account` - Delete user account

### Alerts

- `GET /api/alerts` - List user alerts
- `POST /api/alerts` - Create new alert
- `GET /api/alerts/[id]` - Get specific alert
- `PUT /api/alerts/[id]` - Update alert
- `DELETE /api/alerts/[id]` - Delete alert
- `GET /api/alerts/events` - List alert events
- `POST /api/alerts/events/[id]/acknowledge` - Acknowledge alert event
- `POST /api/alerts/batch` - Batch alert operations

### Favorites

- `GET /api/favorites` - List user favorites
- `POST /api/favorites` - Create favorite
- `GET /api/favorites/[id]` - Get specific favorite
- `PUT /api/favorites/[id]` - Update favorite
- `DELETE /api/favorites/[id]` - Delete favorite

### Oracles

- `GET /api/oracles` - List all oracle providers
- `POST /api/oracles` - Batch price query
- `GET /api/oracles/[provider]` - Get specific oracle data

### System

- `GET /api/health` - Health check

## Code Quality

This project adopts strict code quality standards to ensure maintainability and reliability:

### Code Standards

- **ESLint**: TypeScript ESLint ruleset with strict type checking
- **Prettier**: Unified code formatting configuration
- **TypeScript**: Strict type checking configuration (`strict: true`)
- **Naming Conventions**: Unified file and variable naming conventions

### Quality Check Scripts

```bash
# Run ESLint check
npm run lint

# Auto-fix ESLint issues
npm run lint:fix

# Run type checking
npm run typecheck

# Run all tests
npm run test

# Run test coverage check
npm run test:coverage

# Run full validation (lint + typecheck + test)
npm run validate

# Check naming conventions
npm run naming:check
```

### Code Quality Metrics

- **Test Coverage**: Target 80%+
- **Type Safety**: 100% TypeScript coverage
- **Lint Pass Rate**: Zero errors, minimized warnings
- **Build Success Rate**: 100%

### Continuous Improvement

- Regularly run `npm run validate` to ensure code quality
- Use `npm run lint:fix` to auto-fix formatting issues
- Ensure all tests pass before committing

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Ensure code passes all quality checks (`npm run validate`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is private and proprietary.

## Acknowledgments

- [Chainlink](https://chain.link/) - Decentralized oracle network
- [Pyth Network](https://pyth.network/) - High-frequency oracle
- [API3](https://api3.org/) - First-party oracle solution
- [RedStone](https://redstone.finance/) - Modular oracle
- [DIA](https://www.diadata.org/) - Open-source oracle
- [WINkLink](https://winklink.org/) - TRON ecosystem oracle
- [Supra](https://supra.com/) - High-performance oracle with verifiable randomness
- [TWAP](https://uniswap.org/) - Uniswap V3 Time-Weighted Average Price oracle
