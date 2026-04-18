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
│  │  authStore, uiStore, realtimeStore, crossChainStores     │   │
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
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────────┐│
│  │WINkLink  │ │  Supra   │ │   TWAP   │ │    Base Oracle Client  ││
│  │  Client  │ │  Client  │ │  Client  │ │      (Abstract)        ││
│  └──────────┘ └──────────┘ └──────────┘ └────────────────────────┘│
│  ┌──────────┐ ┌──────────┐                                        │
│  │Reflector │ │  Flare   │                                        │
│  │  Client  │ │  Client  │                                        │
│  └──────────┘ └──────────┘                                        │
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
| Services Layer   | Market Data Services              | Business logic & data processing       |

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

The application uses Next.js 16 with the App Router. All pages are organized under the `app` directory.

```
src/app/
├── layout.tsx              # Root layout with providers
├── page.tsx                # Home page with dynamic imports
├── globals.css             # Global styles
├── favicon.ico             # Application icon
│
├── price-query/            # Price query page
├── cross-oracle/           # Cross-oracle comparison
├── cross-chain/            # Cross-chain analysis
├── favorites/              # User favorites page
├── alerts/                 # Alerts management page
├── settings/               # User settings page
├── docs/                   # Documentation page
│
├── login/                  # Login page
├── register/               # Registration page
└── auth/                   # Auth related pages
    ├── forgot-password/
    ├── reset-password/
    ├── resend-verification/
    └── verify-email/
│
└── api/                   # API Routes
    ├── oracles/           # Oracle data endpoints
    ├── alerts/            # Alert management
    ├── favorites/         # User favorites
    ├── auth/              # Authentication
    ├── health/            # Health check
    └── prices/            # Price data
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
| Alerts       | `/alerts`       | Price alert management                                |
| Favorites    | `/favorites`    | Saved configurations                                  |
| Settings     | `/settings`     | User preferences                                      |

---

## 3. Component Organization

### 3.1 Directory Structure

```
src/components/
├── charts/                 # Chart components
│   └── ChartToolbar.tsx
│
├── navigation/             # Navigation components
│   ├── DropdownMenu.tsx
│   ├── MobileDrawer.tsx
│   ├── UserMenuDropdown.tsx
│   ├── config.ts
│   ├── types.ts
│   └── index.ts
│
├── alerts/                 # Alert components
│   ├── AlertConfig.tsx
│   ├── AlertHistory.tsx
│   ├── AlertList.tsx
│   ├── AlertBatchOperations.tsx
│   ├── AlertMutePeriod.tsx
│   ├── AlertTemplates.tsx
│   └── __tests__/
│
├── favorites/              # Favorites components
│   ├── FavoriteButton.tsx
│   ├── FavoriteCard.tsx
│   ├── FavoritesManager.tsx
│   └── index.ts
│
├── export/                 # Export components
│   ├── UnifiedExport.tsx
│   ├── ExportHistoryPanel.tsx
│   ├── exportUtils.ts
│   ├── types.ts
│   ├── useExportHistory.ts
│   └── index.ts
│
├── data-transparency/      # Data transparency components
│   ├── DataSourceIndicator.tsx
│   ├── DataSourceList.tsx
│   ├── DataUpdateTime.tsx
│   └── index.ts
│
├── accessibility/          # Accessibility components
│   └── accessibility.css
│
├── search/                 # Search components
│   ├── GlobalSearch.tsx
│   ├── SearchButton.tsx
│   ├── data.ts
│   ├── types.ts
│   ├── useGlobalSearch.ts
│   ├── useSearchKeyboardNavigation.ts
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
│   └── ConnectionStatus.tsx
│
├── shortcuts/              # Keyboard shortcuts
│   ├── ShortcutContext.tsx
│   ├── ShortcutHelpPanel.tsx
│   ├── ShortcutInitializer.tsx
│   └── index.ts
│
├── error-boundary/         # Error boundary components
│   ├── ErrorBoundary.tsx
│   └── index.ts
│
├── icons/                  # Icon components
│   └── SocialIcons.tsx
│
├── ui/                     # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── ChartSkeleton.tsx
│   ├── CompactStatCard.tsx
│   ├── DataTablePro.tsx
│   ├── EmptyStateEnhanced.tsx
│   ├── LiveStatusBar.tsx
│   ├── PasswordInput.tsx
│   ├── PriceFlash.tsx
│   ├── Skeleton.tsx
│   ├── StatCard.tsx
│   ├── Tooltip.tsx
│   ├── DataTablePro/       # Advanced data table
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── types.ts
│   └── selectors/          # Selector components
│       ├── DropdownSelect.tsx
│       ├── SegmentedControl.tsx
│       ├── types.ts
│       └── index.ts
│
├── Navbar.tsx
├── Footer.tsx
├── AppInitializer.tsx
└── PerformanceMetricsCollector.tsx
```

### 3.2 Page-Level Component Organization

Each major page has its own component directory under `src/app/`:

#### Price Query Components (`src/app/price-query/components/`)

- `PriceChart.tsx` - Price chart with technical indicators
- `QueryForm.tsx` - Oracle/symbol/chain selection form
- `QueryHeader.tsx` - Page header with controls
- `QueryResults.tsx` - Price data results display
- `ChartDataTable.tsx` - Tabular data view
- `CustomTooltip.tsx` - Chart tooltip
- `AutoRefreshControl.tsx` - Auto-refresh toggle
- `DataSourceSection.tsx` - Data source information
- `ErrorBanner.tsx` - Error display
- `ExportConfig.tsx` - Export configuration
- `UnifiedExportSection.tsx` - Unified export UI
- `TokenIcon.tsx` - Token icon display
- `stats/` - Per-oracle statistics cards (ChainlinkStats, PythStats, etc.)

#### Cross-Chain Components (`src/app/cross-chain/components/`)

- `InteractivePriceChart.tsx` - Interactive multi-chain price chart
- `PriceComparisonTable.tsx` - Cross-chain price table
- `PriceSpreadHeatmap.tsx` - Price spread visualization
- `OverviewTab.tsx` - Overview tab
- `ChartsTab.tsx` - Charts tab
- `TechnicalIndicators.tsx` - Technical indicator overlays
- `StabilityAnalysis.tsx` - Price stability analysis
- `ChainSelector.tsx` - Chain selection
- `CrossChainFilters.tsx` - Filter controls
- `TabNavigation.tsx` - Tab navigation
- `AnomalyConfig.tsx` - Anomaly detection config
- `ReferenceLineManager.ts` - Chart reference lines
- `BenchmarkComparisonSection.tsx` - Benchmark comparison
- `DataSourceSection.tsx` - Data source info
- `FavoritesDropdown.tsx` - Favorites integration
- `StandardBoxPlot.tsx` - Box plot visualization

#### Cross-Oracle Components (`src/app/cross-oracle/components/`)

- `ControlPanel.tsx` - Oracle/symbol selection
- `SimplePriceTable.tsx` - Price comparison table
- `RiskAlertBanner.tsx` - Risk alert display
- `OracleErrorPanel.tsx` - Error display
- `CrossOracleExportSection.tsx` - Export UI
- `price-comparison/` - Price analysis components
  - `MultiOracleTrendChart.tsx`
  - `DeviationScatterChart.tsx`
  - `PriceDistributionHistogram.tsx`
  - `PriceDispersionCard.tsx`
  - `MarketConsensusCard.tsx`
  - `DispersionGauge.tsx`
  - `ConfidenceBar.tsx`
  - `PriceRangeBar.tsx`
  - `MarketDepthSimulator.tsx`
  - `ChartTabSwitcher.tsx`

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
│  │  - Sidebar, modal, mobile state                      │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  realtimeStore                      │    │
│  │  - WebSocket connection status                      │    │
│  │  - Real-time subscriptions                           │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Cross-Chain Stores (4 stores)              │    │
│  │  - crossChainConfigStore: Configuration state        │    │
│  │  - crossChainDataStore: Data state                   │    │
│  │  - crossChainSelectorStore: Selector state           │    │
│  │  - crossChainUIStore: UI state                       │    │
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
interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  subscription: RealtimeSubscription | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  cleanup: () => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```

