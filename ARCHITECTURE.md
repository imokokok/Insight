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
11. [Error Handling System](#11-error-handling-system)
12. [Services Layer](#12-services-layer)

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
│  │                    Zustand Stores                         │   │
│  │  authStore, uiStore, realtimeStore, crossChainStore      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API Layer                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │   Next.js API Routes + Middleware + Versioning           │   │
│  │   /api/oracles  /api/alerts  /api/favorites  /api/auth   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Oracle Integration Layer                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│
│  │Chainlink │ │   Pyth   │ │   API3   │ │RedStone  │ │  DIA   ││
│  │  Client  │ │  Client  │ │  Client  │ │  Client  │ │ Client ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘│
│  ┌──────────┐ ┌────────────────────────────────────────────────┐│
│  │WINkLink  │ │         Base Oracle Client (Abstract)          ││
│  │  Client  │ │                                                ││
│  └──────────┘ └────────────────────────────────────────────────┘│
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

| Component        | Technology                        | Purpose                                |
| ---------------- | --------------------------------- | -------------------------------------- |
| Frontend         | Next.js 16, React 19              | User interface with SSR/SSG            |
| State Management | React Query, Zustand              | Server state & Client UI state         |
| Real-time        | WebSocket, Supabase Realtime      | Live price updates                     |
| API              | Next.js API Routes + Middleware   | Backend endpoints with unified handler |
| Oracle Clients   | Custom TypeScript clients + DI    | Oracle provider integration            |
| Database         | Supabase PostgreSQL               | Data persistence                       |
| Authentication   | Supabase Auth                     | User management                        |
| Error Handling   | Custom Error Classes + Middleware | Unified error handling                 |
| Services Layer   | Market Data & Oracle Services     | Business logic & data processing       |

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

### 2.1 Next.js 16 App Router Structure with Internationalization

The application uses Next.js 16 with the App Router and next-intl for internationalization. All localized pages are organized under the `[locale]` directory.

```
src/app/
├── layout.tsx              # Root layout with providers
├── page.tsx                # Home page with dynamic imports
├── globals.css             # Global styles
├── favicon.ico             # Application icon
│
├── [locale]/               # Internationalized routes
│   ├── layout.tsx         # Locale-specific layout
│   │
│   ├── price-query/       # Price query page
│   ├── cross-oracle/      # Cross-oracle comparison
│   ├── cross-chain/       # Cross-chain analysis
│   ├── favorites/         # User favorites page
│   ├── alerts/            # Alerts management page
│   ├── settings/          # User settings page
│   ├── methodology/       # Methodology page
│   │
│   ├── chainlink/         # Chainlink oracle page
│   ├── pyth/              # Pyth Network page
│   ├── pyth-network/      # Pyth Network page (alt route)
│   ├── api3/              # API3 page
│   ├── redstone/          # RedStone page
│   ├── dia/               # DIA page
│   ├── winklink/          # WINkLink page
│   │
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   ├── snapshot/[id]/    # Shared snapshot view
│   └── auth/              # Auth related pages
│       ├── forgot-password/
│       ├── reset-password/
│       ├── resend-verification/
│       └── verify-email/
│
└── api/                   # API Routes (non-localized)
    └── ...
```

### 2.2 React 19 with Server and Client Components

#### Server Components (Default)

Server Components are used for static content and data fetching that doesn't require client-side interactivity:

```typescript
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

| Page         | Route           | Purpose                                               |
| ------------ | --------------- | ----------------------------------------------------- |
| Home         | `/`             | Dashboard with market overview, price ticker, metrics |
| Price Query  | `/price-query`  | Price lookup and historical data                      |
| Cross-Oracle | `/cross-oracle` | Compare prices across oracles                         |
| Cross-Chain  | `/cross-chain`  | Cross-chain price analysis                            |
| Oracle Pages | `/{oracle}`     | Provider-specific analytics                           |
| Alerts       | `/alerts`       | Price alert management                                |
| Favorites    | `/favorites`    | Saved configurations                                  |
| Settings     | `/settings`     | User preferences                                      |

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
│   │   ├── API3RiskAssessmentPanel.tsx
│   │   ├── DIANFTDataPanel.tsx
│   │   ├── RedStoneDataStreamsPanel.tsx
│   │   └── WINkLinkGamingDataPanel.tsx
│   ├── forms/              # Form components
│   └── indicators/         # Technical indicators
│       ├── BollingerBands.tsx
│       ├── RSIIndicator.tsx
│       ├── MACDIndicator.tsx
│       ├── ATRIndicator.tsx
│       └── index.ts
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
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Client State (Zustand Stores)             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  authStore                           │    │
│  │  - User authentication state                         │    │
│  │  - Session management                                │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  uiStore                             │    │
│  │  - UI preferences, themes, sidebar state             │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  realtimeStore                      │    │
│  │  - WebSocket connection status                      │    │
│  │  - Real-time subscriptions                           │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  crossChainStore                     │    │
│  │  - Cross-chain analysis state                        │    │
│  │  - Chart configurations                              │    │
│  └─────────────────────────────────────────────────────┘    │
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

### 4.3 Zustand Stores

#### authStore

Manages authentication state:

```typescript
interface AuthStore {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}
```

#### uiStore

Manages UI preferences and state:

```typescript
interface UIStore {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  chartPreferences: ChartPreferences;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: string) => void;
}
```

#### realtimeStore

Manages real-time connection and subscriptions:

```typescript
interface RealtimeStore {
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  subscriptions: Set<string>;
  lastMessage: Message | null;
  setConnectionStatus: (status: ConnectionStatus) => void;
  addSubscription: (channel: string) => void;
  removeSubscription: (channel: string) => void;
  setLastMessage: (message: Message | null) => void;
}
```

#### crossChainStore

Manages cross-chain analysis state:

```typescript
interface CrossChainStore {
  selectedProvider: OracleProvider;
  selectedSymbol: string;
  selectedTimeRange: number;
  selectedBaseChain: Blockchain | null;
  visibleChains: Blockchain[];
  showMA: boolean;
  maPeriod: number;
  chartKey: number;
  hiddenLines: Set<string>;
  focusedChain: Blockchain | null;
  tableFilter: 'all' | 'abnormal' | 'normal';
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  loading: boolean;
  refreshStatus: 'idle' | 'refreshing' | 'success' | 'error';
  refreshInterval: RefreshInterval;
  thresholdConfig: ThresholdConfig;
  colorblindMode: boolean;
  setSelectedProvider: (provider: OracleProvider) => void;
  toggleChain: (chain: Blockchain) => void;
  // ... more actions
}
```

#### selectors

Pre-built selectors for optimized state access:

```typescript
export * from './selectors';
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

  protected config = {
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
    heartbeatTimeout: 10000,
    useExponentialBackoff: false,
  };

  connect(): void;
  disconnect(): void;
  subscribe<T>(channel: string, handler: MessageHandler<T>): () => void;
  send(message: Record<string, unknown>): void;
  reconnect(): void;
}
```

### 5.2 Supabase Realtime Integration

The Supabase Realtime manager handles database change subscriptions:

```typescript
class RealtimeManager {
  private client: SupabaseClient;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private connectionStatus: ConnectionStatus = 'disconnected';

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

### 5.3 Price Alerts

Real-time price alert monitoring:

```typescript
interface PriceAlert {
  id: string;
  symbol: string;
  provider: OracleProvider;
  chain: Blockchain;
  conditionType: 'above' | 'below' | 'change_percent';
  targetValue: number;
  isActive: boolean;
  lastTriggeredAt?: Date;
}
```

### 5.4 Channel-Based Subscriptions

| Channel       | Purpose                 | Data Type                             |
| ------------- | ----------------------- | ------------------------------------- |
| `prices`      | Real-time price updates | Price data with symbol, price, change |
| `tvs`         | Total Value Secured     | Oracle TVS with 24h change            |
| `marketStats` | Market statistics       | Total TVS, chains, protocols          |

---

## 6. API Layer

### 6.1 API Layer Architecture

The API layer is a comprehensive system with versioning, middleware, validation, and response handling:

```
src/lib/api/
├── client/
│   ├── ApiClient.ts        # HTTP client with interceptors
│   ├── ApiError.ts         # API error class
│   ├── types.ts            # Client types
│   └── index.ts
├── middleware/
│   ├── authMiddleware.ts   # Authentication middleware
│   ├── errorMiddleware.ts  # Error handling middleware
│   ├── rateLimitMiddleware.ts  # Rate limiting
│   ├── validationMiddleware.ts # Request validation
│   ├── loggingMiddleware.ts    # Request/response logging
│   └── index.ts
├── versioning/
│   ├── index.ts
│   ├── middleware.ts       # Version header middleware
│   └── constants.ts        # Version constants
├── validation/
│   ├── schemas.ts          # Validation schemas (Zod)
│   ├── validators.ts       # Custom validators
│   └── index.ts
├── response/
│   ├── ApiResponse.ts      # Response builders & helpers
│   └── index.ts
├── handler.ts             # Main API handler
├── oracleHandlers.ts      # Oracle-specific handlers
└── utils.ts               # API utilities
```

### 6.2 API Client

The ApiClient provides a typed HTTP client with interceptor support:

```typescript
class ApiClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(baseURL: string = '');

  addRequestInterceptor(interceptor: RequestInterceptor): void;
  addResponseInterceptor(interceptor: ResponseInterceptor): void;

  async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  async post<T>(url: string, data: unknown, config?: RequestConfig): Promise<ApiResponse<T>>;
  async put<T>(url: string, data: unknown, config?: RequestConfig): Promise<ApiResponse<T>>;
  async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
}

export const apiClient = new ApiClient();
```

### 6.3 Middleware Stack

#### Authentication Middleware

```typescript
interface AuthContext {
  userId?: string;
  sessionId?: string;
  permissions?: string[];
}

interface AuthMiddlewareOptions {
  publicPaths?: string[];
  requireAuth?: boolean;
}

function createAuthMiddleware(options?: AuthMiddlewareOptions);
function getUserId(request: Request): string | undefined;
```

#### Validation Middleware

```typescript
interface ValidationMiddlewareOptions {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}

function createValidationMiddleware(options: ValidationMiddlewareOptions);
function validate(schema: z.ZodSchema, data: unknown): ValidationResult;
```

#### Rate Limit Middleware

```typescript
interface RateLimitMiddlewareOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: Request) => string;
}

function createRateLimitMiddleware(options: RateLimitMiddlewareOptions);
```

#### Error Middleware

```typescript
interface ErrorMiddlewareOptions {
  includeStackTrace?: boolean;
  logErrors?: boolean;
}

function createErrorMiddleware(options?: ErrorMiddlewareOptions);
function defaultErrorMiddleware(error: Error, request: Request): NextResponse;
```

#### Logging Middleware

```typescript
interface LoggingMiddlewareOptions {
  logRequest?: boolean;
  logResponse?: boolean;
  logHeaders?: boolean;
  excludePaths?: string[];
}

function createLoggingMiddleware(options?: LoggingMiddlewareOptions);
function logResponse(response: Response, duration: number): void;
```

### 6.4 API Versioning

API versioning via headers:

```typescript
const API_VERSIONS = {
  V1: '1.0.0',
  V2: '2.0.0',
} as const;

const CURRENT_VERSION = API_VERSIONS.V1;

function withVersionHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-API-Version', CURRENT_VERSION);
  response.headers.set('X-API-Min-Version', API_VERSIONS.V1);
  return response;
}
```

### 6.5 Response System

#### Success Response

```typescript
interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    timestamp: number;
    requestId?: string;
    [key: string]: unknown;
  };
}
```

#### Error Response

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
    i18nKey?: string;
  };
  meta?: {
    timestamp: number;
    requestId?: string;
  };
}
```

#### Response Builders

```typescript
class ApiResponseBuilder {
  static success<T>(data: T, meta?: {...}): ApiSuccessResponse<T>;
  static error(code: string, message: string, options?: {...}): ApiErrorResponse;
  static paginated<T>(data: T[], page: number, limit: number, total: number): ApiPaginatedResponse<T>;
}

