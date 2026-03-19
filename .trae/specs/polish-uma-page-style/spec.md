# UMA 预言机页面样式优化 Spec

## Why

UMA 预言机页面目前功能完整，但在视觉一致性、信息层级和用户体验方面还有优化空间。基于现有 Dune 风格的扁平化设计语言，进行适度的样式优化，提升页面的专业感和可读性，同时保持不过度设计。

## What Changes

### 1. 卡片样式统一
- 统一所有 DashboardCard 的边框、间距和悬停效果
- 优化卡片标题样式，增强信息层级
- 添加微妙的过渡动画提升交互体验

### 2. 数据可视化优化
- 优化图表颜色使用，确保与 UMA 品牌色调一致
- 统一图表网格线和轴线样式
- 改进图例和提示框的视觉效果

### 3. 表格样式改进
- 统一表格头部和行的样式
- 优化排序和筛选控件的视觉反馈
- 改进分页组件的样式一致性

### 4. 状态指示器优化
- 统一健康/警告/危险状态的视觉表现
- 优化状态徽章的对比度和可读性
- 添加状态变化的过渡动画

### 5. 响应式布局微调
- 优化移动端下的卡片堆叠顺序
- 改进小屏幕下的数据展示方式
- 确保触控目标的合适大小

## Impact

- **受影响文件**:
  - `src/components/oracle/panels/UMADashboardPanel/index.tsx`
  - `src/components/oracle/panels/UMANetworkPanel/index.tsx`
  - `src/components/oracle/panels/UMAEcosystemPanel/index.tsx`
  - `src/components/oracle/panels/UMARiskPanel/index.tsx`
  - `src/components/oracle/panels/ValidatorAnalyticsPanel/index.tsx`
  - `src/components/oracle/panels/DisputeResolutionPanel.tsx`
  - `src/components/oracle/panels/DisputeVotingPanel.tsx`
  - `src/components/oracle/common/DashboardCard.tsx`

- **设计风格**: 保持现有 Dune 扁平化风格，不做颠覆性改变

## ADDED Requirements

### Requirement: 卡片样式统一

#### Scenario: DashboardCard 样式优化
- **WHEN** 用户浏览 UMA 页面时
- **THEN** 所有卡片应具有统一的边框、内边距和悬停效果
- **AND** 卡片标题应清晰可辨，与内容有明显区分

### Requirement: 数据可视化优化

#### Scenario: 图表样式统一
- **WHEN** 用户查看图表时
- **THEN** 图表应使用统一的配色方案
- **AND** 网格线和轴线样式应保持一致
- **AND** 提示框样式应清晰易读

### Requirement: 表格样式改进

#### Scenario: ValidatorTable 样式优化
- **WHEN** 用户查看验证者列表时
- **THEN** 表格头部应使用统一的背景色和文字样式
- **AND** 行悬停效果应一致
- **AND** 分页控件样式应统一

### Requirement: 状态指示器优化

#### Scenario: 状态徽章样式统一
- **WHEN** 用户查看网络状态或争议状态时
- **THEN** 健康/警告/危险状态应使用统一的视觉语言
- **AND** 状态变化应有平滑的过渡动画

## MODIFIED Requirements

无破坏性修改，所有变更均为样式层面的优化。

## REMOVED Requirements

无删除需求。
