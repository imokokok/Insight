# RedStone 页面重构任务列表

## 任务总览
将 RedStone 页面从当前的 Tab 导航布局重构为类似 Chainlink 页面的侧边栏导航布局，提升数据密度，突出 RedStone 核心特性。

## 任务列表

- [x] **Task 1: 创建类型定义文件**
  - [x] 创建 `/src/app/[locale]/redstone/types.ts`
  - [x] 定义 `RedStoneTabId` 类型（'market' | 'network' | 'data-streams' | 'providers' | 'cross-chain' | 'ecosystem' | 'cross-oracle' | 'risk'）
  - [x] 定义 `RedStonePageState` 接口
  - [x] 定义 `RedStoneSidebarProps` 接口
  - [x] 定义各个 View 组件的 Props 接口

- [x] **Task 2: 创建页面状态管理 Hook**
  - [x] 创建 `/src/app/[locale]/redstone/hooks/useRedStonePage.ts`
  - [x] 参考 `useChainlinkPage.ts` 实现状态管理
  - [x] 集成 `useRedStoneAllData` 获取数据
  - [x] 实现 `refresh` 和 `exportData` 功能
  - [x] 导出所有必要的状态和方法

- [x] **Task 3: 创建侧边栏导航组件**
  - [x] 创建 `/src/app/[locale]/redstone/components/RedStoneSidebar.tsx`
  - [x] 参考 `ChainlinkSidebar.tsx` 实现
  - [x] 配置 8 个导航项（market, network, data-streams, providers, cross-chain, ecosystem, cross-oracle, risk）
  - [x] 实现选中状态高亮
  - [x] 添加图标

- [x] **Task 4: 创建市场数据视图组件**
  - [x] 创建 `/src/app/[locale]/redstone/components/RedStoneMarketView.tsx`
  - [x] 包含价格趋势图表（使用 PriceChart 组件）
  - [x] 包含快速统计面板（市值、24h交易量、流通供应量等）
  - [x] 包含网络状态概览（活跃节点、数据流数量、响应时间、成功率）
  - [x] 采用紧凑的 Grid 布局

- [x] **Task 5: 创建网络健康视图组件**
  - [x] 创建 `/src/app/[locale]/redstone/components/RedStoneNetworkView.tsx`
  - [x] 显示网络统计（活跃节点、数据流、正常运行时间、平均响应时间）
  - [x] 使用 StatGrid 布局
  - [x] 展示网络健康状态

- [x] **Task 6: 创建数据流视图组件（核心特性）**
  - [x] 创建 `/src/app/[locale]/redstone/components/RedStoneDataStreamsView.tsx`
  - [x] 展示数据流统计卡片：
    - 数据流数量（1,250+）
    - 新鲜度分数（98.5/100）
    - 模块化费用（0.015%/更新）
    - 活跃提供者数量
  - [x] 展示数据流类型分布（价格喂送、自定义数据、L2数据）
  - [x] 展示更新频率分布（高频~10s、标准~60s、低频~300s）
  - [x] 突出 RedStone 的拉取模式优势

- [x] **Task 7: 创建数据提供者视图组件**
  - [x] 创建 `/src/app/[locale]/redstone/components/RedStoneProvidersView.tsx`
  - [x] 展示提供者统计（数据源数量、更新频率、数据质量、平均声誉）
  - [x] 使用表格展示提供者列表（排名、名称、数据点、声誉、最后更新）
  - [x] 实现排序功能（按声誉、数据点、最后更新）
  - [x] 实现筛选功能（全部、高声誉、大数据量）

- [x] **Task 8: 创建跨链支持视图组件**
  - [x] 创建 `/src/app/[locale]/redstone/components/RedStoneCrossChainView.tsx`
  - [x] 展示跨链统计（支持链数量、平均响应时间、最快链、正常运行时间）
  - [x] 使用表格展示支持的链列表（排名、链名称、更新频率、延迟、状态）

- [x] **Task 9: 创建生态系统视图组件**
  - [x] 创建 `/src/app/[locale]/redstone/components/RedStoneEcosystemView.tsx`
  - [x] 展示生态系统统计（集成数量、DeFi协议、基础设施、NFT和游戏）
  - [x] 按类别展示集成项目（基础设施、DeFi、NFT）
  - [x] 使用表格形式展示

- [x] **Task 10: 创建风险评估视图组件**
  - [x] 创建 `/src/app/[locale]/redstone/components/RedStoneRiskView.tsx`
  - [x] 复用现有的 `RedStoneRiskAssessmentPanel` 组件
  - [x] 适配新的布局样式

- [x] **Task 11: 创建组件索引文件**
  - [x] 创建 `/src/app/[locale]/redstone/components/index.ts`
  - [x] 导出所有组件

- [x] **Task 12: 重构主页面**
  - [x] 重写 `/src/app/[locale]/redstone/page.tsx`
  - [x] 采用 Chainlink 页面的布局结构（Hero Header + 侧边栏 + 内容区）
  - [x] 集成 `useRedStonePage` hook
  - [x] 实现响应式布局（移动端汉堡菜单）
  - [x] 根据 `activeTab` 渲染对应视图组件

## 任务依赖关系

```
Task 1 (types.ts)
    ↓
Task 2 (useRedStonePage.ts)
    ↓
Task 3 (RedStoneSidebar.tsx) ──┬──→ Task 12 (page.tsx)
                               │
Task 4-10 (View Components) ────┘
    ↓
Task 11 (index.ts)
```

## 并行执行建议

以下任务可以并行执行（在 Task 1 和 Task 2 完成后）：
- Task 3, Task 4, Task 5, Task 6, Task 7, Task 8, Task 9, Task 10

Task 11 和 Task 12 需要等待其他任务完成后执行。
