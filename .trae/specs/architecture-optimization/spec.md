# 架构优化与长期可维护性提升 Spec

## Why
当前项目架构存在多个状态管理方案混用、API层缺乏统一抽象、错误处理不完善、类型定义分散等问题，这些问题会随着项目规模增长导致维护成本急剧上升。需要系统性地优化架构，提升代码质量和长期可维护性。

## What Changes
- 统一状态管理方案，移除冗余的数据获取库
- 建立统一的 API 路由抽象层和中间件系统
- 完善错误处理体系，建立自定义错误类层级
- 整合类型定义，建立清晰的类型组织结构
- 引入依赖注入模式，提升可测试性
- 优化组件目录结构，降低单目录复杂度
- **BREAKING** 移除 SWR，统一使用 React Query
- **BREAKING** 重构 API 路由结构，引入版本控制

## Impact
- Affected specs: 状态管理层、API层、错误处理、类型系统
- Affected code: 
  - `src/providers/SWRProvider.tsx` - 将被移除
  - `src/hooks/useOracleDataSWR.ts` - 将被重构
  - `src/lib/api/oracleHandlers.ts` - 将被重构
  - `src/lib/errors.ts` - 将被扩展
  - `src/components/oracle/*` - 目录结构将调整
  - `src/app/api/*` - 将引入中间件层

---

## ADDED Requirements

### Requirement: 统一状态管理架构

系统 SHALL 使用单一服务端状态管理方案（React Query），移除 SWR 以消除职责重叠。

#### Scenario: 数据获取统一使用 React Query
- **WHEN** 组件需要获取服务端数据
- **THEN** 统一使用 React Query 提供的 hooks（useQuery, useMutation）
- **AND** 所有现有的 SWR hooks 被迁移到 React Query

#### Scenario: 客户端状态使用 Zustand
- **WHEN** 组件需要管理客户端 UI 状态
- **THEN** 使用 Zustand store
- **AND** 服务端状态与客户端状态保持清晰分离

---

### Requirement: API 路由统一抽象层

系统 SHALL 提供统一的 API 路由处理器抽象，包含认证、验证、错误处理、日志等中间件。

#### Scenario: API 路由使用统一处理器
- **WHEN** 创建新的 API 路由
- **THEN** 使用统一的 `createApiHandler` 函数创建处理器
- **AND** 自动获得认证检查、请求验证、错误处理、日志记录能力

#### Scenario: 中间件链式执行
- **WHEN** API 请求进入
- **THEN** 按顺序执行中间件链
- **AND** 任意中间件可中断请求并返回响应

---

### Requirement: 完善的错误处理体系

系统 SHALL 建立层级化的自定义错误类，提供统一的错误处理和响应格式。

#### Scenario: 业务错误分类处理
- **WHEN** 发生业务错误
- **THEN** 抛出对应的自定义错误类（ValidationError, NotFoundError, AuthenticationError 等）
- **AND** 错误被统一捕获并转换为标准 API 响应格式

#### Scenario: 错误信息国际化
- **WHEN** 返回错误响应
- **THEN** 错误消息支持国际化
- **AND** 包含错误代码便于前端处理

---

### Requirement: 类型定义整合与组织

系统 SHALL 建立清晰的类型定义组织结构，消除重复定义。

#### Scenario: 类型定义按领域组织
- **WHEN** 定义新的类型
- **THEN** 放置在对应的领域目录下（如 `types/oracle/`, `types/auth/`）
- **AND** 使用 index.ts 统一导出

#### Scenario: 共享类型提取
- **WHEN** 多个模块使用相同类型
- **THEN** 提取到 `types/common/` 目录
- **AND** 避免重复定义

---

### Requirement: 依赖注入模式

系统 SHALL 引入依赖注入模式，提升组件可测试性和解耦程度。

#### Scenario: Oracle 客户端依赖注入
- **WHEN** 组件需要使用 Oracle 客户端
- **THEN** 通过依赖注入容器获取
- **AND** 测试时可轻松替换为 mock 实现

#### Scenario: 服务层依赖注入
- **WHEN** 创建服务类
- **THEN** 通过构造函数接收依赖
- **AND** 使用接口类型而非具体实现

---

### Requirement: 组件目录结构优化

系统 SHALL 重新组织组件目录结构，降低单目录复杂度。

#### Scenario: Oracle 组件按功能分类
- **WHEN** 添加新的 Oracle 相关组件
- **THEN** 放置在对应功能子目录（如 `oracle/charts/`, `oracle/indicators/`, `oracle/panels/`）
- **AND** 每个子目录有独立的 index.ts 导出

#### Scenario: 组件命名规范
- **WHEN** 创建新组件
- **THEN** 文件名使用 PascalCase
- **AND** 组件名与文件名一致

---

### Requirement: API 版本控制

系统 SHALL 引入 API 版本控制机制，支持平滑升级。

#### Scenario: API 路由包含版本号
- **WHEN** 创建新的 API 端点
- **THEN** 路由路径包含版本号（如 `/api/v1/oracles`）
- **AND** 旧版本 API 保持向后兼容

#### Scenario: 版本废弃通知
- **WHEN** API 版本即将废弃
- **THEN** 响应头包含废弃警告
- **AND** 文档说明迁移路径

---

### Requirement: 测试架构完善

系统 SHALL 建立完整的测试架构，包含单元测试、集成测试、E2E测试。

#### Scenario: 测试目录结构
- **WHEN** 编写测试
- **THEN** 测试文件放置在 `__tests__` 目录或与源文件同级
- **AND** 测试文件命名为 `*.test.ts` 或 `*.spec.ts`

#### Scenario: 测试覆盖要求
- **WHEN** 提交代码
- **THEN** 核心业务逻辑测试覆盖率不低于 80%
- **AND** CI 流程包含测试覆盖率检查

---

### Requirement: 监控与可观测性

系统 SHALL 集成监控和可观测性工具，支持性能追踪和错误监控。

#### Scenario: 性能监控集成
- **WHEN** 应用运行
- **THEN** 自动收集性能指标
- **AND** 异常性能数据触发告警

#### Scenario: 错误追踪
- **WHEN** 发生未捕获错误
- **THEN** 错误信息自动上报到监控系统
- **AND** 包含上下文信息便于排查

---

## MODIFIED Requirements

### Requirement: 环境配置管理

系统 SHALL 提供更严格的环境变量验证和配置管理。

原配置在开发环境仅警告缺失变量，现要求：
- 必需变量在任何环境缺失时抛出明确错误
- 可选变量提供默认值
- 配置变更支持热重载（开发环境）

---

## REMOVED Requirements

### Requirement: SWR 数据获取
**Reason**: 与 React Query 功能重叠，增加维护成本
**Migration**: 所有 SWR hooks 迁移到 React Query，移除 SWRProvider
