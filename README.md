# Insight - Oracle Data Analytics Platform

Insight is a professional oracle data analytics platform that provides comprehensive analysis and comparison of mainstream oracle protocols including Chainlink, Band Protocol, UMA, Pyth, API3, RedStone, DIA, Tellor, Chronicle, and WINkLink.

## Key Features

- **Real-time Price Monitoring** - Live price feeds from multiple oracle providers with real-time updates
- **Cross-Oracle Price Comparison** - Compare prices across different oracles for the same asset
- **Cross-Chain Performance Analysis** - Analyze oracle performance across multiple blockchain networks
- **Market Overview** - Track Total Value Secured (TVS) and market metrics
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

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State Management**: React Query, SWR, Zustand
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Internationalization**: next-intl

### Backend

- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with OAuth support
- **Real-time**: WebSocket, Supabase Realtime

### Oracle Clients

- Pyth Hermes Client (`@pythnetwork/hermes-client`)
- Custom oracle clients for all supported providers

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

3. Set up environment variables (see Environment Variables section below)

4. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

| Variable                                    | Description                               | Required |
| ------------------------------------------- | ----------------------------------------- | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`                  | Supabase project URL                      | Yes      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`             | Supabase anonymous key                    | Yes      |
| `NEXT_PUBLIC_APP_URL`                       | Application base URL                      | No       |
| `NEXT_PUBLIC_WS_URL`                        | WebSocket server URL                      | No       |
| `NEXT_PUBLIC_ENABLE_REALTIME`               | Enable real-time features (default: true) | No       |
| `NEXT_PUBLIC_ENABLE_ANALYTICS`              | Enable Vercel Analytics                   | No       |
| `NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING` | Enable performance monitoring             | No       |

Example `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_ENABLE_REALTIME=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
```

## Available Scripts

| Command                 | Description                    |
| ----------------------- | ------------------------------ |
| `npm run dev`           | Start development server       |
| `npm run build`         | Build for production           |
| `npm run start`         | Start production server        |
| `npm run lint`          | Run ESLint                     |
| `npm run test`          | Run tests                      |
| `npm run test:watch`    | Run tests in watch mode        |
| `npm run test:coverage` | Run tests with coverage report |

## Project Structure

```
insight/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── api/                # API endpoints
│   │   │   ├── alerts/         # Price alerts API
│   │   │   ├── auth/           # Authentication callbacks
│   │   │   ├── favorites/      # User favorites API
│   │   │   ├── oracles/        # Oracle data API
│   │   │   ├── snapshots/      # User snapshots API
│   │   │   ├── cron/           # Scheduled tasks
│   │   │   └── health/         # Health check endpoint
│   │   ├── [locale]/           # Localized pages
│   │   │   ├── alerts/         # Alerts management page
│   │   │   ├── api3/           # API3 oracle page
│   │   │   ├── band-protocol/  # Band Protocol oracle page
│   │   │   ├── chainlink/      # Chainlink oracle page
│   │   │   ├── chronicle/      # Chronicle oracle page
│   │   │   ├── cross-chain/    # Cross-chain analysis page
│   │   │   ├── cross-oracle/   # Cross-oracle comparison page
│   │   │   ├── dia/            # DIA oracle page
│   │   │   ├── favorites/      # User favorites page
│   │   │   ├── home-components/# Homepage components
│   │   │   ├── login/          # Login page
│   │   │   ├── market-overview/# Market overview page
│   │   │   ├── methodology/    # Methodology page
│   │   │   ├── price-query/    # Price query page
│   │   │   ├── pyth-network/   # Pyth oracle page
│   │   │   ├── redstone/       # RedStone oracle page
│   │   │   ├── register/       # Registration page
│   │   │   ├── settings/       # User settings page
│   │   │   ├── snapshot/       # Shared snapshots page
│   │   │   ├── tellor/         # Tellor oracle page
│   │   │   ├── uma/            # UMA oracle page
│   │   │   └── winklink/       # WINkLink oracle page
│   │   ├── error.tsx           # Error boundary
│   │   ├── global-error.tsx    # Global error handler
│   │   ├── layout.tsx          # Root layout
│   │   ├── not-found.tsx       # 404 page
│   │   ├── page.tsx            # Home page
│   │   ├── globals.css         # Global styles
│   │   └── favicon.ico         # Favicon
│   ├── components/             # React components
│   │   ├── accessibility/      # Accessibility components
│   │   ├── alerts/             # Alert components
│   │   ├── charts/             # Chart components
│   │   ├── comparison/         # Comparison components
│   │   ├── data-transparency/  # Data transparency components
│   │   ├── export/             # Export components
│   │   ├── favorites/          # Favorite components
│   │   ├── layout/             # Layout components
│   │   ├── mobile/             # Mobile components
│   │   ├── navigation/         # Navigation components
│   │   ├── oracle/             # Oracle-specific components
│   │   │   ├── charts/         # Oracle chart components
│   │   │   ├── common/         # Common oracle components
│   │   │   ├── forms/          # Form components
│   │   │   └── indicators/     # Technical indicators
│   │   ├── search/             # Search components
│   │   ├── settings/           # Settings components
│   │   ├── ui/                 # Reusable UI components
│   │   ├── AppInitializer.tsx  # App initializer
│   │   ├── ErrorBoundaries.tsx # Error boundaries
│   │   ├── Footer.tsx          # Footer component
│   │   ├── GaugeChart.tsx      # Gauge chart
│   │   ├── LanguageSwitcher.tsx# Language switcher
│   │   └── Navbar.tsx          # Navigation bar
│   ├── lib/                    # Core libraries
│   │   ├── analytics/          # Analytics utilities
│   │   ├── api/                # API utilities
│   │   ├── config/             # Configuration files
│   │   ├── constants/          # Application constants
│   │   ├── di/                 # Dependency injection
│   │   ├── errors/             # Error handling
│   │   ├── export/             # Data export utilities
│   │   ├── hooks/              # Custom React hooks
│   │   ├── indicators/         # Technical indicators
│   │   ├── monitoring/         # Performance monitoring
│   │   ├── oracles/            # Oracle client implementations
│   │   ├── queries/            # React Query keys
│   │   ├── realtime/           # Real-time communication
│   │   ├── services/           # External services
│   │   ├── snapshots/          # Snapshot management
│   │   ├── supabase/           # Supabase client and utilities
│   │   └── utils/              # Utility functions
│   ├── types/                  # TypeScript type definitions
│   │   ├── oracle/             # Oracle types
│   │   ├── api/                # API types
│   │   ├── ui/                 # UI types
│   │   ├── auth/               # Auth types
│   │   └── common/             # Common types
│   ├── i18n/                   # Internationalization
│   │   ├── messages/           # Translation messages
│   │   │   ├── common.json
│   │   │   ├── home.json
│   │   │   ├── navigation.json
│   │   │   ├── oracles/        # Oracle-specific translations
│   │   │   └── components/     # Component translations
│   │   ├── config.ts
│   │   └── i18n.ts
│   └── providers/              # React providers
│       └── ReactQueryProvider.tsx
├── supabase/
│   └── migrations/             # Database migrations
│       └── 001_initial_schema.sql
├── public/                     # Static assets
│   └── logos/                  # Logo assets
│       ├── cryptos/            # Cryptocurrency logos
│       └── oracles/            # Oracle logos
├── scripts/                    # Utility scripts
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Jest configuration
└── eslint.config.mjs           # ESLint configuration
```

