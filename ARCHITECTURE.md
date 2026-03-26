# Insight Oracle Data Analytics Platform - Architecture Documentation

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Component Organization](#3-component-organization)
4. [State Management](#4-state-management)
5. [Real-time Data Architecture](#5-real-time-data-architecture)
6. [API Layer](#6-api-layer)
7. [Oracle Integration Layer](#7-oracle-integration-layer)
8. [Database Architecture](#8-database-architecture)
9. [Authentication Flow](#9-authentication-flow)
10. [Data Export System](#10-data-export-system)

---

## 1. System Overview

### 1.1 High-Level Architecture

The Insight Oracle Data Analytics Platform is a modern web application built on Next.js 16, designed to provide real-time analytics and monitoring for multiple blockchain oracle providers. The architecture follows a layered approach with clear separation of concerns.

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Home Page   │  │ Market View  │  │ Oracle Pages │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     State Management Layer                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    React Query                            │   │
│  │         (Server State & Data Fetching)                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Zustand                                │   │
│  │              (Client UI State)                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ AuthContext  │  │RealtimeCtx   │  │TimeRangeCtx  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API Layer                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Next.js API Routes                           │   │
│  │  /api/oracles  /api/alerts  /api/favorites  /api/auth    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Oracle Integration Layer                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│
│  │Chainlink │ │   Pyth   │ │   Band   │ │   API3   │ │   UMA  ││
│  │  Client  │ │  Client  │ │  Client  │ │  Client  │ │ Client ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘│
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Base Oracle Client (Abstract)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Persistence Layer                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Supabase PostgreSQL Database                 │   │
│  │  Tables: user_profiles, price_records, user_snapshots,   │   │
│  │          user_favorites, price_alerts, alert_events      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Supabase Realtime (WebSocket)                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Main Components and Interactions

| Component            | Technology                      | Purpose                                |
| -------------------- | ------------------------------- | -------------------------------------- |
| Frontend             | Next.js 16, React 19            | User interface with SSR/SSG            |
| State Management     | React Query, Zustand            | Server state & Client UI state         |
| Real-time            | WebSocket, Supabase Realtime    | Live price updates                     |
| API                  | Next.js API Routes + Middleware | Backend endpoints with unified handler |
| Oracle Clients       | Custom TypeScript clients + DI  | Oracle provider integration            |
| Database             | Supabase PostgreSQL             | Data persistence                       |
| Authentication       | Supabase Auth                   | User management                        |
| Error Handling       | Custom Error Classes            | Unified error handling                 |
| Dependency Injection | Custom DI Container             | Testability & decoupling               |

### 1.3 Data Flow

```
Oracle Providers → Oracle Clients → API Routes → Database
                                        │
                                        ▼
                    Real-time Updates ← Cache Layer
                                        │
                                        ▼
                                   UI Components
```

---

## 2. Frontend Architecture

### 2.1 Next.js 16 App Router Structure

The application uses Next.js 16 with the App Router, leveraging Server Components by default and Client Components where interactivity is required.

```
src/app/
├── layout.tsx              # Root layout with providers
├── page.tsx                # Home page with dynamic imports
├── globals.css             # Global styles
├── favicon.ico             # Application icon
│
├── api/                    # API Routes
│   ├── oracles/            # Oracle data endpoints
│   │   ├── route.ts        # List oracles
│   │   └── [provider]/     # Provider-specific routes
│   ├── alerts/             # Alert management
│   ├── auth/               # Authentication endpoints
│   ├── favorites/          # User favorites
│   ├── snapshots/          # Price snapshots
│   └── cron/               # Scheduled tasks
│
├── market-overview/        # Market overview page
│   ├── page.tsx
│   ├── layout.tsx
│   ├── components/         # Page-specific components
│   ├── constants.ts
│   ├── types.ts
│   └── useMarketOverviewData.ts
│
├── price-query/            # Price query page
│   ├── page.tsx
│   ├── components/
│   └── utils/
│
├── cross-oracle/           # Cross-oracle comparison
│   ├── page.tsx
│   └── components/
│
├── cross-chain/            # Cross-chain analysis
│   ├── page.tsx
│   ├── components/
│   └── useCrossChainData.ts
│
├── chainlink/              # Chainlink oracle page
├── pyth-network/           # Pyth Network page
├── band-protocol/          # Band Protocol page
├── api3/                   # API3 page
├── uma/                    # UMA oracle page
│
├── alerts/                 # Alerts management page
├── favorites/              # User favorites page
├── settings/               # User settings page
├── login/                  # Login page
├── register/               # Registration page
└── snapshot/[id]/          # Shared snapshot view
```

### 2.2 React 19 with Server and Client Components

#### Server Components (Default)

Server Components are used for static content and data fetching that doesn't require client-side interactivity:

```typescript
// Example: Server Component pattern
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Oracle Analytics',
  description: 'Professional oracle analytics platform',
};

export default async function ServerPage() {
  const data = await fetchData();
  return <div>{/* Static content */}</div>;
}
```

#### Client Components

Client Components are used for interactive features:

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function InteractiveComponent() {
  const [state, setState] = useState();
  // Client-side logic
}
```

### 2.3 Page Organization

| Page            | Route              | Purpose                                               |
| --------------- | ------------------ | ----------------------------------------------------- |
| Home            | `/`                | Dashboard with market overview, price ticker, metrics |
| Market Overview | `/market-overview` | Comprehensive market analytics                        |
| Price Query     | `/price-query`     | Price lookup and historical data                      |
| Cross-Oracle    | `/cross-oracle`    | Compare prices across oracles                         |
| Cross-Chain     | `/cross-chain`     | Cross-chain price analysis                            |
| Oracle Pages    | `/{oracle}`        | Provider-specific analytics                           |
| Alerts          | `/alerts`          | Price alert management                                |
| Favorites       | `/favorites`       | Saved configurations                                  |
| Settings        | `/settings`        | User preferences                                      |

### 2.4 Dynamic Imports for Performance

The home page uses dynamic imports to optimize initial load time:

```typescript
import dynamic from 'next/dynamic';

const OracleMarketOverview = dynamic(
  () => import('./home-components/OracleMarketOverview'),
  {
    loading: () => <OracleMarketOverviewSkeleton />,
    ssr: false,
  }
);

const ArbitrageHeatmap = dynamic(
  () => import('./home-components/ArbitrageHeatmap'),
  {
    loading: () => <ArbitrageHeatmapSkeleton />,
    ssr: false,
  }
);
```

---

## 3. Component Organization

### 3.1 Directory Structure

```
src/components/
├── oracle/                 # Oracle-specific components
│   ├── charts/             # Oracle chart components
│   │   ├── PriceChart/
│   │   ├── DynamicPriceChart.tsx
│   │   ├── PriceVolatilityChart.tsx
│   │   ├── ConfidenceIntervalChart.tsx
│   │   ├── KPIDashboard.tsx
│   │   └── ...
│   ├── common/             # Common oracle components
│   │   ├── OraclePageTemplate.tsx
│   │   ├── DashboardCard.tsx
│   │   ├── DataQualityScoreCard.tsx
│   │   ├── ConfidenceScore.tsx
│   │   ├── RiskScoreCard.tsx
│   │   └── ...
│   ├── panels/             # Oracle-specific panels
│   │   ├── ChainlinkDataFeedsPanel.tsx
│   │   ├── PythRiskAssessmentPanel.tsx
│   │   ├── UMAEcosystemPanel.tsx
│   │   ├── API3RiskAssessmentPanel.tsx
│   │   ├── BandValidatorsPanel.tsx
│   │   ├── TellorDisputesPanel.tsx
│   │   ├── ChronicleMakerDAOIntegrationPanel.tsx
│   │   ├── DIANFTDataPanel.tsx
│   │   ├── RedStoneDataStreamsPanel.tsx
│   │   └── WINkLinkGamingDataPanel.tsx
│   ├── forms/              # Form components
│   │   └── ...
│   ├── indicators/         # Technical indicators
│   │   ├── BollingerBands.tsx
│   │   ├── RSIIndicator.tsx
│   │   ├── MACDIndicator.tsx
│   │   ├── ATRIndicator.tsx
│   │   └── index.ts
│   └── index.ts
│
├── charts/                 # Chart components
│   ├── LazyCharts.tsx
│   └── index.ts
│
├── navigation/             # Navigation components
│   ├── DropdownMenu.tsx
│   ├── MobileDrawer.tsx
│   ├── config.ts
│   ├── types.ts
│   └── index.ts
│
├── alerts/                 # Alert components
│   ├── AlertConfig.tsx
│   ├── AlertHistory.tsx
│   ├── AlertList.tsx
│   ├── AlertNotification.tsx
│   └── index.ts
│
├── favorites/              # Favorites components
│   ├── FavoriteButton.tsx
│   ├── FavoriteCard.tsx
│   ├── FavoritesManager.tsx
│   └── index.ts
│
├── comparison/             # Comparison components
│   ├── OracleComparisonView.tsx
│   ├── TimeComparisonChart.tsx
│   └── index.ts
│
├── export/                 # Export components
│   ├── UnifiedExport.tsx
│   ├── ExportHistoryPanel.tsx
│   └── index.ts
│
├── data-transparency/      # Data transparency components
│   ├── DataSourceIndicator.tsx
│   ├── DataUpdateTime.tsx
│   └── index.ts
│
├── accessibility/          # Accessibility components
│   ├── AccessibilitySettings.tsx
│   ├── KeyboardNavigation.tsx
│   └── index.ts
│
├── mobile/                 # Mobile components
│   ├── BottomNavigation.tsx
│   ├── MobilePriceChart.tsx
│   └── index.ts
│
├── search/                 # Search components
│   ├── GlobalSearch.tsx
│   └── index.ts
│
├── settings/               # Settings components
│   ├── DataManagementPanel.tsx
│   ├── NotificationPanel.tsx
│   ├── PreferencesPanel.tsx
│   ├── ProfilePanel.tsx
│   ├── SettingsLayout.tsx
│   └── index.ts
│
├── realtime/               # Real-time components
│   ├── ConnectionStatus.tsx
│   ├── RealtimeNotifications.tsx
│   └── index.ts
│
├── ui/                     # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── ChartSkeleton.tsx
│   ├── EmptyState.tsx
│   ├── Toast.tsx
│   └── index.ts
│
├── Navbar.tsx
├── Footer.tsx
├── ErrorBoundaries.tsx
├── GaugeChart.tsx
├── LanguageSwitcher.tsx
└── AppInitializer.tsx
```

### 3.2 Oracle Component Categories

#### Price Visualization

- `PriceChart.tsx` - Standard price chart
- `DynamicPriceChart.tsx` - Real-time updating chart
- `PriceVolatilityChart.tsx` - Volatility visualization
- `PriceDistributionBoxPlot.tsx` - Price distribution analysis

#### Technical Indicators

- `BollingerBands.tsx` - Bollinger Bands overlay
- `RSIIndicator.tsx` - Relative Strength Index
- `MACDIndicator.tsx` - Moving Average Convergence Divergence
- `ATRIndicator.tsx` - Average True Range

#### Data Quality

- `DataQualityPanel.tsx` - Quality metrics panel
- `DataQualityScoreCard.tsx` - Quality score display
- `DataQualityIndicator.tsx` - Quality indicator badge
- `ConfidenceScore.tsx` - Confidence visualization

#### Cross-Chain Analysis

- `CrossChainPanel.tsx` - Cross-chain overview
- `CrossChainTrendChart.tsx` - Cross-chain trends
- `CrossChainPriceConsistency.tsx` - Price consistency check
- `PriceDeviationHeatmap.tsx` - Deviation visualization

---

## 4. State Management

### 4.1 Multi-Layer State Architecture

The application uses a hybrid state management approach:

```
┌─────────────────────────────────────────────────────────────┐
│                    Server State                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              React Query (@tanstack/react-query)     │    │
│  │  - Server state caching                              │    │
│  │  - Automatic background refetching                   │    │
│  │  - Optimistic updates                                │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                      SWR                              │    │
│  │  - Data fetching with caching                        │    │
│  │  - Revalidation on focus/reconnect                   │    │
│  │  - Deduplication                                     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Client State                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Zustand (crossChainStore)               │    │
│  │  - UI state (filters, selections)                    │    │
│  │  - Cross-chain analysis state                        │    │
│  │  - Chart configurations                              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Global Context                            │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │   AuthContext    │  │  RealtimeContext │                │
│  │  - User state    │  │  - Connection    │                │
│  │  - Session       │  │  - Subscriptions │                │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐                                        │
│  │ TimeRangeContext │                                        │
│  │  - Time range    │                                        │
│  │  - Date filters  │                                        │
│  └──────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 React Query Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### 4.3 SWR Configuration

```typescript
const swrConfig = {
  fetcher: async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch data');
    }
    return response.json();
  },
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  dedupingInterval: 5000,
};

const STALE_TIME_CONFIG = {
  price: 30 * 1000, // 30 seconds
  history: 5 * 60 * 1000, // 5 minutes
  network: 60 * 1000, // 1 minute
};
```

### 4.4 Zustand Store (Cross-Chain Analysis)

The cross-chain store manages complex UI state for cross-chain analysis:

```typescript
interface CrossChainStore {
  // Selector State
  selectedProvider: OracleProvider;
  selectedSymbol: string;
  selectedTimeRange: number;
  selectedBaseChain: Blockchain | null;

  // UI State
  visibleChains: Blockchain[];
  showMA: boolean;
  maPeriod: number;
  chartKey: number;
  hiddenLines: Set<string>;
  focusedChain: Blockchain | null;
  tableFilter: 'all' | 'abnormal' | 'normal';

  // Data State
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  loading: boolean;
  refreshStatus: 'idle' | 'refreshing' | 'success' | 'error';

  // Config State
  refreshInterval: RefreshInterval;
  thresholdConfig: ThresholdConfig;
  colorblindMode: boolean;

  // Actions
  setSelectedProvider: (provider: OracleProvider) => void;
  toggleChain: (chain: Blockchain) => void;
  // ... more actions
}
```

### 4.5 React Context Providers

#### AuthContext

Manages authentication state and user sessions:

```typescript
interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: AuthError | Error | null;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: Provider) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
}
```

#### RealtimeContext

Manages real-time subscriptions:

```typescript
interface RealtimeContextValue {
  connectionStatus: ConnectionStatus;
  subscribeToPriceUpdates: (callback, filters?) => () => void;
  subscribeToAlertEvents: (callback) => () => void;
  subscribeToSnapshotChanges: (callback) => () => void;
  subscribeToFavoriteChanges: (callback) => () => void;
  reconnect: () => void;
  activeSubscriptions: string[];
}
```

---

## 5. Real-time Data Architecture

### 5.1 WebSocket Manager

The WebSocket manager provides a robust real-time connection with automatic reconnection:

```typescript
class WebSocketManager {
  protected ws: WebSocket | null = null;
  protected status: WebSocketStatus = 'disconnected';
  protected reconnectAttempts = 0;
  protected heartbeatTimer: NodeJS.Timeout | null = null;
  protected messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  protected subscribedChannels: Set<string> = new Set();

  // Configuration
  protected config = {
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
    heartbeatTimeout: 10000,
    useExponentialBackoff: false,
  };

  // Key methods
  connect(): void;
  disconnect(): void;
  subscribe<T>(channel: string, handler: MessageHandler<T>): () => void;
  send(message: Record<string, unknown>): void;
  reconnect(): void;
}
```

### 5.2 Mock WebSocket for Development

For development without a live WebSocket server:

```typescript
class MockWebSocketManager extends WebSocketManager {
  private mockInterval: NodeJS.Timeout | null = null;
  private mockDataGenerators: Map<string, () => unknown> = new Map();

  // Mock data generators for different channels
  setupMockDataGenerators(): void {
    // Prices channel
    this.mockDataGenerators.set('prices', () => ({
      symbol: ['BTC', 'ETH', 'LINK', 'PYTH', 'BAND'][Math.floor(Math.random() * 5)],
      price: 10000 + Math.random() * 50000,
      change24h: (Math.random() - 0.5) * 10,
      timestamp: Date.now(),
    }));

    // TVS channel
    this.mockDataGenerators.set('tvs', () => ({...}));

    // Market stats channel
    this.mockDataGenerators.set('marketStats', () => ({...}));
  }
}
```

### 5.3 Supabase Realtime Integration

The Supabase Realtime manager handles database change subscriptions:

```typescript
class RealtimeManager {
  private client: SupabaseClient;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private connectionStatus: ConnectionStatus = 'disconnected';

  // Subscription methods
  subscribeToPriceUpdates(
    callback: (payload: PriceUpdatePayload) => void,
    filters?: { provider?: string; symbol?: string; chain?: string }
  ): () => void;

  subscribeToAlertEvents(
    userId: string,
    callback: (payload: AlertEventPayload) => void
  ): () => void;

  subscribeToSnapshotChanges(
    userId: string,
    callback: (payload: SnapshotChangePayload) => void
  ): () => void;

  subscribeToFavoriteChanges(
    userId: string,
    callback: (payload: FavoriteChangePayload) => void
  ): () => void;
}
```

### 5.4 Channel-Based Subscriptions

| Channel          | Purpose                 | Data Type                             |
| ---------------- | ----------------------- | ------------------------------------- |
| `prices`         | Real-time price updates | Price data with symbol, price, change |
| `tvs`            | Total Value Secured     | Oracle TVS with 24h change            |
| `marketStats`    | Market statistics       | Total TVS, chains, protocols          |
| `uma:prices`     | UMA-specific prices     | UMA oracle prices                     |
| `uma:disputes`   | Dispute events          | Dispute status and details            |
| `uma:validators` | Validator activity      | Validator metrics                     |

### 5.5 Heartbeat and Reconnection Logic

```typescript
// Heartbeat mechanism
protected startHeartbeat(): void {
  this.heartbeatTimer = setInterval(() => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'ping', timestamp: Date.now() });

      // Set timeout for pong response
      this.heartbeatTimeoutTimer = setTimeout(() => {
        logger.warn('Heartbeat timeout, reconnecting...');
        this.ws?.close();
      }, this.config.heartbeatTimeout);
    }
  }, this.config.heartbeatInterval);
}

// Exponential backoff for reconnection
function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  const maxDelay = 30000;
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  return delay + Math.random() * 1000; // Add jitter
}
```

---

## 6. API Layer

### 6.1 Next.js API Routes Structure

```
src/app/api/
├── oracles/
│   ├── route.ts              # GET: List all oracles
│   └── [provider]/
│       └── route.ts          # GET: Oracle-specific data
│
├── alerts/
│   ├── route.ts              # GET, POST: Alert CRUD
│   ├── [id]/
│   │   └── route.ts          # GET, PUT, DELETE: Single alert
│   └── events/
│       ├── route.ts          # GET: Alert events
│       └── [id]/
│           └── acknowledge/
│               └── route.ts  # POST: Acknowledge alert
│
├── auth/
│   ├── callback/
│   │   └── route.ts          # OAuth callback handler
│   └── profile/
│       └── route.ts          # GET, PUT: User profile
│
├── favorites/
│   ├── route.ts              # GET, POST: Favorites
│   └── [id]/
│       └── route.ts          # DELETE: Remove favorite
│
├── snapshots/
│   ├── route.ts              # GET, POST: Snapshots
│   └── [id]/
│       ├── route.ts          # GET, DELETE: Snapshot
│       └── share/
│           └── route.ts      # POST: Share snapshot
│
└── cron/
    └── cleanup/
        └── route.ts          # Cleanup expired records
```

### 6.2 Oracle Handlers

The oracle handlers provide a unified interface for fetching price data:

```typescript
// Core handler functions
export async function handleGetPrice(params: OracleQueryParams): Promise<NextResponse>;

export async function handleGetHistoricalPrices(
  params: OracleQueryParams & { period: number }
): Promise<NextResponse>;

export async function handleBatchPrices(requests: BatchPriceRequest[]): Promise<NextResponse>;

// Validation functions
export function validateProvider(provider: string): NextResponse | null;
export function validateRequiredParams(params: Partial<OracleQueryParams>): NextResponse | null;
export function validatePeriod(period: string | null): {
  valid: boolean;
  value?: number;
  error?: NextResponse;
};
```

### 6.3 Error Handling and Response Formats

#### Standard Error Response

```typescript
interface ErrorResponse {
  code: string;
  message: string;
  retryable: boolean;
  statusCode: number;
  details?: Record<string, unknown>;
}

export const ErrorCodes = {
  INVALID_PROVIDER: 'INVALID_PROVIDER',
  MISSING_PARAMS: 'MISSING_PARAMS',
  INVALID_PARAMS: 'INVALID_PARAMS',
  CLIENT_NOT_FOUND: 'CLIENT_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
```

#### Cached JSON Response

```typescript
export function createCachedJsonResponse<T>(data: T, cacheConfig: CacheConfig): NextResponse {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': `public, s-maxage=${cacheConfig.maxAge}, stale-while-revalidate=${cacheConfig.staleWhileRevalidate}`,
    },
  });
}

export const CacheConfig = {
  PRICE: { maxAge: 30, staleWhileRevalidate: 60 },
  HISTORY: { maxAge: 300, staleWhileRevalidate: 600 },
};
```

### 6.4 Batch Request Support

```typescript
export async function handleBatchPrices(requests: BatchPriceRequest[]): Promise<NextResponse> {
  const results = await Promise.allSettled(
    requests.map(async (req) => {
      const { provider, symbol, chain } = req;
      const client = getOracleClient(provider);

      // Check cache first
      const cachedPrice = await queries.getLatestPrice(provider, symbol, chain);
      if (cachedPrice && isFresh(cachedPrice)) {
        return { provider, symbol, chain, data: cachedPrice, source: 'cache' };
      }

      // Fetch fresh data
      const priceData = await client.getPrice(symbol, chain);
      await queries.savePriceRecord(priceData);

      return { provider, symbol, chain, data: priceData, source: 'fresh' };
    })
  );

  return createCachedJsonResponse({ timestamp: Date.now(), results });
}
```

---

## 7. Oracle Integration Layer

### 7.1 Base Oracle Client

The abstract base class defines the interface for all oracle clients:

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

  protected config: OracleClientConfig;

  // Protected helper methods
  protected createError(message: string, code?: string): OracleError;
  protected generateMockPrice(symbol: string, basePrice: number, chain?: Blockchain): PriceData;
  protected generateMockHistoricalPrices(...): PriceData[];

  // Database integration
  async fetchPriceWithDatabase(
    symbol: string,
    chain: Blockchain | undefined,
    mockGenerator: () => PriceData
  ): Promise<PriceData>;

  async fetchHistoricalPricesWithDatabase(
    symbol: string,
    chain: Blockchain | undefined,
    period: number,
    mockGenerator: () => PriceData[]
  ): Promise<PriceData[]>;
}
```

### 7.2 Provider-Specific Clients

#### Chainlink Client

```typescript
export class ChainlinkClient extends BaseOracleClient {
  name = OracleProvider.CHAINLINK;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
    Blockchain.FANTOM,
    Blockchain.STARKNET,
    Blockchain.BLAST,
    Blockchain.MOONBEAM,
    Blockchain.KAVA,
    Blockchain.POLKADOT,
  ];

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;
    return this.fetchPriceWithDatabase(symbol, chain, () =>
      this.generateMockPrice(symbol, basePrice, chain)
    );
  }
}
```

#### Pyth Network Client

```typescript
export class PythClient extends BaseOracleClient {
  name = OracleProvider.PYTH;
  supportedChains = [
    Blockchain.SOLANA,
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BASE,
    Blockchain.STARKNET,
    Blockchain.BLAST,
    Blockchain.SUI,
    Blockchain.APTOS,
    Blockchain.INJECTIVE,
    Blockchain.SEI,
  ];

  private generateConfidenceInterval(price: number, symbol: string): ConfidenceInterval {
    const baseSpread = SPREAD_PERCENTAGES[symbol.toUpperCase()] || 0.05;
    const halfSpread = price * (baseSpread / 100 / 2);
    return {
      bid: price - halfSpread,
      ask: price + halfSpread,
      widthPercentage: baseSpread,
    };
  }
}
```

#### Band Protocol Client

```typescript
export class BandProtocolClient extends BaseOracleClient {
  name = OracleProvider.BAND_PROTOCOL;
  supportedChains = [
    Blockchain.COSMOS,
    Blockchain.OSMOSIS,
    Blockchain.JUNO,
    Blockchain.ETHEREUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.FANTOM,
    Blockchain.CRONOS,
    Blockchain.INJECTIVE,
    Blockchain.SEI,
    Blockchain.KAVA,
  ];
}
```

#### API3 Client

```typescript
export class API3Client extends BaseOracleClient {
  name = OracleProvider.API3;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
    Blockchain.OPTIMISM,
    Blockchain.MOONBEAM,
    Blockchain.KAVA,
    Blockchain.FANTOM,
    Blockchain.GNOSIS,
    Blockchain.LINEA,
    Blockchain.SCROLL,
  ];
}
```

#### UMA Client

```typescript
export class UMAClient extends BaseOracleClient {
  name = OracleProvider.UMA;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
    Blockchain.AVALANCHE,
    Blockchain.FANTOM,
    Blockchain.GNOSIS,
  ];
}
```

### 7.3 Pyth Hermes Client Integration

The Pyth Hermes Client provides direct integration with Pyth's price feed:

```typescript
export class PythHermesClient {
  private client: HermesClient;
  private priceCallbacks: Map<string, ((price: PythPriceUpdate) => void)[]> = new Map();
  private wsConnection: WebSocket | null = null;

  constructor(endpoint: string = 'https://hermes.pyth.network') {
    this.client = new HermesClient(endpoint);
  }

  async getLatestPrice(symbol: string): Promise<PriceData | null> {
    const priceId = PYTH_PRICE_FEED_IDS[normalizeSymbol(symbol)];
    const priceUpdates = await this.client.getLatestPriceUpdates([priceId]);

    // Parse and return price data with confidence interval
    return {
      provider: OracleProvider.PYTH,
      symbol: symbol.toUpperCase(),
      price: this.convertPythPrice(priceData),
      confidenceInterval: this.calculateConfidenceInterval(...),
      // ...
    };
  }

  subscribeToPriceUpdates(
    symbol: string,
    callback: (price: PythPriceUpdate) => void
  ): () => void {
    // WebSocket subscription implementation
  }
}
```

### 7.4 Storage Layer with Database Fallback

```typescript
export function shouldUseDatabase(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export async function savePriceToDatabase(price: PriceData): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('price_records').insert({
    provider: price.provider,
    symbol: price.symbol,
    chain: price.chain,
    price: price.price,
    timestamp: new Date(price.timestamp).toISOString(),
    confidence: price.confidence,
    ttl: new Date(Date.now() + 3600000).toISOString(), // 1 hour TTL
  });
}

export async function getPriceFromDatabase(
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain
): Promise<PriceData | null> {
  const { data } = await supabase
    .from('price_records')
    .select('*')
    .eq('provider', provider)
    .eq('symbol', symbol)
    .eq('chain', chain)
    .gt('ttl', new Date().toISOString())
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  return data ? mapToPriceData(data) : null;
}
```

### 7.5 Oracle Client Factory

```typescript
export class OracleClientFactory {
  private static instances: Map<OracleProvider, BaseOracleClient> = new Map();
  private static config: OracleClientConfig = {
    useDatabase: true,
    fallbackToMock: true,
  };

  static getClient(provider: OracleProvider): BaseOracleClient {
    if (!this.instances.has(provider)) {
      this.instances.set(provider, this.createClient(provider));
    }
    return this.instances.get(provider)!;
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
        throw new Error(`Unknown oracle provider: ${provider}`);
    }
  }
}
```

---

## 8. Database Architecture

### 8.1 Supabase PostgreSQL

The database is hosted on Supabase with the following schema:

### 8.2 Tables

#### user_profiles

Extends Supabase auth.users with user preferences:

| Column                | Type        | Description                                   |
| --------------------- | ----------- | --------------------------------------------- |
| id                    | UUID        | Primary key, references auth.users            |
| display_name          | TEXT        | User display name                             |
| preferences           | JSONB       | Default oracle, symbol, theme, chart settings |
| notification_settings | JSONB       | Email alerts, push notifications              |
| created_at            | TIMESTAMPTZ | Creation timestamp                            |
| updated_at            | TIMESTAMPTZ | Last update timestamp                         |

#### price_records

Stores historical price data from oracles:

| Column     | Type          | Description                         |
| ---------- | ------------- | ----------------------------------- |
| id         | UUID          | Primary key                         |
| provider   | TEXT          | Oracle provider name                |
| symbol     | TEXT          | Trading pair symbol                 |
| chain      | TEXT          | Blockchain network                  |
| price      | DECIMAL(20,8) | Price value                         |
| timestamp  | TIMESTAMPTZ   | Price timestamp                     |
| confidence | DECIMAL(5,4)  | Confidence score (0-1)              |
| source     | TEXT          | Data source                         |
| created_at | TIMESTAMPTZ   | Record creation time                |
| ttl        | TIMESTAMPTZ   | Time-to-live for cache invalidation |

#### user_snapshots

Stores user price snapshots:

| Column           | Type        | Description               |
| ---------------- | ----------- | ------------------------- |
| id               | UUID        | Primary key               |
| user_id          | UUID        | Foreign key to auth.users |
| symbol           | TEXT        | Trading pair              |
| name             | TEXT        | Snapshot name             |
| selected_oracles | TEXT[]      | Selected oracle providers |
| price_data       | JSONB       | Snapshot price data       |
| stats            | JSONB       | Statistical data          |
| is_public        | BOOLEAN     | Public sharing flag       |
| created_at       | TIMESTAMPTZ | Creation timestamp        |
| updated_at       | TIMESTAMPTZ | Last update timestamp     |

#### user_favorites

Stores user favorite configurations:

| Column      | Type        | Description                               |
| ----------- | ----------- | ----------------------------------------- |
| id          | UUID        | Primary key                               |
| user_id     | UUID        | Foreign key to auth.users                 |
| name        | TEXT        | Favorite name                             |
| config_type | TEXT        | Type: oracle_config, symbol, chain_config |
| config_data | JSONB       | Configuration data                        |
| created_at  | TIMESTAMPTZ | Creation timestamp                        |

#### price_alerts

Stores price alert configurations:

| Column            | Type          | Description                             |
| ----------------- | ------------- | --------------------------------------- |
| id                | UUID          | Primary key                             |
| user_id           | UUID          | Foreign key to auth.users               |
| symbol            | TEXT          | Trading pair                            |
| provider          | TEXT          | Oracle provider                         |
| chain             | TEXT          | Blockchain network                      |
| condition_type    | TEXT          | Condition: above, below, change_percent |
| target_value      | DECIMAL(20,8) | Target price value                      |
| is_active         | BOOLEAN       | Active status                           |
| last_triggered_at | TIMESTAMPTZ   | Last trigger time                       |
| created_at        | TIMESTAMPTZ   | Creation timestamp                      |
| updated_at        | TIMESTAMPTZ   | Last update timestamp                   |

#### alert_events

Stores alert trigger events:

| Column          | Type          | Description                 |
| --------------- | ------------- | --------------------------- |
| id              | UUID          | Primary key                 |
| alert_id        | UUID          | Foreign key to price_alerts |
| user_id         | UUID          | Foreign key to auth.users   |
| triggered_at    | TIMESTAMPTZ   | Trigger timestamp           |
| price           | DECIMAL(20,8) | Price at trigger            |
| condition_met   | TEXT          | Condition description       |
| acknowledged    | BOOLEAN       | Acknowledgment status       |
| acknowledged_at | TIMESTAMPTZ   | Acknowledgment time         |

### 8.3 Row Level Security (RLS) Policies

```sql
-- user_profiles RLS
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

-- price_records RLS (read-only for clients)
CREATE POLICY "Anyone can read price records"
    ON public.price_records FOR SELECT
    USING (true);

-- user_snapshots RLS
CREATE POLICY "Users can view own snapshots"
    ON public.user_snapshots FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Public snapshots are viewable by all"
    ON public.user_snapshots FOR SELECT
    USING (is_public = true);

-- price_alerts RLS
CREATE POLICY "Users can view own alerts"
    ON public.price_alerts FOR SELECT
    USING (auth.uid() = user_id);
```

### 8.4 Database Functions

#### cleanup_expired_price_records

```sql
CREATE OR REPLACE FUNCTION public.cleanup_expired_price_records()
RETURNS void AS $$
BEGIN
    DELETE FROM public.price_records WHERE ttl < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### get_latest_price

```sql
CREATE OR REPLACE FUNCTION public.get_latest_price(
    p_provider TEXT,
    p_symbol TEXT,
    p_chain TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    provider TEXT,
    symbol TEXT,
    chain TEXT,
    price DECIMAL,
    timestamp TIMESTAMPTZ,
    confidence DECIMAL,
    source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pr.id, pr.provider, pr.symbol, pr.chain,
        pr.price, pr.timestamp, pr.confidence, pr.source
    FROM public.price_records pr
    WHERE pr.provider = p_provider
        AND pr.symbol = p_symbol
        AND (p_chain IS NULL OR pr.chain = p_chain)
        AND pr.ttl > NOW()
    ORDER BY pr.timestamp DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### get_price_history

```sql
CREATE OR REPLACE FUNCTION public.get_price_history(
    p_provider TEXT,
    p_symbol TEXT,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_chain TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 1000
)
RETURNS TABLE (...) AS $$
BEGIN
    RETURN QUERY
    SELECT ...
    FROM public.price_records pr
    WHERE pr.provider = p_provider
        AND pr.symbol = p_symbol
        AND (p_chain IS NULL OR pr.chain = p_chain)
        AND pr.timestamp >= p_start_time
        AND pr.timestamp <= p_end_time
    ORDER BY pr.timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8.5 Indexes for Performance

```sql
-- price_records indexes
CREATE INDEX idx_price_records_provider_symbol
    ON public.price_records(provider, symbol);
CREATE INDEX idx_price_records_timestamp
    ON public.price_records(timestamp DESC);
CREATE INDEX idx_price_records_chain
    ON public.price_records(chain);
CREATE INDEX idx_price_records_ttl
    ON public.price_records(ttl);
CREATE INDEX idx_price_records_provider_symbol_timestamp
    ON public.price_records(provider, symbol, timestamp DESC);

-- Partial index for active records
CREATE INDEX idx_price_records_active
    ON public.price_records(provider, symbol)
    WHERE (ttl > NOW());

-- user_snapshots indexes
CREATE INDEX idx_user_snapshots_user_id
    ON public.user_snapshots(user_id);
CREATE INDEX idx_user_snapshots_symbol
    ON public.user_snapshots(symbol);
CREATE INDEX idx_user_snapshots_created_at
    ON public.user_snapshots(created_at DESC);
CREATE INDEX idx_user_snapshots_public
    ON public.user_snapshots(is_public) WHERE (is_public = true);

-- price_alerts indexes
CREATE INDEX idx_price_alerts_user_id
    ON public.price_alerts(user_id);
CREATE INDEX idx_price_alerts_symbol
    ON public.price_alerts(symbol);
CREATE INDEX idx_price_alerts_active
    ON public.price_alerts(is_active) WHERE (is_active = true);

-- alert_events indexes
CREATE INDEX idx_alert_events_user_id
    ON public.alert_events(user_id);
CREATE INDEX idx_alert_events_alert_id
    ON public.alert_events(alert_id);
CREATE INDEX idx_alert_events_triggered_at
    ON public.alert_events(triggered_at DESC);
CREATE INDEX idx_alert_events_acknowledged
    ON public.alert_events(acknowledged) WHERE (acknowledged = false);
```

---

## 9. Authentication Flow

### 9.1 Supabase Auth Integration

The application uses Supabase Auth for authentication:

```typescript
// Auth module exports
export {
  signUp,
  signIn,
  signInWithOAuth,
  signOut,
  resetPassword,
  getSession,
  getUser,
  onAuthStateChange,
  createUserProfile,
  getUserProfile,
} from '@/lib/supabase/auth';
```

### 9.2 Email/Password Authentication

```typescript
// Sign Up
async function signUp(
  email: string,
  password: string,
  displayName?: string
): Promise<{ user: User | null; session: Session | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });
  return { user: data.user, session: data.session, error };
}

// Sign In
async function signIn(
  email: string,
  password: string
): Promise<{ user: User | null; session: Session | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { user: data.user, session: data.session, error };
}
```

### 9.3 OAuth Providers Support

```typescript
async function signInWithOAuth(provider: Provider): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback`,
    },
  });
  return { error };
}
```

### 9.4 Session Management

```typescript
// Get current session
async function getSession(): Promise<{ session: Session | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { session };
}

