# 跨预言机分析功能重构规格文档

## Why

当前 Chainlink 预言机中的"跨预言机分析"功能数据显示过于简单，缺乏专业数据分析的深度和视觉效果。现有的卡片式布局限制了数据密度的展示，无法有效传达复杂的价格对比、偏差分析和性能评估信息。需要重构为更加专业、数据密集型的分析界面，去除卡片样式，采用更紧凑、专业的数据表格和可视化布局。

## What Changes

### 主要改进点

1. **移除卡片样式** - 所有组件改用扁平化、紧凑的布局，使用细边框分隔而非阴影卡片
2. **增强数据密度** - 在相同空间展示更多数据指标和分析维度
3. **专业数据表格** - 重构价格对比表格，增加更多统计列和交互功能
4. **高级分析指标** - 添加 Z-Score、变异系数、置信区间等专业统计指标
5. **实时数据可视化** - 优化图表展示，增加热力图、箱线图等专业图表
6. **性能对比面板** - 重构性能分析界面，增加延迟分布、准确率对比等
7. **数据质量评估** - 增强数据质量评分系统，展示更多维度

### 具体修改内容

#### 1. OracleComparisonSection 重构
- 移除卡片容器，改用扁平化布局
- 增加更多统计指标：变异系数(CV)、标准误差、四分位距
- 优化表格列：添加置信度、更新时间、数据新鲜度
- 增加价格偏差分布直方图

#### 2. BenchmarkComparisonSection 重构
- 移除卡片样式，使用紧凑的统计面板
- 增加行业基准对比的多维度展示
- 添加排名变化趋势指示器
- 优化对比表格，增加历史对比数据

#### 3. PriceTable 增强
- 增加更多列：Z-Score、置信区间、更新频率
- 添加行内迷你图(sparkline)展示价格趋势
- 增强异常值标记和高亮显示
- 添加列筛选和自定义显示功能

#### 4. 新增专业分析组件
- **PriceDeviationAnalysis**: 价格偏差深度分析面板
- **OracleReliabilityMatrix**: 预言机可靠性矩阵
- **CrossOracleMetricsGrid**: 跨预言机指标网格
- **StatisticalSummaryPanel**: 统计摘要面板

#### 5. 样式系统调整
- 使用细边框(`border-gray-200`)替代卡片阴影
- 采用更紧凑的间距系统
- 使用专业金融数据展示配色
- 优化响应式布局

## Impact

### 受影响文件
- `src/app/[locale]/cross-oracle/components/OracleComparisonSection.tsx`
- `src/app/[locale]/cross-oracle/components/BenchmarkComparisonSection.tsx`
- `src/app/[locale]/cross-oracle/components/PriceTable.tsx`
- `src/app/[locale]/cross-oracle/components/ComparisonTabs.tsx`
- `src/app/[locale]/cross-oracle/components/StatsSection.tsx`

### 新增文件
- `src/app/[locale]/cross-oracle/components/PriceDeviationAnalysis.tsx`
- `src/app/[locale]/cross-oracle/components/OracleReliabilityMatrix.tsx`
- `src/app/[locale]/cross-oracle/components/CrossOracleMetricsGrid.tsx`
- `src/app/[locale]/cross-oracle/components/StatisticalSummaryPanel.tsx`

## ADDED Requirements

### Requirement: 专业数据展示
系统 SHALL 提供专业级的数据分析展示界面，不使用卡片样式，采用扁平化、高数据密度的布局。

#### Scenario: 价格对比展示
- **WHEN** 用户查看跨预言机价格对比
- **THEN** 系统显示包含以下信息的紧凑表格：
  - 预言机名称和标识
  - 当前价格（带趋势指示）
  - 与平均价格的偏差百分比
  - Z-Score 值
  - 置信度/置信区间
  - 数据新鲜度
  - 24小时变化率
  - 价格迷你图

#### Scenario: 统计分析面板
- **WHEN** 用户查看统计分析
- **THEN** 系统显示以下统计指标：
  - 平均价格、加权平均价格
  - 价格范围（最高/最低）
  - 标准差和变异系数
  - 四分位距(IQR)
  - 偏度和峰度指标
  - 一致性评分

### Requirement: 高级可视化
系统 SHALL 提供专业的数据可视化组件，展示价格分布、偏差热力图和性能对比。

#### Scenario: 偏差热力图
- **WHEN** 用户查看偏差分析
- **THEN** 系统显示时间-预言机维度的价格偏差热力图

#### Scenario: 箱线图展示
- **WHEN** 用户查看价格分布
- **THEN** 系统显示各预言机的价格分布箱线图

### Requirement: 性能对比
系统 SHALL 提供详细的预言机性能对比功能。

#### Scenario: 延迟分析
- **WHEN** 用户查看性能分析
- **THEN** 系统显示各预言机的响应延迟分布直方图

#### Scenario: 可靠性矩阵
- **WHEN** 用户查看可靠性分析
- **THEN** 系统显示预言机可靠性评分矩阵

## MODIFIED Requirements

### Requirement: 现有价格表格
**原需求**: 基础价格对比表格
**修改后**: 
- 增加 Z-Score 列
- 增加置信区间列
- 增加迷你图列
- 增加数据新鲜度指示器
- 移除卡片容器，改用扁平化布局

### Requirement: 统计概览
**原需求**: 基础统计卡片展示
**修改后**:
- 移除卡片样式
- 增加更多统计指标
- 使用网格布局提高数据密度
- 添加趋势指示器

## REMOVED Requirements

### Requirement: 卡片样式布局
**原因**: 卡片样式占用过多空间，不适合高密度数据展示
**迁移**: 全部改为扁平化边框布局

### Requirement: 简单数据展示
**原因**: 需要更专业的数据分析功能
**迁移**: 增加统计指标和可视化组件
