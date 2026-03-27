# 部署前全面检查 Spec

## Why

项目即将部署上线，需要进行一次完整全面的检查，确保代码质量、性能、安全性和稳定性都达到生产环境要求。本次检查涵盖代码规范、类型检查、测试、构建、性能预算、安全审计等多个维度。

## What Changes

- **代码质量检查**: ESLint 检查、Prettier 格式检查、TypeScript 类型检查
- **测试验证**: 单元测试、E2E 测试运行并确保通过
- **构建验证**: 生产构建测试，确保无构建错误
- **性能预算检查**: 验证 Web Vitals 和 Bundle 大小是否符合预算
- **安全审计**: npm audit 检查依赖安全漏洞
- **国际化检查**: 验证翻译文件完整性
- **环境变量验证**: 检查必要的环境变量配置
- **数据库迁移验证**: 确保数据库 schema 和迁移文件就绪

## Impact

- Affected specs: 整个项目代码库
- Affected code: 所有源代码文件、配置文件、测试文件
- Affected systems: 构建系统、测试系统、部署流程

## ADDED Requirements

### Requirement: 代码质量检查

The system SHALL provide comprehensive code quality checks before deployment:

#### Scenario: ESLint 检查通过

- **WHEN** 运行 `npm run lint`
- **THEN** 所有 ESLint 规则检查通过
- **AND** 无错误级别的问题
- **AND** 警告数量在可接受范围内（< 20）

#### Scenario: Prettier 格式检查通过

- **WHEN** 运行 `npm run format:check`
- **THEN** 所有文件符合 Prettier 格式规范
- **AND** 无格式错误

#### Scenario: TypeScript 类型检查通过

- **WHEN** 运行 `npm run typecheck`
- **THEN** TypeScript 编译无错误
- **AND** 无隐式 any 类型
- **AND** 严格模式检查通过

### Requirement: 测试验证

The system SHALL ensure all tests pass before deployment:

#### Scenario: 单元测试通过

- **WHEN** 运行 `npm run test`
- **THEN** 所有单元测试通过
- **AND** 测试覆盖率不低于 60%
- **AND** 无测试失败或跳过

#### Scenario: E2E 测试通过

- **WHEN** 运行 `npm run test:e2e`
- **THEN** 所有 Playwright E2E 测试通过
- **AND** 关键用户流程测试覆盖

### Requirement: 构建验证

The system SHALL verify production build succeeds:

#### Scenario: 生产构建成功

- **WHEN** 运行 `npm run build`
- **THEN** 构建过程无错误
- **AND** 生成有效的 `.next` 输出目录
- **AND** 静态资源正确生成
- **AND** 无构建警告（或警告已评估）

### Requirement: 性能预算检查

The system SHALL verify performance budgets are met:

#### Scenario: Web Vitals 预算检查

- **WHEN** 检查性能预算配置
- **THEN** LCP < 2500ms (目标) / < 4000ms (警告)
- **AND** INP < 200ms (目标) / < 500ms (警告)
- **AND** CLS < 0.1 (目标) / < 0.25 (警告)
- **AND** FCP < 1800ms (目标) / < 3000ms (警告)
- **AND** TTFB < 800ms (目标) / < 1800ms (警告)

#### Scenario: Bundle 大小检查

- **WHEN** 检查构建输出
- **THEN** JavaScript Bundle < 300KB (目标) / < 500KB (警告)
- **AND** CSS Bundle < 100KB (目标) / < 150KB (警告)
- **AND** 图片资源 < 500KB (目标) / < 1000KB (警告)

### Requirement: 安全审计

The system SHALL perform security audits:

#### Scenario: 依赖安全审计

- **WHEN** 运行 `npm audit`
- **THEN** 无高危 (high) 或严重 (critical) 漏洞
- **AND** 中等 (moderate) 漏洞已评估
- **AND** 所有漏洞有处理计划

#### Scenario: 安全检查清单

- **WHEN** 检查安全配置
- **THEN** 环境变量未泄露在代码中
- **AND** API 路由有适当的认证和授权
- **AND** 安全头部已配置 (X-Frame-Options, X-Content-Type-Options 等)
- **AND** CORS 配置正确

### Requirement: 国际化检查

The system SHALL verify i18n configuration:

#### Scenario: 翻译文件完整性检查

- **WHEN** 运行 `npm run i18n:check`
- **THEN** 所有翻译键在 en 和 zh-CN 中都存在
- **AND** 无未使用的翻译键
- **AND** 翻译文件格式正确

### Requirement: 环境变量验证

The system SHALL verify environment variables:

#### Scenario: 必要环境变量检查

- **WHEN** 检查环境变量配置
- **THEN** NEXT_PUBLIC_SUPABASE_URL 已配置
- **AND** NEXT_PUBLIC_SUPABASE_ANON_KEY 已配置
- **AND** SUPABASE_SERVICE_ROLE_KEY 已配置（服务端）
- **AND** 所有必需的环境变量都有值

### Requirement: 数据库迁移验证

The system SHALL verify database migrations:

#### Scenario: 迁移文件检查

- **WHEN** 检查数据库迁移
- **THEN** 所有迁移文件已创建
- **AND** 迁移文件语法正确
- **AND** RLS 策略已配置
- **AND** 索引已优化

## MODIFIED Requirements

无

## REMOVED Requirements

无