// Listen for auth state changes
function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): {
  data: { subscription: Subscription };
} {
  return supabase.auth.onAuthStateChange(callback);
}
```

### 9.5 Profile Auto-Creation on Signup

A database trigger automatically creates a user profile when a new user signs up:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            split_part(NEW.email, '@', 1)
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 9.6 Auth Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Authentication Flow                        │
└──────────────────────────────────────────────────────────────┘

1. Email/Password Sign Up:
   User → SignUp Form → AuthContext.signUp() → Supabase Auth
                                                        │
                                                        ▼
                                          Trigger: handle_new_user()
                                                        │
                                                        ▼
                                          Create user_profiles record
                                                        │
                                                        ▼
                                          Return session to client

2. OAuth Sign In:
   User → OAuth Button → AuthContext.signInWithOAuth() → Supabase Auth
                                                            │
                                                            ▼
                                          Redirect to OAuth Provider
                                                            │
                                                            ▼
                                          User authorizes
                                                            │
                                                            ▼
                                          Callback to /api/auth/callback
                                                            │
                                                            ▼
                                          Exchange code for session
                                                            │
                                                            ▼
                                          Redirect to dashboard

3. Session Persistence:
   App Load → AuthContext.initializeAuth() → getSession()
                                                │
                                                ▼
                                    Check for existing session
                                                │
                                                ▼
                                    Subscribe to auth state changes
                                                │
                                                ▼
                                    Update context on changes
```

