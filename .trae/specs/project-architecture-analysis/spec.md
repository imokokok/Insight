# 项目架构分析规范

## Why

作为一个预言机数据分析平台，项目架构的质量直接影响可维护性、扩展性和团队协作效率。需要系统评估项目的技术栈选择、目录结构、代码组织、设计模式等方面，识别架构优势和潜在问题，为后续优化提供依据。

## What Changes

- 建立架构评估标准和检查清单
- 评估技术栈选择的合理性
- 分析目录结构和代码组织
- 评估设计模式和最佳实践
- 识别架构债务和改进机会

## Impact

- Affected specs: 无现有 spec 受影响
- Affected code: 全局架构决策、目录结构、代码组织

## ADDED Requirements

### Requirement: 技术栈评估
系统 SHALL 对项目技术栈进行全面评估。

#### Scenario: 前端框架评估
- **WHEN** 评估前端框架
- **THEN** 应检查框架版本是否为最新稳定版
- **AND** 应评估框架特性是否充分利用

#### Scenario: 状态管理评估
- **WHEN** 评估状态管理方案
- **THEN** 应检查状态管理方案是否适合项目规模
- **AND** 应评估是否存在状态管理混乱问题

### Requirement: 目录结构评估
系统 SHALL 对项目目录结构进行评估。

#### Scenario: 目录组织评估
- **WHEN** 评估目录组织
- **THEN** 应检查是否遵循 Next.js App Router 最佳实践
- **AND** 应评估模块划分是否清晰

### Requirement: 代码架构评估
系统 SHALL 对代码架构进行评估。

#### Scenario: 组件设计评估
- **WHEN** 评估组件设计
- **THEN** 应检查组件职责是否单一
- **AND** 应评估组件复用性

#### Scenario: 数据流评估
- **WHEN** 评估数据流
- **THEN** 应检查数据流向是否清晰
- **AND** 应评估 API 设计是否合理

## MODIFIED Requirements

无

## REMOVED Requirements

无

---

## 评估结果总结

### 🎯 总体评分：A- (优秀)

### ✅ 架构优势

#### 1. 技术栈选择 (A)

**评分：优秀**

项目采用了现代化、成熟的技术栈：

| 技术领域 | 技术选型 | 版本 | 评价 |
|---------|---------|------|------|
| 框架 | Next.js | 16.1.6 | 最新版本，App Router 架构 |
| UI 库 | React | 19.2.3 | 最新版本，支持并发特性 |
| 语言 | TypeScript | 5.x | 严格模式，类型安全 |
| 样式 | Tailwind CSS | 4.x | 最新版本，原子化 CSS |
| 后端 | Supabase | 2.98.0 | BaaS 架构，实时功能 |
| 状态管理 | Zustand + SWR | 5.0.11 + 2.4.1 | 轻量级，服务端状态分离 |
| 图表 | Recharts | 3.8.0 | React 原生图表库 |
| 国际化 | next-intl | 4.8.3 | 服务端渲染友好 |

**优势分析：**

1. **Next.js 16 + React 19**：采用最新版本，享受最新性能优化和特性
2. **App Router 架构**：利用服务端组件减少客户端 JS 体积
3. **Supabase 全栈方案**：统一认证、数据库、实时订阅
4. **SWR + Zustand 分层**：服务端状态与客户端状态分离
5. **TypeScript 严格模式**：类型安全保障

#### 2. 目录结构 (A-)

**评分：优秀**

