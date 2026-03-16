# 跨链比较页面UX优化 Spec

## Why

跨链比较页面目前一次性展示了大量功能模块（筛选器、热力图、统计数据、价格分布、对比表格、相关性矩阵、滚动相关性、协整分析、稳定性分析、交互式价格图表等），导致：

1. 页面过长，用户需要大量滚动才能看到全部内容
2. 信息过载，新用户可能感到困惑不知从何看起
3. 某些高级功能（如协整分析、波动率曲面）并非所有用户都需要
4. 页面加载和渲染性能可能受影响

## What Changes

- **新增**: 模块分组标签页系统，将功能按逻辑分组展示
- **新增**: 默认折叠高级分析模块，用户可手动展开
- **新增**: 快速导航栏，方便用户跳转到特定模块
- **优化**: 统计卡片默认收起，点击展开详情
- **优化**: 价格分布直方图和箱线图合并为可切换视图

## Impact

- Affected specs: 跨链比较页面用户体验
- Affected code:
  - `src/app/cross-chain/page.tsx`
  - `src/app/cross-chain/components/CrossChainFilters.tsx`
  - 新增组件文件

## ADDED Requirements

### Requirement: 模块分组标签页系统

The system SHALL provide a tab-based navigation system to organize cross-chain comparison features into logical groups.

#### Scenario: 标签页切换

- **GIVEN** 用户在跨链比较页面
- **WHEN** 页面加载时
- **THEN** 默认显示"概览"标签页，包含核心统计和基础图表
- **AND** 提供以下标签页选项：
  - 概览（Overview）：核心统计、价格对比表、基础热力图
  - 相关性分析（Correlation）：相关性矩阵、滚动相关性
  - 高级分析（Advanced）：协整分析、波动率分析
  - 价格图表（Charts）：交互式价格图表、价格分布

### Requirement: 高级模块默认折叠

The system SHALL collapse advanced analysis modules by default to reduce initial cognitive load.

#### Scenario: 展开高级功能

- **GIVEN** 用户位于"高级分析"标签页
- **WHEN** 页面加载时
- **THEN** 协整分析和波动率曲面模块默认折叠
- **AND** 显示模块标题和简要描述
- **AND** 提供展开/折叠按钮

### Requirement: 统计卡片优化

The system SHALL optimize the statistics grid display to be more compact and expandable.

#### Scenario: 收起/展开统计详情

- **GIVEN** 用户位于"概览"标签页
- **WHEN** 页面加载时
- **THEN** 默认显示精简版统计（仅显示6个核心指标）
- **AND** 提供"查看全部"按钮展开完整统计
- **AND** 再次点击可收起

### Requirement: 快速导航栏

The system SHALL provide a quick navigation bar for easy access to different sections.

#### Scenario: 快速跳转

- **GIVEN** 用户在跨链比较页面任意位置
- **WHEN** 滚动页面时
- **THEN** 显示浮动导航栏
- **AND** 点击导航项可平滑滚动到对应模块
