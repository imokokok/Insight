# UMA 页面重构 - Product Requirement Document

## Overview
- **Summary**: 完整重构 UMA 预言机页面，采用更现代、专业的设计风格，减少卡片样式的使用，突出展示 UMA 预言机的核心特色。
- **Purpose**: 提升用户体验，让 UMA 预言机页面在视觉上更加美观和专业，更好地传达 UMA 的独特价值和技术特色。
- **Target Users**: 区块链开发者、预言机研究人员、DeFi 项目方、加密货币投资者和分析师。

## Goals
- 采用更高级、专业的页面设计风格
- 减少传统卡片样式，使用更现代的展示方式
- 突出展示 UMA 预言机的核心特色和优势
- 提升页面的视觉美感和用户体验
- 保持与项目整体设计风格的一致性

## Non-Goals (Out of Scope)
- 不修改 UMA 预言机的业务逻辑和数据获取方式
- 不添加新的功能模块
- 不修改其他预言机页面的设计
- 不重构项目的整体架构

## Background & Context
- 当前 UMA 页面使用基本的 Card 组件，设计风格较为传统
- 项目已有 AdvancedCard、AdvancedTable 等更高级的组件可以使用
- 其他预言机页面（如 Chainlink）有更丰富的设计元素可以参考
- 设计系统中已有金融主题的配色和样式可以使用

## Functional Requirements
- **FR-1**: 重新设计 UMA 页面的 Hero 区域，采用更专业的视觉呈现
- **FR-2**: 重新设计 UMA 特色功能展示区域，减少卡片样式
- **FR-3**: 重新设计价格数据展示区域，采用更现代的数据可视化方式
- **FR-4**: 添加 UMA 关键统计数据展示模块
- **FR-5**: 优化页面整体布局和间距

## Non-Functional Requirements
- **NFR-1**: 页面加载性能保持在当前水平或更好
- **NFR-2**: 响应式设计，在各种屏幕尺寸上显示良好
- **NFR-3**: 保持国际化支持（中英文）
- **NFR-4**: 符合项目现有的设计系统和风格规范

## Constraints
- **Technical**: 使用 Next.js、React、Tailwind CSS，遵循现有代码结构
- **Business**: 保持现有功能不变，只做 UI/UX 改进
- **Dependencies**: 复用现有组件（AdvancedCard、AdvancedTable 等）和样式

## Assumptions
- 当前 UMA 数据获取逻辑保持不变
- 翻译文件中已有足够的内容支持新的设计
- AdvancedCard、AdvancedTable 等高级组件可以正常使用

## Acceptance Criteria

### AC-1: Hero 区域重新设计
- **Given**: 用户访问 UMA 页面
- **When**: 页面加载完成
- **Then**: Hero 区域展示 UMA 品牌标识、标题、副标题，采用更现代的布局和视觉效果
- **Verification**: `human-judgment`

### AC-2: 特色功能展示优化
- **Given**: 用户访问 UMA 页面
- **When**: 滚动到特色功能区域
- **Then**: UMA 的四个核心功能以非卡片的现代方式展示，视觉层次清晰
- **Verification**: `human-judgment`

### AC-3: 统计数据展示
- **Given**: 用户访问 UMA 页面
- **When**: 页面加载完成
- **Then**: 展示 UMA 的关键统计数据，如支持链数、活跃合约数、总锁仓价值等
- **Verification**: `programmatic`

### AC-4: 价格数据展示优化
- **Given**: 用户访问 UMA 页面
- **When**: 查看价格数据区域
- **Then**: 价格数据和图表以更专业的方式展示，减少卡片使用
- **Verification**: `human-judgment`

### AC-5: 整体视觉提升
- **Given**: 用户访问 UMA 页面
- **When**: 浏览整个页面
- **Then**: 页面整体视觉风格更加专业、现代，与项目其他页面保持一致性
- **Verification**: `human-judgment`

## Open Questions
- [ ] 是否需要添加 UMA 品牌的 logo 或特定配色？
- [ ] 是否需要为 UMA 添加特定的统计数据？
