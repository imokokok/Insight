# 首页Hero背景优化 Spec

## Why
当前首页Hero区域背景过于简单（纯白+淡网格），导致页面显得空白、缺乏层次感。需要在保持项目整体风格（专业、简洁、蓝色主调）的前提下，适度增加背景的视觉层次，让页面更加精致。

## What Changes
- **适度启用粒子效果**: 以极低的密度启用粒子网络动画，增加细微的动态感
- **优化静态渐变**: 在现有渐变基础上，增加1-2个更淡的辅助色光晕，丰富层次但不抢眼
- **保持克制**: 所有效果保持低饱和度、低透明度，确保不干扰前景内容阅读
- **遵循设计系统**: 严格使用项目现有的蓝色系色彩（--primary-500: #3b82f6, --primary-400: #60a5fa等）

## Impact
- Affected specs: 首页视觉设计
- Affected code: 
  - `src/app/[locale]/home-components/ProfessionalHero.tsx`
  - `src/app/[locale]/home-components/HeroBackground.tsx`

## ADDED Requirements
### Requirement: 克制的动态背景
The system SHALL provide a subtle enriched hero background:

#### Scenario: 低密度粒子效果
- **WHEN** 用户访问首页
- **THEN** 背景显示极低密度的粒子网络（约20-30个粒子）
- **AND** 粒子连线透明度极低（0.1-0.2），仅作为细微纹理
- **AND** 粒子颜色使用项目主蓝色 (#3b82f6) 和辅助紫蓝色 (#8b5cf6)
- **AND** 支持 prefers-reduced-motion 无障碍设置

#### Scenario: 增强静态渐变
- **WHEN** 用户访问首页
- **THEN** 背景在现有蓝、紫色光晕基础上，增加1个淡青色辅助光晕
- **AND** 所有光晕透明度控制在 0.04-0.08 之间，保持极低存在感
- **AND** 光晕位置分布在角落，不覆盖主要内容区域

## MODIFIED Requirements
### Requirement: HeroBackground组件配置
**原配置**: `enableParticles={false} enableDataFlow={false}`
**新配置**: `enableParticles={true}`（使用低密度参数）, `enableDataFlow={false}`（保持禁用，避免过度）

## REMOVED Requirements
无
