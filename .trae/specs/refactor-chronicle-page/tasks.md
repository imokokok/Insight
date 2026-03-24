# Chronicle 页面重构任务列表

## 任务依赖关系
- Task 1 (类型定义) 是所有其他任务的基础
- Task 2 (Hook) 依赖 Task 1
- Task 3-9 (视图组件) 可以并行执行，都依赖 Task 1 和 Task 2
- Task 10 (侧边栏) 依赖 Task 1
- Task 11 (主页面) 依赖所有其他任务

## 任务列表

- [x] **Task 1: 创建类型定义文件**
  - [x] 创建 `src/app/[locale]/chronicle/types.ts`
  - [x] 定义 `ChronicleTabId` 类型（market, network, validators, makerdao, scuttlebutt, cross-oracle, risk）
  - [x] 定义 `ChroniclePageState` 接口
  - [x] 定义 `ChroniclePageActions` 接口
  - [x] 定义 `ChronicleSidebarProps` 接口
  - [x] 定义各个 View 组件的 Props 接口
  - [x] 定义 `NetworkStats`、`ValidatorData` 等数据接口

- [x] **Task 2: 创建页面逻辑 Hook**
  - [x] 创建 `src/app/[locale]/chronicle/hooks/useChroniclePage.ts`
  - [x] 导入并使用 `useChronicleAllData` hook
  - [x] 管理 `activeTab` 状态
  - [x] 实现 `refresh` 和 `exportData` 功能
  - [x] 返回所有必要的状态和方法

- [x] **Task 3: 创建 Market View 组件**
  - [x] 创建 `src/app/[locale]/chronicle/components/ChronicleMarketView.tsx`
  - [x] 显示价格趋势图表（占 2/3 宽度）
  - [x] 显示快速统计数据（市值、24h 交易量、流通供应量、质押 APR）
  - [x] 显示网络状态指标（验证者数量、数据喂价数量、响应时间、成功率）
  - [x] 显示数据源状态
  - [x] 参考 ChainlinkMarketView 的布局和样式

- [x] **Task