#### uiStore

Manages UI preferences and state:

```typescript
interface UIStore {
  sidebar: { isOpen: boolean; isCollapsed: boolean; activeItem: string };
  modal: { isOpen: boolean; modalId: string | null; modalData: unknown };
  isMobile: boolean;
  toggleSidebar: () => void;
  openModal: (modalId: string, data?: unknown) => void;
  closeModal: () => void;
  setIsMobile: (isMobile: boolean) => void;
}
```

#### realtimeStore

Manages real-time connection and subscriptions:

```typescript
interface RealtimeState {
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  activeSubscriptions: string[];
  lastPriceUpdate: PriceUpdate | null;
  lastAlertEvent: AlertEvent | null;
  lastSnapshotChange: SnapshotChange | null;
  lastFavoriteChange: FavoriteChange | null;
  priceUpdateCount: number;
  alertEventCount: number;
  reconnectAttempts: number;
  userId: string | null;
}
```

#### crossChainConfigStore

Manages cross-chain configuration state:

```typescript
interface ConfigState {
  refreshInterval: RefreshInterval;
  thresholdConfig: ThresholdConfig;
  colorblindMode: boolean;
  updateIntervals: Record<string, number>;
}
```

#### crossChainDataStore

Manages cross-chain data state:

```typescript
interface DataState {
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  crossChainComparison: CrossChainComparisonResult[];
  loading: boolean;
  refreshStatus: 'idle' | 'refreshing' | 'success' | 'error';
  showRefreshSuccess: boolean;
  lastUpdated: number | null;
  anomalies: Anomaly[];
}
```

