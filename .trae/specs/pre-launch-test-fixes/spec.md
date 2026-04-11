# 上线前测试问题修复规范

## Why

项目即将上线，但测试报告显示存在以下关键问题：
- 测试覆盖率仅 25.29%（目标 70%）
- 97 个测试用例失败
- 64 个 ESLint 错误
- 部分测试因内存问题崩溃

这些问题会影响系统稳定性和可维护性，必须在上线前修复。

## What Changes

- 修复所有失败的测试用例（97个）
- 提高测试覆盖率至 50% 以上
- 修复关键的 ESLint 错误
- 解决测试内存崩溃问题
- 确保构建和类型检查通过

## Impact

- Affected specs: 测试体系、代码质量
- Affected code:
  - 测试文件：`src/**/*.test.{ts,tsx}`, `src/**/*.spec.{ts,tsx}`
  - 源代码文件：所有低覆盖率模块
  - 配置文件：`jest.config.js`, `jest.setup.js`

## ADDED Requirements

### Requirement: 测试用例修复

系统 SHALL 确保所有测试用例通过。

#### Scenario: 修复 Alert 相关测试失败

- **WHEN** 运行 Alert 相关测试
- **THEN** 所有测试用例应通过，无超时或 Mock 错误

#### Scenario: 修复 Favorites 测试失败

- **WHEN** 运行 Favorites 相关测试
- **THEN** 所有测试用例应通过，无内存崩溃

#### Scenario: 修复 DataFreshness 测试失败

- **WHEN** 运行 DataFreshness 测试
- **THEN** 测试应正常完成，无内存溢出

### Requirement: 测试覆盖率提升

系统 SHALL 达到最低测试覆盖率要求。

#### Scenario: 核心模块覆盖率达标

- **WHEN** 运行测试覆盖率检查
- **THEN** 核心业务逻辑模块覆盖率应 > 50%

#### Scenario: 总体覆盖率达标

- **WHEN** 运行 `npm run test:coverage`
- **THEN** 总体覆盖率应 > 50%（目标 70%）

### Requirement: 代码规范修复

系统 SHALL 通过 ESLint 检查。

#### Scenario: 修复关键 ESLint 错误

- **WHEN** 运行 `npm run lint`
- **THEN** 错误数量应 < 10 个

#### Scenario: 函数长度合规

- **WHEN** 检查函数长度
- **THEN** 无函数超过 500 行

### Requirement: 构建验证

系统 SHALL 成功构建。

#### Scenario: 生产构建成功

- **WHEN** 运行 `npm run build`
- **THEN** 构建应成功完成，无错误

#### Scenario: TypeScript 类型检查通过

- **WHEN** 运行 `npm run typecheck`
- **THEN** 应无类型错误

## MODIFIED Requirements

### Requirement: 测试配置优化

测试配置 SHALL 支持大规模测试运行。

#### Scenario: 增加内存限制

- **WHEN** 运行大量测试
- **THEN** Jest 应有足够内存，不会崩溃

#### Scenario: 优化测试超时

- **WHEN** 运行异步测试
- **THEN** 超时时间应合理，避免误判

## REMOVED Requirements

无移除的需求。
