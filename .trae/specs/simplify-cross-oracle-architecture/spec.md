# 多预言机对比页面信息架构简化规格

## Why

当前多预言机对比页面存在5个Tab（overview、charts、advanced、snapshots、performance），内容分散且功能重叠，导致：
1. 用户难以快速找到核心信息
2. 部分Tab使用率低下（如advanced、snapshots）
3. 相似功能分散在不同Tab中
4. 信息架构不符合用户心智模型

需要重新设计信息架构，将5个Tab简化为3个核心Tab，让用户一眼看到最重要的信息。

## What Changes

### 1. Tab结构重组（5个→3个）

**当前结构：**
- overview - 概览（统计卡片+价格表格+图表）
- charts - 图表（重复的价格趋势图+热力图+箱线图+波动率图）
- advanced - 高级（移动平均线+数据质量趋势）
- snapshots - 快照（快照管理+对比）
- performance - 性能（延迟分布+相关性矩阵+排名）

**新结构：**
- 📊 **overview** - 概览（整合核心功能）
  - 关键指标卡片（一致性评分、平均价格、最大偏差、数据点数）
  - 价格对比表格
  - 价格趋势图（主图表）
  - 异常预警提示
  
- 📈 **analysis** - 深度分析（合并原charts+advanced+performance）
  - 价格偏差热力图
  - 价格分布箱线图
  - 波动率分析
  - 预言机性能排名
  - 相关性矩阵
  
- 💾 **history** - 历史记录（合并原snapshots+部分历史功能）
  - 快照管理
  - 历史对比
  - 数据导出

### 2. OverviewTab内容优化

**保留的核心内容：**
- 关键指标区域（4列紧凑网格）
- 价格对比表格（精简列：预言机、价格、偏差、置信度）
- 主价格趋势图（带标准差区域）
- 异常预警横幅

**移除的内容：**
- 重复的图表（已在analysis Tab中）
- 复杂的统计指标（CV、SEM等）
- 展开行详情（简化交互）

### 3. AnalysisTab内容整合

**从原ChartsTab迁移：**
- 价格偏差热力图
- 价格分布箱线图
- 波动率图表

**从原PerformanceTab迁移：**
- 预言机性能排名
- 价格相关性矩阵
- 响应时间统计

**从原AdvancedTab迁移：**
- 移动平均线（作为图表叠加选项）
- 数据质量评分

### 4. HistoryTab功能合并

**从原SnapshotsTab迁移：**
- 快照列表
- 快照对比功能

**新增功能：**
- 导出历史数据
- 时间范围快速选择

### 5. 删除AdvancedTab

**删除原因：**
- 移动平均线可作为图表叠加选项
- 数据质量评分可整合到overview的指标卡片
- 该Tab使用率最低

### 6. 统一交互模式

**所有Tab统一使用：**
- 扁平化设计（bg-slate-50/30）
- 一致的图表工具栏
- 统一的时间范围选择器
- 统一的预言机筛选器

## Impact

### 受影响文件
- `src/app/[locale]/cross-oracle/components/TabNavigation.tsx` - Tab定义更新
- `src/app/[locale]/cross-oracle/components/ComparisonTabs.tsx` - Tab内容重组
- `src/app/[locale]/cross-oracle/types.ts` - TabId类型更新
- `src/app/[locale]/cross-oracle/hooks/useTabNavigation.ts` - 新建hook（从组件提取）
- `src/app/[locale]/cross-oracle/page.tsx` - 移除对删除Tab的引用

### 新增文件
- `src/app/[locale]/cross-oracle/components/AnalysisTab.tsx` - 深度分析Tab
- `src/app/[locale]/cross-oracle/components/HistoryTab.tsx` - 历史记录Tab

### 删除文件
- 无需删除，原AdvancedTab内容整合到其他组件

## ADDED Requirements

### Requirement: Tab结构简化
系统 SHALL 将5个Tab简化为3个核心Tab，提升信息架构清晰度。

