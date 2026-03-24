# Tasks - Band Protocol 页面重构

## 任务列表

- [x] Task 1: 创建 Band Protocol 页面基础结构和类型定义
  - [x] SubTask 1.1: 创建 `src/app/[locale]/band-protocol/types.ts` 文件，定义 BandProtocolTabId 和接口
  - [x] SubTask 1.2: 更新 `src/lib/config/oracles.tsx` 中 Band Protocol 的 tabs 配置，精简为 6 个核心 Tab

- [x] Task 2: 创建 Band Protocol 专用 Hook
  - [x] SubTask 2.1: 创建 `src/app/[locale]/band-protocol/hooks/useBandProtocolPage.ts`，管理页面状态和数据获取
  - [x] SubTask 2.2: 集成 BandProtocolClient 的方法（getValidators、getNetworkStats、getCrossChainStats 等）

- [x] Task 3: 创建 Band Protocol 侧边栏组件
  - [x] SubTask 3.1: 创建 `src/app/[locale]/band-protocol/components/BandProtocolSidebar.tsx`
  - [x] SubTask 3.2: 实现 6 个导航项：market、network、validators、cross-chain、data-feeds、risk

- [x] Task 4: 创建 Band Protocol 视图组件 - MarketView
  - [x] SubTask 4.1: 创建 `src/app/[locale]/band-protocol/components/BandProtocolMarketView.tsx`
  - [x] SubTask 4.2: 实现价格图表、快速统计、网络状态概览、数据源状态

- [x] Task 5: 创建 Band Protocol 视图组件 - NetworkView
  - [x] SubTask 5.1: 创建 `src/app/[locale]/band-protocol/components/BandProtocolNetworkView.tsx`
  - [x] SubTask 5.2: 实现网络指标卡片、网络健康面板、每小时活动图表、性能指标

- [x] Task 6: 创建 Band Protocol 视图组件 - ValidatorsView
  - [x] SubTask 6.1: 创建 `src/app/[locale]/band-protocol/components/BandProtocolValidatorsView.tsx`
  - [x] SubTask 6.2: 实现验证者列表表格（包含佣金率、正常运行时间、质押量）
  - [x] SubTask 6.3: 实现验证者统计概览卡片

- [x] Task 7: 创建 Band Protocol 视图组件 - CrossChainView
  - [x] SubTask 7.1: 创建 `src/app/[locale]/band-protocol/components/BandProtocolCrossChainView.tsx`
  - [x] SubTask 7.2: 实现支持的链列表（Cosmos Hub、Osmosis、Ethereum 等）
  - [x] SubTask 7.3: 显示各链的请求统计和平均 Gas 成本

- [x] Task 8: 创建 Band Protocol 视图组件 - DataFeedsView 和 RiskView
  - [x] SubTask 8.1: 创建 `src/app/[locale]/band-protocol/components/BandProtocolDataFeedsView.tsx`
  - [x] SubTask 8.2: 创建 `src/app/[locale]/band-protocol/components/BandProtocolRiskView.tsx`

- [x] Task 9: 创建组件索引文件
  - [x] SubTask 9.1: 创建 `src/app/[locale]/band-protocol/components/index.ts`，导出所有组件

- [x] Task 10: 重构主页面
  - [x] SubTask 10.1: 完全重构 `src/app/[locale]/band-protocol/page.tsx`，采用 Chainlink 风格的布局
  - [x] SubTask 10.2: 实现 Hero 区域（Logo、价格、统计概览、刷新/导出按钮）
  - [x] SubTask 10.3: 实现侧边栏导航和主内容区域的响应式布局

## 任务依赖关系
- Task 1 必须在 Task 2、3、4、5、6、7、8 之前完成
- Task 2 必须在 Task 10 之前完成
- Task 3、4、5、6、7、8 可以并行执行，但必须在 Task 9 之前完成
- Task 9 必须在 Task 10 之前完成
