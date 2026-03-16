# 背景色一致性优化 - Product Requirement Document

## Overview
- **Summary**: 优化预言机数据分析平台的背景色设计，解决不同页面背景色不一致的问题，统一采用 Dune 风格的扁平化设计，提升整体设计融合度。
- **Purpose**: 确保整个平台的视觉一致性，提升用户体验，使页面看起来更加专业和统一。
- **Target Users**: 所有使用该预言机数据分析平台的用户。

## Goals
- 统一所有页面的背景色，采用一致的 Dune 风格设计
- 确保背景色与项目的整体设计风格高度融合
- 提升用户界面的专业感和一致性
- 解决当前首页和市场概览页面背景色不一致的问题

## Non-Goals (Out of Scope)
- 不更改内容区域内的组件配色方案
- 不重构整个应用的布局结构
- 不添加新功能，只优化现有视觉设计

## Background & Context
当前项目存在以下背景色不一致的问题：
1. 首页使用纯白色背景 `bg-white` (#ffffff)
2. 市场概览页面使用浅灰色背景 `bg-gray-50` (#f9fafb)
3. 布局文件中的 main 标签使用 `bg-gray-50`
4. CSS 中已定义了 Dune 风格背景色变量 `--bg-dune: #FAFAFA`，但未被统一使用
5. 不同页面使用不同背景色，导致视觉体验不连贯

## Functional Requirements
- **FR-1**: 统一所有页面的主背景色为 Dune 风格的浅灰色 (#FAFAFA)
- **FR-2**: 确保 CSS 变量定义与实际使用保持一致
- **FR-3**: 更新所有相关页面组件，使用统一的背景色类
- **FR-4**: 保持卡片和组件的现有配色方案不变

## Non-Functional Requirements
- **NFR-1**: 视觉一致性提升：所有页面应具有统一的背景色和视觉风格
- **NFR-2**: 可访问性：确保背景色与文本色的对比度符合 WCAG 标准
- **NFR-3**: 性能：不应引入任何性能问题

## Constraints
- **Technical**: 使用 Next.js + Tailwind CSS 技术栈
- **Business**: 需要在保持现有功能不变的前提下进行
- **Dependencies**: 依赖现有的 Tailwind CSS 配置和自定义变量

## Assumptions
- 所有页面都应该使用相同的主背景色
- Dune 风格的浅灰色 (#FAFAFA) 是最适合的选择
- 现有组件和卡片的配色方案不需要调整

## Acceptance Criteria

### AC-1: 首页背景色统一
- **Given**: 用户访问首页
- **When**: 页面加载完成
- **Then**: 首页背景色应为 Dune 风格的浅灰色 (#FAFAFA)
- **Verification**: `programmatic`

### AC-2: 市场概览页面背景色统一
- **Given**: 用户访问市场概览页面
- **When**: 页面加载完成
- **Then**: 市场概览页面背景色应与首页保持一致，使用 #FAFAFA
- **Verification**: `programmatic`

### AC-3: CSS 变量正确配置
- **Given**: 查看全局样式文件
- **When**: 检查背景色相关变量
- **Then**: `--bg-dune` 变量应设置为 #FAFAFA 并被正确使用
- **Verification**: `programmatic`

### AC-4: 布局文件背景色统一
- **Given**: 查看根布局组件
- **When**: 检查 main 标签的背景色类
- **Then**: 应使用统一的 Dune 风格背景色类
- **Verification**: `programmatic`

### AC-5: 视觉一致性检查
- **Given**: 在浏览器中查看多个页面
- **When**: 切换不同页面
- **Then**: 所有页面的背景色应视觉上一致，无明显差异
- **Verification**: `human-judgment`

## Open Questions
- 无
