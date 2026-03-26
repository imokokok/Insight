# 大文件拆分任务列表

## 任务1: 拆分 ComparisonTabs 组件

- [x] 创建 tabs/ 目录结构
  - [x] 创建 `app/[locale]/cross-oracle/components/tabs/` 目录
  - [x] 创建 `tabs/index.ts` 导出文件
- [x] 创建 OverviewTab 组件
  - [x] 从 ComparisonTabs 提取 `renderOverviewTab` 逻辑
  - [x] 创建 `OverviewTab.tsx` 文件
  - [x] 定义组件 Props 接口
  - [x] 迁移 StatsSection 和 PriceTableSection 调用
- [x] 创建 AnalysisTab 组件
  - [x] 从 ComparisonTabs 提取 `renderAnalysisTab` 逻辑
  - [x] 创建 `AnalysisTab.tsx` 文件
  - [x] 定义组件 Props 接口
  - [x] 迁移所有分析图表组件调用
- [x] 创建 ChainsTab 组件
  - [x] 从 ComparisonTabs 提取 `renderChainsTab` 逻辑
  - [x] 创建 `ChainsTab.tsx` 文件
  - [x] 定义组件 Props 接口
- [x] 创建 HistoryTab 组件
  - [x] 从 ComparisonTabs 提取 `renderHistoryTab` 逻辑
  - [x] 创建 `HistoryTab.tsx` 文件
  - [x] 定义组件 Props 接口
- [x] 重构 ComparisonTabs.tsx
  - [x] 导入新的 Tab 组件
  - [x] 简化 `renderTabContent` 函数
  - [x] 精简 Props 接口（移除已传递给 Tab 组件的详细 props）
  - [x] 确保 TypeScript 类型检查通过

## 任务2: 简化 oraclePanels 配置

- [ ] 创建 utils/ 目录和共享工具函数
  - [ ] 创建 `components/oracle/common/oraclePanels/utils/` 目录
  - [ ] 创建 `renderUtils.tsx` - 通用渲染工具
    - [ ] 提取 `renderStatsGrid` 函数
    - [ ] 提取 `renderKPICards` 函数
    - [ ] 提取 `renderChartSection` 函数
  - [ ] 创建 `statsUtils.ts` - 统计指标生成工具
    - [ ] 提取通用的 stats 数组生成逻辑
    - [ ] 提取 KPI 数据计算逻辑
  - [ ] 创建 `chartUtils.ts` - 图表配置生成工具
    - [ ] 提取通用的图表配置生成逻辑
- [ ] 简化 ChainlinkPanelConfig.tsx
  - [ ] 使用共享工具函数替换重复代码
  - [ ] 保留差异化配置
- [ ] 简化 PythPanelConfig.tsx
  - [ ] 使用共享工具函数替换重复代码
  - [ ] 保留差异化配置
- [ ] 简化其他面板配置文件
  - [ ] API3PanelConfig.tsx
  - [ ] TellorPanelConfig.tsx
  - [ ] BandProtocolPanelConfig.tsx
  - [ ] UMAPanelConfig.tsx
  - [ ] DIAPanelConfig.tsx
  - [ ] ChroniclePanelConfig.tsx
  - [ ] RedStonePanelConfig.tsx
  - [ ] WINkLinkPanelConfig.tsx

## 任务3: 提取通用 Hooks

- [ ] 创建 useClickOutside hook
  - [ ] 从 useCrossOraclePage 提取点击外部关闭逻辑
  - [ ] 创建 `hooks/useClickOutside.ts` 文件
  - [ ] 支持多个 ref 的监听
- [ ] 创建 useKeyboardNavigation hook
  - [ ] 从 useCrossOraclePage 提取键盘导航逻辑
  - [ ] 创建 `app/[locale]/cross-oracle/hooks/useKeyboardNavigation.ts`
  - [ ] 支持上下箭头和 Enter/Escape 键
- [ ] 重构 useCrossOraclePage.ts
  - [ ] 使用新的 useClickOutside hook
  - [ ] 使用新的 useKeyboardNavigation hook
  - [ ] 移除重复代码
  - [ ] 确保功能保持不变

## 任务4: 验证和测试

- [x] 运行 TypeScript 类型检查
  - [x] 修复所有类型错误
- [x] 构建项目
  - [x] 确保无构建错误
- [x] 功能测试
  - [x] 测试所有 Tab 正常显示
  - [x] 测试 Tab 切换功能
- [x] 代码质量检查
  - [x] 确保 ComparisonTabs 行数 < 150
  - [x] 检查无重复代码

# 任务依赖关系

- 任务1 可以独立执行
- 任务2 可以独立执行
- 任务3 依赖于 useCrossOraclePage 的现有代码
- 任务4 依赖于所有前置任务
