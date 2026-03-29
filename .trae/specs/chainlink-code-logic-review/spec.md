# Chainlink 页面代码逻辑审查规范

## Why

对 Chainlink 预言机页面的所有功能代码进行深度逻辑审查，识别代码质量问题、潜在 bug、性能问题和架构缺陷，提供具体的改进建议。

## What Changes

- 识别代码逻辑问题和潜在 bug
- 分析代码重复和可维护性问题
- 评估性能瓶颈和优化机会
- 审查类型安全和错误处理
- 提出架构改进建议

## Impact

- Affected specs: Chainlink 页面代码质量
- Affected code: `/src/app/[locale]/chainlink/` 目录下的所有组件

---

## 一、Mock 数据问题 (严重)

### 1.1 Mock 数据分散在组件内部

**问题描述**: Mock 数据直接硬编码在各个组件内部，无法统一管理和替换。

**问题位置**:
- [ChainlinkDataFeedsView.tsx:13-94](file:///Users/imokokok/Documents/foresight-build/insight/src/app/[locale]/chainlink/components/ChainlinkDataFeedsView.tsx#L13-L94) - `mockDataFeeds`
- [ChainlinkCCIPView.tsx:50-196](file:///Users/imokokok/Documents/foresight-build/insight/src/app/[locale]/chainlink/components/ChainlinkCCIPView.tsx#L50-L196) - `mockCCIPStats`, `mockTransactions`, `mockSupportedChains`, `mockRMNStatus`
- [ChainlinkVRFView.tsx:55-141](file:///Users/imokokok/Documents/foresight-build/insight/src/app/[locale]/chainlink/components/ChainlinkVRFView.tsx#L55-L141) - `mockVRFStats`, `mockRequests`, `mockSubscriptions`
- [ChainlinkStakingView.tsx:52-142](file:///Users/imokokok/Documents/foresight-build/insight/src/app/[locale]/chainlink/components/ChainlinkStakingView.tsx#L52-L142) - `MOCK_POOL_STATS`, `MOCK_REWARD_HISTORY`, `MOCK_SLASHING_EVENTS`
- [ChainlinkNodesView.tsx:24-97](file:///Users/imokokok/Documents/foresight-build/insight/src/app/[locale]/chainlink/components/ChainlinkNodesView.tsx#L24-L97) - `mockNodes`

**影响**:
- 数据无法统一管理
- 切换真实数据源时需要修改多个文件
- 数据一致性难以保证
- 测试困难

**建议改进**:
```typescript
// 创建 /src/app/[locale]/chainlink/data/index.ts
export const chainlinkMockData = {
  dataFeeds: [...],
  ccip: { stats: {...}, transactions: [...] },
  vrf: { stats: {...}, requests: [...] },
  // ...
};

// 或创建数据服务层
export const chainlinkDataService = {
  getDataFeeds: async () => { ... },
  getCCIPStats: async () => { ... },
  // ...
};
```

### 1.2 缺少数据源抽象层

**问题描述**: 没有数据源抽象层，无法在 mock 数据和真实 API 之间切换。

**建议改进**:
```typescript
// 创建数据源接口
interface IChainlinkDataSource {
  getDataFeeds(): Promise<DataFeed[]>;
  getCCIPStats(): Promise<CCIPStats>;
  getVRFStats(): Promise<VRFStats>;
  // ...
}

// Mock 实现
class MockChainlinkDataSource implements IChainlinkDataSource { ... }

// API 实现
class APIChainlinkDataSource implements IChainlinkDataSource { ... }

// 工厂函数
function getChainlinkDataSource(): IChainlinkDataSource {
  return process.env.USE_MOCK_DATA 
    ? new MockChainlinkDataSource() 
    : new APIChainlinkDataSource();
}
```

---

## 二、代码重复问题 (高)

### 2.1 工具函数重复定义

**问题描述**: 相同的工具函数在多个文件中重复定义。

**问题位置**:
- `formatNumber` - CCIPView.tsx:198-206, VRFView.tsx:143-151
- `formatCurrency` - CCIPView.tsx:208-216, VRFView.tsx:153-161
- `formatTimeAgo` - CCIPView.tsx:218-225, VRFView.tsx:173-180
- `formatGas` - VRFView.tsx:163-171
- `formatDate` - StakingView.tsx:216-223
- `getStatusColor` - CCIPView.tsx:241-250, StakingView.tsx:225-238

**建议改进**:
```typescript
// 创建 /src/app/[locale]/chainlink/utils/format.ts
export function formatNumber(num: number): string { ... }
export function formatCurrency(num: number): string { ... }
export function formatTimeAgo(date: Date): string { ... }
export function formatDate(date: Date, format?: string): string { ... }
export function getStatusColor(status: string): string { ... }

// 在组件中导入使用
import { formatNumber, formatCurrency } from '../utils/format';
```

### 2.2 统计卡片模式重复

**问题描述**: 相同的统计卡片 UI 模式在多个组件中重复实现。

**问题位置**:
- CCIPView.tsx - 跨链活动概览卡片
- VRFView.tsx - 请求统计卡片
- StakingView.tsx - 质押池统计卡片
- NodesView.tsx - 节点统计概览

**建议改进**:
```typescript
// 创建通用 StatCard 组件
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
}

export function StatCard({ icon, label, value, change, trend, color }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
      {change && <TrendIndicator value={change} trend={trend} />}
    </div>
  );
}
```

### 2.3 表格组件模式重复

**问题描述**: 表格渲染模式在多个地方重复，虽然使用了 `ChainlinkDataTable`，但仍有大量重复的列定义模式。

**建议改进**:
```typescript
// 创建表格列配置工厂
export function createDataFeedColumns(t: TranslationFn): Column<DataFeed>[] {
  return [
    { key: 'name', header: t('chainlink.dataFeeds.name'), sortable: true },
    // ...
  ];
}

export function createNodeColumns(t: TranslationFn): Column<NodeData>[] {
  return [
    { key: 'name', header: t('chainlink.nodes.name'), sortable: true },
    // ...
  ];
}
```

---

## 三、类型安全问题 (高)

### 3.1 不安全的类型转换

**问题描述**: 使用 `as unknown as` 进行类型转换，绕过类型检查。

**问题位置**:
- [ChainlinkDataFeedsView.tsx:263-274](file:///Users/imokokok/Documents/foresight-build/insight/src/app/[locale]/chainlink/components/ChainlinkDataFeedsView.tsx#L263-L274)
- [ChainlinkNodesView.tsx:192-203](file:///Users/imokokok/Documents/foresight-build/insight/src/app/[locale]/chainlink/components/ChainlinkNodesView.tsx#L192-L203)

```typescript
// 问题代码
<ChainlinkDataTable
  data={filteredFeeds as unknown as Record<string, unknown>[]}
  columns={columns as unknown as Array<{...}>}
/>
```

**建议改进**:
```typescript
// 修改 ChainlinkDataTable 为泛型组件
export function ChainlinkDataTable<T extends Record<string, unknown>>({
  data,
  columns,
}: ChainlinkDataTableProps<T>) {
  // ...
}

// 使用时无需类型转换
<ChainlinkDataTable<DataFeed>
  data={filteredFeeds}
  columns={columns}
/>
```

### 3.2 可选属性处理不一致

**问题描述**: 可选属性的处理方式不一致，可能导致运行时错误。

**问题位置**:
- [ChainlinkNetworkView.tsx:16](file:///Users/imokokok/Documents/foresight-build/insight/src/app/[locale]/chainlink/components/ChainlinkNetworkView.tsx#L16) - `networkData.activeNodes?.toLocaleString() || '1,847'`
- [types.ts:25-29](file:///Users/imokokok/Documents/foresight-build/insight/src/app/[locale]/chainlink/types.ts#L25-L29) - NetworkStats 中多个可选属性

**建议改进**:
```typescript
// 使用默认值模式
const networkData = networkStats ?? config.networkData;
const activeNodes = networkData.activeNodes ?? 1847;

// 或创建数据规范化函数
function normalizeNetworkStats(stats: NetworkStats | null | undefined): Required<NetworkStats> {
  return {
    activeNodes: stats?.activeNodes ?? 1847,
    dataFeeds: stats?.dataFeeds ?? 1243,
    // ...
  };
}
```

---

## 四、性能问题 (中)

### 4.1 实时数据更新可能导致内存泄漏

**问题描述**: `RealtimeThroughputMonitor` 使用 `setInterval` 更新数据，如果组件卸载时未清理，可能导致内存泄漏。

**问题位置**: [RealtimeThroughputMonitor.tsx:117-142](file:///Users/imokokok/Documents/foresight-build/insight/src/app/[locale]/chainlink/components/RealtimeThroughputMonitor.tsx#L117-L142)

```typescript
// 当前代码 - 清理逻辑正确，但可以优化
useEffect(() => {
  if (!autoUpdate) return;
  const interval = setInterval(() => { ... }, updateInterval);
  return () => clearInterval(interval);
}, [autoUpdate, updateInterval]);
```

**建议改进**:
```typescript
// 使用 useRef 存储最新回调，避免依赖变化时重新创建 interval
const callbackRef = useRef(generateNewDataPoint);
callbackRef.current = generateNewDataPoint;

useEffect(() => {
  if (!autoUpdate) return;
  
  const interval = setInterval(() => {
    setData(prev => [...prev.slice(1), callbackRef.current()]);
  }, updateInterval);
  
  return () => clearInterval(interval);
}, [autoUpdate, updateInterval]);
```

### 4.2 大列表缺少虚拟滚动

**问题描述**: 数据表格和列表组件没有使用虚拟滚动，大数据量时可能影响性能。

**问题位置**:
- ChainlinkDataTable.tsx - 表格渲染
- CCIPView.tsx - 支持的链列表
- VRFView.tsx - 订阅列表

**建议改进**:
```typescript
// 使用 react-window 或 @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

export function ChainlinkDataTable<T>({ data, columns }: Props<T>) {
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
  });
  
  // ...
}
```

### 4.3 图表组件重复渲染

**问题描述**: Recharts 图表组件在某些情况下会不必要地重新渲染。

**问题位置**:
- ChainlinkStakingView.tsx - 多个图表
- ChainlinkEcosystemView.tsx - TVL 图表
- RealtimeThroughputMonitor.tsx - 实时图表

**建议改进**:
```typescript
// 使用 React.memo 包装图表组件
const MemoizedAreaChart = memo(AreaChart);

// 使用 useMemo 缓存图表数据
const chartData = useMemo(() => 
  historicalData.slice(-24).map(d => ({ price: d.price })),
  [historicalData]
);

// 使用 useCallback 缓存事件处理
const handleChartClick = useCallback((data) => {
  // ...
}, [deps]);
```

---

## 五、状态管理问题 (中)

### 5.1 缺少全局状态管理

**问题描述**: 相关组件之间没有共享状态，数据重复获取或计算。

**问题位置**:
- `ChainlinkNodesView` 和 `ChainlinkStakingView` 都有质押计算器
- 多个组件都需要网络统计数据
- Hero 和各视图组件都需要价格数据

**建议改进**:
```typescript
// 创建 Chainlink 上下文
interface ChainlinkContextValue {
  price: PriceData | null;
  networkStats: NetworkStats | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const ChainlinkContext = createContext<ChainlinkContextValue | null>(null);

export function ChainlinkProvider({ children }: { children: React.ReactNode }) {
  const { price, networkStats, isLoading, refetchAll } = useChainlinkAllData({ ... });
  
  return (
    <ChainlinkContext.Provider value={{ price, networkStats, isLoading, refresh: refetchAll }}>
      {children}
    </ChainlinkContext.Provider>
  );
}

export function useChainlinkContext() {
  const context = useContext(ChainlinkContext);
  if (!context) throw new Error('useChainlinkContext must be used within ChainlinkProvider');
  return context;
}
```

### 5.2 组件内部状态过多

**问题描述**: `ChainlinkStakingView` 组件内部状态过多，逻辑复杂。

**问题位置**: [ChainlinkStakingView.tsx](file:///Users/imokokok/Documents/foresight-build/insight/src/app/[locale]/chainlink/components/ChainlinkStakingView.tsx) - 775 行代码

**建议改进**:
```typescript
// 拆分为多个子组件
// StakingPoolOverview.tsx
// StakingCalculator.tsx
// StakingRewardsChart.tsx
// StakingSlashingEvents.tsx
// StakingUnlockQueue.tsx
// StakingOperatorRanking.tsx

// 使用自定义 hook 管理状态
function useStakingCalculator(initialAmount = '10000') {
  const [stakeAmount, setStakeAmount] = useState(initialAmount);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('moderate');
  const [stakingPeriod, setStakingPeriod] = useState(12);
  
  const rewards = useMemo(() => calculateRewards(stakeAmount, selectedScenario, stakingPeriod), 
    [stakeAmount, selectedScenario, stakingPeriod]);
  
  return { stakeAmount, setStakeAmount, selectedScenario, setSelectedScenario, stakingPeriod, setStakingPeriod, rewards };
}
```

---

## 六、错误处理问题 (高)

### 6.1 缺少组件级错误边界

**问题描述**: 只有页面级错误边界，没有组件级错误边界，单个组件错误会导致整个页面崩溃。

**问题位置**: [page.tsx:112](file:///Users/imokokok/Documents/foresight-build/insight/src/app/[locale]/chainlink/page.tsx#L112) - 只有 `OracleErrorBoundary`

**建议改进**:
```typescript
// 为关键组件添加错误边界
<ErrorBoundary fallback={<StakingViewErrorFallback />} onError={logError}>
  <ChainlinkStakingView />
</ErrorBoundary>

<ErrorBoundary fallback={<ChartErrorFallback />} onError={logError}>
  <RealtimeThroughputMonitor />
</ErrorBoundary>
```

### 6.2 数据获取缺少错误处理

**问题描述**: 组件内部的数据处理没有错误处理逻辑。

**问题位置**:
- useChainlinkPage.ts - 只有顶层的错误状态
- 各视图组件 - 没有 try-catch

**建议改进**:
```typescript
// 在 hook 中添加错误处理
export function useChainlinkPage() {
  const [error, setError] = useState<Error | null>(null);
  
  const refresh = useCallback(async () => {
    try {
      setError(null);
      await refetchAll();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Failed to refresh data:', err);
    }
  }, [refetchAll]);
  
  return { error, refresh, ... };
}
```

---

## 七、可访问性问题 (中)

### 7.1 缺少 ARIA 标签

**问题描述**: 交互元素缺少必要的 ARIA 标签。

**问题位置**:
- ChainlinkSidebar.tsx - 导航项
- ChainlinkDataTable.tsx - 排序按钮
- 各种筛选按钮

**建议改进**:
```typescript
<button
  onClick={() => handleSort(column.key)}
  aria-label={`Sort by ${column.header}`}
  aria-pressed={sortConfig?.key === column.key}
  aria-describedby={`sort-direction-${column.key}`}
>
  {column.header}
  {sortConfig?.key === column.key && (
    <span id={`sort-direction-${column.key}`} className="sr-only">
      {sortConfig.direction === 'asc' ? 'ascending' : 'descending'}
    </span>
  )}
</button>
```

### 7.2 键盘导航支持不完整

**问题描述**: 部分交互元素不支持键盘导航。

**问题位置**:
- ChainlinkEcosystemView.tsx - 链筛选按钮
- ChainlinkRiskView.tsx - 可展开的风险因素

**建议改进**:
```typescript
// 添加键盘事件处理
<button
  onClick={() => setExpandedFactor(expandedFactor === index ? null : index)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setExpandedFactor(expandedFactor === index ? null : index);
    }
  }}
  aria-expanded={expandedFactor === index}
  aria-controls={`factor-details-${index}`}
>
  {/* ... */}
</button>
```

---

## 八、国际化问题 (低)

### 8.1 硬编码字符串

**问题描述**: 部分字符串仍然硬编码，没有使用国际化。

**问题位置**:
- ChainlinkCCIPView.tsx:220-224 - `formatTimeAgo` 返回的字符串
- ChainlinkVRFView.tsx - 类似问题
- 各种 `+`、`-` 前缀

**建议改进**:
```typescript
// 使用国际化函数
function formatTimeAgo(date: Date, t: TranslationFn): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return t('common.time.secondsAgo', { count: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('common.time.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  return t('common.time.hoursAgo', { count: hours });
}
```

---

## 九、架构问题 (高)

### 9.1 缺少服务层抽象

**问题描述**: 数据获取逻辑直接在组件中处理，没有服务层抽象。

**建议改进**:
```typescript
// 创建服务层
// /src/app/[locale]/chainlink/services/chainlinkService.ts
export interface IChainlinkService {
  getMarketData(): Promise<MarketData>;
  getNetworkStats(): Promise<NetworkStats>;
  getDataFeeds(): Promise<DataFeed[]>;
  getCCIPStats(): Promise<CCIPStats>;
  // ...
}

export class ChainlinkService implements IChainlinkService {
  async getMarketData(): Promise<MarketData> {
    // API 调用或 mock 数据
  }
  // ...
}

// 使用依赖注入
const chainlinkService = new ChainlinkService();
```

### 9.2 组件职责不清晰

**问题描述**: 部分组件职责过多，混合了数据获取、格式化、渲染等逻辑。

**问题位置**:
- ChainlinkStakingView.tsx - 775 行，包含数据、计算、图表、表单
- ChainlinkHero.tsx - 650 行，包含多个子组件定义

**建议改进**:
```typescript
// 按职责拆分组件
// 1. 数据层 - hooks/useStakingData.ts
// 2. 格式化层 - utils/stakingFormat.ts
// 3. 展示层 - components/StakingPoolCard.tsx, StakingCalculator.tsx 等
// 4. 容器层 - ChainlinkStakingView.tsx (组合组件)
```

---

## 十、潜在 Bug (严重)

### 10.1 除零错误风险

**问题描述**: 某些计算可能存在除零错误。

**问题位置**:
- [ChainlinkVRFView.tsx:301](file:///Users/imokokok/Documents/foresight-build/insight/src/app/[locale]/chainlink/components/ChainlinkVRFView.tsx#L301) - `totalFunded / activeSubscriptions`
- [ChainlinkEcosystemView.tsx:207](file:///Users/imokokok/Documents/foresight-build/insight/src/app/[locale]/chainlink/components/ChainlinkEcosystemView.tsx#L207) - `((latest.total - previous.total) / previous.total)`

**建议改进**:
```typescript
// 添加安全除法
function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  return denominator === 0 ? fallback : numerator / denominator;
}

// 使用
const avgBalance = safeDivide(totalFunded, activeSubscriptions, 0);
const change = safeDivide(latest.total - previous.total, previous.total, 0) * 100;
```

### 10.2 日期处理潜在问题

**问题描述**: 日期处理没有考虑时区和无效日期。

**问题位置**:
- ChainlinkCCIPView.tsx:218-225 - `formatTimeAgo`
- ChainlinkRiskView.tsx - 时间线事件日期

**建议改进**:
```typescript
// 使用 date-fns 或 dayjs 处理日期
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';

function formatTimeAgo(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return 'Invalid date';
  return formatDistanceToNow(parsedDate, { addSuffix: true });
}
```

### 10.3 数组访问越界风险

**问题描述**: 数组访问没有边界检查。

**问题位置**:
- [ChainlinkEcosystemView.tsx:205](file:///Users/imokokok/Documents/foresight-build/insight/src/app/[locale]/chainlink/components/ChainlinkEcosystemView.tsx#L205) - `filteredTvlData[filteredTvlData.length - 1]`
- [RealtimeThroughputMonitor.tsx:156](file:///Users/imokokok/Documents/foresight-build/insight/src/app/[locale]/chainlink/components/RealtimeThroughputMonitor.tsx#L156) - `data[data.length - 1]`

**建议改进**:
```typescript
// 添加边界检查
const latest = filteredTvlData.at(-1);
const previous = filteredTvlData.at(0);

if (!latest || !previous) {
  return { current: 0, change: 0, breakdown: [] };
}
```

---

## 问题优先级汇总

| 优先级 | 问题类别 | 数量 | 说明 |
|--------|----------|------|------|
| P0 - 严重 | 潜在 Bug、Mock 数据问题 | 5 | 可能导致运行时错误或数据问题 |
| P1 - 高 | 类型安全、错误处理、架构问题 | 6 | 影响代码质量和可维护性 |
| P2 - 中 | 性能、状态管理、可访问性 | 5 | 影响用户体验和性能 |
| P3 - 低 | 国际化、代码风格 | 2 | 影响代码一致性 |

---

## 改进建议总结

1. **立即修复 (P0)**:
   - 添加除零保护
   - 添加数组边界检查
   - 集中管理 Mock 数据

2. **短期改进 (P1)**:
   - 修复类型安全问题
   - 添加组件级错误边界
   - 创建服务层抽象

3. **中期优化 (P2)**:
   - 添加虚拟滚动
   - 实现全局状态管理
   - 添加可访问性支持

4. **长期完善 (P3)**:
   - 完善国际化
   - 统一代码风格
