# 硬编码字符串国际化 Spec

## Why
项目中存在大量硬编码的中文字符串，约50个组件文件包含未国际化的文本。这会导致语言切换时部分内容无法翻译，影响用户体验和多语言支持的一致性。

## What Changes
- 识别所有硬编码的中文字符串
- 将硬编码字符串提取到翻译文件（en.json 和 zh-CN.json）
- 替换组件中的硬编码字符串为 `t()` 函数调用
- 确保所有组件正确使用 `useI18n()` hook

## Impact
- Affected code: `src/components/oracle/*.tsx`（约50个文件）
- Affected i18n: `src/i18n/en.json`, `src/i18n/zh-CN.json`

## ADDED Requirements

### Requirement: 硬编码字符串国际化
系统应将所有硬编码的 UI 文本字符串迁移到国际化翻译文件中。

#### Scenario: 组件国际化
- **WHEN** 组件包含硬编码的中文字符串
- **THEN** 应提取字符串到翻译文件，并使用 `t()` 函数引用

#### Scenario: 翻译文件更新
- **WHEN** 添加新的翻译 key
- **THEN** en.json 和 zh-CN.json 应同时更新，保持结构一致

## Implementation Guidelines

### 翻译 Key 命名规范
按照功能模块组织翻译 key：
- `updateFrequency.*` - 更新频率相关
- `concentrationRisk.*` - 集中度风险相关
- `requestTrend.*` - 请求趋势相关
- `ecosystem.*` - 生态系统相关
- `confidenceAlert.*` - 置信区间预警相关
- `nodeReputation.*` - 节点声誉相关
- `publisher.*` - Publisher 相关
- `snapshot.*` - 快照相关
- `dataSource.*` - 数据源相关
- `networkHealth.*` - 网络健康相关
- `dataQuality.*` - 数据质量相关

### 迁移模式
**Before:**
```tsx
<p className="text-xs text-gray-500">平均每小时更新</p>
```

**After:**
```tsx
const { t } = useI18n();
<p className="text-xs text-gray-500">{t('updateFrequency.avgHourlyUpdates')}</p>
```

## Files to Internationalize

### 高优先级（核心组件）
1. `UpdateFrequencyHeatmap.tsx` - 更新频率热力图
2. `ConcentrationRisk.tsx` - 集中度风险分析
3. `RequestTrendChart.tsx` - 请求趋势图表
4. `EcosystemPanel.tsx` - 生态系统面板
5. `ConfidenceAlertPanel.tsx` - 置信区间预警
6. `NodeReputationPanel.tsx` - 节点声誉面板
7. `PublisherList.tsx` - Publisher 列表
8. `SnapshotManager.tsx` - 快照管理器
9. `DataSourceTraceabilityPanel.tsx` - 数据源追溯
10. `NetworkHealthPanel.tsx` - 网络健康面板

### 中优先级
11. `DataQualityPanel.tsx` - 数据质量面板
12. `PublisherReliabilityScore.tsx` - Publisher 可靠性评分
13. `AccuracyAnalysisPanel.tsx` - 准确性分析
14. `PriceAccuracyStats.tsx` - 价格准确性统计
15. `ValidatorAnalyticsPanel.tsx` - 验证者分析
16. `DisputeResolutionPanel.tsx` - 争议解决
17. `CoveragePoolPanel.tsx` - 覆盖池面板
18. `FirstPartyOracleAdvantages.tsx` - 第一方预言机优势
19. `CrossChainPanel.tsx` - 跨链面板
20. `PublisherAnalysisPanel.tsx` - Publisher 分析

### 其他文件
剩余约30个组件文件需要国际化处理。