class ApiResponseHandler {
  static json<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>>;
  static error(code: string, message: string, statusCode: number, options?): NextResponse<ApiErrorResponse>;
  static paginated<T>(data: T[], page: number, limit: number, total: number): NextResponse<ApiPaginatedResponse<T>>;
  static created<T>(data: T): NextResponse<ApiSuccessResponse<T>>;
  static noContent(): NextResponse;
  static badRequest(message: string, details?): NextResponse<ApiErrorResponse>;
  static unauthorized(message?, details?): NextResponse<ApiErrorResponse>;
  static forbidden(message?, details?): NextResponse<ApiErrorResponse>;
  static notFound(message?, details?): NextResponse<ApiErrorResponse>;
  static conflict(message: string, details?): NextResponse<ApiErrorResponse>;
  static tooManyRequests(retryAfter: number, message?): NextResponse<ApiErrorResponse>;
  static internalError(message?, details?): NextResponse<ApiErrorResponse>;
}
```

### 6.6 Cache Configuration

```typescript
const CacheConfig = {
  PRICE: { maxAge: 30, staleWhileRevalidate: 60 },
  HISTORY: { maxAge: 300, staleWhileRevalidate: 600 },
  SHORT: { maxAge: 10, staleWhileRevalidate: 30 },
  NONE: { header: 'no-store, no-cache, must-revalidate' },
} as const;

