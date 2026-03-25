# 多预言机对比页面代码架构优化规格

## Why

当前代码架构存在以下问题，影响可维护性和性能：

1. **useCrossOraclePage hook 过于庞大** - 500+行，包含过多状态逻辑
2. **Props Drilling 严重** - ComparisonTabs 组件有 80+ 个 props
3. **组件职责不单一** - ComparisonTabs 包含 3 个 Tab 的渲染逻辑，代码量过大
4. **缺乏代码分割** - 所有 Tab 内容一次性加载，影响首屏性能
5. **类型定义分散** - 类型定义散落在多个文件中
6. **重复计算** - 图表数据在每次渲染时重新计算

## What Changes

### 1. 拆分 useCrossOraclePage Hook

将庞大的 hook 拆分为多个职责单一的 hook：

```
useCrossOraclePage/                    # 文件夹结构
├── index.ts                           # 统一导出
├── useCrossOraclePage.ts              # 主 hook（精简版）
├── useOracleSelection.ts              # 预言机选择状态
├── usePriceData.ts                    # 价格数据获取
├── useChartInteractions.ts            # 图表交互（zoom、hover等）
├── useFilterState.ts                  # 筛选状态管理
└── useSnapshotActions.ts              # 快照相关操作
```

### 2. 使用 Context API 减少 Props Drilling

创建三个 Context：

- **OracleDataContext** - 共享价格数据、统计指标
- **ChartConfigContext** - 共享图表配置（颜色、时间范围等）
- **UIStateContext** - 共享 UI 状态（loading、hovered等）

### 3. 组件拆分与懒加载

将 ComparisonTabs 拆分为独立组件：

```
components/
├── tabs/
│   ├── OverviewTab/                   # 概览 Tab（懒加载）
│   │   ├── index.tsx
│   │   ├── StatsGrid.tsx
│   │   ├── PriceTableSection.tsx
│   │   └── PriceChartSection.tsx
│   ├── AnalysisTab/                   # 分析 Tab（懒加载）
│   │   ├── index.tsx
│   │   ├── HeatmapSection.tsx
│   │   ├── BoxPlotSection.tsx
│   │   └── PerformanceSection.tsx
│   └── HistoryTab/                    # 历史 Tab（懒加载）
│       ├── index.tsx
│       └── SnapshotSection.tsx
```

### 4. 数据计算优化

- 使用 `useMemo` 缓存昂贵的计算
- 使用 `useCallback` 缓存事件处理函数
- 图表数据按需计算，避免不必要的重计算

### 5. 类型定义集中化

创建统一的类型定义文件：

```
types/
├── index.ts                           # 统一导出
├── oracle.ts                          # 预言机相关类型
├── chart.ts                           # 图表相关类型
├── stats.ts                           # 统计指标类型
└── ui.ts                              # UI 状态类型
```

## Impact

### 受影响文件

- `useCrossOraclePage.ts` - 拆分为多个小 hook
- `ComparisonTabs.tsx` - 拆分为 3 个独立的 Tab 组件
- `page.tsx` - 添加 Context Provider
- `types.ts` - 类型定义重构

### 性能提升

- 首屏加载时间减少 30%+（通过代码分割）
- 不必要的重渲染减少 50%+（通过 Context 和 memo）
- 代码可维护性显著提升

## ADDED Requirements

### Requirement: Hook 拆分
系统 SHALL 将 useCrossOraclePage 拆分为多个职责单一的 hook。

#### Scenario: Hook 职责单一
- **WHEN** 开发者查看 hook 代码
- **THEN** 每个 hook 只负责一个明确的职责
- **AND** 主 hook 只负责组合各个子 hook

### Requirement: Context API 使用
系统 SHALL 使用 Context API 减少 props drilling。

#### Scenario: 减少 Props 传递
- **WHEN** ComparisonTabs 组件渲染
- **THEN** props 数量从 80+ 减少到 20 以内
- **AND** 深层组件通过 Context 获取数据

### Requirement: 代码分割
系统 SHALL 对 Tab 组件进行代码分割。

#### Scenario: 懒加载 Tab
- **WHEN** 用户首次访问页面
- **THEN** 只加载 OverviewTab 代码
- **AND** 其他 Tab 代码按需加载

## MODIFIED Requirements

### Requirement: 组件结构
**原实现:** ComparisonTabs 包含所有 Tab 渲染逻辑

**修改后:**
- 每个 Tab 独立为单独的组件
- 使用动态导入实现懒加载
- 共享逻辑通过 Context 提供

### Requirement: 类型定义
**原实现:** 类型定义散落在多个文件中

**修改后:**
- 集中化的类型定义
- 清晰的类型层次结构
- 避免类型重复定义

## REMOVED Requirements

### Requirement: 单一庞大 Hook
**原因:** 难以维护和测试
**迁移:** 拆分为多个小 hook

### Requirement: Props Drilling
**原因:** 导致组件耦合度高
**迁移:** 使用 Context API

## 技术实现要点

### 1. Hook 拆分原则

- 每个 hook 不超过 150 行
- 单一职责原则
- 可独立测试

### 2. Context 设计

- 避免 Context 值频繁变化
- 使用多个小 Context 而非一个大 Context
- 合理拆分 Provider

### 3. 性能优化

- React.memo 包裹纯展示组件
- useMemo 缓存计算结果
- useCallback 缓存回调函数
- 虚拟列表处理大数据量

## 预期效果

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 首屏加载时间 | ~3s | ~2s | 33% |
| Props 数量 | 80+ | <20 | 75% |
| Hook 代码行数 | 500+ | <150 | 70% |
| 组件重渲染次数 | 高 | 低 | 显著 |
| 代码可维护性 | 低 | 高 | 显著 |