项目遵循了清晰的分层架构：

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── [oracle-pages]/    # 预言机页面
│   └── layout.tsx         # 根布局
├── components/            # 组件库
│   ├── alerts/           # 告警组件
│   ├── charts/           # 图表组件
│   ├── favorites/        # 收藏组件
│   ├── navigation/       # 导航组件
│   ├── oracle/           # 预言机组件
│   ├── realtime/         # 实时组件
│   ├── settings/         # 设置组件
│   └── ui/               # 基础 UI 组件
├── contexts/             # React Context
├── hooks/                # 自定义 Hooks
├── i18n/                 # 国际化
├── lib/                  # 核心库
│   ├── alerts/          # 告警逻辑
│   ├── api/             # API 工具
│   ├── config/          # 配置
│   ├── i18n/            # i18n 配置
│   ├── oracles/         # 预言机客户端
│   ├── snapshots/       # 快照管理
│   ├── supabase/        # Supabase 集成
│   ├── types/           # 类型定义
│   └── utils/           # 工具函数
├── providers/           # Provider 组件
└── stores/              # Zustand Stores
```

**优势分析：**

1. **清晰的模块边界**：按功能域划分，职责明确
2. **App Router 最佳实践**：API 路由与页面路由分离
3. **组件分层合理**：基础 UI 组件与业务组件分离
4. **lib 目录组织**：核心逻辑与 UI 解耦

#### 3. 预言机架构设计 (A)

**评分：优秀**

预言机客户端采用了优秀的抽象设计：

```typescript
// 抽象基类设计
export abstract class BaseOracleClient {
  abstract name: OracleProvider;
  abstract supportedChains: Blockchain[];
  abstract getPrice(symbol: string, chain?: Blockchain): Promise<PriceData>;
  abstract getHistoricalPrices(...): Promise<PriceData[]>;
  
  // 共享逻辑
  protected generateMockPrice(...): PriceData;
  async fetchPriceWithDatabase(...): Promise<PriceData>;
}
```

**设计优势：**

1. **抽象基类模式**：统一接口，多态实现
2. **策略模式**：支持多种预言机提供商
3. **数据库回退机制**：Mock 数据与真实数据无缝切换
4. **类型安全**：完整的 TypeScript 类型定义

**支持的预言机：**
- Chainlink
- Band Protocol
- UMA
- Pyth Network
- API3

#### 4. 状态管理架构 (A-)

**评分：优秀**

项目采用了分层状态管理策略：

| 状态类型 | 管理方案 | 使用场景 |
|---------|---------|---------|
| 服务端状态 | SWR | 价格数据、历史数据 |
| 全局客户端状态 | Zustand | 跨链筛选状态 |
| 局部状态 | React Context | 认证、时间范围、实时连接 |
| 表单状态 | React State | 局部表单 |

**Context 层次结构：**

```tsx
<I18nProvider>
  <SWRProvider>
    <AuthProvider>
      <TimeRangeProvider>
        <RealtimeProvider>
          {children}
        </RealtimeProvider>
      </TimeRangeProvider>
    </AuthProvider>
  </SWRProvider>
</I18nProvider>
```

**优势分析：**

1. **关注点分离**：不同类型状态使用不同方案
2. **SWR 自动缓存**：减少重复请求
3. **Context 职责单一**：每个 Context 管理特定领域
4. **Zustand 轻量级**：避免 Redux 复杂性

#### 5. 认证与安全 (A-)

**评分：优秀**

认证系统设计完善：

```typescript
// 认证 Context
export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: AuthError | Error | null;
  signUp: (...) => Promise<{ error: AuthError | null }>;
  signIn: (...) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: Provider) => Promise<...>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<...>;
  refreshProfile: () => Promise<void>;
}
```

**安全特性：**

1. **Supabase Auth**：企业级认证方案
2. **路由保护**：Middleware 层路由守卫
3. **OAuth 支持**：第三方登录
4. **Session 管理**：自动刷新和状态同步

```typescript
// Middleware 路由保护
const protectedRoutes = ['/dashboard', '/settings', '/profile'];
const authRoutes = ['/login', '/register', '/forgot-password', '/auth'];
```

#### 6. 实时数据架构 (A)

**评分：优秀**

实时数据订阅架构设计优秀：

```typescript
export interface RealtimeContextValue {
  connectionStatus: ConnectionStatus;
  subscribeToPriceUpdates: (callback, filters?) => () => void;
  subscribeToAlertEvents: (callback) => () => void;
  subscribeToSnapshotChanges: (callback) => () => void;
  subscribeToFavoriteChanges: (callback) => () => void;
  reconnect: () => void;
  activeSubscriptions: string[];
}
```

**优势分析：**

1. **Supabase Realtime**：PostgreSQL 变更订阅
2. **统一订阅管理**：realtimeManager 集中管理
3. **连接状态监控**：实时反馈连接状态
4. **自动清理**：组件卸载自动取消订阅
5. **用户隔离**：认证用户专属订阅

#### 7. API 设计 (B+)

**评分：良好**

API 路由设计合理：

```
app/api/
├── alerts/
│   ├── [id]/route.ts      # 单个告警操作
│   ├── events/[id]/       # 告警事件
│   └── route.ts           # 告警列表
├── auth/
│   ├── callback/route.ts  # OAuth 回调
│   └── profile/route.ts   # 用户资料
├── cron/cleanup/route.ts  # 定时任务
├── favorites/[id]/        # 收藏操作
├── oracles/[provider]/    # 预言机数据
└── snapshots/[id]/share/  # 快照分享
```

**优势分析：**

1. **RESTful 设计**：资源导向的路由结构
2. **动态路由**：支持资源 ID 参数
3. **Cron 任务**：支持定时清理
4. **分享功能**：快照分享 API

### ⚠️ 需要改进的问题

#### 1. 组件库缺乏统一入口 (B)

**问题：组件导出不一致**

部分组件目录有 `index.ts` 统一导出，部分没有：

```typescript
// ✅ 良好实践
// src/components/alerts/index.ts
export { AlertConfig } from './AlertConfig';
export { AlertHistory } from './AlertHistory';
export { AlertList } from './AlertList';

