# 前端页面细节审查与优化 Spec

## Why
项目前端页面存在一些不专业的小细节问题，包括样式不统一、颜色对比度不足、缺少错误处理文件等。这些问题虽然不影响核心功能，但会影响用户体验和代码维护性，需要进行系统性审查和修复。

## What Changes
- 统一圆角样式，遵循 Dune Style Flat Design 设计规范
- 修复颜色对比度问题（Footer、Navbar 等组件）
- 统一颜色使用，移除硬编码颜色值
- 添加 Next.js 约定的错误处理文件（error.tsx、not-found.tsx、global-error.tsx）
- 统一加载状态实现方式
- 修复代码格式问题（多余空格等）
- **BREAKING**: 部分组件的视觉样式会有细微调整

## Impact
- Affected specs: UI 组件规范、设计系统
- Affected code:
  - `src/components/ui/*` - UI 基础组件
  - `src/components/Footer.tsx` - 页脚组件
  - `src/components/Navbar.tsx` - 导航栏组件
  - `src/app/*` - 页面文件
  - `src/lib/config/colors.ts` - 颜色配置

## ADDED Requirements

### Requirement: 统一圆角样式
The system SHALL 统一所有组件的圆角样式，遵循 Dune Style Flat Design（无圆角或极小平角）

#### Scenario: Card 组件
- **GIVEN** Card 组件渲染
- **WHEN** 查看组件样式
- **THEN** 应使用 `border-radius: 0` 或极小平角，不使用 `rounded-lg` 等大圆角

#### Scenario: EmptyState 组件
- **GIVEN** EmptyState 组件渲染
- **WHEN** 查看组件样式
- **THEN** 应移除 `rounded-lg` 类名，保持扁平设计

#### Scenario: ChartSkeleton 组件
- **GIVEN** ChartSkeleton 组件渲染
- **WHEN** 查看组件样式
- **THEN** 应移除 `rounded-md`、`rounded` 类名

#### Scenario: Toast 组件
- **GIVEN** Toast 通知显示
- **WHEN** 查看组件样式
- **THEN** 应使用统一的圆角规范

### Requirement: 修复颜色对比度问题
The system SHALL 修复所有颜色对比度不足的问题

#### Scenario: Footer Logo
- **GIVEN** Footer 组件渲染
- **WHEN** 查看 Logo 区域
- **THEN** 背景色与文字颜色应有足够对比度（符合 WCAG AA 标准）

#### Scenario: Navbar 用户头像
- **GIVEN** Navbar 组件渲染且用户未登录
- **WHEN** 查看默认头像
- **THEN** 背景色与文字颜色应有足够对比度

### Requirement: 统一颜色配置
The system SHALL 统一使用颜色配置文件，移除硬编码颜色值

#### Scenario: EmptyState 组件颜色
- **GIVEN** EmptyState 组件中的颜色定义
- **WHEN** 检查颜色来源
- **THEN** 应使用 `tailwindClasses` 或 `colors` 配置，而非硬编码的 `bg-gray-100`、`text-gray-900` 等

#### Scenario: 按钮颜色
- **GIVEN** 组件中的按钮样式
- **WHEN** 检查颜色来源
- **THEN** 应使用品牌色系（finance-primary、finance-secondary 等）

### Requirement: 添加错误处理文件
The system SHALL 添加 Next.js 约定的错误处理文件

#### Scenario: 路由级别错误
- **GIVEN** 路由发生错误
- **WHEN** 错误边界捕获错误
- **THEN** 应显示友好的错误页面（error.tsx）

#### Scenario: 全局错误
- **GIVEN** 发生全局错误
- **WHEN** 全局错误边界捕获错误
- **THEN** 应显示全局错误页面（global-error.tsx）

#### Scenario: 404 页面
- **GIVEN** 访问不存在的路由
- **WHEN** Next.js 捕获 404 错误
- **THEN** 应显示自定义 404 页面（not-found.tsx）

### Requirement: 统一加载状态
The system SHALL 统一加载状态的实现方式

#### Scenario: 页面加载
- **GIVEN** 页面数据加载中
- **WHEN** 显示加载状态
- **THEN** 应使用骨架屏（Skeleton）而非全屏加载动画

#### Scenario: 图表加载
- **GIVEN** 图表数据加载中
- **WHEN** 显示加载状态
- **THEN** 应使用 ChartSkeleton 组件

### Requirement: 代码格式规范
The system SHALL 修复代码格式问题

#### Scenario: 多余空格
- **GIVEN** 组件源代码
- **WHEN** 检查代码格式
- **THEN** 应移除多余的空格，保持代码整洁

## MODIFIED Requirements

### Requirement: UI 组件样式规范
The system SHALL 更新 UI 组件样式以符合设计系统

#### Scenario: Card 组件
- **GIVEN** Card 组件样式定义
- **WHEN** 应用样式
- **THEN** 应遵循 Dune Style Flat Design 规范

### Requirement: 颜色配置扩展
The system SHALL 扩展现有颜色配置以支持更多场景

#### Scenario: 空状态颜色
- **GIVEN** 需要定义空状态组件的颜色
- **WHEN** 添加颜色配置
- **THEN** 应在 `colors.ts` 中添加相应的 tailwind 类名

## REMOVED Requirements
无移除的需求
