# 代码结构优化任务清单

## 高优先级任务

### Task 1: 统一 Hooks 组织
**目标**: 将分散的 oracle hooks 统一放到 `hooks/oracles/` 目录下

**现状问题**:
- 根目录下有 10+ 个 oracle 专用 hook 文件（useChainlinkData.ts, usePythData.ts 等）
- 只有 api3/ 目录是按 oracle 组织的
- 部分 hooks 功能重叠

**实施步骤**:
1. 创建 `hooks/oracles/` 目录结构
2. 将根目录下的 oracle hooks 移动到对应子目录
3. 更新所有导入路径
4. 删除重复的 hook 实现

**目录结构**:
```
hooks/
├── oracles/
│   ├── index.ts              # 统一导出
│   ├── chainlink.ts          # 原 useChainlinkData.ts
│   ├── pyth.ts               # 原 usePythData.ts
│   ├── bandProtocol.ts       # 原 useBandProtocolData.ts
│   ├── uma.ts                # 原 useUMAData.ts
│   ├── redstone.ts           # 原 useRedStoneData.ts
│   ├── dia.ts                # 原 useDIAData.ts
│   ├── tellor.ts             # 原 useTellorData.ts
│   ├── chronicle.ts          # 原 useChronicleData.ts
│   ├── winklink.ts           # 原 useWINkLinkData.ts
│   └── api3/                 # 保留现有结构
│       ├── index.ts
│       ├── useAPI3Price.ts
│       └── ...
├── queries/                  # 保留
├── realtime/                 # 保留
└── ui/                       # 新建：移动 UI 相关 hooks
```

---

### Task 2: 简化组件目录结构
**目标**: 重构 `components/oracle/common/` 目录，使其更加清晰

**现状问题**:
- `common/` 目录包含 25+ 组件，过于庞大
- `oraclePanels/` 只有 2 个文件，分类过细
- 部分组件职责不清晰

**实施步骤**:
1. 分析 common/ 中的所有组件，按职责分类
2. 创建新的子目录：data-display/, alerts/, shared/
3. 移动组件到对应目录
4. 更新所有导入路径

**目录结构**:
```
components/oracle/
├── charts/                   # 保留
├── data-display/             # 重命名自 common/
│   ├── index.ts
│   ├── OracleHero.tsx
│   ├── LoadingState.tsx
│   ├── PriceAccuracyStats.tsx
│   ├── DataQualityIndicator.tsx
│   ├── RiskScoreCard.tsx
│   └── ...
├── alerts/                   # 新建：从 common/anomaly/ 扩展
│   ├── index.ts
│   ├── AnomalyAlert.tsx
│   ├── AlertConfig.tsx
│   ├── VolatilityAlert.tsx
│   └── ...
├── forms/                    # 保留
├── indicators/               # 保留
└── shared/                   # 新建：跨模块共享组件
    ├── index.ts
    ├── OraclePageTemplate.tsx
    └── TabNavigation.tsx
```

---

### Task 3: 类型定义整合
**目标**: 清理分散和重复的类型定义

**现状问题**:
- 类型分布在多个位置（types/, lib/, components/, app/）
- 存在重复定义
- 部分类型命名不一致

**实施步骤**:
1. 梳理所有类型定义位置
2. 将核心领域类型集中到 `src/types/`
3. 模块内部类型保留在模块目录
4. 统一命名规范
5. 删除重复定义

**类型组织规范**:
```
types/
├── index.ts                  # 统一导出
├── oracle/
│   ├── index.ts
│   ├── enums.ts              # OracleProvider, Blockchain 等
│   ├── price.ts              # PriceData, PriceQuery 等
│   ├── config.ts             # 配置相关类型
│   └── client.ts             # 客户端接口
├── api/
│   ├── index.ts
│   ├── requests.ts           # API 请求类型
│   └── responses.ts          # API 响应类型
├── ui/
│   ├── index.ts
│   ├── components.ts         # 通用组件 props
│   └── charts.ts             # 图表相关类型
└── auth/
    └── index.ts
```

**模块内部类型**:
```
lib/oracles/
├── types.ts                  # oracle 模块内部类型
├── interfaces.ts             # 接口定义（已存在）
└── uma/
    └── types.ts              # UMA 专用类型（保留）
```

---

## 中优先级任务

### Task 4: Oracle 页面模板化
**目标**: 为 10 个 oracle 页面创建统一的模板系统

**现状问题**:
- 10 个 oracle 页面（chainlink/, pyth/, api3/ 等）结构高度相似
- 每个页面都有独立的 components/, hooks/, types.ts
- 维护成本高，新增 oracle 需要复制大量代码

