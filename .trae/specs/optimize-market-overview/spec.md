# 市场概览页视觉优化规范

## Why
当前市场概览页面存在以下视觉问题：
1. **功能区域直接融入背景色**：MarketStats、ChartContainer、MarketSidebar 等核心功能组件直接放置在 `bg-insight` 背景上，缺乏视觉边界和层次感
2. **信息层级不清晰**：各功能模块之间没有明显的视觉区分，用户难以快速识别不同的信息区块
3. **专业感不足**：作为数据分析平台的核心页面，当前的平面化设计缺乏金融数据平台应有的精致感和专业度
4. **视觉单调**：全页面统一的背景色使得长时间浏览容易产生视觉疲劳

需要优化以：
- 建立清晰的视觉层级和信息分组
- 为功能模块添加适当的容器和边界
- 提升页面的专业数据分析平台质感
- 保持简洁优雅的设计风格

## What Changes

### 视觉优化
- **添加卡片容器**：为核心功能模块（MarketStats、ChartContainer、MarketSidebar、AssetsTable）添加白色卡片背景
- **优化间距系统**：调整模块之间的间距，建立清晰的视觉节奏
- **增强边框和阴影**：使用微妙的边框和阴影区分不同功能区域
- **保留整体背景**：维持 `bg-insight` 作为页面底层背景，卡片悬浮于其上

### 布局调整
- **MarketStats 区域**：添加白色卡片背景，突出核心指标
- **图表区域**：ChartContainer 和 MarketSidebar 分别使用独立卡片
- **资产表格**：AssetsTable 添加卡片容器，与上方图表区域形成视觉区分
- **统一圆角和间距**：所有卡片使用一致的圆角（rounded-xl）和间距（p-4/p-6）

### 细节优化
- **标题区域**：MarketHeader 保持简洁，与下方内容形成对比
- **分隔线优化**：使用更 subtle 的分隔方式替代现有的边框
- **悬停效果**：为卡片添加微妙的悬停阴影效果
- **响应式保持**：确保移动端卡片布局正常

## Impact
- **受影响文件**：
  - `src/app/[locale]/market-overview/page.tsx` - 主页面布局调整
  - `src/app/[locale]/market-overview/components/MarketStats.tsx` - 统计组件样式优化
  - `src/app/[locale]/market-overview/components/MarketHeader.tsx` - 头部样式微调
  - `src/app/[locale]/market-overview/components/ChartContainer.tsx` - 图表容器样式优化
  - `src/app/[locale]/market-overview/components/MarketSidebar.tsx` - 侧边栏样式优化
  - `src/app/[locale]/market-overview/components/AssetsTable.tsx` - 表格容器样式优化

## ADDED Requirements

### Requirement: 核心指标卡片容器
The system SHALL wrap the MarketStats component with a card container that:
- 使用白色背景（bg-white）
- 添加 subtle 边框（border border-gray-200）
- 使用 rounded-xl 圆角
- 添加轻微阴影（shadow-sm）
- 保持内部布局不变

#### Scenario: 页面加载
- **WHEN** 用户访问市场概览页
- **THEN** MarketStats 显示在白色卡片容器内
- **AND** 与背景形成清晰的视觉区分

### Requirement: 图表区域卡片容器
The system SHALL wrap the ChartContainer with a card container that:
- 使用白色背景
- 添加边框和圆角
- 保持图表区域的高度和响应式行为
- 与右侧 MarketSidebar 卡片对齐

#### Scenario: 图表展示
- **WHEN** 用户查看图表区域
- **THEN** 图表显示在白色卡片容器内
- **AND** 图表标题、工具栏、图表内容保持原有布局

### Requirement: 侧边栏卡片容器
The system SHALL wrap the MarketSidebar with a card container that:
- 使用白色背景
- 添加边框和圆角
- 保持侧边栏内部组件布局
- 与左侧 ChartContainer 卡片高度协调

#### Scenario: 侧边栏展示
- **WHEN** 用户查看侧边栏
- **THEN** 侧边栏内容显示在白色卡片容器内
- **AND** 预言机列表、时间范围等信息清晰展示

### Requirement: 资产表格卡片容器
The system SHALL wrap the AssetsTable with a card container that:
- 使用白色背景
- 添加边框和圆角
- 保持表格的滚动和交互功能
- 与上方图表区域形成视觉层次

#### Scenario: 表格展示
- **WHEN** 用户查看资产表格
- **THEN** 表格显示在白色卡片容器内
- **AND** 表格头部、行、分页等功能正常

### Requirement: 页面间距优化
The system SHALL adjust the page spacing that:
- 增加模块之间的垂直间距（space-y-6 替代 space-y-8）
- 统一内边距使用（p-4 或 p-6）
- 保持响应式布局下的间距一致性

#### Scenario: 页面布局
- **WHEN** 页面渲染完成
- **THEN** 各模块之间有清晰的间距
- **AND** 整体布局平衡、不拥挤

## MODIFIED Requirements

### Requirement: MarketStats 组件
**现有功能**：直接渲染在页面上，无卡片背景
**修改后**：
- 添加白色卡片容器
- 保持内部指标布局和样式
- 添加适当的内边距

#### Scenario: 统计指标展示
- **WHEN** 渲染 MarketStats
- **THEN** 显示在白色卡片内
- **AND** 指标值和变化趋势清晰可见

### Requirement: ChartContainer 组件
**现有功能**：直接渲染，使用 p-3 内边距
**修改后**：
- 外部添加卡片容器
- 内部保持原有布局
- 调整内边距为 p-4 或 p-6

#### Scenario: 图表容器展示
- **WHEN** 渲染 ChartContainer
- **THEN** 显示在白色卡片内
- **AND** 图表类型切换、时间范围选择等功能正常

### Requirement: MarketSidebar 组件
**现有功能**：直接渲染，space-y-3 布局
**修改后**：
- 外部添加卡片容器
- 内部移除多余的间距
- 保持预言机列表和交互功能

#### Scenario: 侧边栏展示
- **WHEN** 渲染 MarketSidebar
- **THEN** 显示在白色卡片内
- **AND** 预言机列表、悬停效果正常

### Requirement: AssetsTable 组件
**现有功能**：直接渲染在 p-3 容器内
**修改后**：
- 外部添加卡片容器
- 保持表格样式和交互
- 调整内边距

#### Scenario: 表格展示
- **WHEN** 渲染 AssetsTable
- **THEN** 显示在白色卡片内
- **AND** 表格行、排序、筛选功能正常

### Requirement: 页面主容器
**现有功能**：使用 space-y-8 和 p-3 内边距
**修改后**：
- 调整模块间距为 space-y-6
- 为各模块添加卡片容器
- 保持整体布局结构

#### Scenario: 页面渲染
- **WHEN** 页面加载完成
- **THEN** 各功能模块显示在独立的卡片内
- **AND** 页面整体视觉层次清晰

## REMOVED Requirements

无移除的功能需求，仅为现有组件添加视觉容器。
