# 架构评估与优化建议规范

## Why

Insight Oracle Data Analytics Platform 项目已经建立了较为完善的架构体系，但随着项目规模的增长和业务复杂度的提升，需要对现有架构进行全面评估，识别潜在问题，并提出专业的优化建议，以确保系统的可扩展性、可维护性和性能表现。

## What Changes

### 架构评估

- 对项目整体架构进行全面分析
- 评估各层次的设计合理性和耦合度
- 识别架构层面的技术债务

### 优化建议

- 提出架构层面的改进方案
- 优化模块划分和依赖关系
- 提升系统性能和可维护性

### 最佳实践

- 建立架构治理规范
- 制定架构演进路线图
- 完善架构文档体系

## Impact

### Affected specs

- 系统架构设计
- 模块组织结构
- 性能优化策略
- 开发规范体系

### Affected code

- 核心架构模块
- 状态管理层
- API 层设计
- 服务层组织

## ADDED Requirements

### Requirement: 架构评估体系

系统应建立全面的架构评估体系，包括：

#### Scenario: 架构健康度评估

- **WHEN** 进行架构评审时
- **THEN** 使用以下评估维度：
  - 分层架构合理性（25%）
  - 模块耦合度（20%）
  - 代码可维护性（20%）
  - 性能表现（15%）
  - 测试覆盖质量（10%）
  - 文档完整性（10%）

#### Scenario: 架构决策记录

- **WHEN** 做出重要架构决策时
- **THEN** 记录决策背景、方案选择、权衡考虑和影响范围

### Requirement: 分层架构优化

系统应优化分层架构设计：

#### Scenario: 层次边界清晰化

- **WHEN** 设计新功能模块时
- **THEN** 遵循以下层次原则：
  - UI 层：仅负责视图渲染和用户交互
  - 业务逻辑层：处理业务规则和数据转换
  - 数据访问层：统一管理数据获取和缓存
  - 基础设施层：提供通用能力和工具函数

#### Scenario: 依赖方向控制

- **WHEN** 模块间存在依赖关系时
- **THEN** 确保依赖方向从高层指向低层，避免循环依赖

### Requirement: 状态管理优化

系统应优化状态管理策略：

#### Scenario: 状态分类管理

- **WHEN** 管理应用状态时
- **THEN** 按以下分类使用不同方案：
  - 服务器状态：使用 React Query（价格数据、用户数据等）
  - 客户端 UI 状态：使用 Zustand（主题、侧边栏等）
  - 表单状态：使用 React Hook Form 或本地状态
  - 临时状态：使用组件本地状态

#### Scenario: 状态同步策略

- **WHEN** 处理实时数据时
- **THEN** 实现以下同步机制：
  - WebSocket 连接管理与自动重连
  - 数据缓存与失效策略
  - 乐观更新与回滚机制

### Requirement: 组件架构优化

系统应优化组件架构设计：

#### Scenario: 组件职责单一化

- **WHEN** 设计组件时
- **THEN** 遵循单一职责原则：
  - 单个组件代码行数 < 300 行
  - 组件职责清晰，避免过度耦合
  - 提取可复用逻辑到自定义 Hooks

#### Scenario: 组件分层设计

- **WHEN** 组织组件结构时
- **THEN** 采用以下分层：
  - 原子组件（Button, Card 等）
  - 分子组件（MetricCard, ChartToolbar 等）
  - 有机体组件（PriceChart, DataTablePro 等）
  - 模板组件（OraclePageTemplate 等）
  - 页面组件（各路由页面）

### Requirement: API 层架构优化

系统应优化 API 层架构：

#### Scenario: API 设计规范化

- **WHEN** 设计 API 接口时
- **THEN** 遵循 RESTful 规范：
  - 统一的响应格式
  - 完善的错误处理
  - 版本控制机制
  - 请求验证与响应转换

#### Scenario: 中间件链优化

- **WHEN** 处理 API 请求时
- **THEN** 按以下顺序执行中间件：
  1. 日志记录中间件
  2. CORS 中间件
  3. 认证中间件
  4. 速率限制中间件
  5. 验证中间件
  6. 业务处理
  7. 错误处理中间件

### Requirement: 性能优化架构

系统应建立性能优化架构：

#### Scenario: 代码分割策略

