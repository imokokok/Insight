# Pyth Network 页面专业优化建议

## Why
作为预言机数据分析平台，Pyth Network 页面目前使用了通用模板，未能充分展示 Pyth 作为高频预言机的核心特性和数据深度。需要针对 Pyth 的技术特点提供更专业的数据展示和分析功能。

## What Changes
- 新增 Pyth 特有的置信区间价格展示
- 新增 Publisher 数据源分析面板
- 新增价格更新频率实时统计
- 实现风险评估标签页内容
- 实现生态系统标签页内容
- 新增跨链价格一致性分析
- 新增价格历史准确率分析
- 优化实时价格流展示

## Impact
- Affected specs: Pyth Network 数据展示能力
- Affected code: 
  - `src/app/pyth-network/page.tsx`
  - `src/components/oracle/OraclePageTemplate.tsx`
  - `src/components/oracle/MarketDataPanel.tsx`
  - `src/lib/oracles/pythNetwork.ts`

## ADDED Requirements

### Requirement: 置信区间价格展示
Pyth Network 提供独特的价格置信区间，系统 SHALL 展示价格置信区间数据。

#### Scenario: 价格置信区间展示
- **WHEN** 用户查看 Pyth Network 市场数据
- **THEN** 系统显示当前价格的置信区间（bid/ask spread）
- **AND** 显示置信区间宽度百分比
- **AND** 当置信区间异常宽时显示警告

### Requirement: Publisher 数据源分析
Pyth 采用 Publisher 模式提供第一方数据，系统 SHALL 展示 Publisher 相关分析数据。

#### Scenario: Publisher 列表展示
- **WHEN** 用户访问 Pyth Network 页面
- **THEN** 系统显示活跃 Publisher 列表
- **AND** 显示每个 Publisher 的可靠性评分
- **AND** 显示每个 Publisher 的数据延迟
- **AND** 支持按 Publisher 筛选价格数据

#### Scenario: Publisher 可靠性分析
- **WHEN** 用户查看 Publisher 详情
- **THEN** 系统显示该 Publisher 的历史准确率
- **AND** 显示与其他 Publisher 的价格偏差
- **AND** 显示数据提交频率统计

### Requirement: 高频更新实时展示
Pyth 以高频更新（亚秒级）著称，系统 SHALL 突出展示其实时性优势。

#### Scenario: 实时价格流
- **WHEN** 用户查看价格面板
- **THEN** 系统以流式方式展示价格更新
- **AND** 显示每秒更新次数统计
- **AND** 显示平均更新延迟
- **AND** 支持暂停/恢复实时更新

#### Scenario: 更新频率热力图
- **WHEN** 用户查看网络健康面板
- **THEN** 系统显示不同时段的价格更新频率热力图
- **AND** 标注更新频率异常时段

### Requirement: 风险评估功能
系统 SHALL 为 Pyth Network 提供专业的风险评估功能。

#### Scenario: 价格偏差风险
- **WHEN** 用户访问风险评估标签页
- **THEN** 系统显示 Pyth 价格与市场均价的偏差分析
- **AND** 当偏差超过阈值时显示风险警告
- **AND** 提供历史偏差趋势图

#### Scenario: 数据源集中度风险
- **WHEN** 用户查看风险评估
- **THEN** 系统分析 Publisher 集中度风险
- **AND** 显示单一 Publisher 故障影响评估
- **AND** 提供数据源多样性评分

#### Scenario: 跨链一致性风险
- **WHEN** 用户查看风险评估
- **THEN** 系统显示不同链上价格的一致性分析
- **AND** 标注跨链套利机会
- **AND** 显示跨链延迟风险

### Requirement: 生态系统展示
系统 SHALL 展示 Pyth Network 的生态系统集成情况。

#### Scenario: 集成协议展示
- **WHEN** 用户访问生态系统标签页
- **THEN** 系统显示使用 Pyth 数据的协议列表
- **AND** 按链分类展示
- **AND** 显示各协议的 TVL 数据

#### Scenario: 数据源覆盖展示
- **WHEN** 用户查看生态系统
- **THEN** 系统显示 Pyth 支持的数据源类型分布
- **AND** 显示加密货币、外汇、商品等分类
- **AND** 显示新增数据源趋势

### Requirement: 历史准确率分析
系统 SHALL 提供 Pyth 价格数据的历史准确率分析。

#### Scenario: 价格准确率统计
- **WHEN** 用户查看历史分析
- **THEN** 系统显示与实际成交价的偏差统计
- **AND** 显示不同市场条件下的准确率
- **AND** 提供准确率趋势图

#### Scenario: 极端行情分析
- **WHEN** 用户查看历史分析
- **THEN** 系统标注历史上的极端行情时段
- **AND** 显示极端行情下的价格表现
- **AND** 分析极端行情的恢复速度

### Requirement: 价格对比功能
系统 SHALL 提供 Pyth 与其他预言机的价格对比功能。

#### Scenario: 多预言机价格对比
- **WHEN** 用户选择价格对比功能
- **THEN** 系统同时显示 Pyth、Chainlink、Band 等预言机价格
- **AND** 显示价格差异百分比
- **AND** 标注最优价格来源

#### Scenario: 历史价格偏差分析
- **WHEN** 用户查看历史对比
- **THEN** 系统显示不同预言机价格的历史偏差趋势
- **AND** 分析偏差产生的原因
- **AND** 提供套利机会历史记录

## MODIFIED Requirements

### Requirement: 市场数据面板增强
现有市场数据面板 SHALL 针对 Pyth 特点进行增强。

#### Scenario: 增强的价格展示
- **WHEN** 用户查看 Pyth 市场数据
- **THEN** 系统显示 EMA 价格（Pyth 特有）
- **AND** 显示价格聚合方式说明
- **AND** 显示当前价格的时间戳精度

### Requirement: 网络健康面板增强
现有网络健康面板 SHALL 添加 Pyth 特有的网络指标。

#### Scenario: Solana 网络状态
- **WHEN** 用户查看网络健康
- **THEN** 系统显示 Solana 网络状态（Pyth 主要部署链）
- **AND** 显示 Solana 区块确认时间
- **AND** 显示 Pyth 程序账户状态

## REMOVED Requirements

### Requirement: 通用节点统计
**Reason**: Pyth 采用 Publisher 模式而非节点模式，传统的节点数量统计不适用
**Migration**: 替换为 Publisher 相关统计

## 优先级建议

### P0 - 核心功能（影响数据可信度）
1. 置信区间价格展示
2. Publisher 数据源分析
3. 风险评估标签页实现

### P1 - 重要功能（提升专业度）
4. 高频更新实时展示
5. 历史准确率分析
6. 生态系统展示

### P2 - 增强功能（锦上添花）
7. 价格对比功能
8. 跨链一致性分析
9. 极端行情分析

## 技术实现建议

### 数据获取
- 接入 Pyth Hermes API 获取实时价格和置信区间
- 接入 Pyth on-chain program 获取 Publisher 信息
- 缓存历史数据用于准确率分析

### 性能优化
- 使用 WebSocket 实现价格流式更新
- 使用 Web Worker 处理高频数据计算
- 实现数据聚合减少渲染压力

### UI/UX 优化
- 价格更新使用微动画提示
- 置信区间使用可视化条形图
- 风险等级使用颜色编码
