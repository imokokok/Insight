# Checklist

## Task 1: 启用 Risk Tab

- [x] page.tsx 中添加 `activeTab === 'risk'` 条件渲染
- [x] useWINkLinkData.ts 中添加 `useWINkLinkRiskMetrics` hook
- [x] page.tsx 中导入并使用 WINkLinkRiskPanel
- [x] Risk Panel 正常显示数据质量评分
- [x] Risk Panel 正常显示价格偏差
- [x] Risk Panel 正常显示节点集中度风险
- [x] Risk Panel 正常显示正常运行时间风险

## Task 2: 添加跨预言机对比 Tab

- [x] oracles.tsx 中添加 `{ id: 'cross-oracle', labelKey: 'winklink.tabs.crossOracle' }`
- [x] page.tsx 中添加 `activeTab === 'cross-oracle'` 条件渲染
- [x] 跨预言机对比组件正常显示
- [x] 对比数据包含价格对比
- [x] 对比数据包含响应时间对比
- [x] 对比数据包含节点数量对比

## Task 3: 添加 Tab 专属图标

- [x] TabNavigation.tsx 中 `getTabIcon` 函数添加 `tron` case
- [x] TabNavigation.tsx 中 `getTabIcon` 函数添加 `gaming` case
- [x] tron Tab 显示 TRON 网络图标
- [x] gaming Tab 显示游戏手柄图标

## Task 4: 增强统计数据展示

- [x] page.tsx 统计卡片包含 VRF 日请求数
- [x] page.tsx 统计卡片包含游戏交易量
- [x] page.tsx 统计卡片包含活跃游戏数
- [x] 统计卡片布局合理，响应式正常

## Task 5: 添加国际化支持

- [x] zh-CN.json 中添加 `winklink.tabs.crossOracle` 翻译
- [x] en.json 中添加 `winklink.tabs.crossOracle` 翻译
- [x] zh-CN.json 中添加新的统计指标翻译
- [x] en.json 中添加新的统计指标翻译

## 最终验证

- [x] 所有 7 个 Tabs 正常显示和切换
- [x] Risk Tab 显示风险评估数据
- [x] Cross-Oracle Tab 显示对比数据
- [x] 所有 Tab 都有专属图标
- [x] 统计卡片展示 VRF 和游戏特色指标
- [x] 页面无报错，功能正常
