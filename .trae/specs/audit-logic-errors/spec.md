# 项目逻辑错误审查规范

## Why
作为一个 Oracle 价格数据聚合平台，Insight 需要确保数据处理的准确性、一致性和可靠性。本次审查旨在发现并修复项目中存在的逻辑错误、类型不匹配、性能问题和代码重复等问题，提升系统的整体质量。

## What Changes
- **时间戳处理统一**: 修复时间戳单位转换不一致的问题
- **类型安全增强**: 修复函数参数类型不匹配的问题
- **性能优化**: 解决告警检测中的 N+1 查询问题
- **代码重构**: 消除重复代码，提取公共逻辑
- **功能完善**: 实现缺失的历史价格功能
- **配置规范化**: 修复硬编码配置和无效默认值

## Impact
- 受影响模块: Oracle 客户端、API 路由、告警系统、WebSocket 管理
- 受影响文件: pythHermesClient.ts, storage.ts, queries.ts, detector.ts, websocket.ts 及多个 API 路由文件

## ADDED Requirements

### Requirement: 时间戳处理一致性
The system SHALL 统一时间戳处理逻辑，确保毫秒和秒的转换一致。

#### Scenario: 数据库存储时间戳
- **WHEN** 价格数据保存到数据库时
- **THEN** 时间戳单位必须统一（建议使用毫秒）
- **AND** 所有模块使用相同的时间戳工具函数

#### Scenario: API 响应时间戳
- **WHEN** API 返回价格数据时
- **THEN** 时间戳格式必须与前端期望一致
- **AND** 文档明确说明时间戳单位

### Requirement: 类型安全
The system SHALL 确保函数参数类型与调用时传入的类型一致。

#### Scenario: Pyth 价格转换
- **WHEN** 调用 `convertPythPrice` 函数时
- **THEN** 传入参数必须与函数签名匹配
- **AND** 类型定义必须覆盖所有可能的输入格式

#### Scenario: API 响应类型
- **WHEN** API 返回数据时
- **THEN** 响应类型必须与 TypeScript 类型定义一致
- **AND** 使用类型守卫进行运行时验证

### Requirement: 告警系统性能
The system SHALL 优化告警检测性能，避免 N+1 查询问题。

#### Scenario: 批量获取历史价格
- **WHEN** 检测 `change_percent` 类型告警时
- **THEN** 应批量获取所有相关历史价格
- **AND** 使用内存缓存减少数据库查询

#### Scenario: 告警检查调度
- **WHEN** 定时任务执行告警检查时
- **THEN** 应限制并发检查数量
- **AND** 记录检查耗时用于监控

### Requirement: 代码复用
The system SHALL 消除重复代码，提取公共逻辑到共享模块。

#### Scenario: API 认证逻辑
- **WHEN** 多个 API 路由需要获取用户 ID 时
- **THEN** 应使用统一的 `getUserId` 工具函数
- **AND** 函数应放在 `lib/api/utils.ts` 中

#### Scenario: Oracle 价格获取
- **WHEN** 多个 API 路由需要获取价格数据时
- **THEN** 应使用统一的价格获取逻辑
- **AND** 缓存策略应一致

#### Scenario: WebSocket 管理
- **WHEN** 需要管理 WebSocket 连接时
- **THEN** 应使用统一的连接管理器
- **AND** 避免在多个地方重复实现心跳和重连逻辑

### Requirement: 功能完整性
The system SHALL 实现缺失的核心功能。

#### Scenario: Pyth 历史价格
- **WHEN** 调用 `getHistoricalPrices` 方法时
- **THEN** 应返回真实的历史价格数据
- **OR** 如果 API 不支持，应抛出明确的错误

#### Scenario: Oracle 真实数据
- **WHEN** Oracle 客户端获取价格时
- **THEN** 应优先使用真实 API 数据
- **AND** Mock 数据应仅用于开发和测试环境

### Requirement: 配置规范化
The system SHALL 使用有效的配置值，避免硬编码。

#### Scenario: WebSocket URL 配置
- **WHEN** 初始化 WebSocket 连接时
- **THEN** 应使用有效的默认 URL
- **OR** 在配置缺失时抛出明确错误

#### Scenario: 基础价格配置
- **WHEN** 使用基础价格生成 Mock 数据时
- **THEN** 应从配置或环境变量读取
- **AND** 支持动态更新

## MODIFIED Requirements

### Requirement: Oracle 客户端接口
修改 `BaseOracleClient` 以支持：
- 统一的时间戳处理
- 明确的错误类型
- 可配置的 Mock 数据生成

### Requirement: API 路由结构
重构 API 路由以：
- 使用共享的认证中间件
- 使用统一的错误处理
- 使用一致的响应格式

## REMOVED Requirements

### Requirement: 重复的 getUserId 函数
**Reason**: 函数在多个文件中重复定义
**Migration**: 提取到 `lib/api/utils.ts` 并更新所有引用

### Requirement: 重复的 WebSocket 管理逻辑
**Reason**: `lib/realtime/websocket.ts` 和 `hooks/useWebSocket.ts` 功能重叠
**Migration**: 保留 `lib/realtime/websocket.ts` 作为核心实现，`hooks/useWebSocket.ts` 仅作为 React 封装
