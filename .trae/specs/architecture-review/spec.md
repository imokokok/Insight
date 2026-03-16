# 项目架构审查与优化建议

## Why

项目经过多轮迭代开发，积累了大量功能，但架构层面存在一些可以优化的地方。本规范旨在识别架构问题并提供专业的优化建议，提升代码可维护性、性能和开发体验。

## What Changes

- 识别现有架构的优缺点
- 提供状态管理优化建议
- 提供组件结构优化建议
- 提供数据层优化建议
- 提供工程化改进建议

## Impact

- Affected specs: 整体架构设计
- Affected code: 状态管理层、组件层、API层、工程配置

---

## 一、现有架构分析

### 1.1 技术栈概览

| 类别       | 技术                | 版本    |
| ---------- | ------------------- | ------- |
| 框架       | Next.js             | 16.1.6  |
| UI库       | React               | 19.2.3  |
| 语言       | TypeScript          | 5.x     |
| 样式       | Tailwind CSS        | 4.x     |
| 图表       | Recharts            | 3.8.0   |
| 服务端状态 | React Query         | 5.90.21 |
| 客户端状态 | Zustand             | 5.0.11  |
| 数据库     | Supabase PostgreSQL | -       |
| 认证       | Supabase Auth       | 2.98.0  |
| 实时通信   | Supabase Realtime   | -       |
| 国际化     | next-intl           | 4.8.3   |
| 动画       | Framer Motion       | 12.36.0 |

### 1.2 架构优点

#### ✅ 清晰的分层架构

```
UI Layer → State Layer → API Layer → Oracle Integration → Database
```

项目采用了清晰的分层设计，各层职责明确。

#### ✅ 良好的关注点分离

- `src/app/` - 页面路由
- `src/components/` - UI组件
- `src/hooks/` - 自定义Hooks
- `src/lib/` - 核心逻辑
- `src/contexts/` - 全局状态

#### ✅ 完善的错误处理体系

- 自定义错误类 (`AppError`, `OracleError`, `BusinessErrors`)
- 统一的错误响应转换
- Error Boundary 组件

#### ✅ 依赖注入容器

自定义的 DI 容器实现，支持单例和工厂模式，提高了可测试性。

#### ✅ 实时数据架构

WebSocket + Supabase Realtime 双通道实时数据更新机制。

#### ✅ 国际化支持

使用 next-intl 实现中英文双语支持。

---

## 二、架构问题识别

### 2.1 🔴 状态管理过于复杂（高优先级）

**问题描述：**
项目同时使用了 4 种状态管理方案：

1. React Query（服务端状态）
2. Zustand（客户端状态）
3. 多个 Context（AuthContext, RealtimeContext, TimeRangeContext）
4. SWR（数据获取，但 package.json 中未见）

**影响：**

- 学习成本高
- 状态同步复杂
- 调试困难
- 代码一致性差

**建议：**

```
推荐方案：React Query + Zustand 组合

React Query 负责：
- 所有服务端数据获取和缓存
- API 请求状态管理

Zustand 负责：
- UI 状态（筛选、选择、模态框状态）
- 跨组件共享的客户端状态

移除：
- SWR（如果存在）
- 将 Context 状态迁移到 Zustand 或 React Query
```

### 2.2 🔴 组件结构过于庞大（高优先级）

**问题描述：**
`src/components/oracle/` 目录包含 100+ 个组件，结构复杂：

- `charts/` - 30+ 图表组件
- `common/` - 40+ 通用组件
- `panels/` - 50+ 面板组件
- `forms/` - 表单组件
- `indicators/` - 指标组件

**影响：**

- 组件查找困难
- 职责边界模糊
- 复用性差
- 打包体积大

**建议：**

