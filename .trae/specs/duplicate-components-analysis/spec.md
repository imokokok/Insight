# 重复组件分析与复用建议 Spec

## Why
代码库中存在大量重复的组件和逻辑，导致代码维护成本增加、一致性难以保证。通过识别和合并重复组件，可以提高代码复用率、减少维护成本、确保 UI 一致性。

## What Changes
- 识别并合并重复的 Hero 组件子组件
- 统一 ErrorBoundary 相关组件
- 统一 Loading/Skeleton 组件
- 统一 ChartToolbar 相关组件
- 统一卡片类组件

## Impact
- Affected specs: 无
- Affected code: 
  - `src/app/[locale]/*/components/*Hero.tsx` (多个 Oracle Hero 组件)
  - `src/components/oracle/shared/` (共享组件)
  - `src/components/ui/` (UI 组件)
  - `src/components/error-boundary/` (错误边界)

---

## 详细分析

### 1. Hero 组件子组件重复（高优先级）

#### 问题描述
在 `ChainlinkHero.tsx` 和 `API3Hero.tsx` 中发现以下组件完全重复定义：

| 组件名 | ChainlinkHero.tsx | API3Hero.tsx | 重复行数 |
|--------|-------------------|--------------|----------|
| `Sparkline` | L54-L101 | L76-L123 | ~47行 |
| `EnhancedCoreStats` | L106-L161 | L126-L181 | ~55行 |
| `CompactMetricsRow` | L256-L297 | L285-L326 | ~41行 |
| `UnifiedInfoSection` | L299-L452 | L329-L481 | ~153行 |
| `ActionButtons` | L220-L253 | L239-L282 | ~33行 |
| `MiniPriceChart` | L163-L217 | L184-L236 | ~53行 |

**总计重复代码：约 382 行**

#### 建议方案
创建共享组件文件：
- `src/components/oracle/shared/HeroComponents/Sparkline.tsx`
- `src/components/oracle/shared/HeroComponents/EnhancedCoreStats.tsx`
- `src/components/oracle/shared/HeroComponents/CompactMetricsRow.tsx`
- `src/components/oracle/shared/HeroComponents/UnifiedInfoSection.tsx`
- `src/components/oracle/shared/HeroComponents/ActionButtons.tsx`
- `src/components/oracle/shared/HeroComponents/MiniPriceChart.tsx`

---

### 2. ErrorBoundary 组件重复（高优先级）

#### 问题描述
发现多个 ErrorBoundary 实现：

| 文件路径 | 功能描述 | 行数 |
|----------|----------|------|
| `src/components/error-boundary/ErrorBoundary.tsx` | 全局错误边界，功能最完整 | ~567行 |
| `src/components/oracle/shared/OracleErrorBoundary.tsx` | Oracle 专用错误边界 | ~195行 |
| `src/app/[locale]/cross-oracle/components/ErrorBoundary.tsx` | 跨 Oracle 错误边界 | ~71行 |
| `src/components/oracle/shared/ErrorFallback.tsx` | Oracle 错误回退 | ~52行 |
| `src/app/[locale]/cross-oracle/components/ErrorFallback.tsx` | 跨 Oracle 错误回退 | ~89行 |

#### 重复点分析
1. 所有 ErrorBoundary 都实现了相同的 React 错误边界模式
2. `OracleErrorBoundary` 和 `cross-oracle/ErrorBoundary` 功能几乎相同
3. `ErrorFallback` 组件在多处重复定义

#### 建议方案
1. 保留 `src/components/error-boundary/ErrorBoundary.tsx` 作为主实现
2. 创建 `src/components/error-boundary/OracleErrorBoundary.tsx` 作为 Oracle 专用封装
3. 删除 `src/app/[locale]/cross-oracle/components/ErrorBoundary.tsx` 和 `ErrorFallback.tsx`
4. 统一使用 `src/components/oracle/shared/ErrorFallback.tsx`

---

### 3. ChartToolbar 组件重复（中优先级）

#### 问题描述
发现 3 个 ChartToolbar 实现：