---

## 10. Data Export System

### 10.1 Export Formats

The system supports three export formats:

| Format | Extension | Library                 | Use Case             |
| ------ | --------- | ----------------------- | -------------------- |
| CSV    | `.csv`    | Native                  | Simple data exchange |
| JSON   | `.json`   | Native                  | API integration      |
| Excel  | `.xlsx`   | jsPDF + jsPDF-AutoTable | Reports              |

### 10.2 Export Configuration

```typescript
export interface ExportConfig {
  id: string;
  name: string;
  nameZh: string;
  description?: string;
  descriptionZh?: string;
  format: ExportFormat;
  timeRange: ExportTimeRange;
  customDateRange?: {
    startDate: string;
    endDate: string;
  };
  dataTypes: ExportDataType[];
  fieldGroups: FieldGroup[];
  includeMetadata: boolean;
  includeTimestamp: boolean;
  fileName?: string;
  createdAt: number;
  updatedAt: number;
}

export type ExportFormat = 'csv' | 'json' | 'excel';
export type ExportTimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL' | 'custom';
export type ExportDataType =
  | 'oracleMarket'
  | 'assets'
  | 'trendData'
  | 'chainBreakdown'
  | 'protocolDetails'
  | 'assetCategories'
  | 'comparisonData'
  | 'benchmarkData'
  | 'correlationData'
  | 'riskMetrics'
  | 'anomalies'
  | 'all';
```