```
推荐目录结构：

src/components/
├── ui/                    # 基础UI组件（Button, Card, Input等）
├── charts/                # 通用图表组件
│   ├── base/             # 基础图表
│   ├── technical/        # 技术指标图表
│   └── analytics/        # 分析图表
├── oracle/               # Oracle相关组件
│   ├── shared/           # 共享组件
│   └── providers/        # 按Provider分组
│       ├── chainlink/
│       ├── pyth/
│       ├── band/
│       └── ...
├── features/             # 功能模块组件
│   ├── alerts/
│   ├── favorites/
│   ├── snapshots/
│   └── settings/
└── layout/               # 布局组件
    ├── Navbar/
    ├── Footer/
    └── Sidebar/
```

### 2.3 🟡 缺少统一的 API 客户端层（中优先级）

**问题描述：**
API 调用分散在多处：

- `src/lib/api/` - API 处理器
- `src/lib/oracles/` - Oracle 客户端
- `src/lib/supabase/` - 数据库查询
- 各 hooks 中直接 fetch

**影响：**

- 请求配置不统一
- 错误处理不一致
- 缓存策略分散
- 难以统一监控

**建议：**

```typescript
// 推荐创建统一的 API 客户端

// src/lib/api/client.ts
class ApiClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;

  async request<T>(config: RequestConfig): Promise<T>;
  async get<T>(url: string, config?: RequestConfig): Promise<T>;
  async post<T>(url: string, data: unknown, config?: RequestConfig): Promise<T>;

  // 请求/响应拦截器
  addRequestInterceptor(interceptor: RequestInterceptor): void;
  addResponseInterceptor(interceptor: ResponseInterceptor): void;
}

// 统一的错误处理
class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: unknown
  ) {}
}
```

### 2.4 🟡 Hooks 目录结构可优化（中优先级）

**问题描述：**
`src/hooks/` 目录包含 30+ 个 hooks，但缺乏清晰的组织：

- `useAPI3Data.ts`, `useChainlinkData.ts`, `useDIAData.ts` 等 Provider 特定 hooks
- `useOracleData.ts`, `useOracleDataQuery.ts`, `useOraclePrices.ts` 功能重叠
- `api3/` 子目录与其他平级 hooks 不一致

**建议：**

```
src/hooks/
├── queries/              # React Query hooks
│   ├── useOraclePrices.ts
│   ├── usePriceHistory.ts
│   └── useMarketData.ts
├── mutations/            # Mutation hooks
│   ├── useAlertMutations.ts
│   └── useFavoriteMutations.ts
├── realtime/             # 实时数据 hooks
│   ├── useRealtimePrice.ts
│   └── useRealtimeAlerts.ts
├── ui/                   # UI 相关 hooks
│   ├── useChartZoom.ts
│   ├── useChartExport.ts
│   └── useKeyboardShortcuts.ts
└── providers/            # Provider 特定 hooks
    ├── chainlink/
    ├── pyth/
    └── ...
```

### 2.5 🟡 缺少性能监控和错误追踪（中优先级）

**问题描述：**

- 无 APM（Application Performance Monitoring）集成
- 无前端错误追踪服务（如 Sentry）
- 缺少性能指标收集

**建议：**

```typescript
// 集成 Sentry 进行错误追踪
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// 集成 Web Vitals 性能监控
export function reportWebVitals(metric: NextWebVitalsMetric) {
  // 发送到分析服务
}
```

### 2.6 🟢 缺少统一的组件库/设计系统（低优先级）

**问题描述：**

- `src/components/ui/` 只有 6 个基础组件
- 大量重复的样式定义
- 缺少统一的设计令牌

**建议：**

```typescript
// 建立设计令牌系统
// src/styles/tokens.ts
export const tokens = {
  colors: {
    primary: { /* ... */ },
    neutral: { /* ... */ },
    semantic: { /* ... */ },
  },
  spacing: { /* ... */ },
  typography: { /* ... */ },
  shadows: { /* ... */ },
  radii: { /* ... */ },
};

// 扩展 UI 组件库
src/components/ui/
├── primitives/           # 原子组件
│   ├── Button/
│   ├── Input/
│   ├── Select/
│   └── ...
├── composites/           # 组合组件
│   ├── DataTable/
│   ├── Modal/
│   └── ...
└── layouts/              # 布局组件
    ├── Stack/
    ├── Grid/
    └── ...
```

