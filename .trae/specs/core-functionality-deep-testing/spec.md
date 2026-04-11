# 核心功能深度测试规范

## Why

项目已经具备基础的测试框架,但核心业务逻辑的测试覆盖不够深入:
- Oracle客户端系统缺少完整的测试覆盖(RedStone, DIA, WINkLink客户端)
- 工厂模式的测试不够全面,缺少依赖注入、错误处理等场景
- 缓存系统缺少边界条件和并发场景测试
- 数据库操作缺少事务、错误恢复等深度测试
- WebSocket实时通信缺少连接管理、重连机制等测试
- 警报系统缺少复杂业务场景的测试
- API路由缺少权限验证、数据验证等深度测试

这些问题可能导致核心功能在边界条件下出现不可预期的行为,影响系统稳定性。

## What Changes

- 为所有Oracle客户端补充完整的单元测试(RedStone, DIA, WINkLink)
- 为OracleClientFactory补充深度测试(依赖注入、错误处理、并发场景)
- 为OracleCache补充边界条件和并发测试
- 为数据库操作补充事务和错误恢复测试
- 为WebSocket通信补充连接管理和重连测试
- 为警报系统补充复杂业务场景测试
- 为API路由补充权限验证和数据验证测试
- 为技术指标计算补充数学准确性测试
- 为数据导出功能补充格式验证测试

## Impact

- Affected specs: 测试体系、代码质量、系统稳定性
- Affected code:
  - Oracle客户端: `src/lib/oracles/**/*.ts`
  - 工厂类: `src/lib/oracles/factory.ts`
  - 缓存系统: `src/lib/oracles/base.ts` (OracleCache)
  - 数据库操作: `src/lib/oracles/base/databaseOperations.ts`
  - WebSocket: `src/lib/realtime/websocket.ts`
  - 警报系统: `src/lib/oracles/api3/**/*.ts`, `src/hooks/data/useAlerts.ts`
  - API路由: `src/app/api/**/*.ts`
  - 技术指标: `src/lib/indicators/**/*.ts`, `src/hooks/ui/useTechnicalIndicators.ts`
  - 数据导出: `src/lib/export/**/*.ts`, `src/components/export/**/*.ts`

## ADDED Requirements

### Requirement: Oracle客户端完整测试覆盖

系统 SHALL 为所有Oracle客户端提供完整的单元测试。

#### Scenario: RedStone客户端测试
- **WHEN** 测试RedStone客户端
- **THEN** 应覆盖价格获取、历史数据、错误处理、Mock数据生成等场景

#### Scenario: DIA客户端测试
- **WHEN** 测试DIA客户端
- **THEN** 应覆盖价格服务、NFT服务、网络服务、缓存机制等场景

#### Scenario: WINkLink客户端测试
- **WHEN** 测试WINkLink客户端
- **THEN** 应覆盖TRON生态集成、价格获取、错误处理等场景

### Requirement: 工厂模式深度测试

系统 SHALL 为OracleClientFactory提供全面的测试覆盖。

#### Scenario: 依赖注入测试
- **WHEN** 使用依赖注入容器
- **THEN** 工厂应正确解析和返回客户端实例

#### Scenario: 错误处理测试
- **WHEN** 请求不支持的Oracle提供商
- **THEN** 应抛出适当的错误并记录日志

#### Scenario: 并发场景测试
- **WHEN** 多个组件同时请求同一客户端
- **THEN** 应返回相同的单例实例

### Requirement: 缓存系统边界测试

系统 SHALL 为OracleCache提供边界条件和并发测试。

#### Scenario: TTL过期测试
- **WHEN** 缓存条目超过TTL
- **THEN** 应自动清理并返回null

#### Scenario: 并发访问测试
- **WHEN** 多个请求同时访问缓存
- **THEN** 应保证线程安全,无数据竞争

#### Scenario: 内存管理测试
- **WHEN** 缓存积累大量数据
- **THEN** cleanup方法应正确清理过期条目

### Requirement: 数据库操作深度测试

系统 SHALL 为数据库操作提供事务和错误恢复测试。

#### Scenario: 事务测试
- **WHEN** 执行数据库事务
- **THEN** 应保证原子性,失败时正确回滚

#### Scenario: 错误恢复测试
- **WHEN** 数据库连接失败
- **THEN** 应正确处理错误并返回适当的响应

#### Scenario: 数据验证测试
- **WHEN** 插入无效数据
- **THEN** 应拒绝并返回验证错误

### Requirement: WebSocket通信测试

系统 SHALL 为WebSocket提供连接管理和重连测试。

#### Scenario: 连接管理测试
- **WHEN** WebSocket连接建立和断开
- **THEN** 应正确管理连接状态和清理资源

#### Scenario: 重连机制测试
- **WHEN** WebSocket连接断开
- **THEN** 应自动重连并恢复订阅

#### Scenario: 消息处理测试
- **WHEN** 接收WebSocket消息
- **THEN** 应正确解析和处理不同类型的消息

### Requirement: 警报系统业务场景测试

系统 SHALL 为警报系统提供复杂业务场景测试。

#### Scenario: 警报触发测试
- **WHEN** 价格达到警报阈值
- **THEN** 应正确触发警报并通知用户

#### Scenario: 批量操作测试
- **WHEN** 执行批量警报操作
- **THEN** 应正确处理部分失败并返回详细结果

#### Scenario: 警报去重测试
- **WHEN** 同一条件多次触发
- **THEN** 应正确去重避免重复通知

### Requirement: API路由深度测试

系统 SHALL 为API路由提供权限验证和数据验证测试。

#### Scenario: 权限验证测试
- **WHEN** 未授权用户访问受保护资源
- **THEN** 应返回401错误

#### Scenario: 数据验证测试
- **WHEN** 提交无效的请求数据
- **THEN** 应返回详细的验证错误信息

#### Scenario: 速率限制测试
- **WHEN** 超过API调用限制
- **THEN** 应返回429错误并包含重试信息

### Requirement: 技术指标准确性测试

系统 SHALL 为技术指标计算提供数学准确性测试。

#### Scenario: RSI计算测试
- **WHEN** 计算RSI指标
- **THEN** 结果应在0-100范围内,且计算准确

#### Scenario: MACD计算测试
- **WHEN** 计算MACD指标
- **THEN** 应正确计算DIF、DEA、MACD柱状图

#### Scenario: 布林带计算测试
- **WHEN** 计算布林带
- **THEN** 应正确计算上轨、中轨、下轨

### Requirement: 数据导出格式验证测试

系统 SHALL 为数据导出功能提供格式验证测试。

#### Scenario: CSV导出测试
- **WHEN** 导出CSV格式
- **THEN** 应正确处理特殊字符、逗号、换行符

#### Scenario: Excel导出测试
- **WHEN** 导出Excel格式
- **THEN** 应正确格式化数字、日期、货币

#### Scenario: PDF导出测试
- **WHEN** 导出PDF格式
- **THEN** 应正确生成图表、表格、布局

## MODIFIED Requirements

### Requirement: 测试覆盖率提升

测试覆盖率 SHALL 达到更高的标准。

#### Scenario: 核心模块覆盖率
- **WHEN** 运行覆盖率检查
- **THEN** 核心业务逻辑模块覆盖率应 > 80%

#### Scenario: 总体覆盖率
- **WHEN** 运行 `npm run test:coverage`
- **THEN** 总体覆盖率应 > 70%

## REMOVED Requirements

无移除的需求。
