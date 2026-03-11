# 首页扁平化重做设计规范

## Why
当前首页虽然功能完整，但采用了传统的卡片式布局，视觉上显得较为厚重。参考 Dune Analytics 等顶级数据分析平台的扁平化设计风格，去除冗余的卡片边框和阴影，采用更加简洁、专业、信息密度更高的设计，提升平台的专业感和数据可视化体验。

## What Changes
- **扁平化 Hero 区域**: 去除厚重渐变，采用简洁的深色背景配合微妙的数据可视化元素
- **无边框实时数据区**: 去除卡片边框，使用留白和分隔线区分内容，类似 Dune 的数据表格风格
- **极简功能导航**: 采用纯文字+图标的简洁导航，去除背景色和边框
- **网格化预言机展示**: 使用网格布局展示协议，去除卡片样式，悬停时显示微妙背景变化
- **数据洞察仪表盘**: 采用仪表盘风格的数字展示，突出数据本身
- **专业页脚**: 简洁的页脚设计，信息层次分明
- **精简动画效果**: 去除过度动画，保留必要的微交互

## Impact
- Affected specs: 首页布局、视觉风格、组件样式
- Affected code: src/app/page.tsx, src/components/Card.tsx, src/app/globals.css

## ADDED Requirements

### Requirement: 扁平化 Hero 区域
The system SHALL 提供简洁专业的 Hero 区域。

#### Scenario: 页面加载
- **WHEN** 用户访问首页
- **THEN** 显示简洁的深色背景 Hero 区域
- **AND** 背景包含微妙的数据网格或粒子效果（低饱和度）
- **AND** 标题使用简洁的白色文字，无渐变效果
- **AND** 核心统计数据以简洁数字形式展示，无动画计数

### Requirement: 无边框实时数据区
The system SHALL 以扁平化方式展示实时价格数据。

#### Scenario: 数据展示
- **WHEN** 页面加载完成
- **THEN** 以表格/列表形式显示预言机价格数据
- **AND** 去除卡片边框和阴影，使用分隔线区分行
- **AND** 每个项目显示代币图标、名称、当前价格、24h变化
- **AND** 悬停时显示微妙背景色变化（如 bg-gray-50）

### Requirement: 极简功能导航
The system SHALL 提供简洁的功能导航入口。

#### Scenario: 导航交互
- **WHEN** 用户查看功能区域
- **THEN** 显示图标+文字形式的导航链接
- **AND** 去除背景色、边框、阴影
- **AND** 悬停时仅显示文字颜色变化或下划线

### Requirement: 网格化预言机协议展示
The system SHALL 以网格形式展示支持的预言机协议。

#### Scenario: 协议展示
- **WHEN** 用户查看预言机区域
- **THEN** 以网格布局展示各协议 Logo 和名称
- **AND** 去除卡片样式，使用简洁的网格项
- **AND** 悬停时显示微妙背景色和箭头指示

### Requirement: 数据洞察仪表盘
The system SHALL 以仪表盘风格展示核心数据指标。

#### Scenario: 统计展示
- **WHEN** 用户浏览首页
- **THEN** 显示大号数字指标（预言机数、链数、数据 feeds 等）
- **AND** 数字下方显示简洁标签
- **AND** 去除装饰性元素，突出数据本身

### Requirement: 响应式设计
The system SHALL 在各种屏幕尺寸下保持良好的视觉效果。

#### Scenario: 移动端适配
- **WHEN** 用户在移动设备访问
- **THEN** 所有元素自动适配屏幕宽度
- **AND** 保持扁平化设计的简洁性
- **AND** 移动端优化布局和交互

## MODIFIED Requirements

### Requirement: 页面布局
The system SHALL 采用扁平化的单页布局设计。

#### Scenario: 布局结构
- **WHEN** 用户滚动页面
- **THEN** 按顺序看到: Hero → 实时数据 → 功能导航 → 预言机协议 → 数据洞察 → 页脚
- **AND** 各区域之间使用留白分隔，去除装饰性分隔线

### Requirement: 视觉风格
The system SHALL 采用扁平化视觉风格。

#### Scenario: 视觉呈现
- **WHEN** 用户浏览页面
- **THEN** 看到统一的扁平化设计
- **AND** 去除渐变背景、阴影、圆角卡片
- **AND** 使用简洁的黑白灰配色，配合品牌色点缀

### Requirement: 动画效果
The system SHALL 提供精简的动画效果。

#### Scenario: 动画交互
- **WHEN** 页面加载时
- **THEN** 元素直接显示，无入场动画
- **AND** 悬停时仅显示颜色变化，无位移或缩放
- **AND** 保持页面响应速度

## REMOVED Requirements
### Requirement: 卡片式组件
**Reason**: 扁平化设计去除卡片边框和阴影
**Migration**: 使用留白和分隔线替代卡片容器

### Requirement: 渐变背景
**Reason**: 扁平化设计采用纯色背景
**Migration**: Hero 区域使用纯色深色背景

### Requirement: 动画计数效果
**Reason**: 扁平化设计追求简洁，去除过度动画
**Migration**: 直接显示静态数字
