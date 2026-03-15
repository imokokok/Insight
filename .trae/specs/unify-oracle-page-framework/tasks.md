# Tasks

## Phase 1: 基础组件统一

- [x] Task 1: 创建统一的 LoadingState 组件
  - [x] SubTask 1.1: 在 `/src/components/oracle/common/` 创建 `LoadingState.tsx`
  - [x] SubTask 1.2: 支持可配置的主题色（根据预言机品牌色）
  - [x] SubTask 1.3: 支持 i18n 加载文字

- [x] Task 2: 创建统一的 ErrorFallback 组件
  - [x] SubTask 2.1: 在 `/src/components/oracle/common/` 创建 `ErrorFallback.tsx`
  - [x] SubTask 2.2: 支持错误信息显示
  - [x] SubTask 2.3: 支持重试按钮和回调
  - [x] SubTask 2.4: 支持可配置的主题色

- [x] Task 3: 扩展 OracleConfig 类型定义
  - [x] SubTask 3.1: 在 `/src/lib/config/oracles.tsx` 添加 `OracleTab` 接口
  - [x] SubTask 3.2: 扩展 `OracleConfig` 接口，添加 `tabs` 和 `themeColor` 字段
  - [x] SubTask 3.3: 更新所有预言机配置，添加 tabs 配置

## Phase 2: OraclePageTemplate 重构

- [ ] Task 4: 重构 OraclePageTemplate 组件
  - [ ] SubTask 4.1: 添加对 customTabs 的支持
  - [ ] SubTask 4.2: 添加对 customPanels 的支持
  - [ ] SubTask 4.3: 集成统一的 LoadingState 和 ErrorFallback
  - [ ] SubTask 4.4: 统一统计卡片展示逻辑
  - [ ] SubTask 4.5: 保持向后兼容性

- [ ] Task 5: 更新 TabNavigation 组件
  - [ ] SubTask 5.1: 支持从 OracleConfig 读取 tabs 配置
  - [ ] SubTask 5.2: 统一标签页样式（使用 config.themeColor）

## Phase 3: 页面迁移

- [ ] Task 6: 迁移 API3 页面
  - [x] SubTask 6.1: 更新 `/src/lib/config/oracles.tsx` 中 API3 的 tabs 配置
  - [ ] SubTask 6.2: 创建 API3 专属面板组件映射
  - [ ] SubTask 6.3: 简化 `/src/app/api3/page.tsx` 使用 OraclePageTemplate
  - [ ] SubTask 6.4: 删除 `/src/app/api3/API3PageContent.tsx`

- [ ] Task 7: 迁移 Tellor 页面
  - [x] SubTask 7.1: 更新 `/src/lib/config/oracles.tsx` 中 Tellor 的 tabs 配置
  - [ ] SubTask 7.2: 创建 Tellor 专属面板组件映射
  - [ ] SubTask 7.3: 简化 `/src/app/tellor/page.tsx` 使用 OraclePageTemplate
  - [ ] SubTask 7.4: 删除 `/src/app/tellor/TellorPageContent.tsx`

- [ ] Task 8: 迁移 DIA 页面
  - [x] SubTask 8.1: 更新 `/src/lib/config/oracles.tsx` 中 DIA 的 tabs 配置
  - [ ] SubTask 8.2: 创建 DIA 专属面板组件映射
  - [ ] SubTask 8.3: 简化 `/src/app/dia/page.tsx` 使用 OraclePageTemplate
  - [ ] SubTask 8.4: 删除 `/src/app/dia/DIAPageContent.tsx`

- [ ] Task 9: 迁移 Chronicle 页面
  - [x] SubTask 9.1: 更新 `/src/lib/config/oracles.tsx` 中 Chronicle 的 tabs 配置
  - [ ] SubTask 9.2: 创建 Chronicle 专属面板组件映射
  - [ ] SubTask 9.3: 简化 `/src/app/chronicle/page.tsx` 使用 OraclePageTemplate
  - [ ] SubTask 9.4: 删除 `/src/app/chronicle/ChroniclePageContent.tsx`

- [ ] Task 10: 迁移 WINkLink 页面
  - [x] SubTask 10.1: 更新 `/src/lib/config/oracles.tsx` 中 WINkLink 的 tabs 配置
  - [ ] SubTask 10.2: 创建 WINkLink 专属面板组件映射
  - [ ] SubTask 10.3: 简化 `/src/app/winklink/page.tsx` 使用 OraclePageTemplate
  - [ ] SubTask 10.4: 删除 `/src/app/winklink/WINkLinkPageContent.tsx`

- [ ] Task 11: 迁移 RedStone 页面
  - [x] SubTask 11.1: 更新 `/src/lib/config/oracles.tsx` 中 RedStone 的 tabs 配置
  - [ ] SubTask 11.2: 简化 `/src/app/redstone/page.tsx` 使用 OraclePageTemplate

## Phase 4: 验证和优化

- [ ] Task 12: 验证所有页面正常加载
  - [ ] SubTask 12.1: 测试 Chainlink 页面
  - [ ] SubTask 12.2: 测试 Pyth 页面
  - [ ] SubTask 12.3: 测试 UMA 页面
  - [ ] SubTask 12.4: 测试 Band Protocol 页面
  - [ ] SubTask 12.5: 测试 API3 页面
  - [ ] SubTask 12.6: 测试 Tellor 页面
  - [ ] SubTask 12.7: 测试 DIA 页面
  - [ ] SubTask 12.8: 测试 Chronicle 页面
  - [ ] SubTask 12.9: 测试 WINkLink 页面
  - [ ] SubTask 12.10: 测试 RedStone 页面

- [ ] Task 13: 验证独特功能面板正常显示
  - [ ] SubTask 13.1: 验证 API3 的 Airnode 面板
  - [ ] SubTask 13.2: 验证 Tellor 的 Price Stream 面板
  - [ ] SubTask 13.3: 验证 DIA 的 Transparency 面板
  - [ ] SubTask 13.4: 验证 Chronicle 的 Scuttlebutt 面板
  - [ ] SubTask 13.5: 验证 WINkLink 的 Gaming 面板

- [ ] Task 14: 代码清理
  - [ ] SubTask 14.1: 删除未使用的导入
  - [ ] SubTask 14.2: 优化重复代码
  - [ ] SubTask 14.3: 运行 lint 检查

# Task Dependencies
- Task 2 depends on Task 1
- Task 4 depends on Task 1, Task 2, Task 3
- Task 5 depends on Task 3
- Task 6-11 depend on Task 4, Task 5
- Task 12-14 depend on Task 6-11