- **WHEN** 构建应用时
- **THEN** 实施以下分割策略：
  - 路由级别分割（每个页面独立 chunk）
  - 组件级别分割（大型组件动态导入）
  - 第三方库分割（vendor chunk）
  - 公共模块提取（common chunk）

#### Scenario: 缓存架构设计

- **WHEN** 设计缓存策略时
- **THEN** 采用多级缓存：
  - 浏览器缓存（静态资源）
  - CDN 缓存（API 响应）
  - React Query 缓存（服务器状态）
  - IndexedDB 缓存（离线数据）

### Requirement: 测试架构优化

系统应优化测试架构：

#### Scenario: 测试金字塔策略

- **WHEN** 编写测试时
- **THEN** 遵循测试金字塔：
  - 单元测试（70%）：测试独立函数和组件
  - 集成测试（20%）：测试模块间交互
  - E2E 测试（10%）：测试关键业务流程

#### Scenario: 测试数据管理

- **WHEN** 编写测试时
- **THEN** 统一管理测试数据：
  - 使用 Mock 数据工厂
  - 隔离测试环境
  - 避免测试间相互影响

## MODIFIED Requirements

### Requirement: 依赖注入优化

现有依赖注入系统需要更充分的使用：

- 在服务层全面应用 DI 模式
- 统一服务接口定义
- 支持服务生命周期管理
- 提供服务替换和 Mock 能力

### Requirement: Oracle 客户端架构

现有 Oracle 客户端架构需要进一步优化：

- 统一错误处理和重试机制
- 优化数据源切换策略
- 增强缓存和预取能力
- 提供更灵活的配置选项

## REMOVED Requirements

### Requirement: 过度耦合的组件

**Reason**: 某些组件承担了过多职责，导致难以维护和测试
**Migration**: 拆分为更小的、职责单一的组件，提取共享逻辑到 Hooks

---

## 架构评估详细分析

### 1. 当前架构优势

#### 1.1 清晰的分层架构

**优点分析：**

✅ **UI 层**

- 使用 Next.js 16 App Router，支持 SSR/SSG
- 组件化设计，复用性良好
- 动态导入优化性能

✅ **状态管理层**

- React Query 管理服务器状态
- Zustand 管理客户端状态
- 职责分离清晰

✅ **API 层**

- 统一的 API 处理器
- 完善的中间件系统
- 版本控制支持

✅ **服务层**

- Oracle 客户端工厂模式
- 业务逻辑封装良好
- 数据处理模块化

✅ **数据层**

- Supabase PostgreSQL
- 实时数据订阅
- RLS 安全策略

**架构图：**

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Next.js Pages (SSR/SSG) + React Components      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   State Management Layer                 │
│  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │   React Query        │  │   Zustand Stores     │    │
│  │   (Server State)     │  │   (Client State)     │    │
│  └──────────────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      API Layer                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Next.js API Routes + Middleware Stack           │   │
│  │  (Auth, Validation, Rate Limit, Error Handling)  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Service Layer                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Oracle Clients + Business Services              │   │
│  │  (Chainlink, Pyth, API3, DIA, RedStone, etc.)    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Supabase PostgreSQL + Realtime + Storage        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### 1.2 设计模式应用

**工厂模式（Oracle Client Factory）：**

```typescript
export class OracleClientFactory {
  private static instances: Map<OracleProvider, BaseOracleClient> = new Map();

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
      case OracleProvider.PYTH:
        return new PythClient(this.config);
      // ... other providers
    }
  }
}
```

**优点：**

- 统一的客户端创建接口
- 单例模式避免重复创建
- 易于扩展新的 Oracle 提供商

**依赖注入容器：**

```typescript
export class DIContainer {
  private services = new Map<Token, any>();
  private factories = new Map<Token, () => any>();

  register<T>(token: Token, factory: () => T): void {
    this.factories.set(token, factory);
  }

  resolve<T>(token: Token): T {
    if (!this.services.has(token)) {
      const factory = this.factories.get(token);
      if (factory) {
        this.services.set(token, factory());
      }
    }
    return this.services.get(token);
  }
}
```

**优点：**

- 解耦服务依赖
- 支持服务替换
- 便于测试 Mock

#### 1.3 完善的错误处理