#### crossChainSelectorStore

Manages cross-chain selector state:

```typescript
interface SelectorState {
  selectedProvider: OracleProvider;
  selectedSymbol: string;
  selectedTimeRange: number;
  selectedBaseChain: Blockchain | null;
}
```

#### crossChainUIStore

Manages cross-chain UI state:

```typescript
interface UIState {
  visibleChains: Blockchain[];
  showMA: boolean;
  maPeriod: number;
  chartKey: number;
  hiddenLines: Set<string>;
  focusedChain: Blockchain | null;
  tableFilter: 'all' | 'abnormal' | 'normal';
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
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
│   ├── enhancedErrorMiddleware.ts  # Enhanced error handling
│   ├── errorMiddleware.ts  # Error handling middleware
│   ├── rateLimitMiddleware.ts  # Rate limiting
│   ├── rateLimitStore.ts   # Rate limit state store
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
│   ├── oracleDataValidation.ts  # Oracle data validation
│   └── index.ts
├── response/
│   ├── ApiResponse.ts      # Response builders & helpers
│   └── index.ts
├── retry/
│   ├── enhancedRetry.ts    # Enhanced retry logic
│   └── index.ts
├── handler.ts             # Main API handler
├── oracleHandlers.ts      # Oracle-specific handlers
├── oracleApiClient.ts     # Oracle API client
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
  abstract getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: PriceFetchOptions
  ): Promise<PriceData>;
  abstract getSupportedSymbols(): string[];

  protected config: OracleClientConfig;
  protected createError(message: string, code?: string, options?: ErrorOptions): OracleError;
  protected createUnsupportedSymbolError(symbol: string, chain?: Blockchain): OracleError;
  protected createNoDataError(symbol: string, chain?: Blockchain, reason?: string): OracleError;
  protected createProviderError(
    reason: string,
    originalError?: Error,
    options?: ErrorOptions
  ): OracleError;
  protected validatePriceData(data: unknown, context?: string): PriceData;
  protected safeValidatePriceData(data: unknown, context?: string): PriceData | null;

  getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number,
    options?: PriceFetchOptions
  ): Promise<PriceData[]>;
  isSymbolSupported(symbol: string, chain?: Blockchain): boolean;
  getSupportedChainsForSymbol(symbol: string): Blockchain[];
  getUpdateInterval(chain?: Blockchain): number;
  fetchPriceWithDatabase(symbol: string, chain?: Blockchain): Promise<PriceData>;
  fetchHistoricalPricesWithDatabase(
    symbol: string,
    chain?: Blockchain,
    period?: number
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
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
  ];
}
```

#### Pyth Network Client

```typescript
export class PythClient extends BaseOracleClient {
  name = OracleProvider.PYTH;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.SOLANA,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.APTOS,
    Blockchain.SUI,
    Blockchain.BASE,
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
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
    Blockchain.OPTIMISM,
  ];
}
```

#### RedStone Client

```typescript
export class RedStoneClient extends BaseOracleClient {
  name = OracleProvider.REDSTONE;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
    Blockchain.FANTOM,
    Blockchain.LINEA,
    Blockchain.MANTLE,
    Blockchain.SCROLL,
    Blockchain.ZKSYNC,
  ];
}
```

#### DIA Client

```typescript
export class DIAClient extends BaseOracleClient {
  name = OracleProvider.DIA;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
  ];
}
```

