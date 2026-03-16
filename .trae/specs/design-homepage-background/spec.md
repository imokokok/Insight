# 首页背景设计规格

## Why
首页已参照 Dune 风格改为扁平化设计，完全不使用卡片样式。当前纯白色背景显得过于空旷，缺乏视觉层次感。需要添加符合 Dune 风格的背景设计，增强页面的专业感和视觉吸引力，同时保持简洁扁平的设计风格。

## What Changes
- 添加 Hero 区域背景装饰（网格/点阵图案 + 渐变光晕）
- 添加分区域背景色区分（交替使用白色和极浅灰色）
- 添加微妙的动画效果增强活力
- 保持扁平化设计风格，不使用卡片阴影

## Impact
- Affected components: ProfessionalHero, BentoMetricsGrid, FeatureCards, LivePriceTicker, ProfessionalCTA
- Affected files: globals.css, page.tsx, home-components/*

## ADDED Requirements

### Requirement: Hero 区域背景
The system SHALL provide a visually appealing background for the Hero section that:
- 使用 SVG 网格/点阵图案作为背景装饰
- 添加柔和的渐变光晕效果（蓝色/紫色调）
- 保持扁平化风格，不使用阴影或卡片效果
- 响应式适配，在不同屏幕尺寸下正常显示

#### Scenario: Desktop view
- **WHEN** 用户在桌面端访问首页
- **THEN** Hero 区域显示完整的网格背景 + 渐变光晕效果

#### Scenario: Mobile view
- **WHEN** 用户在移动端访问首页
- **THEN** 背景自动简化，保持可读性和性能

### Requirement: 分区域背景色
The system SHALL use alternating background colors to distinguish sections:
- 白色背景 (#FFFFFF) 用于 Hero、FeatureCards、ProfessionalCTA
- 极浅灰色背景 (#F8FAFC 或 #F9FAFB) 用于 BentoMetricsGrid、LivePriceTicker
- 使用边框分隔不同区域，不使用卡片包裹

### Requirement: 动画效果
The system SHALL add subtle animations to enhance visual appeal:
- 渐变光晕的缓慢呼吸动画
- 网格背景的微浮动效果
- 保持性能友好，使用 CSS 动画

## Design Specifications

### 颜色规范
- 主背景色: #FFFFFF (白色)
- 次背景色: #F8FAFC (slate-50)
- 网格线颜色: rgba(148, 163, 184, 0.1) (slate-400 at 10%)
- 渐变光晕: 从 rgba(59, 130, 246, 0.15) 到 rgba(139, 92, 246, 0.1)

### 布局规范
- Hero 区域: 全宽背景，内容居中，最大宽度 1280px
- 网格密度: 40px 间隔，1px 线宽
- 渐变光晕位置: 右上角和左下角
- 区域间距: 使用 py-16 到 py-20 的垂直间距

### 动画规范
- 渐变呼吸: 8s ease-in-out infinite
- 网格浮动: 20s linear infinite
- 使用 will-change 优化性能
- 支持 prefers-reduced-motion 媒体查询