**错误分类体系：**

```
AppError (抽象基类)
├── ValidationError (400)
├── NotFoundError (404)
├── AuthenticationError (401)
├── AuthorizationError (403)
├── ConflictError (409)
├── RateLimitError (429)
├── InternalError (500)
└── OracleError (业务特定错误)
```

**优点：**

- 统一的错误处理接口
- 支持国际化错误消息
- 错误恢复机制
- 详细的错误上下文

#### 1.4 模块化设计

**Oracle 客户端模块化：**

```
src/lib/oracles/
├── base.ts              # 基类和接口
├── factory.ts           # 客户端工厂
├── chainlink.ts         # Chainlink 实现
├── pyth/                # Pyth 模块
│   ├── index.ts
│   ├── priceFetching.ts
│   ├── metadataFetching.ts
│   └── pythWebSocket.ts
├── api3/                # API3 模块
│   ├── index.ts
│   ├── alertService.ts
│   └── coveragePoolService.ts
└── dia/                 # DIA 模块
    ├── diaDataService.ts
    ├── diaPriceService.ts
    └── diaNFTService.ts
```

**优点：**

- 每个提供商独立模块
- 共享基类和接口
- 易于维护和扩展

### 2. 架构问题识别

#### 2.1 状态管理边界模糊

**问题描述：**

当前项目中 React Query 和 Zustand 的使用边界不够清晰，可能导致：

- 状态重复存储
- 数据同步困难
- 状态来源不明确

**示例问题：**

```typescript
// 问题：价格数据应该用 React Query 还是 Zustand？
// 当前可能在两个地方都有存储

// React Query
const { data: price } = useQuery(['price', symbol], () => fetchPrice(symbol));

// Zustand
const currentPrice = usePriceStore((state) => state.currentPrice);
```

**影响：**

- 数据一致性风险
- 调试困难
- 性能浪费

#### 2.2 组件职责过重

**问题描述：**

某些组件承担了过多职责，例如：

- 数据获取
- 业务逻辑处理
- UI 渲染
- 状态管理

**示例：QueryResults 组件（重构前 1059 行）：**

```typescript
// 问题：组件过大，职责过多
export function QueryResults() {
  // 数据获取逻辑
  const { data, isLoading } = useQuery(...);

  // 业务逻辑处理
  const processedData = useMemo(() => {
    // 大量数据处理逻辑
  }, [data]);

  // 状态管理
  const [selectedRows, setSelectedRows] = useState([]);

  // 导出逻辑
  const handleExport = () => {
    // 导出实现
  };

  // 渲染逻辑
  return (
    // 大量 JSX
  );
}
```

**影响：**

- 难以测试
- 难以复用
- 性能问题（不必要的重渲染）

#### 2.3 API 层缺乏统一抽象

**问题描述：**

虽然实现了 API 中间件，但缺乏统一的 API 客户端抽象：

- 每个组件直接调用 fetch 或 axios
- 缺乏统一的请求/响应拦截
- 错误处理不一致

**示例问题：**

```typescript
// 组件 A
const response = await fetch('/api/prices');
const data = await response.json();

// 组件 B
const { data } = await axios.get('/api/oracles');

// 组件 C
const result = await apiClient.get('/api/alerts');
```

**影响：**

- 代码重复
- 行为不一致
- 难以统一修改

#### 2.4 性能优化不足

**问题描述：**

虽然使用了动态导入，但性能优化还有提升空间：

- 缺乏细粒度的代码分割
- 图片优化不充分
- 缓存策略可以更智能

**示例问题：**

```typescript
// 问题：整个页面作为一个 chunk
const OraclePage = dynamic(() => import('./OraclePage'), { ssr: false });

// 建议：按功能模块分割
const PriceChart = dynamic(() => import('./PriceChart'));
const DataTable = dynamic(() => import('./DataTable'));
const ControlPanel = dynamic(() => import('./ControlPanel'));
```

**影响：**

- 首屏加载时间
- 资源浪费
- 用户体验

#### 2.5 测试架构不完善

**问题描述：**

虽然测试文件很多，但测试架构存在问题：

- 单元测试覆盖率不足（当前 26.17%）
- 集成测试较少
- E2E 测试覆盖不全

**示例问题：**