#### Scenario: Tab导航
- **WHEN** 用户访问多预言机对比页面
- **THEN** 看到3个Tab：概览(Overview)、深度分析(Analysis)、历史记录(History)
- **AND** 每个Tab有清晰的职责边界

#### Scenario: 概览Tab内容
- **WHEN** 用户点击概览Tab
- **THEN** 看到关键指标卡片、价格对比表格、主价格趋势图
- **AND** 有异常预警提示（如存在）
- **AND** 没有重复的图表或复杂统计指标

#### Scenario: 深度分析Tab内容
- **WHEN** 用户点击深度分析Tab
- **THEN** 看到价格偏差热力图、价格分布箱线图、波动率分析
- **AND** 看到预言机性能排名和相关性矩阵
- **AND** 可以切换时间范围查看不同周期的分析

#### Scenario: 历史记录Tab内容
- **WHEN** 用户点击历史记录Tab
- **THEN** 看到快照列表和历史对比功能
- **AND** 可以导出历史数据

### Requirement: 数据持久化兼容
系统 SHALL 处理Tab名称变更对用户本地存储的影响。

#### Scenario: 本地存储迁移
- **WHEN** 用户之前保存了Tab状态（如advanced或performance）
- **THEN** 系统自动映射到新的Tab（analysis）
- **AND** 不显示错误或不存在的Tab

## MODIFIED Requirements

### Requirement: TabId类型定义
**原定义:**
```typescript
type TabId = 'overview' | 'charts' | 'advanced' | 'snapshots' | 'performance';
```

**修改后:**
```typescript
type TabId = 'overview' | 'analysis' | 'history';
```

### Requirement: TabNavigation组件
**原实现:** 5个Tab的导航

**修改后:**
- 3个Tab的导航
- 更新图标和标签
- 保持本地存储功能
- 添加从旧TabId到新TabId的映射逻辑

### Requirement: ComparisonTabs组件
**原实现:** 5个render函数（renderOverviewTab、renderChartsTab等）

**修改后:**
- 3个render函数（renderOverviewTab、renderAnalysisTab、renderHistoryTab）
- 原charts、advanced、performance内容整合到renderAnalysisTab
- 原snapshots内容迁移到renderHistoryTab
- 简化renderOverviewTab，移除重复图表

## REMOVED Requirements

### Requirement: AdvancedTab独立展示
**原因:** 内容使用率低，功能可整合到AnalysisTab作为选项
**迁移:** 
- 移动平均线 → AnalysisTab图表叠加选项
- 数据质量趋势 → OverviewTab指标卡片

### Requirement: PerformanceTab独立展示
**原因:** 与ChartsTab功能重叠，都是数据分析类内容
**迁移:**
- 性能排名 → AnalysisTab
- 延迟分布 → AnalysisTab
- 相关性矩阵 → AnalysisTab

### Requirement: ChartsTab独立展示
**原因:** 与OverviewTab的价格趋势图重复
**迁移:**
- 价格趋势图 → 从OverviewTab移除（保留主图表）
- 其他图表 → AnalysisTab

## 用户体验改进点

### 1. 信息层次更清晰
- 第一层（Overview）：核心数据，一眼看到关键信息
- 第二层（Analysis）：深度分析，需要时查看
- 第三层（History）：历史记录，偶尔使用

### 2. 减少认知负担
- 从5个选项减少到3个
- 每个Tab的职责更明确
- 避免功能重复

### 3. 提升核心功能可见性
- 最重要的价格对比和趋势图在OverviewTab突出展示
- 异常预警更明显
- 关键指标一目了然

## 技术实现要点

### 1. 向后兼容
- 本地存储的Tab状态需要映射逻辑
- 旧链接（如#advanced）需要重定向

### 2. 性能优化
- AnalysisTab图表懒加载
- HistoryTab数据按需获取
- OverviewTab优先渲染

### 3. 代码组织
- 提取useTabNavigation hook
- 拆分大型render函数
- 统一图表配置