// ❌ 缺少统一导出
// src/components/oracle/ - 无 index.ts
// 需要逐个导入
import { PriceChart } from '@/components/oracle/PriceChart';
import { FilterPanel } from '@/components/oracle/FilterPanel';
```

**改进建议：**

```typescript
// 创建 src/components/oracle/index.ts
export { PriceChart } from './PriceChart';
export { FilterPanel } from './FilterPanel';
export { DynamicPriceChart } from './DynamicPriceChart';
// ... 其他组件
```

**优先级：中**

#### 2. 缺少 API 响应类型定义 (B)

**问题：API 响应类型分散**

API 路由缺少统一的响应类型定义：

```typescript
// 当前状态 - 隐式类型
export async function GET(request: Request) {
  const data = await fetchData();
  return Response.json(data); // 类型不明确
}

// 建议改进
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export async function GET(request: Request): Promise<Response> {
  const data = await fetchData();
  return Response.json<ApiResponse<PriceData>>({
    success: true,
    data,
  });
}
```

**优先级：中**

#### 3. 缺少错误边界策略 (B-)

**问题：错误处理不够系统**

虽然有 ErrorBoundary 组件，但缺少细粒度的错误边界：

```tsx
// 当前状态 - 全局错误边界
<ErrorBoundary>
  <App />
</ErrorBoundary>

// 建议改进 - 分层错误边界
<ErrorBoundary fallback={<GlobalError />}>
  <Navbar />
  <main>
    <ErrorBoundary fallback={<ContentError />}>
      {children}
    </ErrorBoundary>
  </main>
  <Footer />
</ErrorBoundary>
```

**优先级：中**

#### 4. 缺少环境配置管理 (B)

**问题：环境变量管理分散**

环境变量直接在代码中使用，缺少统一管理：

```typescript
// 当前状态
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 建议改进
// src/lib/config/env.ts
export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL,
    environment: process.env.NODE_ENV,
  },
} as const;

// 类型安全的环境变量
type EnvConfig = typeof env;
```

**优先级：低**

#### 5. 缺少依赖注入机制 (B-)

**问题：预言机客户端实例化分散**

预言机客户端在多处直接实例化：

```typescript
// 当前状态 - 分散实例化
const chainlinkClient = new ChainlinkClient();
const bandClient = new BandProtocolClient();

// 建议改进 - 工厂模式
// src/lib/oracles/factory.ts
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
        return new ChainlinkClient();
      case OracleProvider.BAND_PROTOCOL:
        return new BandProtocolClient();
      // ...
    }
  }
}
```

**优先级：低**

#### 6. 缺少测试覆盖 (C+)

**问题：测试覆盖不足**

项目有 Jest 配置，但测试文件较少：

```
src/hooks/__tests__/
  └── useOracleData.test.ts

src/lib/oracles/__tests__/
  └── base.test.ts
