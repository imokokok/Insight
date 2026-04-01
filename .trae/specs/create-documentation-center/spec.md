# 创建文档中心页面 Spec

## Why

当前首页的"查看文档"按钮链接到了 `/price-query` 页面，这与用户期望不符。用户希望点击"查看文档"后能够跳转到专门的文档中心页面，查看平台的使用指南、API文档、技术架构等内容。这将提升用户体验，帮助用户更好地理解和使用平台。

## What Changes

- 创建新的文档中心页面 `/docs`
- 更新首页 ProfessionalHero 组件中的"查看文档"按钮链接
- 添加文档中心相关的国际化文案
- 文档中心包含：快速入门、功能指南、技术文档、开发者资源等模块

## Impact

- 新增页面: `src/app/[locale]/docs/page.tsx`
- 新增组件: `src/app/[locale]/docs/components/` 目录下的文档相关组件
- 修改文件: `src/app/[locale]/home-components/ProfessionalHero.tsx`
- 新增国际化: `src/i18n/messages/en/docs.json` 和 `zh-CN/docs.json`
- 修改配置: `src/i18n/config.ts` 添加 docs 消息文件配置

## ADDED Requirements

### Requirement: 文档中心页面

The system SHALL provide a documentation center page accessible at `/docs` route.

#### Scenario: 页面访问

- **WHEN** 用户访问 `/docs` 路径
- **THEN** 系统显示文档中心页面，包含导航和文档内容

#### Scenario: 多语言支持

- **WHEN** 用户切换语言（中文/英文）
- **THEN** 文档中心内容显示对应语言的文案

#### Scenario: 文档导航

- **WHEN** 用户点击文档分类（快速入门、功能指南等）
- **THEN** 页面滚动到对应章节或展开对应内容

#### Scenario: 首页跳转

- **WHEN** 用户在首页点击"查看文档"按钮
- **THEN** 系统导航到 `/docs` 页面

### Requirement: 文档内容结构

The documentation center SHALL include the following sections:

#### Section: 快速入门

- 平台介绍
- 注册登录指南
- 基本使用教程

#### Section: 功能指南

- 价格查询功能说明
- 跨预言机对比功能说明
- 跨链分析功能说明
- 告警管理功能说明

#### Section: 技术文档

- 方法论说明（链接到 /methodology）
- API 参考（链接到 API_REFERENCE.md 内容）
- 架构设计概览

#### Section: 开发者资源

- 集成指南
- 示例代码
- 常见问题

### Requirement: 视觉设计

The documentation center SHALL follow the existing design system:

- 使用项目现有的配色方案
- 使用 Tailwind CSS 进行样式定义
- 保持与 methodology 页面一致的卡片式布局
- 支持响应式设计

## MODIFIED Requirements

### Requirement: 首页 CTA 按钮

**Current**: "查看文档"按钮链接到 `/price-query`
**Modified**: "查看文档"按钮链接到 `/docs`

## REMOVED Requirements

None