function createCachedJsonResponse<T>(data: T, cacheConfig: CacheConfig): NextResponse;
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
  protected createError(message: string, code?: string): OracleError;
  protected generateMockPrice(symbol: string, basePrice: number, chain?: Blockchain): PriceData;
  protected generateMockHistoricalPrices(...): PriceData[];
  async fetchPriceWithDatabase(...): Promise<PriceData>;
  async fetchHistoricalPricesWithDatabase(...): Promise<PriceData[]>;
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

### 7.3 Additional Oracle Implementations

| Client   | File                                                                                            | Description                                  |
| -------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------- |
| RedStone | `redstone.ts`, `redstoneConstants.ts`                                                           | RedStone oracle data streams                 |
| DIA      | `dia.ts`, `diaDataService.ts`, `diaPriceService.ts`, `diaNFTService.ts`, `diaNetworkService.ts` | DIA oracle with modular service architecture |
| WINkLink | `winklink.ts`, `winklinkRealDataService.ts`                                                     | WINkLink oracle with real data support       |

#### DIA Service Architecture

DIA 预言机采用模块化服务架构：

```typescript
// DIADataService - 主服务入口
class DIADataService {
  private priceService: DIAPriceService; // 价格数据服务
  private nftService: DIANFTService; // NFT 地板价服务
  private networkService: DIANetworkService; // 网络统计服务

  async getAssetPrice(symbol: string, chain?: Blockchain): Promise<PriceData | null>;
  async getNFTFloorPrice(
    collectionAddress: string,
    chain: Blockchain
  ): Promise<DIANFTQuotation | null>;
  async getNetworkStats(): Promise<DIANetworkStatsData | null>;
  async getTokenOnChainData(
    symbol: string,
    chain?: Blockchain
  ): Promise<DIATokenOnChainData | null>;
}
```