| 文件路径 | 功能描述 | 行数 |
|----------|----------|------|
| `src/components/ui/ChartToolbar.tsx` | 通用图表工具栏 | ~260行 |
| `src/components/oracle/charts/ChartToolbar/EnhancedChartToolbar.tsx` | 增强版图表工具栏 | ~480行 |
| `src/components/oracle/charts/PriceChart/ChartToolbar.tsx` | 价格图表工具栏 | ~529行 |

#### 重复点分析
1. 三个组件都有时间范围选择功能
2. 三个组件都有导出功能
3. 三个组件都有全屏切换功能
4. `EnhancedChartToolbar` 和 `PriceChart/ChartToolbar` 都有价格显示功能

#### 建议方案
1. 保留 `src/components/ui/ChartToolbar.tsx` 作为基础组件
2. 创建 `src/components/oracle/charts/OracleChartToolbar.tsx` 作为 Oracle 专用扩展
3. 删除 `EnhancedChartToolbar.tsx` 和 `PriceChart/ChartToolbar.tsx`

---

### 4. 卡片类组件重复（中优先级）

#### 问题描述
发现多个卡片类组件：

| 文件路径 | 功能描述 | 行数 |
|----------|----------|------|
| `src/components/oracle/data-display/DashboardCard.tsx` | 仪表盘卡片（含 StatCard, StatGrid, MetricCard 等） | ~286行 |
| `src/components/oracle/data-display/DataQualityScoreCard.tsx` | 数据质量评分卡 | ~369行 |
| `src/components/oracle/data-display/RiskScoreCard.tsx` | 风险评分卡 | ~120行 |
| `src/components/ui/StatCard.tsx` | UI 库统计卡片 | ~238行 |

#### 重复点分析
1. `DashboardCard` 中的 `StatCard` 与 `src/components/ui/StatCard.tsx` 功能类似
2. `DataQualityScoreCard` 和 `RiskScoreCard` 结构相似，都是评分卡片
3. 多个组件都有趋势指示器（TrendIndicator）

#### 建议方案
1. 统一使用 `src/components/ui/StatCard.tsx`
2. 创建 `src/components/oracle/data-display/ScoreCard.tsx` 作为评分卡片基础组件
3. `DataQualityScoreCard` 和 `RiskScoreCard` 继承或组合 `ScoreCard`

---

### 5. Loading/Skeleton 组件（低优先级）

#### 问题描述
发现多个加载状态组件：

| 文件路径 | 功能描述 | 行数 |
|----------|----------|------|
| `src/components/oracle/shared/LoadingState.tsx` | Oracle 加载状态 | ~55行 |
| `src/components/ui/Skeleton.tsx` | UI 库骨架屏 | ~71行 |
| `src/components/ui/ChartSkeleton.tsx` | 图表骨架屏 | 未详细分析 |
| `src/components/ui/LoadingProgress.tsx` | 加载进度 | 未详细分析 |

#### 建议方案
1. 保留 `src/components/ui/Skeleton.tsx` 作为基础骨架屏组件
2. `LoadingState.tsx` 使用 `Skeleton.tsx` 构建
3. 创建统一的加载状态组件

---

## 复用优先级排序

### 高优先级（立即处理）
1. **Hero 组件子组件** - 影响多个 Oracle 页面，重复代码最多
2. **ErrorBoundary 组件** - 影响错误处理一致性

### 中优先级（后续处理）
3. **ChartToolbar 组件** - 影响图表功能
4. **卡片类组件** - 影响数据展示一致性

### 低优先级（可选处理）
5. **Loading/Skeleton 组件** - 影响较小

---

## 预估收益

| 类别 | 减少代码行数 | 减少文件数 |
|------|-------------|-----------|
| Hero 子组件 | ~400行 | 0 (新增共享文件) |
| ErrorBoundary | ~200行 | 2 |
| ChartToolbar | ~300行 | 2 |
| 卡片类组件 | ~150行 | 0 |
| **总计** | **~1050行** | **4个文件** |
