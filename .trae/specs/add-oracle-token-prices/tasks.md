# Tasks

- [x] Task 1: 创建 OracleTokenPrices 组件
  - [x] SubTask 1.1: 创建组件文件 `src/app/[locale]/market-overview/components/OracleTokenPrices.tsx`
  - [x] SubTask 1.2: 定义组件 Props 接口，接收价格数据和加载状态
  - [x] SubTask 1.3: 实现价格卡片 UI，包含代币Logo、符号、价格、涨跌幅
  - [x] SubTask 1.4: 实现响应式布局（桌面端横向排列，移动端横向滚动）
  - [x] SubTask 1.5: 添加加载状态骨架屏

- [x] Task 2: 创建价格数据 Hook
  - [x] SubTask 2.1: 创建 `useOracleTokenPrices.ts` hook 文件
  - [x] SubTask 2.2: 集成 `binanceMarketService.getMultipleTokensMarketData` 获取价格
  - [x] SubTask 2.3: 实现自动刷新逻辑（默认30秒间隔）
  - [x] SubTask 2.4: 实现错误处理和重试机制
  - [x] SubTask 2.5: 返回价格数据、加载状态、错误状态、最后更新时间

- [x] Task 3: 定义类型和常量
  - [x] SubTask 3.1: 在 `types/oracle.ts` 添加 `OracleTokenPrice` 类型定义
  - [x] SubTask 3.2: 创建常量文件定义9个预言机代币映射（符号、名称、Logo路径）

- [x] Task 4: 集成到市场概览页面
  - [x] SubTask 4.1: 在 `useMarketOverviewData.ts` 中调用 price hook
  - [x] SubTask 4.2: 在 `page.tsx` 中添加 OracleTokenPrices 组件
  - [x] SubTask 4.3: 将价格数据传递给组件

- [x] Task 5: 添加国际化支持
  - [x] SubTask 5.1: 在 `zh-CN/marketOverview.json` 添加价格相关文案
  - [x] SubTask 5.2: 在 `en/marketOverview.json` 添加价格相关文案
  - [x] SubTask 5.3: 组件中使用翻译函数

- [x] Task 6: 样式和交互优化
  - [x] SubTask 6.1: 根据涨跌设置卡片边框颜色（涨绿色/跌红色）
  - [x] SubTask 6.2: 添加悬停效果显示更多信息（24h最高/最低价）
  - [x] SubTask 6.3: 添加价格刷新动画指示器

# Task Dependencies

- Task 3 需要在 Task 1 之前完成（类型定义）
- Task 2 需要在 Task 1 之前完成（Hook 提供数据）
- Task 4 依赖 Task 1 和 Task 2
- Task 5 和 Task 6 可以并行执行
