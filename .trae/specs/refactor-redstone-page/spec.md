# RedStone 页面重构规格文档

## Why

当前 RedStone 页面存在以下问题：
1. 信息密度低，大量空间被不必要的装饰性元素占据
2. 布局松散，数据展示不够紧凑
3. 缺乏统一的信息架构，各标签页内容组织不一致
4. 没有充分展示 RedStone 作为模块化预言机的核心特性（数据流、拉取模式、低延迟等）

参考 Chainlink 页面的成功经验，采用侧边栏导航 + 高密度数据展示的布局，可以显著提升用户体验和数据可读性。

## What Changes

### 布局重构
- 采用 Chainlink 页面的布局模式：Hero Header + 侧边栏导航 + 内容区域
- 使用 max-w-[1600px] 宽屏布局，提升数据展示空间
- 移除冗余的 TabNavigation，改用侧边栏导航

### 组件拆分
- 创建 `RedStoneSidebar` 组件 - 侧边栏导航
- 创建 `RedStoneHeader` 组件 - 页面头部（价格、刷新、导出）
- 创建 `RedStoneMarketView` 组件 - 市场数据视图
- 创建 `RedStoneNetworkView` 组件 - 网络健康视图
- 创建 `RedStoneDataStreamsView` 组件 - 数据流视图（RedStone 核心特性）
- 创建 `RedStoneProvidersView` 组件 - 数据提供者视图
- 创建 `RedStoneCrossChainView` 组件 - 跨链支持视图
- 创建 `RedStoneEcosystemView` 组件 - 生态系统视图
- 创建 `RedStoneRiskView` 组件 - 风险评估视图
- 创建 `useRedStonePage` hook - 页面状态管理
- 创建 `types.ts` - 类型定义

### 导航标签优化
将原有标签优化为以下结构：
- `market` - 市场数据（价格趋势、关键指标）
- `network` - 网络健康（节点状态、延迟分布）
- `data-streams` - 数据流（RedStone 核心特性：数据流数量、新鲜度分数、模块化费用）
- `providers` - 数据提供者（提供者列表、声誉排名）
- `cross-chain` - 跨链支持（支持的链、延迟对比）
- `ecosystem` - 生态系统（集成项目）
- `cross-oracle` - 跨预言机对比
- `risk` - 风险评估

### 数据密度提升
- 使用紧凑的 Stats Grid 布局
- 采用表格形式展示列表数据
- 减少卡片间距和padding
- 使用更小的字体展示次要信息

### RedStone 特性突出展示
- **模块化费用**：展示每更新一次的费用优势
- **数据新鲜度分数**：突出 RedStone 的低延迟特性
- **数据流类型**：区分价格喂送、自定义数据、L2数据
- **拉取模式优势**：对比传统推送模式

## Impact

### 受影响的文件
- `/src/app/[locale]/redstone/page.tsx` - 完全重写
- 新增 `/src/app/[locale]/redstone/components/` 目录及所有组件
- 新增 `/src/app/[locale]/redstone/hooks/useRedStonePage.ts`
- 新增 `/src/app/[locale]/redstone/types.ts`

### 依赖文件（只读参考）
- `/src/app/[locale]/chainlink/page.tsx` - 布局参考
- `/src/app/[locale]/chainlink/components/ChainlinkSidebar.tsx` - 侧边栏参考
- `/src/app/[locale]/chainlink/hooks/useChainlinkPage.ts` - hook 模式参考
- `/src/hooks/useRedStoneData.ts` - 数据获取 hook

## ADDED Requirements

### Requirement: 页面布局重构
The system SHALL provide a redesigned RedStone page layout matching Chainlink page structure.

#### Scenario: 页面加载
- **GIVEN** 用户访问 RedStone 页面
- **WHEN** 页面加载完成
- **THEN** 显示 Hero Header（包含价格、刷新按钮、导出按钮）
- **AND** 显示左侧边栏导航
- **AND** 显示主内容区域

#### Scenario: 侧边栏导航
- **GIVEN** 用户在 RedStone 页面
- **WHEN** 点击侧边栏导航项
- **THEN** 主内容区域切换到对应视图
- **AND** 被选中的导航项高亮显示

### Requirement: 数据流特性展示
The system SHALL prominently display RedStone's data stream features.

#### Scenario: 数据流标签页
- **GIVEN** 用户点击 "数据流" 导航项
- **THEN** 显示数据流统计卡片（流数量、新鲜度分数、模块化费用、提供者数量）
- **AND** 显示数据流类型分布
- **AND** 显示更新频率分布

### Requirement: 高密度数据展示
The system SHALL present data in a compact, information-dense format.

#### Scenario: 统计数据展示
- **GIVEN** 任何标签页包含统计数据
- **THEN** 使用 4 列 Grid 布局展示
- **AND** 每个统计项包含标题、数值、变化指示

#### Scenario: 列表数据展示
- **GIVEN** 任何标签页包含列表数据
- **THEN** 使用表格形式展示
- **AND** 包含排名/序号列
- **AND** 关键数据右对齐

### Requirement: 响应式设计
The system SHALL support responsive design for mobile devices.

#### Scenario: 移动端访问
- **GIVEN** 用户在移动设备访问
- **THEN** 侧边栏变为汉堡菜单
- **AND** 统计数据变为 2 列布局
- **AND** 表格支持横向滚动

## MODIFIED Requirements

无修改现有需求，此为全新重构。

## REMOVED Requirements

### Requirement: 旧版 TabNavigation
**Reason**: 被侧边栏导航替代，提供更清晰的导航结构
**Migration**: 使用新的侧边栏导航组件

### Requirement: 冗余的 Provider Detail Modal
**Reason**: 改为在 Providers 标签页使用表格展示，减少弹窗层级
**Migration**: 在 Providers 视图中直接展示详情