#### WINkLink Client

```typescript
export class WINkLinkClient extends BaseOracleClient {
  name = OracleProvider.WINKLINK;
  supportedChains = [Blockchain.TRON];
}
```

#### Supra Client

```typescript
export class SupraClient extends BaseOracleClient {
  name = OracleProvider.SUPRA;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BASE,
    Blockchain.SOLANA,
    Blockchain.BNB_CHAIN,
    Blockchain.AVALANCHE,
    Blockchain.ZKSYNC,
    Blockchain.SCROLL,
    Blockchain.MANTLE,
    Blockchain.LINEA,
  ];
}
```

#### TWAP Client

```typescript
export class TWAPClient extends BaseOracleClient {
  name = OracleProvider.TWAP;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
  ];
}
```

#### Reflector Client

```typescript
export class ReflectorClient extends BaseOracleClient {
  name = OracleProvider.REFLECTOR;
  supportedChains = [Blockchain.STELLAR];
}
```

#### Flare Client

```typescript
export class FlareClient extends BaseOracleClient {
  name = OracleProvider.FLARE;
  supportedChains = [Blockchain.FLARE];
}
```

### 7.3 Oracle File Structure

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
```

### 7.4 Oracle Client Factory

```typescript
export class OracleClientFactory {
  private static instances: Map<OracleProvider, BaseOracleClient> = new Map();

  static getClient(provider: OracleProvider): BaseOracleClient;
  private static createClient(provider: OracleProvider): BaseOracleClient;
}

