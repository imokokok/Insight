# 项目代码规范 (Project Coding Standards) Spec

## Why
项目规模较大，涉及多预言机集成、复杂组件结构和多语言支持。为确保代码一致性、可维护性和高质量的 AI 协作，需要建立统一的代码规范文档。

## What Changes
- 创建 `.trae/rules/project_rules.md` 代码规范文档
- 规范涵盖：技术栈、命名约定、文件组织、错误处理、性能优化、样式规范、i18n 等

## Impact
- 所有未来 AI 生成的代码都将遵循此规范
- 提高代码一致性和可维护性
- 降低代码审查成本

## ADDED Requirements

### Requirement: 代码规范文档
系统 SHALL 提供完整的代码规范文档，供 AI 在编写代码时遵循。

#### Scenario: 文档结构
- **GIVEN** AI 需要编写新代码
- **WHEN** 开始编码前
- **THEN** AI SHALL 读取 `.trae/rules/project_rules.md` 并遵循其中规范

#### Scenario: 规范覆盖范围
- **GIVEN** 项目使用 Next.js + TypeScript + Tailwind 技术栈
- **WHEN** 编写任何代码
- **THEN** SHALL 遵循规范中的：
  - 技术栈版本要求
  - 命名约定
  - 文件组织结构
  - 错误处理模式
  - 性能优化原则
  - 样式和 Tailwind 使用规范
  - i18n 国际化规范
  - 类型定义规范
  - Hook 和组件编写规范
  - API 路由规范
  - 测试规范
  - 注释规范

#### Scenario: 规范更新
- **GIVEN** 项目演进需要更新规范
- **WHEN** 发现新的模式或最佳实践
- **THEN** SHALL 更新 `project_rules.md` 以反映最新规范