**支持的区块链映射** (DIA_CHAIN_MAPPING):

- Ethereum, Arbitrum, Polygon, Avalanche, BNB Chain, Base, Optimism, Fantom, Cronos
- Moonbeam, Gnosis, Kava, Solana, Sui, Aptos, Injective, Sei
- Cosmos, Osmosis, Juno, Celestia, Tron, TON, Near, Aurora, Celo
- Starknet, Blast, Cardano, Polkadot, Mantle, Linea, Scroll, zkSync
- Moonriver, Metis, StarkEx

**配置资产地址** (DIA_ASSET_ADDRESSES):

- DIA, ETH, BTC, USDC, USDT, LINK 等多链合约地址配置

### 7.4 Pyth Hermes Client Integration

```typescript
export class PythHermesClient {
  private client: HermesClient;
  private priceCallbacks: Map<string, ((price: PythPriceUpdate) => void)[]> = new Map();
  private wsConnection: WebSocket | null = null;

  constructor(endpoint: string = 'https://hermes.pyth.network');
  async getLatestPrice(symbol: string): Promise<PriceData | null>;
  subscribeToPriceUpdates(symbol: string, callback: (price: PythPriceUpdate) => void): () => void;
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

  static getClient(provider: OracleProvider): BaseOracleClient;
  private static createClient(provider: OracleProvider): BaseOracleClient;
}
```

