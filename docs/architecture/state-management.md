# State Management Architecture

> State management strategy and best practices for the Insight platform

## Table of Contents

- [Overview](#overview)
- [State Layering](#state-layering)
- [React Query](#react-query)
- [Zustand Store](#zustand-store)
- [Best Practices](#best-practices)

## Overview

Insight adopts a layered state management strategy:

- **Server State**: React Query - Handles server data caching and synchronization
- **Client State**: Zustand - Manages UI state and global application state
- **Local State**: React useState/useReducer - Component-level state

```mermaid
graph TB
    subgraph StateManagement["State Management Architecture"]
        subgraph ServerState["Server State - React Query"]
            A[Price Data]
            B[Historical Data]
            C[User Data]
        end

        subgraph ClientState["Client State - Zustand"]
            D[authStore - Auth State]
            E[uiStore - UI State]
            F[realtimeStore - Realtime Data State]
            G[crossChainConfigStore - Config]
            G2[crossChainDataStore - Data]
            G3[crossChainSelectorStore - Selector]
            G4[crossChainUIStore - UI]
            H[notificationStore - Notifications]
            I[timeRangeStore - Time Range]
        end

        subgraph LocalState["Local State - React Hooks"]
            H[Form Inputs]
            I[Component Expansion State]
            J[Temporary Data]
        end
    end

    A --> K[Component Render]
    B --> K
    D --> K
    E --> K
    F --> K
    G --> K
    H --> K
```

## Zustand Stores

Insight includes the following Zustand Stores:

| Store                   | File Location                           | Purpose                              |
| ----------------------- | --------------------------------------- | ------------------------------------ |
| authStore               | `src/stores/authStore.ts`               | User authentication state management |
| uiStore                 | `src/stores/uiStore.ts`                 | UI state management                  |
| realtimeStore           | `src/stores/realtimeStore.ts`           | Realtime data state management       |
| crossChainConfigStore   | `src/stores/crossChainConfigStore.ts`   | Cross-chain configuration state      |
| crossChainDataStore     | `src/stores/crossChainDataStore.ts`     | Cross-chain data state               |
| crossChainSelectorStore | `src/stores/crossChainSelectorStore.ts` | Cross-chain selector state           |
| crossChainUIStore       | `src/stores/crossChainUIStore.ts`       | Cross-chain UI state                 |
| notificationStore       | `src/stores/notificationStore.ts`       | Notification state management        |
| timeRangeStore          | `src/stores/timeRangeStore.ts`          | Time range selection state           |

## authStore

Authentication state management, handling user login, registration, OAuth authentication, etc.

```typescript
// src/stores/authStore.ts
interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: AuthError | Error | null;
  initialized: boolean;
  subscription: Subscription | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  cleanup: () => void;
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
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: AuthError | Error | null) => void;
  clearError: () => void;
}
```

**Exported Hooks:**

```typescript
export const useUser = () => useAuthStore((state) => state.user);
export const useSession = () => useAuthStore((state) => state.session);
export const useProfile = () => useAuthStore((state) => state.profile);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useAuthInitialized = () => useAuthStore((state) => state.initialized);
export const useIsAuthenticated = () => useAuthStore((state) => !!state.user);
export const useAuthActions = () => {
  const initialize = useAuthStore((state) => state.initialize);
  const cleanup = useAuthStore((state) => state.cleanup);
  const signUp = useAuthStore((state) => state.signUp);
  const signIn = useAuthStore((state) => state.signIn);
  const signInWithOAuth = useAuthStore((state) => state.signInWithOAuth);
  const signOut = useAuthStore((state) => state.signOut);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const clearError = useAuthStore((state) => state.clearError);

  return useMemo(
    () => ({
      initialize,
      cleanup,
      signUp,
      signIn,
      signInWithOAuth,
      signOut,
      resetPassword,
      refreshProfile,
      clearError,
    }),
    [
      initialize,
      cleanup,
      signUp,
      signIn,
      signInWithOAuth,
      signOut,
      resetPassword,
      refreshProfile,
      clearError,
    ]
  );
};
```

## uiStore

UI state management, handling sidebar, modals, toast notifications, themes, etc.

```typescript
// src/stores/uiStore.ts
interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
  toasts: Toast[];
  theme: 'light' | 'dark' | 'system';
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIActions {
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}
```

**Main Features:**

- **Sidebar Management**: `toggleSidebar`, `setSidebarCollapsed`
- **Modal Management**: `openModal`, `closeModal`
- **Toast Notifications**: `addToast`, `removeToast` (auto-removed after 5 seconds)
- **Theme Switching**: `setTheme`

## realtimeStore

Realtime data state management, handling Supabase Realtime connections and subscriptions.

```typescript
// src/stores/realtimeStore.ts
interface RealtimeState {
  connectionStatus: ConnectionStatus;
  activeSubscriptions: string[];
  lastPriceUpdate: PriceUpdatePayload | null;
  lastAlertEvent: AlertEventPayload | null;
  lastSnapshotChange: SnapshotChangePayload | null;
  lastFavoriteChange: FavoriteChangePayload | null;
  priceUpdateCount: number;
  alertEventCount: number;
  reconnectAttempts: number;
  userId: string | null;
  _initialized: boolean;
}

interface RealtimeActions {
  setConnectionStatus: (status: ConnectionStatus) => void;
  setActiveSubscriptions: (subscriptions: string[]) => void;
  subscribeToPriceUpdates: (
    callback?: (payload: PriceUpdatePayload) => void,
    filters?: { provider?: string; symbol?: string; chain?: string }
  ) => () => void;
  subscribeToAlertEvents: (
    userId: string,
    callback?: (payload: AlertEventPayload) => void
  ) => () => void;
  subscribeToSnapshotChanges: (
    userId: string,
    callback?: (payload: SnapshotChangePayload) => void
  ) => () => void;
  subscribeToFavoriteChanges: (
    userId: string,
    callback?: (payload: FavoriteChangePayload) => void
  ) => () => void;
  reconnect: () => void;
  reset: () => void;
  _initialize: () => void;
  setUserId: (userId: string | null) => void;
}
```

**Exported Hooks:**

```typescript
export const useConnectionStatus = () => useRealtimeStore((state) => state.connectionStatus);
export const useActiveSubscriptions = () => useRealtimeStore((state) => state.activeSubscriptions);
export const useLastPriceUpdate = () => useRealtimeStore((state) => state.lastPriceUpdate);
export const useLastAlertEvent = () => useRealtimeStore((state) => state.lastAlertEvent);
export const useLastSnapshotChange = () => useRealtimeStore((state) => state.lastSnapshotChange);
export const useLastFavoriteChange = () => useRealtimeStore((state) => state.lastFavoriteChange);
export const usePriceUpdateCount = () => useRealtimeStore((state) => state.priceUpdateCount);
export const useAlertEventCount = () => useRealtimeStore((state) => state.alertEventCount);
export const useReconnectAttempts = () => useRealtimeStore((state) => state.reconnectAttempts);
export const useIsConnected = () =>
  useRealtimeStore((state) => state.connectionStatus === 'connected');
export const useRealtimeActions = () =>
  useRealtimeStore(
    useShallow((state) => ({
      setConnectionStatus: state.setConnectionStatus,
      setActiveSubscriptions: state.setActiveSubscriptions,
      subscribeToPriceUpdates: state.subscribeToPriceUpdates,
      subscribeToAlertEvents: state.subscribeToAlertEvents,
      subscribeToSnapshotChanges: state.subscribeToSnapshotChanges,
      subscribeToFavoriteChanges: state.subscribeToFavoriteChanges,
      reconnect: state.reconnect,
      reset: state.reset,
      _initialize: state._initialize,
      setUserId: state.setUserId,
    }))
  );
```

**Supported Realtime Subscriptions:**

- `subscribeToPriceUpdates` - Price updates
- `subscribeToAlertEvents` - Alert events
- `subscribeToSnapshotChanges` - Snapshot changes
- `subscribeToFavoriteChanges` - Favorite changes

## Cross-Chain Stores

The cross-chain feature uses 4 separate Zustand stores for better state separation:

### crossChainConfigStore

Manages cross-chain configuration state (refresh intervals, thresholds, colorblind mode).

### crossChainDataStore

Manages cross-chain data state (current prices, historical prices, loading status).

### crossChainSelectorStore

Manages cross-chain selector state (selected provider, symbol, time range, base chain).

### crossChainUIStore

Manages cross-chain UI state (chart configuration, hidden lines, table filters, sort state).

```typescript
// src/stores/crossChainUIStore.ts
interface CrossChainUIState {
  chartKey: number;
  hiddenLines: Set<string>;
  focusedChain: Blockchain | null;
  tableFilter: 'all' | 'abnormal' | 'normal';
  refreshInterval: RefreshInterval;
  thresholdConfig: ThresholdConfig;
  colorblindMode: boolean;
  // ... more state
}
```

## Selector Pattern

Each store exports fine-grained selector hooks for optimized re-renders:

```typescript
// Example from authStore
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => !!state.user);

// Example from realtimeStore
export const useConnectionStatus = () => useRealtimeStore((state) => state.connectionStatus);
export const useIsConnected = () =>
  useRealtimeStore((state) => state.connectionStatus === 'connected');

// Example from crossChainUIStore
export const useChartKey = () => useCrossChainUIStore((state) => state.chartKey);
export const useTableFilter = () => useCrossChainUIStore((state) => state.tableFilter);
```

## State Layering

### Layering Strategy

| Layer               | Tool        | Purpose                                  | Persistence  |
| ------------------- | ----------- | ---------------------------------------- | ------------ |
| Server State        | React Query | API data, caching, synchronization       | Auto cache   |
| Global Client State | Zustand     | User preferences, theme, global settings | localStorage |
| Local Client State  | Zustand     | Page-level state, temporary data         | Memory       |
| Component State     | useState    | Forms, UI interactions                   | None         |

### State Flow

```mermaid
sequenceDiagram
    participant Component as React Component
    participant Hook as Custom Hook
    participant RQ as React Query
    participant ZS as Zustand Store
    participant API as API Layer
    participant Server as Server

    Component->>Hook: useOraclePrice()
    Hook->>RQ: useQuery()
    RQ->>API: fetchPrice()
    API->>Server: HTTP Request
    Server-->>API: Response
    API-->>RQ: PriceData
    RQ-->>Hook: Cached Data
    Hook-->>Component: price, isLoading

    Component->>ZS: setSelectedProvider()
    ZS-->>Component: Updated State
```

## React Query

### Query Keys Management

```typescript
// src/lib/queries/queryKeys.ts
export const queryKeys = {
  oracles: {
    all: ['oracles'] as const,
    detail: (provider: OracleProvider) => ['oracles', provider] as const,
    price: (provider: OracleProvider, symbol: string, chain?: Blockchain) =>
      ['oracles', provider, 'price', symbol, chain] as const,
    history: (provider: OracleProvider, symbol: string, period: number) =>
      ['oracles', provider, 'history', symbol, period] as const,
    comparison: (symbols: string[]) => ['oracles', 'comparison', ...symbols] as const,
  },
  alerts: {
    all: ['alerts'] as const,
    detail: (id: string) => ['alerts', id] as const,
    events: ['alertEvents'] as const,
    stats: ['alertStats'] as const,
  },
  user: {
    profile: ['user', 'profile'] as const,
    preferences: ['user', 'preferences'] as const,
    favorites: ['user', 'favorites'] as const,
  },
  market: {
    overview: ['market', 'overview'] as const,
    trends: ['market', 'trends'] as const,
  },
} as const;
```

### Query Hooks

```typescript
// src/hooks/queries/useOraclePrices.ts
export function useOraclePrice(provider: OracleProvider, symbol: string, chain?: Blockchain) {
  return useQuery({
    queryKey: queryKeys.oracles.price(provider, symbol, chain),
    queryFn: async () => {
      const client = OracleClientFactory.getClient(provider);
      return client.getPrice(symbol, chain);
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    refetchOnWindowFocus: false,
  });
}

export function usePriceHistory(
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain,
  period: number = 24
) {
  return useQuery({
    queryKey: queryKeys.oracles.history(provider, symbol, period),
    queryFn: async () => {
      const client = OracleClientFactory.getClient(provider);
      return client.getHistoricalPrices(symbol, chain, period);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
```

## Best Practices

### 1. State Separation Principle

```typescript
// ❌ Bad practice: Mixing server and client state
function BadComponent() {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchPrices().then((data) => {
      setPrices(data);
      setLoading(false);
    });
  }, []);
}

// ✅ Good practice: Use React Query for server state
function GoodComponent() {
  const { data: prices, isLoading } = useOraclePrices();
}
```

### 2. Use Immer for Immutable Updates

```typescript
// ✅ Use Immer for immutable updates
set((state) => {
  state.nested.object.value = newValue;
});

// ❌ Avoid manual spreading
set((state) => ({
  ...state,
  nested: {
    ...state.nested,
    object: {
      ...state.nested.object,
      value: newValue,
    },
  },
}));
```

### 3. Use Fine-grained Subscriptions

```typescript
// ✅ Only subscribe to needed fields
const price = useCrossChainStore((state) => state.price);

// ❌ Avoid subscribing to entire Store
const state = useCrossChainStore();
```

### 4. Optimistic Update Pattern

```typescript
const useUpdatePreference = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePreferenceAPI,
    onMutate: async (newPreference) => {
      await queryClient.cancelQueries({ queryKey: ['preferences'] });
      const previousPreference = queryClient.getQueryData(['preferences']);
      queryClient.setQueryData(['preferences'], newPreference);
      return { previousPreference };
    },
    onError: (err, newPreference, context) => {
      queryClient.setQueryData(['preferences'], context?.previousPreference);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
    },
  });
};
```

## Debugging Tools

### Zustand DevTools

```typescript
const useStore = create(
  devtools(
    (set) => ({ ... }),
    { name: 'StoreName' }
  )
);
```

### React Query DevTools

```typescript
export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
```

## Performance Optimization

### 1. Query Deduplication

React Query automatically deduplicates requests with the same Query Key.

```typescript
function ComponentA() {
  const { data } = useOraclePrice('chainlink', 'BTC');
  return <div>{data?.price}</div>;
}

function ComponentB() {
  const { data } = useOraclePrice('chainlink', 'BTC'); // Won't trigger new request
  return <div>{data?.price}</div>;
}
```

### 2. Use useShallow for Selector Optimization

```typescript
export const useRealtimeActions = () =>
  useRealtimeStore(
    useShallow((state) => ({
      setConnectionStatus: state.setConnectionStatus,
      reconnect: state.reconnect,
      // ...
    }))
  );
```

## Summary

- **Server State**: Use React Query for caching, retries, deduplication features
- **Client State**: Use Zustand for simplicity, lightweight, TypeScript-friendly
- **State Separation**: Clearly distinguish between server and client state, avoid mixing
- **Nine Core Stores**: authStore, uiStore, realtimeStore, crossChainConfigStore, crossChainDataStore, crossChainSelectorStore, crossChainUIStore, notificationStore, timeRangeStore
- **Performance Optimization**: Use fine-grained subscriptions, selectors, and Immer immutable updates
