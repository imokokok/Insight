# 优化跨预言机对比功能规范

## Why
当前 `CrossOracleComparison` 组件虽然能够对比多个预言机的价格数据，但存在以下问题：
1. **默认只对比 3 个预言机**（Chainlink、Pyth、Band Protocol），没有充分利用所有可对比的预言机
2. **性能数据是硬编码的**，没有反映真实的预言机特性
3. **对比维度不够全面**，缺少更新频率、数据延迟、去中心化程度等关键指标
4. **没有根据预言机特性进行分组对比**，比如高频更新 vs 低频更新

需要优化组件，使其完整贴合预言机的可对比共性。

## 可对比共性分析

基于 `IOracleClient` 接口和 `BaseOracleClient` 基类，所有价格喂价预言机具有以下可对比共性：

### 核心价格指标
- **当前价格** (`price`) - 所有预言机都提供
- **价格精度** (`decimals`) - 通常为 8
- **置信度** (`confidence`) - 0-1 之间的数值
- **24h 变化** (`change24h`, `change24hPercent`)
- **响应时间** (`responseTime`) - API 调用耗时

### 性能指标
- **更新频率** - 价格更新间隔（Pyth 亚秒级 vs Chainlink 小时级）
- **数据源数量** - 聚合的数据源数量
- **支持链数量** - 多链部署情况
- **可靠性** - 服务可用性百分比
- **准确性** - 价格偏差统计
- **去中心化程度** - 节点/验证者数量

### 预言机特性分组

#### 高频更新组（适合高频交易场景）
| 预言机 | 更新频率 | 特点 |
|--------|----------|------|
| **Pyth** | ~400ms | 亚秒级更新，适合衍生品交易 |
| **RedStone** | 实时流式 | 模块化设计，按需拉取 |

#### 标准更新组（适合 DeFi 协议）
| 预言机 | 更新频率 | 特点 |
|--------|----------|------|
| **Chainlink** | 1-24小时 | 行业标杆，最广泛采用 |
| **Band Protocol** | 15-60分钟 | Cosmos 生态，跨链支持 |
| **API3** | 1小时 | 第一方预言机，dAPI |
| **DIA** | 1-24小时 | 透明数据源，社区驱动 |
| **Tellor** | 按需 | 去中心化，PoW 机制 |

## What Changes

### 1. 扩展默认对比预言机
将默认对比的预言机从 3 个扩展到 **6 个**：
- Chainlink（基准）
- Pyth（高频）
- Band Protocol（跨链）
- API3（第一方）
- RedStone（模块化）
- DIA（透明）
- Tellor（去中心化）

### 2. 优化性能数据
更新 `defaultPerformanceData`，为每个预言机提供真实的性能指标：
- 基于各预言机文档和实际数据
- 区分高频组和标准组的特性
- 添加 Tellor、DIA、RedStone、API3 的真实数据

### 3. 增强对比维度
新增以下对比维度：
- **更新频率对比** - 可视化各预言机的更新间隔差异
- **数据源透明度** - 数据来源的透明程度评分
- **延迟分布** - 价格从数据源到链上的延迟
- **价格偏差热力图** - 多资产多预言机的偏差矩阵

### 4. 分组对比视图
新增分组对比功能：
- **高频组视图** - Pyth、RedStone 对比
- **标准组视图** - Chainlink、Band、API3、DIA、Tellor 对比
- **全量对比视图** - 所有预言机对比

### 5. 智能基准选择
允许用户选择不同的基准预言机：
- Chainlink（默认，行业标准）
- Pyth（高频场景）
- 自定义基准

## Impact
- 受影响文件：
  - `src/components/oracle/charts/CrossOracleComparison/index.tsx` - 扩展默认预言机列表
  - `src/components/oracle/charts/CrossOracleComparison/crossOracleConfig.ts` - 更新性能数据
  - `src/components/oracle/charts/CrossOracleComparison/useComparisonStats.ts` - 增强统计逻辑
  - `src/components/oracle/charts/CrossOracleComparison/ComparisonControls.tsx` - 新增分组选择器
  - `src/components/oracle/charts/CrossOracleComparison/ComparisonCharts.tsx` - 新增对比图表

## ADDED Requirements

### Requirement: 扩展默认预言机列表
CrossOracleComparison 组件 SHALL 默认对比 6 个预言机

#### Scenario: 用户打开跨预言机对比页面
- **WHEN** 用户打开跨预言机对比页面
- **THEN** 默认选中 Chainlink、Pyth、Band Protocol、API3、RedStone、DIA、Tellor
- **AND** 用户可以选择最多 5 个同时对比（避免图表过于拥挤）

### Requirement: 优化性能数据
CrossOracleComparison 组件 SHALL 使用真实的预言机性能数据

#### Scenario: 用户查看性能雷达图
- **WHEN** 用户查看性能雷达图
- **THEN** 显示基于真实数据的性能指标
- **AND** 区分高频组和标准组的特性

### Requirement: 分组对比视图
CrossOracleComparison 组件 SHALL 支持按特性分组对比

#### Scenario: 用户选择高频组视图
- **WHEN** 用户选择"高频组"视图
- **THEN** 只显示 Pyth 和 RedStone 的对比
- **AND** 突出显示亚秒级更新的优势

#### Scenario: 用户选择标准组视图
- **WHEN** 用户选择"标准组"视图
- **THEN** 显示 Chainlink、Band、API3、DIA、Tellor 的对比
- **AND** 突出显示各预言机在 DeFi 协议中的适用性

### Requirement: 增强对比维度
CrossOracleComparison 组件 SHALL 提供更多对比维度

#### Scenario: 用户查看更新频率对比
- **WHEN** 用户查看更新频率对比图表
- **THEN** 显示各预言机的更新间隔（毫秒/秒/分钟/小时）
- **AND** 用对数刻度展示数量级差异

#### Scenario: 用户查看价格偏差热力图
- **WHEN** 用户查看价格偏差热力图
- **THEN** 显示多资产（BTC、ETH、SOL 等）在各预言机间的偏差矩阵
- **AND** 用颜色深浅表示偏差大小

## MODIFIED Requirements

### Requirement: 智能基准选择
CrossOracleComparison 组件 SHALL 支持选择不同基准预言机

#### Scenario: 用户切换基准预言机
- **WHEN** 用户从下拉菜单选择不同的基准预言机
- **THEN** 所有偏差计算相对于新基准
- **AND** 图表实时更新

## REMOVED Requirements
无移除功能
