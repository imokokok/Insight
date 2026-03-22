# 多预言机比较分析页面重构规格文档

## Why
当前多预言机比较分析页面功能完整但设计不够专业，信息密度偏低，数据可视化不够专业。需要参照 ui-redesign-rules.md 和 project_rules.md 进行全面重构，打造一个专业的数据分析平台级别的多预言机比较页面。

## What Changes
- **布局重构**: 采用紧凑专业风格，提升信息密度
- **新增专业组件**: LiveStatusBar、DataTablePro、SparklineChart、ChartToolbar
- **表格增强**: 添加固定列、条件格式、多排序、列宽调整
- **图表增强**: 添加专业图表工具栏、图表联动、迷你趋势图
- **实时数据展示**: 添加专业的实时状态指示和数据新鲜度展示
- **面包屑导航**: 添加页面面包屑导航
- **响应式优化**: 移动端卡片式表格、底部导航

## Impact
- 受影响文件: src/app/[locale]/cross-oracle/page.tsx 及所有子组件
- 新增组件: LiveStatusBar, DataTablePro, SparklineChart, ChartToolbar, Breadcrumb
- 修改组件: HeaderSection, StatsSection, PriceTable, ComparisonTabs, StatsCards

## ADDED Requirements

### Requirement: LiveStatusBar 实时状态栏
The system SHALL provide a professional live status bar at the top of the page.

#### Scenario: 显示实时状态
- **WHEN** 页面加载完成
- **THEN** 显示 UTC 时间、网络延迟、最后更新时间、连接状态
- **AND** 连接状态变化时实时更新

### Requirement: DataTablePro 专业数据表格
The system SHALL provide a professional data table with advanced features.

#### Scenario: 固定列功能
- **WHEN** 表格数据量大
- **THEN** 支持左侧固定关键列（预言机名称、价格）
- **AND** 支持右侧固定操作列

#### Scenario: 条件格式
- **WHEN** 显示偏差数据
- **THEN** 根据数值范围自动应用颜色样式（成功/警告/危险）
- **AND** 异常数据高亮显示

#### Scenario: 多字段排序
- **WHEN** 用户点击表头
- **THEN** 支持多字段组合排序
- **AND** 显示排序指示器

### Requirement: SparklineChart 迷你趋势图
The system SHALL provide sparkline charts for KPI cards.

#### Scenario: 在统计卡片显示趋势
- **WHEN** 渲染统计卡片
- **THEN** 在卡片内显示迷你趋势图
- **AND** 根据趋势方向显示不同颜色

### Requirement: ChartToolbar 图表工具栏
The system SHALL provide a professional chart toolbar.

#### Scenario: 时间范围切换
- **WHEN** 用户点击时间范围按钮
- **THEN** 切换图表显示的时间范围
- **AND** 同步更新所有关联图表

#### Scenario: 图表类型切换
- **WHEN** 用户选择不同图表类型
- **THEN** 切换图表显示方式（折线/面积/蜡烛）

### Requirement: Breadcrumb 面包屑导航
The system SHALL provide breadcrumb navigation.

#### Scenario: 显示导航路径
- **WHEN** 页面加载
- **THEN** 显示从首页到当前页面的路径
- **AND** 支持点击返回上级页面

## MODIFIED Requirements

### Requirement: HeaderSection 头部区域
**现有功能保留**:
- 交易对选择器
- 筛选面板
- 收藏功能
- 刷新按钮
- 色盲模式切换

**新增功能**:
- 紧凑布局（减小间距）
- 与 LiveStatusBar 集成
- 面包屑导航

### Requirement: StatsSection 统计区域
**现有功能保留**:
- 交易对信息展示
- 数据质量分数卡片
- 统计卡片网格

**新增功能**:
- 紧凑布局
- SparklineChart 集成
- 细分数据展示
- 基准对比

### Requirement: PriceTable 价格表格
**现有功能保留**:
- 价格数据显示
- 偏差计算
- 排序功能
- 展开详情
- 悬停提示

**增强功能**:
- 使用 DataTablePro 组件
- 固定列支持
- 条件格式
- 紧凑模式
- 多排序支持