**实施步骤**:
1. 分析现有 oracle 页面的共同点和差异
2. 设计可配置的页面模板
3. 创建 `OraclePageTemplate` 组件
4. 为每个 oracle 创建配置对象
5. 迁移现有页面使用模板

**建议方案**:
```typescript
// lib/config/oracles.tsx (已存在，需要扩展)
export interface OraclePageConfig {
  provider: OracleProvider;
  title: string;
  description: string;
  icon: React.ReactNode;
  themeColor: string;
  views: OracleViewConfig[];
  sidebar: SidebarConfig;
}

// app/[locale]/[oracle]/page.tsx
export default function OraclePage({ 
  params 
}: { 
  params: { locale: string; oracle: string } 
}) {
  const config = getOracleConfig(params.oracle);
  return <OraclePageTemplate config={config} />;
}
```

---

### Task 5: 增加测试覆盖
**目标**: 为核心模块添加单元测试和集成测试

**现状问题**:
- 测试文件分布不均
- components/ 和 app/ 几乎没有测试
- 核心业务逻辑测试不足

**实施步骤**:
1. 为核心 hooks 添加单元测试
2. 为关键组件添加集成测试
3. 为 API routes 添加测试
4. 配置 Playwright E2E 测试

**测试策略**:
```
测试覆盖目标：
├── hooks/                    # 目标：80% 覆盖
│   ├── oracles/              # 每个 hook 都要有测试
│   └── queries/              # React Query hooks
├── lib/
│   ├── oracles/              # 已有 4 个，目标：全部覆盖
│   ├── api/                  # 新增：API 层测试
│   └── errors/               # 错误处理测试
├── components/
│   └── oracle/               # 关键组件测试
└── e2e/                      # 新增：Playwright 测试
    ├── navigation.spec.ts
    ├── price-query.spec.ts
    └── cross-oracle.spec.ts
```

---

### Task 6: 性能优化
**目标**: 实施代码分割和懒加载，优化首屏加载

**现状问题**:
- 部分页面组件可能过于庞大
- 图表组件可能阻塞首屏渲染
- 没有使用动态导入

**实施步骤**:
1. 识别大型组件和页面
2. 为图表组件添加动态导入
3. 为非关键组件添加懒加载
4. 优化图片和资源加载
5. 配置性能预算

**优化清单**:
```typescript
// 1. 图表组件动态导入
const PriceChart = dynamic(
  () => import('@/components/oracle/charts/PriceChart'),
  { loading: () => <ChartSkeleton /> }
);

// 2. 页面级别代码分割
const CrossOraclePage = dynamic(
  () => import('./CrossOracleContent'),
  { ssr: false }
);

// 3. 虚拟化长列表
import { useVirtualizer } from '@tanstack/react-virtual';
```

---

## 低优先级任务

### Task 7: 文档完善
**目标**: 为复杂模块添加架构文档

**实施步骤**:
1. 为 lib/oracles/ 添加架构说明
2. 为状态管理策略添加文档
3. 更新 API 接口文档
4. 添加开发指南

**文档清单**:
- `docs/architecture/oracles.md` - 预言机系统架构
- `docs/architecture/state-management.md` - 状态管理
- `docs/development/contributing.md` - 开发指南
- `docs/api/README.md` - API 文档

---

### Task 8: 代码规范统一
**目标**: 统一代码风格和命名约定

**实施步骤**:
1. 审查现有代码风格差异
2. 更新 ESLint 配置
3. 统一命名约定
4. 添加自动化格式化

**规范清单**:
- 组件命名：PascalCase
- Hook 命名：camelCase + use 前缀
- 工具函数：camelCase
- 常量：SCREAMING_SNAKE_CASE
- 类型：PascalCase + 描述性名称

---

## 任务依赖关系

```
Task 1 (Hooks 组织) ─────┐
                         ├──→ Task 4 (页面模板化)
Task 2 (组件目录) ───────┤
                         │
Task 3 (类型整合) ───────┘
                         │
Task 5 (测试覆盖) ───────┤
                         ├──→ Task 6 (性能优化)
Task 7 (文档完善) ───────┘
```

---

## 实施建议

### 阶段 1: 基础设施（第 1-2 周）
- Task 3: 类型定义整合
- Task 1: 统一 Hooks 组织

### 阶段 2: 组件重构（第 3-4 周）
- Task 2: 简化组件目录
- Task 4: Oracle 页面模板化

### 阶段 3: 质量提升（第 5-6 周）
- Task 5: 增加测试覆盖
- Task 6: 性能优化

### 阶段 4: 文档完善（第 7 周）
- Task 7: 文档完善
- Task 8: 代码规范统一
