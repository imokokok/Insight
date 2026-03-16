# 架构优化实施规范

## Why
根据架构审查报告，项目存在状态管理复杂、组件结构庞大、缺少统一API客户端等问题。本规范将系统性地实施优化建议，提升代码可维护性和开发体验。

## What Changes
- **Phase 1**: 统一状态管理（迁移 Context 到 Zustand，统一 React Query 配置）
- **Phase 2**: 重组组件结构（按功能模块重新组织组件目录）
- **Phase 3**: 创建统一 API 客户端层
- **Phase 4**: 优化 Hooks 目录结构
- **Phase 5**: 集成监控服务（Sentry + Web Vitals）

## Impact
- Affected specs: 整体架构
- Affected code: 
  - `src/contexts/` - 状态管理重构
  - `src/stores/` - 新建 Zustand stores
  - `src/components/` - 目录重组
  - `src/hooks/` - 目录重组
  - `src/lib/api/` - API 客户端
  - `src/lib/monitoring/` - 监控服务

---

## ADDED Requirements

### Requirement: 统一状态管理架构
The system SHALL use a simplified state management architecture with React Query for server state and Zustand for client state.

#### Scenario: Server State Management
- **WHEN** fetching data from APIs
- **THEN** use React Query with unified configuration

#### Scenario: Client State Management
- **WHEN** managing UI state (filters, selections, modals)
- **THEN** use Zustand stores

#### Scenario: Auth State Migration
- **WHEN** accessing authentication state
- **THEN** use Zustand store instead of AuthContext

### Requirement: 组件目录结构优化
The system SHALL organize components by feature and function for better discoverability and maintainability.

#### Scenario: UI Components
- **WHEN** creating reusable UI components
- **THEN** place in `src/components/ui/`

#### Scenario: Feature Components
- **WHEN** creating feature-specific components
- **THEN** place in `src/components/features/{feature-name}/`

#### Scenario: Oracle Components
- **WHEN** creating oracle-specific components
- **THEN** place in `src/components/oracle/{provider}/`

### Requirement: 统一 API 客户端
The system SHALL provide a unified API client for all HTTP requests with consistent error handling and caching.

#### Scenario: API Request
- **WHEN** making an API request
- **THEN** use the unified ApiClient with automatic error handling

#### Scenario: Error Handling
- **WHEN** an API error occurs
- **THEN** return standardized error response

### Requirement: Hooks 目录结构优化
The system SHALL organize hooks by function type for better discoverability.

#### Scenario: Query Hooks
- **WHEN** creating data fetching hooks
- **THEN** place in `src/hooks/queries/`

#### Scenario: Mutation Hooks
- **WHEN** creating data mutation hooks
- **THEN** place in `src/hooks/mutations/`

### Requirement: 监控服务集成
The system SHALL integrate Sentry for error tracking and Web Vitals for performance monitoring.

#### Scenario: Error Tracking
- **WHEN** an unhandled error occurs
- **THEN** automatically report to Sentry

#### Scenario: Performance Monitoring
- **WHEN** page loads or interactions occur
- **THEN** collect Web Vitals metrics

---

## MODIFIED Requirements

### Requirement: 状态管理配置
React Query configuration SHALL be centralized with consistent stale time, cache time, and retry settings.

### Requirement: 组件导入路径
Component import paths SHALL follow the new directory structure after reorganization.

---

## REMOVED Requirements

### Requirement: 多 Context 状态管理
**Reason**: Simplified to Zustand stores
**Migration**: Migrate AuthContext, TimeRangeContext, RealtimeContext to Zustand stores

### Requirement: 分散的 API 调用
**Reason**: Unified under ApiClient
**Migration**: Update all fetch calls to use ApiClient