### 10.3 Field Configuration

```typescript
export interface ExportField {
  key: string;
  label: string;
  labelZh: string;
  dataType: 'string' | 'number' | 'boolean' | 'date';
  format?: string;
  selected: boolean;
}

export interface FieldGroup {
  key: ExportDataType;
  label: string;
  labelZh: string;
  fields: ExportField[];
}

// Example field group
{
  key: 'oracleMarket',
  label: 'Oracle Market Data',
  labelZh: '预言机市场数据',
  fields: [
    { key: 'name', label: 'Name', labelZh: '名称', dataType: 'string', selected: true },
    { key: 'share', label: 'Market Share (%)', labelZh: '市场份额 (%)', dataType: 'number', format: '0.00', selected: true },
    { key: 'tvs', label: 'TVS', labelZh: 'TVS', dataType: 'string', selected: true },
    // ... more fields
  ],
}
```

### 10.4 Scheduled Exports

The system supports scheduled exports via cron jobs:

```typescript
// Scheduled export configuration
interface ScheduledExportConfig {
  id: string;
  userId: string;
  name: string;
  config: ExportConfig;
  schedule: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    time: string; // HH:mm format
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
  delivery: {
    method: 'email' | 'webhook' | 'download';
    email?: string;
    webhookUrl?: string;
  };
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
}
```