```

**改进建议：**

1. 增加单元测试覆盖
2. 添加集成测试
3. 添加 E2E 测试（Playwright）
4. 设置测试覆盖率阈值

**优先级：高**

#### 7. 缺少性能监控 (B-)

**问题：缺少性能监控机制**

虽然有 Vercel Analytics 和 Speed Insights，但缺少自定义性能监控：

```typescript
// 建议添加性能监控
// src/lib/monitoring/performance.ts
export function trackPerformance(metric: string, value: number) {
  if (typeof window !== 'undefined') {
    performance.mark(metric);
    // 发送到监控系统
  }
}

// 在关键路径使用
export function useOracleData(client, options) {
  useEffect(() => {
    const start = performance.now();
    fetchPrice().then(() => {
      trackPerformance('oracle-fetch', performance.now() - start);
    });
  }, []);
}
```

**优先级：低**

### 📊 架构评估指标

| 评估维度 | 评分 | 状态 | 优先级 |
|---------|------|------|--------|
| 技术栈选择 | A | ✅ 优秀 | - |
| 目录结构 | A- | ✅ 优秀 | - |
| 预言机架构 | A | ✅ 优秀 | - |
| 状态管理 | A- | ✅ 优秀 | - |
| 认证安全 | A- | ✅ 优秀 | - |
| 实时数据 | A | ✅ 优秀 | - |
| API 设计 | B+ | ⚠️ 良好 | 中 |
| 组件组织 | B | ⚠️ 良好 | 中 |
| 错误处理 | B- | ⚠️ 一般 | 中 |
| 环境配置 | B | ⚠️ 良好 | 低 |
| 依赖管理 | B- | ⚠️ 一般 | 低 |
| 测试覆盖 | C+ | ❌ 不足 | 高 |
| 性能监控 | B- | ⚠️ 一般 | 低 |

### 🎯 改进优先级建议

#### 高优先级（立即处理）

1. **增加测试覆盖**
   - 为核心业务逻辑添加单元测试
   - 为 API 路由添加集成测试
   - 设置 CI 测试覆盖率阈值（建议 70%+）

#### 中优先级（近期处理）

2. **统一组件导出**
   - 为所有组件目录创建 index.ts
   - 建立组件导出规范

3. **完善 API 类型**
   - 定义统一的 API 响应类型
   - 为所有 API 路由添加类型注解

4. **改进错误边界**
   - 实现分层错误边界
   - 添加错误上报机制

#### 低优先级（长期优化）

5. **环境配置管理**
   - 创建统一的环境配置模块
   - 添加环境变量验证

6. **依赖注入机制**
   - 实现预言机客户端工厂
   - 支持依赖注入和测试 Mock

7. **性能监控**
   - 添加自定义性能指标
   - 集成性能监控服务

### 💡 架构最佳实践建议

#### 1. 代码组织原则

```
✅ 按功能域划分模块
✅ 保持组件职责单一
✅ 分离业务逻辑与 UI
✅ 使用 TypeScript 严格模式
```

#### 2. 状态管理原则

```
✅ 服务端状态用 SWR
✅ 客户端状态用 Zustand
✅ 局部状态用 Context
✅ 避免状态冗余
```

#### 3. API 设计原则

```
✅ RESTful 风格
✅ 统一响应格式
✅ 完整类型定义
✅ 错误处理规范
```

#### 4. 性能优化原则

```
✅ 使用服务端组件
✅ 代码分割和懒加载
✅ 图片优化
✅ 缓存策略
```

### 🏆 总结

作为一个预言机数据分析平台，您的项目架构在**技术栈选择**和**核心设计**方面表现优秀。主要优势在于：

1. **现代化技术栈**：Next.js 16 + React 19 + TypeScript
2. **清晰的分层架构**：UI、业务逻辑、数据层分离
3. **优秀的预言机抽象**：策略模式 + 工厂模式
4. **完善的实时数据**：Supabase Realtime 集成
5. **合理的状态管理**：SWR + Zustand + Context 分层

需要重点改进的领域：

1. **测试覆盖**（最优先）
2. **组件导出规范**
3. **API 类型定义**
4. **错误处理策略**

整体而言，这是一个**架构设计优秀的项目**，具有良好的可维护性和扩展性。通过系统性的改进可以达到生产级企业应用标准。