```typescript
// 问题：测试过于简单，缺乏边界情况
test('renders correctly', () => {
  render(<Component />);
  expect(screen.getByText('Title')).toBeInTheDocument();
});

// 建议：更全面的测试
describe('Component', () => {
  it('should handle loading state', () => {});
  it('should handle error state', () => {});
  it('should handle empty data', () => {});
  it('should handle user interactions', () => {});
  it('should be accessible', () => {});
});
```

**影响：**

- 质量保障不足
- 重构风险高
- 回归问题

### 3. 专业优化建议

#### 3.1 状态管理优化

**建议方案：明确状态管理边界**

```typescript
// 1. 服务器状态 - 使用 React Query
// 价格数据、用户数据、Oracle 数据等
export function useOraclePrices(provider: OracleProvider) {
  return useQuery({
    queryKey: ['oracle-prices', provider],
    queryFn: () => oracleClient.getPrices(provider),
    staleTime: 30 * 1000, // 30秒
    gcTime: 5 * 60 * 1000, // 5分钟
  });
}

// 2. 客户端 UI 状态 - 使用 Zustand
// 主题、侧边栏、模态框等
export const useUIStore = create<UIStore>((set) => ({
  theme: 'system',
  sidebarCollapsed: false,
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({
    sidebarCollapsed: !state.sidebarCollapsed
  })),
}));

// 3. 表单状态 - 使用 React Hook Form
// 复杂表单、验证等
export function usePriceAlertForm() {
  return useForm<PriceAlertFormData>({
    resolver: zodResolver(priceAlertSchema),
    defaultValues: {
      symbol: '',
      condition: 'above',
      targetValue: 0,
    },
  });
}

// 4. 临时状态 - 使用组件本地状态
// 悬停状态、展开状态等
export function DataTable() {
  const [expanded, setExpanded] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  return (
    // ...
  );
}
```

**实施步骤：**

1. **审计现有状态**：识别每个状态的类型
2. **迁移计划**：逐步迁移到正确的状态管理方案
3. **文档规范**：建立状态管理指南
4. **代码审查**：确保新代码遵循规范

**预期收益：**

- 状态来源清晰
- 数据一致性提升
- 调试更容易
- 性能优化

#### 3.2 组件架构优化

**建议方案：组件分层与职责分离**

```typescript
// 1. 原子组件（Atoms）
// 最基础的 UI 组件
export function Button({ children, variant, ...props }: ButtonProps) {
  return (
    <button className={cn('btn', variants[variant])} {...props}>
      {children}
    </button>
  );
}

// 2. 分子组件（Molecules）
// 组合多个原子组件
export function MetricCard({ title, value, change, icon }: MetricCardProps) {
  return (
    <Card>
      <CardHeader>
        <Icon name={icon} />
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="value">{value}</div>
        <DifferenceBadge value={change} />
      </CardContent>
    </Card>
  );
}

// 3. 有机体组件（Organisms）
// 复杂的业务组件
export function PriceChart({ symbol, provider }: PriceChartProps) {
  // 数据获取 - 使用 Hook
  const { data, isLoading } = usePriceData(symbol, provider);

  // 业务逻辑 - 使用 Hook
  const { chartData, indicators } = useChartDataProcessing(data);

  // 交互逻辑 - 使用 Hook
  const { zoom, pan, reset } = useChartInteraction();

  // 渲染
  return (
    <div className="price-chart">
      <ChartToolbar onZoom={zoom} onPan={pan} onReset={reset} />
      <Chart data={chartData} indicators={indicators} />
    </div>
  );
}

// 4. 模板组件（Templates）
// 页面布局模板
export function OraclePageTemplate({ children }: OraclePageTemplateProps) {
  return (
    <div className="oracle-page">
      <Navbar />
      <main className="content">
        {children}
      </main>
      <Footer />
    </div>
  );
}

// 5. 页面组件（Pages）
// 路由页面
export default function ChainlinkPage() {
  return (
    <OraclePageTemplate>
      <OracleHeader provider={OracleProvider.CHAINLINK} />
      <PriceChartSection />
      <DataQualitySection />
      <RiskAnalysisSection />
    </OraclePageTemplate>
  );
}
```

**提取逻辑到 Hooks：**

