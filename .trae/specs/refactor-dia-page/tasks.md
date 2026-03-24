# DIA 页面重构任务列表

## 任务依赖关系
- Task 1 (types.ts) 无依赖
- Task 2 (useDIAPage.ts) 依赖 Task 1
- Task 3 (DIASidebar.tsx) 依赖 Task 1
- Task 4 (DIAMarketView.tsx) 依赖 Task 1
- Task 5 (DIANetworkView.tsx) 依赖 Task 1
- Task 6 (DIADataFeedsView.tsx) 依赖 Task 1
- Task 7 (DIANFTView.tsx) 依赖 Task 1
- Task 8 (DIAStakingView.tsx) 依赖 Task 1
- Task 9 (DIAEcosystemView.tsx) 依赖 Task 1
- Task 10 (DIARiskView.tsx) 依赖 Task 1
- Task 11 (components/index.ts) 依赖 Task 3-10
- Task 12 (page.tsx) 依赖 Task 2, 3, 11

## 任务列表

- [x] Task 1: 创建类型定义文件 `src/app/[locale]/dia/types.ts`
  - 定义 `DIATabId` 类型（'market' | 'network' | 'data-feeds' | 'nft-data' | 'staking' | 'ecosystem' | 'cross-oracle' | 'risk'）
  - 定义 `DIANetworkStats` 接口
  - 定义 `DIAPageState` 接口
  - 定义 `DIAPageActions` 接口
  - 定义 `DIASidebarProps` 接口
  - 定义 `DIAMarketViewProps` 接口
  - 定义 `DIANetworkViewProps` 接口

- [x] Task 2: 创建 `useDIAPage` hook `src/app/[locale]/dia/hooks/useDIAPage.ts`
  - 参考 `useChainlinkPage.ts` 实现
  - 使用 `useDIAAllData` 获取数据
  - 管理 `activeTab` 状态
  - 提供 `refresh` 和 `exportData` 功能
  - 返回 `lastUpdated` 时间戳

- [x] Task 3: 创建侧边栏组件 `src/app/[locale]/dia/components/DIASidebar.tsx`
  - 参考 `ChainlinkSidebar.tsx` 实现
  - 8 个导航项：市场数据、网络健康、数据馈送、NFT 数据、质押、生态系统、跨预言机对比、风险评估
  - 使用 indigo 主题色
  - 支持移动端菜单

- [x] Task 4: 创建市场视图组件 `src/app/[locale]/dia/components/DIAMarketView.tsx`
  - 参考 `ChainlinkMarketView.tsx` 实现
  - 左侧：价格趋势图表（占 2/3 宽度）
  - 右侧：快速统计面板（市值、24h 交易量、流通供应量、质押 APR）
  - 底部：网络状态概览和数据源列表
  - 使用 DIA 特有的统计数据

- [x] Task 5: 创建网络视图组件 `src/app/[locale]/dia/components/DIANetworkView.tsx`
  - 参考 `ChainlinkNetworkView.tsx` 实现
  - 顶部：4 个核心指标卡片（活跃数据源、数据馈送、响应时间、正常运行时间）
  - 中部：网络健康面板
  - 底部：每小时活动图表和性能指标

- [x] Task 6: 创建数据馈送视图组件 `src/app/[locale]/dia/components/DIADataFeedsView.tsx`
  - 数据馈送表格展示
  - 显示名称、类型、链、状态、置信度
  - 数据源透明度信息展示

- [x] Task 7: 创建 NFT 数据视图组件 `src/app/[locale]/dia/components/DIANFTView.tsx`
  - NFT 集合列表展示
  - 地板价趋势图表
  - 按链分布统计

- [x] Task 8: 创建质押视图组件 `src/app/[locale]/dia/components/DIAStakingView.tsx`
  - 质押统计卡片（总质押量、APR、质押者数量）
  - 质押详情面板
  - 历史 APR 趋势

- [x] Task 9: 创建生态系统视图组件 `src/app/[locale]/dia/components/DIAEcosystemView.tsx`
  - 生态合作伙伴列表
  - 按类别分类展示
  - TVL 统计

- [x] Task 10: 创建风险视图组件 `src/app/[locale]/dia/components/DIARiskView.tsx`
  - 风险评估面板
  - 网络风险指标
  - 数据质量指标

- [x] Task 11: 创建组件导出文件 `src/app/[locale]/dia/components/index.ts`
  - 导出所有视图组件
  - 导出侧边栏组件

- [x] Task 12: 重构主页面 `src/app/[locale]/dia/page.tsx`
  - 参考 `chainlink/page.tsx` 实现
  - 使用 `useDIAPage` hook
  - 实现 Hero 区域（实时状态条、标题、价格、按钮、统计卡片）
  - 实现侧边栏布局
  - 实现内容区域渲染逻辑
  - 支持移动端菜单
  - 保留 CrossOracleComparison 组件

## 并行执行建议
- Task 1 可以独立执行
- Task 3-10 可以并行执行（都依赖 Task 1）
- Task 2 和 Task 3-10 可以并行执行
- Task 11 依赖 Task 3-10
- Task 12 依赖 Task 2 和 Task 11
