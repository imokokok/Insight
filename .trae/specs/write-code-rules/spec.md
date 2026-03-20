# Insight 代码规范文档 Spec

## Why

Insight 是一个专业的区块链预言机数据分析平台，基于 Next.js 16 + React 19 + TypeScript 构建。随着项目规模扩大和团队协作需求增加，需要一套完整的代码规范来确保：

1. **代码一致性** - 统一的编码风格和架构模式
2. **可维护性** - 清晰的代码结构和文档规范
3. **可扩展性** - 支持长期发展和功能迭代
4. **团队协作** - 降低代码审查成本，提高开发效率
5. **质量保证** - 通过自动化工具和最佳实践确保代码质量

## What Changes

- **新增** `.trae/rules/project_rules.md` - AI 代码助手编码规范文档
- **新增** Spec 文档体系 - 规范文档的管理和版本控制
- **涵盖** 架构规范、代码风格、组件设计、状态管理、性能优化、测试规范等全方位规范

## Impact

- **受影响范围**: 所有新代码编写、代码审查、重构操作
- **关键文件**: `.trae/rules/project_rules.md`
- **相关配置**: `eslint.config.mjs`, `.prettierrc`, `tsconfig.json`, `next.config.ts`

## ADDED Requirements

### Requirement: 代码规范文档

The system SHALL provide a comprehensive code standards document that covers:

#### Scenario: 新功能开发
- **WHEN** AI 助手为 Insight 项目编写代码
- **THEN** 必须遵循 project_rules.md 中定义的规范
- **AND** 包括架构模式、命名约定、类型安全、性能优化等方面

#### Scenario: 代码审查
- **WHEN** 进行代码审查或重构
- **THEN** 以 project_rules.md 作为审查标准
- **AND** 确保所有代码符合规范要求

#### Scenario: 长期维护
- **WHEN** 项目持续迭代发展
- **THEN** 规范文档支持扩展和更新
- **AND** 保持向后兼容性