---

## 8. Database Architecture

### 8.1 Supabase PostgreSQL

The database is hosted on Supabase with the following schema:

### 8.2 Tables

#### user_profiles

| Column                | Type        | Description                                   |
| --------------------- | ----------- | --------------------------------------------- |
| id                    | UUID        | Primary key, references auth.users            |
| display_name          | TEXT        | User display name                             |
| preferences           | JSONB       | Default oracle, symbol, theme, chart settings |
| notification_settings | JSONB       | Email alerts, push notifications              |
| created_at            | TIMESTAMPTZ | Creation timestamp                            |
| updated_at            | TIMESTAMPTZ | Last update timestamp                         |

#### price_records

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
| ttl        | TIMESTAMPTZ   | Time-to-live for cache invalidation |

#### user_snapshots

| Column           | Type    | Description               |
| ---------------- | ------- | ------------------------- |
| id               | UUID    | Primary key               |
| user_id          | UUID    | Foreign key to auth.users |
| symbol           | TEXT    | Trading pair              |
| name             | TEXT    | Snapshot name             |
| selected_oracles | TEXT[]  | Selected oracle providers |
| price_data       | JSONB   | Snapshot price data       |
| stats            | JSONB   | Statistical data          |
| is_public        | BOOLEAN | Public sharing flag       |

#### user_favorites

| Column      | Type  | Description                               |
| ----------- | ----- | ----------------------------------------- |
| id          | UUID  | Primary key                               |
| user_id     | UUID  | Foreign key to auth.users                 |
| name        | TEXT  | Favorite name                             |
| config_type | TEXT  | Type: oracle_config, symbol, chain_config |
| config_data | JSONB | Configuration data                        |

#### price_alerts

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

#### alert_events

| Column        | Type          | Description                 |
| ------------- | ------------- | --------------------------- |
| id            | UUID          | Primary key                 |
| alert_id      | UUID          | Foreign key to price_alerts |
| user_id       | UUID          | Foreign key to auth.users   |
| triggered_at  | TIMESTAMPTZ   | Trigger timestamp           |
| price         | DECIMAL(20,8) | Price at trigger            |
| condition_met | TEXT          | Condition description       |
| acknowledged  | BOOLEAN       | Acknowledgment status       |

### 8.3 Row Level Security (RLS) Policies

```sql
-- user_profiles RLS
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

-- price_records RLS (read-only for clients)
CREATE POLICY "Anyone can read price records"
    ON public.price_records FOR SELECT
    USING (true);

-- user_snapshots RLS
CREATE POLICY "Users can view own snapshots"
    ON public.user_snapshots FOR SELECT
    USING (auth.uid() = user_id);

-- price_alerts RLS
CREATE POLICY "Users can view own alerts"
    ON public.price_alerts FOR SELECT
    USING (auth.uid() = user_id);
```

---

## 9. Authentication Flow

### 9.1 Supabase Auth Integration

