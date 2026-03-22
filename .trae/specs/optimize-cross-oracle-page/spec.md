# 多预言机比较分析页面优化规格文档

## Why
当前多预言机比较分析页面存在以下设计问题：
1. 内边距过小（px-3 py-3），导致页面过于拥挤，不符合价格查询页面的设计标准（px-4 sm:px-6 lg:px-8 py-6）
2. 功能重复：HeaderSection 和 PriceTableSection 都有预言机选择器，造成用户困惑
3. 筛选功能分散：FilterPanel 和 HeaderSection 的按钮组功能有重叠
4. 缺少统一的控制面板，用户需要在多个地方进行操作
5. 页面信息架构不够清晰，核心功能不够突出

## What Changes
- **调整内边距**: 从 px-3 py-3 改为 px-4 sm:px-6 lg:px-8 py-6，与价格查询页面保持一致
- **整合预言机选择器**: 移除 HeaderSection 中的重复选择器，只在 PriceTableSection 保留
- **重构 HeaderSection**: 简化头部区域，移除冗余功能，突出核心操作
- **优化 FilterPanel**: 整合时间范围、偏差筛选、预言机筛选到一个统一面板
- **统一控制面板**: 在左侧边栏创建统一的查询控制面板（参考价格查询页面设计）
- **优化布局结构**: 采用左右分栏布局，左侧控制面板 + 右侧内容区域

## Impact
- 受影响文件: 
  - src/app/[locale]/cross-oracle/page.tsx
  - src/app/[locale]/cross-oracle/components/HeaderSection.tsx
  - src/app/[locale]/cross-oracle/components/FilterPanel.tsx
  - src/app/[locale]/cross-oracle/components/PriceTableSection.tsx
  - src/app/[locale]/cross-oracle/components/ComparisonTabs.tsx
- 新增组件: ControlPanel（统一控制面板）

## ADDED Requirements

### Requirement: ControlPanel 统一控制面板
The system SHALL provide a unified control panel on the left sidebar.

#### Scenario: 统一查询控制
- **WHEN** 用户访问页面
- **THEN** 左侧显示统一控制面板
- **AND** 面板包含：交易对选择、预言机多选、时间范围、偏差筛选
- **AND** 查询按钮突出显示

#### Scenario: 响应式适配
- **WHEN** 在移动端访问
- **THEN** 控制面板折叠或移至顶部
- **AND** 所有功能仍然可访问

## MODIFIED Requirements

### Requirement: 页面内边距调整
**修改内容**:
- 页面容器内边距从 `px-3 py-3` 改为 `px-4 sm:px-6 lg:px-8 py-6`
- 组件间距从 `space-y-3` 改为 `space-y-6`
- 卡片内边距从 `p-3` 改为 `p-4`

### Requirement: HeaderSection 简化
**现有功能保留**:
- 面包屑导航
- 页面标题和描述
- 刷新按钮
- 收藏功能
- 最后更新时间

**移除功能**:
- 交易对选择器（移至 ControlPanel）
- FilterPanel 按钮（移至 ControlPanel）
- 色盲模式切换（移至 ControlPanel 或页面设置）

**优化内容**:
- 简化按钮组，只保留核心操作
- 优化布局，减少视觉噪音

### Requirement: FilterPanel 整合
**现有功能保留**:
- 时间范围选择
- 偏差筛选
- 预言机筛选

**整合方式**:
- 将 FilterPanel 功能整合到 ControlPanel
- 移除独立的 FilterPanel 弹窗
- 使用更直观的表单控件

### Requirement: PriceTableSection 优化
**现有功能保留**:
- 价格表格显示
- 预言机选择器（保留，但样式优化）
- 排序功能
- 展开详情

**优化内容**:
- 预言机选择器改为更紧凑的样式
- 移除重复的功能按钮
- 与 ControlPanel 的选择状态同步

### Requirement: ComparisonTabs 布局优化
**优化内容**:
- 采用左右分栏布局
- 左侧：ControlPanel（固定宽度 400px）
- 右侧：标签内容区域（自适应）
- 标签导航保持在顶部

## REMOVED Requirements

### Requirement: HeaderSection 中的 PairSelector
**原因**: 功能重复，移至 ControlPanel 统一管理
**迁移**: 在 ControlPanel 中实现交易对选择

### Requirement: HeaderSection 中的 FilterPanel 按钮
**原因**: 筛选功能整合到 ControlPanel
**迁移**: 在 ControlPanel 中直接显示筛选选项

### Requirement: HeaderSection 中的色盲模式切换
**原因**: 减少头部视觉噪音，移至更合适的位置
**迁移**: 移至 ControlPanel 底部或页面设置

## 设计规范参考

### 布局规范（参考价格查询页面）
```
页面容器: max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6
组件间距: space-y-6
左侧边栏: xl:w-[400px] xl:flex-shrink-0
主内容区: flex-1 min-w-0
网格间距: gap-6
卡片内边距: p-4
```

### 响应式断点
```
移动端: < 768px (控制面板折叠)
平板端: 768px - 1023px (控制面板可折叠)
桌面端: >= 1024px (左右分栏)
```

## 文件结构变更
```
src/app/[locale]/cross-oracle/
├── page.tsx                          # 修改：调整布局和间距
├── components/
│   ├── HeaderSection.tsx             # 修改：简化功能
│   ├── ControlPanel.tsx              # 新增：统一控制面板
│   ├── FilterPanel.tsx               # 修改：整合到 ControlPanel
│   ├── PriceTableSection.tsx         # 修改：优化选择器样式
│   ├── ComparisonTabs.tsx            # 修改：左右分栏布局
│   └── ...                           # 其他组件保持不变
```

## 验收标准
- [ ] 页面内边距与价格查询页面一致
- [ ] HeaderSection 功能简化，无重复选择器
- [ ] ControlPanel 统一控制面板正常工作
- [ ] 左右分栏布局在桌面端正常显示
- [ ] 响应式布局在移动端正常适配
- [ ] 所有现有功能完整保留
- [ ] 用户体验提升，操作更直观
