# 代码质量全面提升规范

## Why
当前项目存在多个代码质量问题,包括文件过大、类型安全不足、性能优化缺失、错误处理不一致、测试覆盖不足、代码风格不一致等问题,这些问题会影响项目的可维护性、性能和开发效率。通过系统性的代码质量改进,可以提升代码的可读性、可维护性、性能和安全性。

## What Changes
- 重构大文件,拆分为更小的模块化组件
- 增强类型安全,消除 `any` 类型,添加运行时验证
- 优化性能,添加 memo、useMemo、useCallback
- 统一错误处理机制,完善错误边界
- 提高测试覆盖率,添加单元测试、集成测试和 E2E 测试
- 统一代码风格,规范注释语言,改进命名
- 增强安全性,添加输入验证和环境变量管理
- 改进可维护性,添加文档,降低复杂度,完善依赖注入
- **BREAKING**: 重构部分 API 接口,可能影响现有功能

## Impact
- Affected specs: 所有 Oracle 客户端、组件、hooks、工具函数
- Affected code: 
  - `src/lib/oracles/` - 所有 Oracle 客户端实现
  - `src/app/[locale]/` - 所有页面组件
  - `src/hooks/` - 所有自定义 hooks
  - `src/lib/utils/` - 所有工具函数
  - `src/components/` - 所有 React 组件

## ADDED Requirements

### Requirement: 文件大小和模块化
系统 SHALL 确保单个文件不超过 500 行代码,超过限制的文件必须拆分为更小的模块。

#### Scenario: 大文件拆分
- **WHEN** 文件超过 500 行
- **THEN** 应该按照职责拆分为多个文件,每个文件负责单一功能

#### Scenario: 模块化设计
- **WHEN** 创建新功能
- **THEN** 应该遵循单一职责原则,每个模块只负责一个功能

### Requirement: 类型安全
系统 SHALL 严格禁止使用 `any` 类型,所有类型必须明确定义。

#### Scenario: 禁止 any 类型
- **WHEN** 定义变量、函数参数或返回值
- **THEN** 必须使用明确的类型定义,不能使用 `any`

#### Scenario: 运行时类型验证
- **WHEN** 处理外部数据(如 API 响应)
- **THEN** 必须使用 Zod 或类似库进行运行时类型验证

### Requirement: 性能优化
系统 SHALL 在适当的地方使用 React 性能优化技术。

#### Scenario: 组件 memoization
- **WHEN** 组件接收相同的 props 时
- **THEN** 应该使用 React.memo 避免不必要的重渲染

#### Scenario: 值 memoization
- **WHEN** 计算昂贵的值时
- **THEN** 应该使用 useMemo 缓存计算结果

#### Scenario: 函数 memoization
- **WHEN** 将函数传递给子组件时
- **THEN** 应该使用 useCallback 避免函数重新创建

### Requirement: 错误处理
系统 SHALL 提供统一的错误处理机制。

#### Scenario: 错误边界
- **WHEN** 组件发生错误时
- **THEN** 应该被错误边界捕获并显示友好的错误信息

#### Scenario: 错误日志
- **WHEN** 发生错误时
- **THEN** 应该记录详细的错误信息,包括堆栈跟踪和上下文信息

### Requirement: 测试覆盖
系统 SHALL 保持至少 80% 的测试覆盖率。

#### Scenario: 单元测试
- **WHEN** 编写新的工具函数或 hook
- **THEN** 必须编写对应的单元测试

#### Scenario: 集成测试
- **WHEN** 编写新的组件或页面
- **THEN** 必须编写对应的集成测试

#### Scenario: E2E 测试
- **WHEN** 添加新的用户流程
- **THEN** 必须编写对应的 E2E 测试

### Requirement: 代码风格一致性
系统 SHALL 遵循统一的代码风格和命名规范。

#### Scenario: 注释语言
- **WHEN** 编写代码注释
- **THEN** 必须使用英文,保持一致性

#### Scenario: 命名规范
- **WHEN** 命名变量、函数、组件
- **THEN** 必须遵循既定的命名规范(驼峰命名、PascalCase 等)

### Requirement: 安全性
系统 SHALL 实施严格的安全措施。

#### Scenario: 输入验证
- **WHEN** 接收用户输入
- **THEN** 必须进行验证和清理,防止 XSS 和注入攻击

#### Scenario: 环境变量
- **WHEN** 使用敏感信息
- **THEN** 必须通过环境变量管理,不能硬编码

### Requirement: 文档
系统 SHALL 提供完整的代码文档。

#### Scenario: 函数文档
- **WHEN** 编写公共函数
- **THEN** 必须添加 JSDoc 注释,说明参数、返回值和用途

#### Scenario: 组件文档
- **WHEN** 编写可复用组件
- **THEN** 必须添加 README 或 Storybook 文档

### Requirement: 依赖注入
系统 SHALL 使用依赖注入模式管理服务依赖。

#### Scenario: 服务注入
- **WHEN** 使用外部服务
- **THEN** 应该通过依赖注入容器管理,而不是直接实例化

### Requirement: 代码复杂度
系统 SHALL 控制代码复杂度在合理范围内。

#### Scenario: 函数复杂度
- **WHEN** 函数圈复杂度超过 10
- **THEN** 应该拆分为多个小函数

#### Scenario: 组件复杂度
- **WHEN** 组件行数超过 300 行
- **THEN** 应该拆分为多个子组件

## MODIFIED Requirements

### Requirement: ESLint 配置
原有 ESLint 配置需要增强,添加更多严格规则。

**修改内容**:
- 添加 `@typescript-eslint/no-explicit-any: error` (从 warn 改为 error)
- 添加 `complexity: ['error', 10]` 限制圈复杂度
- 添加 `max-lines: ['error', { max: 500, skipBlankLines: true, skipComments: true }]` 限制文件行数
- 添加 `max-lines-per-function: ['error', { max: 50 }]` 限制函数行数

### Requirement: TypeScript 配置
原有 TypeScript 配置需要增强严格性。

**修改内容**:
- 添加 `"noImplicitAny": true` 禁止隐式 any
- 添加 `"strictNullChecks": true` 严格空值检查
- 添加 `"noUnusedLocals": true` 检查未使用的局部变量
- 添加 `"noUnusedParameters": true` 检查未使用的参数

## REMOVED Requirements

### Requirement: 宽松的类型检查
**Reason**: 为了提高类型安全性,需要移除宽松的类型检查选项
**Migration**: 所有使用宽松类型的代码需要更新为严格类型
