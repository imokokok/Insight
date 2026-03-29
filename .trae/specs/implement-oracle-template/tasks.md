# Tasks

## Phase 1: 核心基础设施

- [x] Task 1: 创建统一的 useOraclePage Hook
  - [x] SubTask 1.1: 创建 `/src/hooks/useOraclePage.ts` 文件
  - [x] SubTask 1.2: 定义统一的返回类型 `OraclePageData`
  - [x] SubTask 1.3: 实现通用的数据获取逻辑
  - [x] SubTask 1.4: 实现统一的错误处理和刷新机制
  - [x] SubTask 1.5: 支持预言机特定的数据获取扩展

- [x] Task 2: 扩展 OracleConfig 配置
  - [x] SubTask 2.1: 在 `oracles.tsx` 中添加 `viewComponents` 映射
  - [x] SubTask 2.2: 添加 `dataFetcher` 可选配置
  - [x] SubTask 2.3: 完善 `features` 配置与 Tab 的映射关系
  - [x] SubTask 2.4: 添加默认视图组件配置

## Phase 2: 通用组件

- [x] Task 3: 创建通用 OracleHero 组件
  - [x] SubTask 3.1: 创建 `/src/components/oracle/shared/OracleHero.tsx`
  - [x] SubTask 3.2: 支持主题色和图标配置
  - [x] SubTask 3.3: 支持价格和历史数据展示
  - [x] SubTask 3.4: 支持刷新和导出功能

- [x] Task 4: 创建通用 OracleSidebar 组件
  - [x] SubTask 4.1: 创建 `/src/components/oracle/shared/OracleSidebar.tsx`
  - [x] SubTask 4.2: 根据 `config.tabs` 动态渲染导航项
  - [x] SubTask 4.3: 支持主题色定制
  - [x] SubTask 4.4: 支持移动端响应式

- [x] Task 5: 创建通用 OracleContentView 组件
  - [x] SubTask 5.1: 创建 `/src/components/oracle/shared/OracleContentView.tsx`
  - [x] SubTask 5.2: 实现动态组件加载机制
  - [x] SubTask 5.3: 支持懒加载优化
  - [x] SubTask 5.4: 处理组件加载失败

## Phase 3: 模板重构

- [x] Task 6: 重构 OraclePageTemplate
  - [x] SubTask 6.1: 简化模板接口，接受 `provider` 参数
  - [x] SubTask 6.2: 集成 `useOraclePage` Hook
  - [x] SubTask 6.3: 使用通用 Hero、Sidebar、ContentView 组件
  - [x] SubTask 6.4: 统一处理加载和错误状态
  - [x] SubTask 6.5: 支持预言机特定组件覆盖

## Phase 4: 页面迁移

- [x] Task 7: 重构 Chainlink 页面
  - [x] SubTask 7.1: 简化 `chainlink/page.tsx` 使用新模板
  - [x] SubTask 7.2: 配置 Chainlink 特定组件映射
  - [x] SubTask 7.3: 测试所有 Tab 功能正常

- [x] Task 8: 重构 Pyth 页面
  - [x] SubTask 8.1: 简化 `pyth/page.tsx` 使用新模板
  - [x] SubTask 8.2: 配置 Pyth 特定组件映射
  - [x] SubTask 8.3: 测试所有 Tab 功能正常

- [x] Task 9: 重构 Band Protocol 页面
  - [x] SubTask 9.1: 简化 `band-protocol/page.tsx` 使用新模板
  - [x] SubTask 9.2: 配置 Band Protocol 特定组件映射
  - [x] SubTask 9.3: 测试所有 Tab 功能正常

- [x] Task 10: 重构 UMA 页面
  - [x] SubTask 10.1: 简化 `uma/page.tsx` 使用新模板
  - [x] SubTask 10.2: 配置 UMA 特定组件映射
  - [x] SubTask 10.3: 测试所有 Tab 功能正常

- [x] Task 11: 重构 API3 页面
  - [x] SubTask 11.1: 简化 `api3/page.tsx` 使用新模板
  - [x] SubTask 11.2: 配置 API3 特定组件映射
  - [x] SubTask 11.3: 测试所有 Tab 功能正常

- [x] Task 12: 重构 RedStone 页面
  - [x] SubTask 12.1: 简化 `redstone/page.tsx` 使用新模板
  - [x] SubTask 12.2: 配置 RedStone 特定组件映射
  - [x] SubTask 12.3: 测试所有 Tab 功能正常

- [x] Task 13: 重构 DIA 页面
  - [x] SubTask 13.1: 简化 `dia/page.tsx` 使用新模板
  - [x] SubTask 13.2: 配置 DIA 特定组件映射
  - [x] SubTask 13.3: 测试所有 Tab 功能正常

- [x] Task 14: 重构 Tellor 页面
  - [x] SubTask 14.1: 简化 `tellor/page.tsx` 使用新模板
  - [x] SubTask 14.2: 配置 Tellor 特定组件映射
  - [x] SubTask 14.3: 测试所有 Tab 功能正常

- [x] Task 15: 重构 Chronicle 页面
  - [x] SubTask 15.1: 简化 `chronicle/page.tsx` 使用新模板
  - [x] SubTask 15.2: 配置 Chronicle 特定组件映射
  - [x] SubTask 15.3: 测试所有 Tab 功能正常

- [x] Task 16: 重构 WINkLink 页面
  - [x] SubTask 16.1: 简化 `winklink/page.tsx` 使用新模板
  - [x] SubTask 16.2: 配置 WINkLink 特定组件映射
  - [x] SubTask 16.3: 测试所有 Tab 功能正常

## Phase 5: 清理和优化

- [x] Task 17: 清理冗余代码
  - [x] SubTask 17.1: 删除不再使用的独立 Hook 文件（保留特定数据获取逻辑）
  - [x] SubTask 17.2: 删除重复的组件文件（保留特定组件）
  - [x] SubTask 17.3: 更新导出索引文件

- [x] Task 18: 验证和测试
  - [x] SubTask 18.1: 验证所有预言机页面功能正常
  - [x] SubTask 18.2: 验证移动端响应式正常
  - [x] SubTask 18.3: 验证错误处理和加载状态
  - [x] SubTask 18.4: 验证刷新和导出功能

---

# Task Dependencies

- Task 2 depends on Task 1
- Task 3, Task 4, Task 5 can run in parallel
- Task 6 depends on Task 1, Task 2, Task 3, Task 4, Task 5
- Task 7-16 can run in parallel after Task 6
- Task 17 depends on Task 7-16
- Task 18 depends on Task 17