## Supported Oracles

### Chainlink

- **Supported Chains**: Ethereum, Arbitrum, Optimism, Polygon, Avalanche, Base, BNB Chain, Fantom, Starknet, Blast, Moonbeam, Kava, Polkadot
- **Features**: Node analytics, extensive data feeds, high reliability

### Band Protocol

- **Supported Chains**: Cosmos, Osmosis, Juno, Ethereum, Polygon, Avalanche, Fantom, Cronos, Injective, Sei, Kava
- **Features**: Validator analytics, cross-chain data feeds

### UMA

- **Supported Chains**: Ethereum, Arbitrum, Optimism, Polygon, Base, BNB Chain, Avalanche, Fantom, Gnosis
- **Features**: Optimistic oracle, dispute resolution, validator analytics

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

- **Supported Chains**: Ethereum, Arbitrum, Polygon, Avalanche, BNB Chain, Base, Fantom, Cronos, Moonbeam, Gnosis, Kava
- **Features**: Open-source cross-chain oracle, NFT data feeds, transparent methodology

### Tellor

- **Supported Chains**: Ethereum, Arbitrum, Optimism, Polygon, Base, Avalanche, BNB Chain, Fantom, Moonbeam, Gnosis
- **Features**: Stake-based reporting, dispute mechanism, mining rewards

### Chronicle

- **Supported Chains**: Ethereum, Arbitrum, Optimism, Polygon, Base, BNB Chain, Avalanche, Fantom, Gnosis
- **Features**: MakerDAO native oracle, Scuttlebutt protocol, on-chain verification

### WINkLink

- **Supported Chains**: BNB Chain, TRON, Ethereum
- **Features**: TRON ecosystem integration, gaming data feeds, entertainment focus

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
- `DELETE /api/favorites/[id]` - Delete favorite

### Snapshots

- `GET /api/snapshots` - List user snapshots
- `POST /api/snapshots` - Create snapshot
- `GET /api/snapshots/[id]` - Get specific snapshot
- `DELETE /api/snapshots/[id]` - Delete snapshot
- `GET /api/snapshots/[id]/share` - Get shareable snapshot

### Oracles

- `GET /api/oracles` - List all oracle providers
- `GET /api/oracles/[provider]` - Get oracle data

### System

- `GET /api/health` - Health check
- `GET /api/cron/cleanup` - Cleanup expired records

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Acknowledgments

- [Chainlink](https://chain.link/) - Decentralized oracle network
- [Band Protocol](https://bandprotocol.com/) - Cross-chain data oracle
- [UMA](https://umaproject.org/) - Optimistic oracle
- [Pyth Network](https://pyth.network/) - High-frequency oracle
- [API3](https://api3.org/) - First-party oracle solution
- [RedStone](https://redstone.finance/) - Modular oracle
- [DIA](https://www.diadata.org/) - Open-source oracle
- [Tellor](https://tellor.io/) - Decentralized oracle
- [Chronicle](https://chroniclelabs.org/) - MakerDAO oracle
- [WINkLink](https://winklink.org/) - TRON ecosystem oracle