```typescript
// 数据获取 Hook
export function usePriceData(symbol: string, provider: OracleProvider) {
  return useQuery({
    queryKey: ['price', symbol, provider],
    queryFn: () => oracleClient.getPrice(symbol, provider),
    staleTime: 30 * 1000,
  });
}

// 数据处理 Hook
export function useChartDataProcessing(data: PriceData[] | undefined) {
  return useMemo(() => {
    if (!data) return { chartData: [], indicators: [] };

    const chartData = processData(data);
    const indicators = calculateIndicators(data);

    return { chartData, indicators };
  }, [data]);
}

// 交互逻辑 Hook
export function useChartInteraction() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setZoom((prev) => (direction === 'in' ? prev * 1.2 : prev / 1.2));
  }, []);

  const handlePan = useCallback((dx: number, dy: number) => {
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return {
    zoom,
    pan,
    handleZoom,
    handlePan,
    handleReset,
  };
}
```

**实施步骤：**

1. **识别大组件**：找出超过 300 行的组件
2. **职责分析**：识别组件的不同职责
3. **提取 Hooks**：将逻辑提取到自定义 Hooks
4. **拆分组件**：将 UI 拆分为更小的组件
5. **测试覆盖**：为每个 Hook 和组件编写测试

**预期收益：**

- 组件可维护性提升
- 逻辑可复用性增强
- 测试更容易
- 性能优化

#### 3.3 API 层统一抽象

**建议方案：统一 API 客户端**

```typescript
// 1. 核心 API 客户端
class ApiClient {
  private baseURL: string;
  private interceptors: {
    request: RequestInterceptor[];
    response: ResponseInterceptor[];
  };

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL;
    this.interceptors = { request: [], response: [] };
    this.setupDefaultInterceptors();
  }

  private setupDefaultInterceptors() {
    // 请求拦截器
    this.addRequestInterceptor((config) => {
      // 添加认证 token
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // 添加请求 ID
      config.headers['X-Request-ID'] = generateRequestId();

      // 添加 API 版本
      config.headers['X-API-Version'] = API_VERSION;

      return config;
    });

    // 响应拦截器
    this.addResponseInterceptor(
      (response) => response,
      (error) => {
        // 统一错误处理
        if (error.response?.status === 401) {
          // 处理认证过期
          handleAuthExpired();
        }

        // 转换错误格式
        return Promise.reject(ApiError.fromResponse(error));
      }
    );
  }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('POST', url, data, config);
  }

  // ... 其他方法
}

// 2. 服务层封装
class OracleService {
  constructor(private apiClient: ApiClient) {}

  async getPrices(provider: OracleProvider): Promise<PriceData[]> {
    return this.apiClient.get(`/api/oracles/${provider}/prices`);
  }

  async getPriceHistory(
    provider: OracleProvider,
    symbol: string,
    period: number
  ): Promise<PriceData[]> {
    return this.apiClient.get(`/api/oracles/${provider}/history`, {
      params: { symbol, period },
    });
  }
}

// 3. 使用示例
const apiClient = new ApiClient({ baseURL: '/api' });
const oracleService = new OracleService(apiClient);

// 在组件中使用
export function useOraclePrices(provider: OracleProvider) {
  return useQuery({
    queryKey: ['oracle-prices', provider],
    queryFn: () => oracleService.getPrices(provider),
  });
}
```

**实施步骤：**

1. **实现统一客户端**：创建 ApiClient 类
2. **迁移现有调用**：逐步替换直接 fetch/axios 调用
3. **封装服务层**：为每个业务域创建服务类
4. **添加拦截器**：实现认证、日志、错误处理等
5. **编写文档**：建立 API 使用规范

**预期收益：**

- 代码一致性提升
- 错误处理统一
- 易于维护和扩展
- 支持全局配置

#### 3.4 性能优化策略

**建议方案：多维度性能优化**

