# Cross-Oracle Comparison Page Enhancements - Product Requirement Document

## Overview
- **Summary**: 优化跨预言机比较页面的布局，添加实用的数据分析功能，使页面更直观易用，同时保持代码简洁和易于实现。
- **Purpose**: 解决当前页面功能简单和布局不够优化的问题，提供实用的数据分析功能，改善用户体验，不添加过度复杂的功能。
- **Target Users**: Web3开发者、DeFi分析师、预言机用户

## Goals
- 优化页面整体布局，使信息组织更合理
- 添加价格差异显示，直观展示不同预言机之间的价格偏差
- 增加关键统计概览，提供快速参考数据
- 优化表格展示，支持简单的排序功能
- 改善响应式布局，在各种屏幕尺寸下都有良好体验

## Non-Goals (Out of Scope)
- 不添加实时数据流或自动刷新功能
- 不添加用户账户或个人收藏功能
- 不添加复杂的统计计算（如标准偏差）
- 不添加新的图表类型（除了现有折线图）
- 不添加API导出功能
- 不添加复杂的时间范围选择

## Background & Context
- 当前项目使用 Next.js 16、Tailwind CSS、Recharts 和 Supabase 构建
- 已有5个预言机集成：Chainlink、Band Protocol、UMA、Pyth Network、API3
- 支持4个交易对：BTC/USD、ETH/USD、SOL/USD、AVAX/USD
- 当前页面功能：价格表格、24小时折线图、基本筛选
- 用户希望在保持简洁的同时，优化布局和添加实用功能

## Functional Requirements
- **FR-1**: 优化页面整体布局，重新组织组件顺序和间距
- **FR-2**: 添加价格差异计算，显示每个预言机价格相对于平均价格的偏差百分比
- **FR-3**: 添加3个关键统计卡片：平均价格、最高/最低价格、价格区间
- **FR-4**: 优化价格表格，支持按价格和时间戳排序
- **FR-5**: 改进响应式设计，确保在移动端、平板和桌面端都有良好体验
- **FR-6**: 优化筛选区域布局，使符号和预言机选择更紧凑高效

## Non-Functional Requirements
- **NFR-1**: 页面加载时间与现有保持一致
- **NFR-2**: 所有功能必须易于实现，代码复杂度低
- **NFR-3**: 保持与现有设计风格一致，使用相同的配色方案
- **NFR-4**: 确保在预言机数据缺失时有优雅的降级处理

## Constraints
- **Technical**: 必须使用现有的技术栈（Next.js、Tailwind CSS、Recharts）
- **Business**: 不能改变现有的预言机客户端API接口
- **Dependencies**: 依赖现有的预言机数据获取逻辑和国际化支持

## Assumptions
- 现有的预言机客户端能够提供足够的数据
- 用户对基本的统计概念（如平均值）有一定了解
- 现有24小时时间范围对于大多数用户已经足够

## Acceptance Criteria

### AC-1: 页面布局优化
- **Given**: 用户访问跨预言机比较页面
- **When**: 页面加载完成
- **Then**: 页面组件按合理顺序排列，间距适中，视觉层次清晰
- **Verification**: `human-judgment`

### AC-2: 价格差异显示
- **Given**: 用户选择了至少2个预言机进行比较
- **When**: 页面加载或刷新数据后
- **Then**: 表格中显示每个预言机价格相对于平均价格的偏差百分比，正偏差用绿色显示，负偏差用红色显示
- **Verification**: `programmatic`

### AC-3: 关键统计卡片
- **Given**: 用户选择了至少1个交易对和至少2个预言机
- **When**: 数据加载完成后
- **Then**: 页面显示3个统计卡片：平均价格、最高价格/最低价格、价格区间
- **Verification**: `programmatic`

### AC-4: 表格排序功能
- **Given**: 用户在查看价格比较表格
- **When**: 用户点击价格或时间戳列标题
- **Then**: 表格按该列排序，点击同一列切换升序/降序
- **Verification**: `programmatic`

### AC-5: 响应式布局优化
- **Given**: 用户在不同设备上访问页面
- **When**: 屏幕尺寸变化（移动端、平板、桌面端）
- **Then**: 所有组件都能正确布局和显示，交互流畅
- **Verification**: `human-judgment`

### AC-6: 筛选区域优化
- **Given**: 用户在选择交易对和预言机
- **When**: 查看筛选区域
- **Then**: 符号选择和预言机选择布局紧凑高效，易于使用
- **Verification**: `human-judgment`

## Open Questions
- [ ] 统计卡片是否需要放在页面最顶部？