```typescript
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

### 9.2 Session Management

```typescript
async function getSession(): Promise<{ session: Session | null }>;
function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void);
```

### 9.3 Profile Auto-Creation on Signup

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
```

---

## 10. Data Export System

### 10.1 Export Formats

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
  format: ExportFormat;
  timeRange: ExportTimeRange;
  customDateRange?: { startDate: string; endDate: string };
  dataTypes: ExportDataType[];
  fieldGroups: FieldGroup[];
  includeMetadata: boolean;
  includeTimestamp: boolean;
}

export type ExportFormat = 'csv' | 'json' | 'excel';
export type ExportTimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL' | 'custom';
```

---

## 11. Error Handling System

### 11.1 Error Architecture

```
src/lib/errors/
├── AppError.ts           # Abstract base error class
├── BusinessErrors.ts     # Business error types
├── OracleError.ts        # Oracle-specific errors
├── errorRecovery.ts      # Error recovery mechanisms
├── errorToResponse.ts    # Error to API response conversion
├── index.ts              # Exports
└── __tests__/           # Error tests
```

### 11.2 AppError Base Class

```typescript
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

  constructor(options: AppErrorOptions);
  toJSON(): Record<string, unknown>;
  toApiResponse(): { error: { code: string; message: string; retryable: boolean; details? } };
}
```

### 11.3 Business Error Types

```typescript
export class ValidationError extends AppError {
  constructor(message: string, details?: ValidationErrorDetails, i18nKey?: string);
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: NotFoundErrorDetails, i18nKey?: string);
}

export class AuthenticationError extends AppError {
  constructor(message: string, details?: AuthenticationErrorDetails, i18nKey?: string);
}

export class AuthorizationError extends AppError {
  constructor(message: string, details?: AuthorizationErrorDetails, i18nKey?: string);
}

export class ConflictError extends AppError {
  constructor(message: string, details?: ConflictErrorDetails, i18nKey?: string);
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;
  constructor(message: string, details?: RateLimitErrorDetails, i18nKey?: string);
}

