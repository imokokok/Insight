# Supabase 后端集成规范

## Why
项目已配置 Supabase 连接，但目前所有数据都是模拟数据，快照存储在 localStorage。需要建立完整的后端架构，实现数据持久化、用户系统和实时数据同步，将项目从演示状态升级为生产可用的 Oracle 监控平台。

## What Changes
- 创建 Supabase 数据库表结构（用户、价格历史、快照、告警、收藏等）
- 实现 Supabase 认证系统（用户注册/登录/会话管理）
- 创建 API 路由与 Supabase 的集成层
- 实现价格数据的数据库存储和查询
- 将快照从 localStorage 迁移到数据库
- 添加用户偏好和收藏功能
- 实现价格告警系统
- **BREAKING**: 数据源从纯模拟数据切换为数据库优先（模拟数据作为后备）

## Impact
- Affected specs: 无现有 spec 受影响
- Affected code:
  - `src/lib/supabase/client.ts` - 扩展客户端功能
  - `src/lib/types/snapshot.ts` - 迁移到数据库
  - `src/hooks/useOracleData.ts` - 集成数据库查询
  - `src/app/api/oracles/*` - 添加数据库层
  - 新增: `src/lib/supabase/queries.ts` - 数据库查询函数
  - 新增: `src/lib/supabase/auth.ts` - 认证相关
  - 新增: `src/lib/supabase/realtime.ts` - 实时订阅
  - 新增: `src/contexts/AuthContext.tsx` - 认证上下文

## ADDED Requirements

### Requirement: 数据库表结构
系统 SHALL 提供完整的 Supabase 数据库表结构以支持所有功能。

#### Scenario: 价格数据存储
- **WHEN** 系统获取到新的价格数据
- **THEN** 数据应存储到 `price_records` 表，包含 provider、symbol、chain、price、timestamp 等字段

#### Scenario: 用户快照管理
- **WHEN** 用户保存价格快照
- **THEN** 快照应存储到 `user_snapshots` 表，关联用户 ID

### Requirement: 用户认证系统
系统 SHALL 提供基于 Supabase Auth 的用户认证功能。

#### Scenario: 用户注册
- **WHEN** 新用户使用邮箱注册
- **THEN** 系统创建账户并发送验证邮件

#### Scenario: 用户登录
- **WHEN** 用户使用有效凭据登录
- **THEN** 系统创建会话并返回用户信息

#### Scenario: 会话持久化
- **WHEN** 用户刷新页面
- **THEN** 会话应保持有效状态

### Requirement: 价格历史存储
系统 SHALL 将获取的价格数据持久化存储到数据库。

#### Scenario: 价格数据写入
- **WHEN** 从预言机获取到价格数据
- **THEN** 数据写入 `price_records` 表，并设置合理的 TTL

#### Scenario: 历史数据查询
- **WHEN** 用户请求历史价格
- **THEN** 系统优先从数据库查询，数据库无数据时回退到模拟数据

### Requirement: 快照数据库存储
系统 SHALL 将用户快照从 localStorage 迁移到数据库存储。

#### Scenario: 保存快照到数据库
- **WHEN** 用户点击保存快照
- **THEN** 快照存储到 `user_snapshots` 表，关联当前用户

#### Scenario: 加载用户快照
- **WHEN** 用户访问快照管理页面
- **THEN** 从数据库加载该用户的所有快照

### Requirement: 用户收藏功能
系统 SHALL 允许用户收藏交易对和预言机配置。

#### Scenario: 添加收藏
- **WHEN** 用户点击收藏按钮
- **THEN** 配置保存到 `user_favorites` 表

#### Scenario: 查看收藏列表
- **WHEN** 用户访问收藏页面
- **THEN** 显示用户保存的所有收藏配置

### Requirement: 价格告警系统
系统 SHALL 提供价格告警功能。

#### Scenario: 创建告警
- **WHEN** 用户设置价格告警条件
- **THEN** 告警配置保存到 `price_alerts` 表

#### Scenario: 告警触发
- **WHEN** 价格满足告警条件
- **THEN** 系统记录告警事件并通知用户

### Requirement: 实时数据订阅
系统 SHALL 利用 Supabase Realtime 提供实时价格更新。

#### Scenario: 订阅价格更新
- **WHEN** 用户打开监控页面
- **THEN** 系统订阅相关表的变更通知

#### Scenario: 实时推送
- **WHEN** 数据库中有新价格数据写入
- **THEN** 所有订阅的客户端收到实时更新

### Requirement: 数据缓存策略
系统 SHALL 实现智能缓存策略优化性能。

#### Scenario: 热数据缓存
- **WHEN** 频繁访问的价格数据
- **THEN** 使用 Supabase 缓存减少查询延迟

#### Scenario: 缓存失效
- **WHEN** 数据过期或更新
- **THEN** 自动刷新缓存

## MODIFIED Requirements

### Requirement: Oracle 数据获取
系统 SHALL 优先从数据库获取数据，数据库无数据时使用模拟数据。

**原有行为**: 直接生成模拟数据
**修改后行为**: 
1. 首先查询数据库中是否有有效数据
2. 数据库有数据则返回
3. 数据库无数据则调用模拟数据生成器
4. 将模拟数据写入数据库供后续使用

## REMOVED Requirements

### Requirement: localStorage 快照存储
**Reason**: 迁移到数据库存储，支持跨设备同步
**Migration**: 
1. 检测 localStorage 中是否有旧快照
2. 提示用户迁移到云端
3. 迁移完成后清除 localStorage