### 10.5 Export Utilities

```typescript
// Generate export filename
export function generateExportFileName(config: ExportConfig): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const dataTypes = config.dataTypes.length > 2 ? 'multi' : config.dataTypes.join('-');
  const extension = config.format === 'excel' ? 'xlsx' : config.format;
  return `oracle-export-${dataTypes}-${timestamp}.${extension}`;
}

// Validate export configuration
export function validateExportConfig(config: ExportConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name || config.name.trim() === '') {
    errors.push('Configuration name is required');
  }

  if (!config.format || !['csv', 'json', 'excel'].includes(config.format)) {
    errors.push('Invalid export format');
  }

  // ... more validation

  return { valid: errors.length === 0, errors };
}

// Get time range in hours
export function getTimeRangeHours(timeRange: ExportTimeRange): number {
  const hoursMap: Record<ExportTimeRange, number> = {
    '1H': 1,
    '24H': 24,
    '7D': 168,
    '30D': 720,
    '90D': 2160,
    '1Y': 8760,
    ALL: 0,
    custom: 720,
  };
  return hoursMap[timeRange] || 720;
}
```

---

## Technology Stack Summary

| Category             | Technology          | Version |
| -------------------- | ------------------- | ------- |
| Framework            | Next.js             | 16.1.6  |
| UI Library           | React               | 19.2.3  |
| Language             | TypeScript          | 5.x     |
| Styling              | Tailwind CSS        | 4.x     |
| Charts               | Recharts            | 3.8.0   |
| State Management     | React Query         | 5.90.21 |
| Data Fetching        | SWR                 | 2.4.1   |
| Client State         | Zustand             | 5.0.11  |
| Database             | Supabase PostgreSQL | -       |
| Auth                 | Supabase Auth       | 2.98.0  |
| Real-time            | Supabase Realtime   | -       |
| Oracle Clients       | Pyth Hermes Client  | 2.0.0   |
| Animations           | Framer Motion       | 12.36.0 |
| Icons                | Lucide React        | 0.577.0 |
| PDF Export           | jsPDF               | 4.2.0   |
| Internationalization | next-intl           | 4.8.3   |
| Monitoring           | Sentry              | 10.43.0 |