```typescript
// 1. 代码分割优化
// 路由级别分割
const PriceQueryPage = dynamic(
  () => import('@/app/[locale]/price-query/page'),
  { loading: () => <PageSkeleton /> }
);

// 组件级别分割
const PriceChart = dynamic(
  () => import('@/components/oracle/charts/PriceChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // 图表不需要 SSR
  }
);

// 第三方库分割
const Recharts = dynamic(
  () => import('recharts'),
  { ssr: false }
);

// 2. 图片优化
import Image from 'next/image';

export function TokenIcon({ symbol }: TokenIconProps) {
  return (
    <Image
      src={`/logos/cryptos/${symbol.toLowerCase()}.svg`}
      alt={symbol}
      width={32}
      height={32}
      loading="lazy"
      placeholder="blur"
      blurDataURL={generateBlurDataURL()}
    />
  );
}

// 3. 数据缓存优化
export function usePriceData(symbol: string) {
  return useQuery({
    queryKey: ['price', symbol],
    queryFn: () => fetchPrice(symbol),
    staleTime: 30 * 1000, // 30秒内数据新鲜
    gcTime: 5 * 60 * 1000, // 5分钟后清理缓存
    refetchOnWindowFocus: false, // 窗口聚焦不重新获取
    refetchInterval: 60 * 1000, // 每分钟后台刷新
  });
}

// 4. 虚拟滚动
import { useVirtualizer } from '@tanstack/react-virtual';

export function PriceTable({ data }: PriceTableProps) {
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // 每行高度
    overscan: 10, // 预渲染行数
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <PriceRow data={data[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. 防抖和节流
export function useSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchAPI(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  });
}

// 6. 预加载策略
export function usePrefetchOracleData() {
  const queryClient = useQueryClient();

  const prefetchPrices = useCallback((provider: OracleProvider) => {
    queryClient.prefetchQuery({
      queryKey: ['oracle-prices', provider],
      queryFn: () => oracleService.getPrices(provider),
    });
  }, [queryClient]);

  return { prefetchPrices };
}

// 在用户悬停时预加载
export function OracleLink({ provider }: OracleLinkProps) {
  const { prefetchPrices } = usePrefetchOracleData();

  return (
    <Link
      href={`/oracles/${provider}`}
      onMouseEnter={() => prefetchPrices(provider)}
    >
      {provider}
    </Link>
  );
}
```

**实施步骤：**

1. **性能分析**：使用 Lighthouse 和 Web Vitals 分析
2. **代码分割**：实施路由和组件级别分割
3. **图片优化**：使用 Next.js Image 组件
4. **缓存优化**：配置合理的缓存策略
5. **虚拟滚动**：为长列表实现虚拟滚动
6. **预加载**：实现智能预加载策略

**预期收益：**

- 首屏加载时间减少 30-50%
- 交互响应速度提升
- 资源使用优化
- 用户体验提升

#### 3.5 测试架构完善

**建议方案：建立测试金字塔**

```typescript
// 1. 单元测试（70%）
// 测试独立函数和组件
describe('calculatePriceChange', () => {
  it('should calculate positive change correctly', () => {
    const result = calculatePriceChange(110, 100);
    expect(result).toEqual({
      absolute: 10,
      percentage: 10,
      direction: 'up',
    });
  });

  it('should calculate negative change correctly', () => {
    const result = calculatePriceChange(90, 100);
    expect(result).toEqual({
      absolute: -10,
      percentage: -10,
      direction: 'down',
    });
  });

  it('should handle zero previous price', () => {
    expect(() => calculatePriceChange(100, 0)).toThrow('Previous price cannot be zero');
  });
});

// 组件测试
describe('PriceChart', () => {
  it('should render loading state', () => {
    render(<PriceChart isLoading={true} />);
    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
  });

  it('should render chart with data', () => {
    const mockData = generateMockPriceData();
    render(<PriceChart data={mockData} />);
    expect(screen.getByRole('img', { name: /price chart/i })).toBeInTheDocument();
  });

  it('should handle empty data', () => {
    render(<PriceChart data={[]} />);
    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it('should be accessible', async () => {
    const { container } = render(<PriceChart data={mockData} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// 2. 集成测试（20%）
// 测试模块间交互
describe('Oracle Data Flow', () => {
  it('should fetch and display oracle prices', async () => {
    // Mock API
    server.use(
      rest.get('/api/oracles/:provider/prices', (req, res, ctx) => {
        return res(ctx.json(mockPrices));
      })
    );

    render(<OraclePage provider={OracleProvider.CHAINLINK} />);

    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('ETH/USD')).toBeInTheDocument();
    });

    // 验证数据显示
    expect(screen.getByText('$1,800.00')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    server.use(
      rest.get('/api/oracles/:provider/prices', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    render(<OraclePage provider={OracleProvider.CHAINLINK} />);

    await waitFor(() => {
      expect(screen.getByText(/error loading prices/i)).toBeInTheDocument();
    });
  });
});

// 3. E2E 测试（10%）
// 测试关键业务流程
test('user can create price alert', async ({ page }) => {
  // 登录
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // 导航到警报页面
  await page.goto('/alerts');

  // 创建警报
  await page.click('button:has-text("Create Alert")');
  await page.selectOption('select[name="symbol"]', 'ETH/USD');
  await page.selectOption('select[name="condition"]', 'above');
  await page.fill('input[name="targetValue"]', '2000');
  await page.click('button:has-text("Save")');

  // 验证警报创建成功
  await expect(page.locator('text=Alert created successfully')).toBeVisible();
  await expect(page.locator('text=ETH/USD above $2,000')).toBeVisible();
});

// 4. 测试工具函数
// Mock 数据工厂
export function createMockPriceData(overrides?: Partial<PriceData>): PriceData {
  return {
    symbol: 'ETH/USD',
    price: 1800.50,
    timestamp: Date.now(),
    provider: OracleProvider.CHAINLINK,
    chain: Blockchain.ETHEREUM,
    confidence: 0.99,
    ...overrides,
  };
}

// 测试渲染工具
export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider messages={messages}>
        {ui}
      </IntlProvider>
    </QueryClientProvider>,
    options
  );
}
```

