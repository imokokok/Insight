# 多预言机对比功能代码审查与修复 Spec

## Why
多预言机对比功能存在多处逻辑问题、代码重复和不一致的数据处理，影响数据准确性和系统稳定性。需要进行深度审查并修复发现的问题。

## What Changes
- 修复重复实例化问题，统一预言机客户端管理
- 统一数据获取逻辑，消除重复代码
- 修复异常检测和风险指标计算中的逻辑问题
- 优化性能指标计算，移除硬编码值
- 统一类型定义和导出路径
- 改进错误处理和用户反馈机制

## Impact
- Affected specs: cross-oracle 页面、预言机数据获取、统计分析
- Affected code: 
  - `src/app/[locale]/cross-oracle/hooks/*`
  - `src/app/[locale]/cross-oracle/constants.tsx`
  - `src/components/oracle/charts/CrossOracleComparison/*`
  - `src/lib/oracles/performanceMetricsCalculator.ts`

## ADDED Requirements

### Requirement: 统一预言机客户端实例管理
系统 SHALL 使用单例模式管理预言机客户端实例，避免重复创建。

#### Scenario: 客户端实例复用
- **WHEN** 多个组件需要访问同一预言机
- **THEN** 应返回同一客户端实例，而非创建新实例

### Requirement: 数据获取逻辑统一
系统 SHALL 使用统一的数据获取 Hook，避免多套并行逻辑。

#### Scenario: 价格数据获取
- **WHEN** 组件需要获取预言机价格数据
- **THEN** 应通过单一 Hook 获取，确保数据一致性

### Requirement: 统计计算去重
系统 SHALL 将重复的统计计算函数统一到单一模块。

#### Scenario: 标准差计算
- **WHEN** 需要计算标准差、平均值等统计指标
- **THEN** 应调用统一的工具函数，避免多处重复实现

### Requirement: 异常检测阈值一致性
系统 SHALL 确保异常检测阈值在整个系统中保持一致。

#### Scenario: 阈值配置
- **WHEN** 检测价格异常
- **THEN** 应使用统一的阈值配置，而非各处硬编码

### Requirement: 风险指标计算基于真实数据
系统 SHALL 基于历史数据计算趋势，而非生成随机值。

#### Scenario: 趋势计算
- **WHEN** 计算风险指标趋势
- **THEN** 应基于历史数据对比，而非随机生成

### Requirement: 性能指标动态计算
系统 SHALL 尽可能使用动态计算的性能指标，减少硬编码默认值的使用。

#### Scenario: 去中心化评分
- **WHEN** 计算预言机去中心化评分
- **THEN** 应基于实际数据源分布计算，而非硬编码

### Requirement: 延迟数据真实获取
系统 SHALL 从实际请求中获取延迟数据，而非使用模拟数据。

#### Scenario: 响应时间统计
- **WHEN** 显示预言机延迟数据
- **THEN** 应使用实际请求响应时间

### Requirement: 错误处理与用户反馈
系统 SHALL 在数据获取失败时提供明确的错误反馈。

#### Scenario: 数据获取失败
- **WHEN** 预言机数据获取失败
- **THEN** 应向用户展示错误信息，而非静默失败

## MODIFIED Requirements

### Requirement: 类型定义统一
类型定义 SHALL 集中在单一文件管理，避免重复定义。

### Requirement: 并发请求控制
数据获取 SHALL 限制并发请求数量，避免浏览器限制。

## REMOVED Requirements

### Requirement: 随机趋势生成
**Reason**: 风险指标趋势应基于真实数据计算，随机生成无意义
**Migration**: 实现基于历史数据的趋势计算逻辑