---

## 11. Internationalization Architecture

### 11.1 Message Structure

The application uses a modular internationalization structure with next-intl:

```
src/i18n/messages/
├── common.json           # General translations
├── home.json            # Homepage translations
├── navigation.json      # Navigation translations
├── marketOverview.json  # Market overview translations
├── priceQuery.json      # Price query translations
├── crossOracle.json     # Cross-oracle translations
├── crossChain.json      # Cross-chain translations
├── comparison.json      # Comparison translations
├── dataQuality.json     # Data quality translations
├── dataTransparency.json # Data transparency translations
├── ui.json              # UI component translations
├── oracles/             # Oracle-specific translations
│   ├── chainlink.json
│   ├── band.json
│   ├── uma.json
│   ├── pyth.json
│   ├── api3.json
│   ├── redstone.json
│   ├── dia.json
│   ├── tellor.json
│   ├── chronicle.json
│   └── winklink.json
├── components/          # Component translations
│   ├── charts.json
│   ├── alerts.json
│   ├── search.json
│   ├── export.json
│   └── favorites.json
└── features/            # Feature translations
    ├── settings.json
    ├── auth.json
    └── methodology.json
```

### 11.2 Translation Keys

Translations are organized by feature and follow a hierarchical naming convention:

```typescript
// Example: Oracle-specific translations
{
  "chainlink": {
    "title": "Chainlink",
    "description": "Decentralized Oracle Network",
    "features": {
      "nodeAnalytics": "Node Analytics",
      "dataFeeds": "Data Feeds"
    }
  }
}
```

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# WebSocket (optional)
NEXT_PUBLIC_WS_URL=your_websocket_url

# Analytics (optional)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_analytics_id
```

---

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run database migrations
5. Start development server: `npm run dev`

## Scripts

| Script        | Command                 | Description                   |
| ------------- | ----------------------- | ----------------------------- |
| Development   | `npm run dev`           | Start development server      |
| Build         | `npm run build`         | Build for production          |
| Start         | `npm run start`         | Start production server       |
| Lint          | `npm run lint`          | Run ESLint                    |
| Test          | `npm run test`          | Run Jest tests                |
| Test Watch    | `npm run test:watch`    | Run tests in watch mode       |
| Test Coverage | `npm run test:coverage` | Generate test coverage report |