### 2.7 🟢 测试覆盖可提升（低优先级）

**问题描述：**

- `__tests__/` 目录只在部分模块存在
- 缺少 E2E 测试
- 缺少集成测试

**建议：**

```
测试策略：
1. 单元测试：Jest + React Testing Library
   - 工具函数
   - Hooks
   - 独立组件

2. 集成测试：Jest + MSW
   - API 交互
   - 状态管理

3. E2E 测试：Playwright
   - 关键用户流程
   - 跨浏览器测试
```

---

## 三、优化建议总结

### 3.1 高优先级（建议立即处理）

| 问题         | 影响                   | 建议方案                       |
| ------------ | ---------------------- | ------------------------------ |
| 状态管理复杂 | 维护成本高、学习曲线陡 | 统一使用 React Query + Zustand |
| 组件结构庞大 | 查找困难、复用性差     | 按功能/Provider 重新组织       |

### 3.2 中优先级（建议近期处理）

| 问题              | 影响         | 建议方案                 |
| ----------------- | ------------ | ------------------------ |
| 缺少统一API客户端 | 请求配置分散 | 创建 ApiClient 封装层    |
| Hooks 结构混乱    | 代码组织差   | 按功能类型重新分类       |
| 缺少监控追踪      | 问题定位困难 | 集成 Sentry + Web Vitals |

### 3.3 低优先级（可长期规划）

| 问题         | 影响       | 建议方案             |
| ------------ | ---------- | -------------------- |
| 缺少设计系统 | 样式不一致 | 建立设计令牌和组件库 |
| 测试覆盖不足 | 质量保障弱 | 完善测试金字塔       |

---

## 四、架构改进路线图

### Phase 1: 状态管理统一（1-2周）

1. 审计现有状态使用情况
2. 制定迁移策略
3. 逐步迁移 Context 到 Zustand
4. 统一 React Query 配置

### Phase 2: 组件重构（2-3周）

1. 制定新的组件组织规范
2. 创建共享 UI 组件库
3. 按功能模块重组业务组件
4. 清理冗余组件

### Phase 3: 数据层优化（1-2周）

1. 创建统一 API 客户端
2. 统一错误处理
3. 优化缓存策略
4. 添加请求日志

### Phase 4: 工程化提升（1周）

1. 集成 Sentry 错误追踪
2. 添加性能监控
3. 完善测试覆盖
4. 文档更新

---

## 五、最佳实践建议

### 5.1 组件设计原则

```typescript
// ✅ 好的实践：单一职责、明确接口
interface PriceChartProps {
  data: PriceData[];
  symbol: string;
  onPointClick?: (point: DataPoint) => void;
}

export function PriceChart({ data, symbol, onPointClick }: PriceChartProps) {
  // ...
}

// ❌ 避免：过于庞大的组件
export function OracleDashboard(
  {
    /* 20+ props */
  }
) {
  // 1000+ 行代码
}
```

### 5.2 状态管理原则

```typescript
// ✅ 服务端状态使用 React Query
export function useOraclePrices(provider: string) {
  return useQuery({
    queryKey: ['oracle-prices', provider],
    queryFn: () => fetchOraclePrices(provider),
    staleTime: 30_000,
  });
}

// ✅ UI 状态使用 Zustand
export const useUIStore = create<UIState>((set) => ({
  selectedChain: null,
  setSelectedChain: (chain) => set({ selectedChain: chain }),
}));
```

### 5.3 API 设计原则

```typescript
// ✅ 统一的响应格式
interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: number;
    source: string;
  };
}

// ✅ 统一的错误格式
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

---

## 六、结论

项目整体架构设计良好，采用了现代化的技术栈和清晰的分层设计。主要优化方向：

1. **简化状态管理** - 减少心智负担
2. **优化组件结构** - 提高可维护性
3. **统一数据层** - 增强一致性
4. **完善工程化** - 保障质量和性能

建议按优先级逐步实施，避免大规模重构带来的风险。