### Requirement: ComparisonTabs 对比标签页
**现有功能保留**:
- 5个标签页（概览/图表/高级/快照/性能）
- 所有图表组件
- 快照管理
- 性能对比

**增强功能**:
- 紧凑布局
- ChartToolbar 集成
- 图表联动
- 统一时间范围选择

### Requirement: StatsCards 统计卡片
**现有功能保留**:
- 6个核心指标展示
- 历史范围显示
- 一致性评级
- 移动端适配

**增强功能**:
- 紧凑布局
- SparklineChart 集成
- 趋势指示器优化

## REMOVED Requirements
无功能删除，所有现有功能保留。

## 设计规范参考

### 布局规范（来自 ui-redesign-rules.md）
```
页面容器: px-3 py-3 (极致紧凑)
组件间距: space-y-3
网格间距: gap-3
卡片内边距: p-3
最大宽度: max-w-[1600px]
```

### 圆角规范（来自 project_rules.md）
```
按钮: rounded-md (6px)
卡片: rounded-lg (8px)
输入框: rounded-md (6px)
徽章: rounded-full (完全圆角)
模态框: rounded-xl (12px)
```

### 色彩系统（保留现有）
```
--primary-50 到 --primary-900
--gray-50 到 --gray-900
--success-50 到 --success-700
--warning-50 到 --warning-700
--danger-50 到 --danger-700
```

## 文件结构
```
src/app/[locale]/cross-oracle/
├── page.tsx                          # 主页面（修改）
├── components/
│   ├── HeaderSection.tsx             # 头部区域（修改）
│   ├── StatsSection.tsx              # 统计区域（修改）
│   ├── StatsCards.tsx                # 统计卡片（修改）
│   ├── PriceTableSection.tsx         # 表格区域（修改）
│   ├── PriceTable.tsx                # 价格表格（修改）
│   ├── ComparisonTabs.tsx            # 对比标签页（修改）
│   ├── TabNavigation.tsx             # 标签导航（保留）
│   ├── FullscreenChart.tsx           # 全屏图表（保留）
│   ├── ExportSection.tsx             # 导出区域（保留）
│   ├── OracleComparisonSection.tsx   # 预言机对比（保留）
│   ├── BenchmarkComparisonSection.tsx # 基准对比（保留）
│   ├── DataSourcePanel.tsx           # 数据源面板（保留）
│   ├── UnifiedExportSection.tsx      # 统一导出（保留）
│   ├── FilterPanel.tsx               # 筛选面板（保留）
│   ├── PairSelector.tsx              # 交易对选择器（保留）
│   ├── StatsOverview.tsx             # 统计概览（保留）
│   ├── ChartTooltip.tsx              # 图表提示（保留）
│   ├── ErrorBoundary.tsx             # 错误边界（保留）
│   ├── ErrorFallback.tsx             # 错误回退（保留）
│   └── index.ts                      # 组件导出（修改）
├── hooks/
│   └── useCrossOraclePage.ts         # 页面逻辑 Hook（保留）
├── types/
│   └── index.ts                      # 类型定义（保留）
└── constants.tsx                     # 常量定义（保留）

src/components/ui/                    # 新增通用组件
├── LiveStatusBar.tsx                 # 实时状态栏（新增）
├── DataTablePro.tsx                  # 专业数据表格（新增）
├── SparklineChart.tsx                # 迷你趋势图（新增）
├── ChartToolbar.tsx                  # 图表工具栏（新增）
└── Breadcrumb.tsx                    # 面包屑导航（新增）
```

## 验收标准
- [ ] 所有现有功能完整保留
- [ ] 页面布局采用紧凑专业风格
- [ ] LiveStatusBar 正常显示实时状态
- [ ] DataTablePro 支持固定列和条件格式
- [ ] SparklineChart 在统计卡片正常显示
- [ ] ChartToolbar 支持时间范围和图表类型切换
- [ ] Breadcrumb 正常显示导航路径
- [ ] 响应式设计在移动端正常显示
- [ ] 所有现有测试通过