export function getOracleClient(provider: OracleProvider): BaseOracleClient;
export function getAllOracleClients(): Record<OracleProvider, BaseOracleClient>;
```

### 7.5 DIA Service Architecture

DIA oracle adopts a modular service architecture:

```typescript
class DIADataService {
  private priceService: DIAPriceService;
  private nftService: DIANFTService;
  private networkService: DIANetworkService;

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

### 7.6 TWAP On-Chain Service Architecture

TWAP oracle adopts a direct on-chain data fetching architecture via Uniswap V3 pool contracts:

```typescript
class TwapOnChainService {
  private cache: Map<string, { data: TwapPriceData; timestamp: number }>;

  async getTwapPrice(symbol: string, chain: Blockchain): Promise<TwapPriceData>;
  async getSpotPrice(symbol: string, chain: Blockchain): Promise<TwapPriceData>;
  async getPoolInfo(poolAddress: string, chain: Blockchain): Promise<PoolInfo>;
  async getPrices(symbols: string[], chain: Blockchain): Promise<TwapPriceData[]>;
  async findPoolAddress(token0: string, token1: string, chain: Blockchain): Promise<string | null>;
}
```

### 7.7 Reflector Service Architecture

Reflector oracle integrates with the Stellar network via Soroban smart contracts:

```typescript
class ReflectorDataService {
  private cache: Map<string, { data: ReflectorPriceData; timestamp: number }>;

  async fetchLatestPrice(symbol: string, signal?: AbortSignal): Promise<PriceData | null>;
  async fetchPrices(symbols: string[], signal?: AbortSignal): Promise<PriceData[]>;
  async getAssetMetadata(symbol: string): Promise<ReflectorAssetMetadata | null>;
}
```

### 7.8 Flare FTSO Service Architecture

Flare oracle uses the Flare Time Series Oracle (FTSO) for on-chain price feeds:

```typescript
class FtsoDataService {
  private cache: Map<string, { data: FtsoPriceData; timestamp: number }>;

  async fetchPrice(symbol: string, network: string, signal?: AbortSignal): Promise<FtsoPriceData>;
  async fetchPrices(symbols: string[], network: string): Promise<FtsoPriceData[]>;
  async getFeedId(symbol: string): Promise<string | null>;
  clearCache(): void;
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
| PDF    | `.pdf`    | jsPDF + jsPDF-AutoTable | Printable reports    |
| PNG    | `.png`    | html2canvas             | Chart screenshots    |

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
  cause?: Error;
}

export abstract class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: AppErrorDetails;

  constructor(options: AppErrorOptions);
  toJSON(): Record<string, unknown>;
  toApiResponse(): { error: { code: string; message: string; retryable: boolean; details? } };
}
```

### 11.3 Business Error Types

```typescript
export class ValidationError extends AppError {
  constructor(message: string, details?: ValidationErrorDetails);
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: NotFoundErrorDetails);
}

export class AuthenticationError extends AppError {
  constructor(message: string, details?: AuthenticationErrorDetails);
}

export class AuthorizationError extends AppError {
  constructor(message: string, details?: AuthorizationErrorDetails);
}

export class ConflictError extends AppError {
  constructor(message: string, details?: ConflictErrorDetails);
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;
  constructor(message: string, details?: RateLimitErrorDetails);
}

export class InternalError extends AppError {
  constructor(message: string, details?: InternalErrorDetails, cause?: Error);
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
│   ├── binanceMarketService.ts      # Binance market data
│   ├── coinGeckoMarketService.ts    # CoinGecko market data
│   ├── anomalyCalculations.ts       # Anomaly detection algorithms
│   ├── performanceMetrics.ts        # Performance metrics calculations
│   ├── priceCalculations.ts         # Price computation utilities
│   ├── riskCalculations.ts          # Risk metrics calculations
│   ├── types.ts                     # Market data types
│   ├── defiLlamaApi/                # DeFi Llama API integration
│   │   ├── client.ts
│   │   ├── assets.ts
│   │   ├── chains.ts
│   │   ├── comparison.ts
│   │   ├── oracles.ts
│   │   ├── protocols.ts
│   │   ├── types.ts
│   │   └── index.ts
│   └── index.ts
└── oracle/
    └── __tests__/                   # Oracle service tests
```

### 12.2 Price Calculations

```typescript
export function calculatePriceChange(current: number, previous: number): PriceChange;
export function calculateVolatility(prices: number[]): number;
export function calculateMA(prices: number[], period: number): number;
export function calculateEMA(prices: number[], period: number): number;
export function calculateRSI(prices: number[], period: number): number;
```

### 12.3 Risk Calculations

```typescript
export function calculateVaR(prices: number[], confidence: number): number;
export function calculateSharpeRatio(returns: number[], riskFreeRate: number): number;
export function calculateMaxDrawdown(prices: number[]): number;
export function calculateRiskScore(metrics: RiskMetrics): number;
```

### 12.4 Anomaly Calculations

```typescript
export function detectPriceAnomalies(prices: PriceData[]): Anomaly[];
export function calculateZScore(value: number, mean: number, stdDev: number): number;
export function isOutlier(value: number, threshold: number): boolean;
```

---

## Technology Stack Summary

| Category         | Technology              | Version         |
| ---------------- | ----------------------- | --------------- |
| Framework        | Next.js                 | 16.1.6          |
| UI Library       | React                   | 19.2.3          |
| Language         | TypeScript              | 5.x             |
| Styling          | Tailwind CSS            | 4.x             |
| Charts           | Recharts                | 3.8.0           |
| State Management | React Query             | 5.99.0          |
| Client State     | Zustand                 | 5.0.11          |
| Database         | Supabase PostgreSQL     | -               |
| Auth             | Supabase Auth           | 2.98.0          |
| Real-time        | Supabase Realtime       | -               |
| Oracle Clients   | Pyth Hermes Client      | 2.0.0           |
| Oracle Clients   | API3 Contracts          | 27.0.0          |
| Oracle Clients   | Supra Oracle SDK        | 1.0.4           |
| Oracle Clients   | Stellar SDK             | 15.0.1          |
| Blockchain       | Viem                    | 2.47.6          |
| Animations       | Framer Motion           | 12.36.0         |
| Icons            | Lucide React            | 0.577.0         |
| PDF Export       | jsPDF                   | 4.2.0           |
| PDF Export       | jsPDF-AutoTable         | 5.0.7           |
| Screenshot       | html2canvas             | 1.4.1           |
| Monitoring       | Sentry                  | 10.43.0         |
| Analytics        | Vercel Analytics        | 2.0.1           |
| Security         | DOMPurify               | 3.4.0           |
| Performance      | web-vitals              | 5.1.0           |
| Archive          | JSZip                   | 3.10.1          |
| Virtualization   | @tanstack/react-virtual | 3.13.21         |
| Testing          | Jest                    | 30.3.0          |
| Testing          | Playwright              | 1.58.2          |
| Testing          | Testing Library         | 10.4.1 / 16.3.2 |
| Validation       | Zod                     | 4.3.6           |
| Search           | Fuse.js                 | 7.1.0           |
| Styling Utils    | clsx                    | 2.1.1           |
| Styling Utils    | tailwind-merge          | 3.5.0           |

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
