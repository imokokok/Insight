# Hooks 使用规范

## 1. Hooks 命名规范

### 1.1 基本规则

- 自定义 Hook 必须以 `use` 开头
- 使用驼峰命名法
- 文件名与函数名保持一致

```typescript
// 文件: src/hooks/useOracleData.ts
export function useOracleData() { }

// 文件: src/hooks/usePriceHistory.ts
export function usePriceHistory() { }
```

### 1.2 分类命名

| 类型 | 前缀 | 示例 |
|------|------|------|
| 数据获取 | use + Entity + Data | `useOracleData`, `usePriceHistory` |
| 状态管理 | use + StateName | `useFilterState`, `usePagination` |
| 副作用 | use + Action | `useInterval`, `useLocalStorage` |
| 计算/转换 | use + Computed | `useChartData`, `useFilteredData` |

## 2. 自定义 Hooks 结构

### 2.1 数据获取 Hook

```typescript
import { useState, useEffect, useCallback } from 'react';

interface UseOracleDataOptions {
  provider: OracleProvider;
  symbol?: string;
}

interface UseOracleDataResult {
  data: PriceData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useOracleData({ provider, symbol }: UseOracleDataOptions): UseOracleDataResult {
  const [data, setData] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchOracleData(provider, symbol);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [provider, symbol]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
```

### 2.2 分页 Hook

```typescript
import { useState, useCallback } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  total?: number;
}

interface UsePaginationResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

export function usePagination({
  initialPage = 1,
  initialPageSize = 10,
  total = 0,
}: UsePaginationOptions = {}): UsePaginationResult {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.ceil(total / pageSize);

  const nextPage = useCallback(() => {
    setPage(p => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage(p => Math.max(p - 1, 1));
  }, []);

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  }, [totalPages]);

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  return {
    page,
    pageSize,
    total,
    totalPages,
    nextPage,
    prevPage,
    goToPage: goToPage,
    setPageSize: changePageSize,
  };
}
```

### 2.3 筛选 Hook

```typescript
import { useState, useCallback, useMemo } from 'react';

interface FilterState {
  search?: string;
  chain?: Blockchain;
  status?: DataStatus;
  timeRange?: TimeRange;
}

interface UseFilterResult<T> {
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  filteredData: T[];
}

export function useFilterData<T>(
  data: T[],
  filterFn?: (item: T, filters: FilterState) => boolean
): UseFilterResult<T> {
  const [filters, setFilters] = useState<FilterState>({});

  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  const filteredData = useMemo(() => {
    if (!filterFn) return data;
    return data.filter(item => filterFn(item, filters));
  }, [data, filters, filterFn]);

  return {
    filters,
    setFilters: updateFilters,
    resetFilters,
    filteredData,
  };
}
```

## 3. 状态管理规范

### 3.1 useState 使用规范

```typescript
// ✅ 正确：提供初始值类型
const [count, setCount] = useState<number>(0);

// ✅ 正确：复杂状态使用类型推断
const [user, setUser] = useState<User | null>(null);

// ✅ 正确：使用工厂函数避免重复计算
const [data] = useState(() => expensiveCalculation());
```

### 3.2 useReducer 场景

```typescript
type State = {
  isLoading: boolean;
  data: DataType | null;
  error: Error | null;
};

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: DataType }
  | { type: 'FETCH_ERROR'; payload: Error }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, isLoading: false, data: action.payload };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}
```

## 4. 副作用处理规范

### 4.1 useEffect 清理

```typescript
useEffect(() => {
  let mounted = true;
  const controller = new AbortController();

  async function fetchData() {
    try {
      const response = await fetch(url, { signal: controller.signal });
      const data = await response.json();
      
      if (mounted) {
        setData(data);
      }
    } catch (error) {
      if (mounted && error.name !== 'AbortError') {
        setError(error);
      }
    }
  }

  fetchData();

  return () => {
    mounted = false;
    controller.abort();
  };
}, [url]);
```

### 4.2 定时器 Hook

```typescript
import { useEffect, useRef, useCallback } from 'react';

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
```

## 5. Hooks 组合使用

### 5.1 组合多个 Hooks

```typescript
export function useOracleTable(symbols: string[]) {
  const { filters, setFilters, filteredData } = useFilterData(symbols, filterFn);
  const { page, pageSize, totalPages, goToPage } = usePagination({ total: filteredData.length });
  const { data, isLoading, error, refetch } = useOracleData({ symbols: filteredData });

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data?.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  return {
    data: paginatedData,
    isLoading,
    error,
    filters,
    setFilters,
    pagination: { page, pageSize, totalPages, goToPage },
    refetch,
  };
}
```

## 6. 现有 Hooks 目录结构

```
src/hooks/
├── index.ts                 # 导出入口
├── useOracleData.ts         # Oracle数据获取
├── useOraclePrices.ts       # 价格数据
├── usePriceHistory.ts       # 历史价格
└── useUtils.ts              # 工具函数
```
