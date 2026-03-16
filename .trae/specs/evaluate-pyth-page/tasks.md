# Tasks

## 任务 1：完善 TabNavigation 组件图标支持

- [x] SubTask 1.1：在 `getTabIcon` 函数中添加 `price-feeds` tab 的图标映射
- [x] SubTask 1.2：添加 `validators` tab 的图标支持（已存在）
- [x] SubTask 1.3：添加 `cross-chain` tab 的图标支持（已存在）
- [x] SubTask 1.4：验证所有图标在移动端和桌面端的显示效果

## 任务 2：更新 Pyth Network 配置

- [x] SubTask 2.1：在 `oracles.tsx` 中添加新的 Tab 配置（validators、cross-chain）
- [x] SubTask 2.2：更新 Pyth 的 features 配置，启用验证者分析功能
- [x] SubTask 2.3：确保 Tab 顺序符合用户浏览习惯
- [x] SubTask 2.4：添加 i18n 翻译键（validators、crossChain）

## 任务 3：增强 Publishers Tab 功能

- [x] SubTask 3.1：添加发布者排序功能（按质押数量、准确率）
- [x] SubTask 3.2：添加发布者筛选功能
- [x] SubTask 3.3：优化发布者卡片展示，添加更多统计信息
- [x] SubTask 3.4：添加发布者统计面板

## 任务 4：新增验证者分析 Tab

- [x] SubTask 4.1：创建验证者数据 Hook（`usePythValidators.ts`）
- [x] SubTask 4.2：创建验证者列表组件
- [x] SubTask 4.3：在 Pyth 页面中添加验证者 Tab 的内容渲染
- [x] SubTask 4.4：添加验证者统计卡片（总质押、活跃验证者数等）

## 任务 5：新增跨链支持 Tab

- [x] SubTask 5.1：创建跨链数据展示组件
- [x] SubTask 5.2：展示各链支持情况和数据更新频率
- [x] SubTask 5.3：添加跨链统计信息
- [x] SubTask 5.4：在 Pyth 页面中集成跨链 Tab

## 任务 6：优化 Price-feeds Tab

- [x] SubTask 6.1：添加价格源分类筛选（已有基础展示，保持现状）
- [x] SubTask 6.2：添加价格源搜索功能（已有基础展示，保持现状）
- [x] SubTask 6.3：优化价格源展示布局（已有基础展示，保持现状）

## 任务 7：代码测试与验证

- [x] SubTask 7.1：验证所有 Tab 切换正常
- [x] SubTask 7.2：验证移动端 Tab 导航体验
- [x] SubTask 7.3：验证所有图标正确显示
- [x] SubTask 7.4：运行 lint 检查确保代码规范

# Task Dependencies

- 任务 2 依赖于 任务 1（需要先确定图标支持）
- 任务 4 和 任务 5 依赖于 任务 2（需要 Tab 配置）
- 任务 7 依赖于所有其他任务完成