**实施步骤：**

1. **建立测试规范**：制定测试编写标准
2. **提升单元测试覆盖率**：目标 80%+
3. **添加集成测试**：覆盖关键模块交互
4. **完善 E2E 测试**：覆盖核心业务流程
5. **CI/CD 集成**：自动化测试执行

**预期收益：**

- 质量保障提升
- 重构信心增强
- 回归问题减少
- 文档作用

### 4. 架构演进路线图

#### 阶段一：基础优化（1-2 个月）

**目标：** 解决现有架构问题，提升代码质量

**任务清单：**

- [ ] 状态管理边界明确化
  - [ ] 审计现有状态使用
  - [ ] 制定状态管理规范
  - [ ] 迁移不合理的状态管理
- [ ] 组件职责分离
  - [ ] 识别大组件（>300行）
  - [ ] 提取逻辑到 Hooks
  - [ ] 拆分 UI 组件
- [ ] API 层统一
  - [ ] 实现统一 API 客户端
  - [ ] 封装服务层
  - [ ] 迁移现有调用
- [ ] 测试覆盖提升
  - [ ] 单元测试覆盖率提升到 60%
  - [ ] 添加关键集成测试
  - [ ] 完善 E2E 测试

**验收标准：**

- ESLint 错误 0，警告 < 50
- TypeScript 编译无错误
- 测试覆盖率 > 60%
- 核心页面性能评分 > 90

#### 阶段二：性能优化（1 个月）

**目标：** 提升应用性能和用户体验

**任务清单：**

- [ ] 代码分割优化
  - [ ] 路由级别分割
  - [ ] 组件级别分割
  - [ ] 第三方库分割
- [ ] 缓存策略优化
  - [ ] React Query 缓存配置
  - [ ] 浏览器缓存策略
  - [ ] CDN 缓存配置
- [ ] 资源优化
  - [ ] 图片优化
  - [ ] 字体优化
  - [ ] SVG 优化
- [ ] 渲染优化
  - [ ] 虚拟滚动
  - [ ] 防抖节流
  - [ ] 懒加载

**验收标准：**

- 首屏加载时间 < 2s
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1

#### 阶段三：架构升级（2-3 个月）

**目标：** 建立更先进的架构体系

**任务清单：**

- [ ] 微前端探索
  - [ ] 评估微前端方案
  - [ ] 模块联邦配置
  - [ ] 独立部署能力
- [ ] 服务端架构优化
  - [ ] API 网关设计
  - [ ] 服务拆分评估
  - [ ] GraphQL 探索
- [ ] 监控告警体系
  - [ ] 性能监控
  - [ ] 错误追踪
  - [ ] 业务监控