export class InternalError extends AppError {
  constructor(message: string, details?: InternalErrorDetails, i18nKey?: string, cause?: Error);
}
```

### 11.4 Error Codes

| Code                 | Status | Description               |
| -------------------- | ------ | ------------------------- |
| VALIDATION_ERROR     | 400    | Request validation failed |
| NOT_FOUND            | 404    | Resource not found        |
| AUTHENTICATION_ERROR | 401    | Authentication required   |
| AUTHORIZATION_ERROR  | 403    | Insufficient permissions  |
| CONFLICT             | 409    | Resource conflict         |
| RATE_LIMIT_EXCEEDED  | 429    | Rate limit exceeded       |
| INTERNAL_ERROR       | 500    | Internal server error     |

---

## 12. Services Layer

### 12.1 Services Architecture

```
src/lib/services/
├── marketData/
│   ├── anomalyCalculations.ts  # Anomaly detection algorithms
│   ├── defiLlamaApi.ts         # DeFi Llama API integration
│   ├── priceCalculations.ts    # Price computation utilities
│   ├── riskCalculations.ts     # Risk metrics calculations
│   └── index.ts
├── oracle/
│   ├── OracleMarketDataService.ts  # Oracle market data service
│   └── index.ts
└── api3WebSocket.ts            # API3 WebSocket service
```

### 12.2 Market Data Service

```typescript
export class OracleMarketDataService {
  async getMarketData(): Promise<MarketData>;
  async getPriceStats(symbol: string, provider: OracleProvider): Promise<PriceStats>;
  async getHistoricalStats(symbol: string, period: number): Promise<HistoricalStats>;
}
```

### 12.3 Price Calculations

```typescript
export function calculatePriceChange(current: number, previous: number): PriceChange;
export function calculateVolatility(prices: number[]): number;
export function calculateMA(prices: number[], period: number): number;
export function calculateEMA(prices: number[], period: number): number;
export function calculateRSI(prices: number[], period: number): number;
```

### 12.4 Risk Calculations

```typescript
export function calculateVaR(prices: number[], confidence: number): number;
export function calculateSharpeRatio(returns: number[], riskFreeRate: number): number;
export function calculateMaxDrawdown(prices: number[]): number;
export function calculateRiskScore(metrics: RiskMetrics): number;
```

### 12.5 Anomaly Calculations

```typescript
export function detectPriceAnomalies(prices: PriceData[]): Anomaly[];
export function calculateZScore(value: number, mean: number, stdDev: number): number;
export function isOutlier(value: number, threshold: number): boolean;
```

---

## Technology Stack Summary

| Category             | Technology              | Version         |
| -------------------- | ----------------------- | --------------- |
| Framework            | Next.js                 | 16.1.6          |
| UI Library           | React                   | 19.2.3          |
| Language             | TypeScript              | 5.x             |
| Styling              | Tailwind CSS            | 4.x             |
| Charts               | Recharts                | 3.8.0           |
| State Management     | React Query             | 5.90.21         |
| Client State         | Zustand                 | 5.0.11          |
| Database             | Supabase PostgreSQL     | -               |
| Auth                 | Supabase Auth           | 2.98.0          |
| Real-time            | Supabase Realtime       | -               |
| Oracle Clients       | Pyth Hermes Client      | 2.0.0           |
| Oracle Clients       | Pyth Price Service SDK  | 1.8.0           |
| Oracle Clients       | API3 Contracts          | 27.0.0          |
| Animations           | Framer Motion           | 12.36.0         |
| Icons                | Lucide React            | 0.577.0         |
| PDF Export           | jsPDF                   | 4.2.0           |
| PDF Export           | jsPDF-AutoTable         | 5.0.7           |
| Internationalization | next-intl               | 4.8.3           |
| Monitoring           | Sentry                  | 10.43.0         |
| Virtualization       | @tanstack/react-virtual | 3.13.21         |
| HTTP Client          | Axios                   | 1.13.6          |
| Testing              | Jest                    | 30.3.0          |
| Testing              | Playwright              | 1.58.2          |
| Testing              | Testing Library         | 10.4.1 / 16.3.2 |
| Validation           | Zod                     | 4.3.6           |
| Date Handling        | date-fns                | 4.1.0           |
| Search               | Fuse.js                 | 7.1.0           |
| Blockchain           | Viem                    | 2.47.6          |
| Maps                 | react-simple-maps       | 3.0.0           |

---

## Internationalization Architecture

### Message Structure

```
src/i18n/messages/
├── common.json           # General translations
├── home.json            # Homepage translations
├── navigation.json      # Navigation translations
├── priceQuery.json      # Price query translations
├── crossOracle.json     # Cross-oracle translations
├── crossChain.json      # Cross-chain translations
├── comparison.json      # Comparison translations
├── dataQuality.json     # Data quality translations
├── ui.json              # UI component translations
├── oracles/             # Oracle-specific translations
│   ├── chainlink.json
│   ├── pyth.json
│   ├── api3.json
│   ├── redstone.json
│   ├── dia.json
│   └── winklink.json
├── components/          # Component translations
└── features/            # Feature translations
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

| Script        | Command                 | Description                    |
| ------------- | ----------------------- | ------------------------------ |
| Development   | `npm run dev`           | Start development server       |
| Build         | `npm run build`         | Build for production           |
| Start         | `npm run start`         | Start production server        |
| Lint          | `npm run lint`          | Run ESLint                     |
| Typecheck     | `npm run typecheck`     | Run TypeScript checking        |
| Test          | `npm run test`          | Run Jest tests                 |
| Test Watch    | `npm run test:watch`    | Run tests in watch mode        |
| Test Coverage | `npm run test:coverage` | Generate test coverage report  |
| Format        | `npm run format`        | Format code with Prettier      |
| Validate      | `npm run validate`      | Run lint, typecheck, and tests |