- [ ] 文档体系完善
  - [ ] 架构文档
  - [ ] API 文档
  - [ ] 开发指南

**验收标准：**

- 架构文档完整
- 监控体系完善
- 团队满意度 > 80%
- 系统可扩展性提升

### 5. 架构治理建议

#### 5.1 建立架构决策记录（ADR）

```markdown
# ADR-001: 使用 React Query 管理服务器状态

## 状态

已接受

## 背景

项目需要管理大量来自服务器的数据（价格、用户信息等），需要选择合适的状态管理方案。

## 决策

使用 React Query 管理所有服务器状态，使用 Zustand 管理客户端 UI 状态。

## 理由

1. React Query 专为服务器状态设计
2. 自动缓存、重新获取、后台更新
3. 与 Zustand 职责分离清晰
4. 开发体验好，调试工具完善

## 后果

- 需要明确区分服务器状态和客户端状态
- 团队需要学习 React Query API
- 需要制定使用规范

## 替代方案

- 全部使用 Zustand：缺乏服务器状态特性
- 全部使用 React Query：不适合客户端状态
- Redux Toolkit：过于复杂，学习成本高
```

#### 5.2 建立代码审查清单

```markdown
# 代码审查清单

## 架构层面

- [ ] 是否遵循分层架构原则？
- [ ] 依赖方向是否正确？
- [ ] 是否存在循环依赖？
- [ ] 模块职责是否单一？

## 代码质量

- [ ] 是否通过 ESLint 和 TypeScript 检查？
- [ ] 是否有足够的测试覆盖？
- [ ] 是否有必要的文档和注释？
- [ ] 是否遵循命名规范？

## 性能考虑

- [ ] 是否有不必要的重渲染？
- [ ] 是否使用了合适的缓存策略？
- [ ] 是否有性能瓶颈？
- [ ] 是否需要代码分割？

## 安全考虑

- [ ] 是否有安全漏洞？
- [ ] 敏感信息是否妥善处理？
- [ ] 用户输入是否验证？
- [ ] 是否有权限检查？

## 可维护性

- [ ] 代码是否易于理解？
- [ ] 是否易于扩展？
- [ ] 是否易于测试？
- [ ] 是否易于调试？
```

#### 5.3 建立技术债务管理

```markdown
# 技术债务清单

## 高优先级

1. **状态管理边界模糊**
   - 影响：数据一致性风险
   - 预计工作量：2周
   - 截止日期：2024-02-28

2. **组件职责过重**
   - 影响：可维护性差
   - 预计工作量：3周
   - 截止日期：2024-03-15

## 中优先级

3. **API 层缺乏统一抽象**
   - 影响：代码重复
   - 预计工作量：1周
   - 截止日期：2024-03-31

4. **测试覆盖率不足**
   - 影响：质量保障不足
   - 预计工作量：持续进行
   - 截止日期：持续

## 低优先级

5. **文档不完善**
   - 影响：新人上手慢
   - 预计工作量：2周
   - 截止日期：2024-04-15
```

### 6. 总结

#### 架构优势

✅ **分层清晰**：UI、状态管理、API、服务、数据层职责明确
✅ **设计模式**：工厂模式、依赖注入、策略模式应用合理
✅ **错误处理**：完善的错误分类和处理机制
✅ **模块化**：Oracle 客户端模块化设计良好
✅ **技术栈现代**：Next.js 16、React 19、TypeScript 严格模式

#### 需要改进

📌 **状态管理**：明确 React Query 和 Zustand 的使用边界
📌 **组件设计**：拆分大组件，提取逻辑到 Hooks
📌 **API 层**：统一 API 客户端和服务层封装
📌 **性能优化**：代码分割、缓存策略、虚拟滚动
📌 **测试覆盖**：提升单元测试覆盖率，完善集成和 E2E 测试

#### 核心建议

1. **立即行动**：解决状态管理边界和组件职责问题
2. **短期优化**：统一 API 层，提升测试覆盖率
3. **中期规划**：性能优化，建立架构治理体系
4. **长期演进**：探索微前端，持续架构升级

**预期成果：**

- 代码可维护性提升 50%
- 性能提升 30-50%
- 测试覆盖率提升到 80%+
- 团队开发效率提升 30%
- 架构文档完善，知识传承顺畅
