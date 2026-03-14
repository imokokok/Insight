# RedStone 预言机集成评估 Spec

## Why

RedStone 是近年来快速崛起的模块化预言机解决方案，采用独特的"按需拉取"（Pull-based）数据模型，在成本效率和数据覆盖范围方面具有显著优势。作为专业的预言机数据分析平台，评估并集成 RedStone 可以：

1. **扩展数据覆盖范围** - RedStone 支持超过 1000 种资产，包括传统预言机难以覆盖的长尾资产
2. **提供差异化分析维度** - RedStone 的模块化架构和按需付费模式为用户提供了新的评估视角
3. **保持市场竞争力** - 作为数据分析平台，需要覆盖主流及新兴预言机以提供全面的市场洞察
4. **技术多样性** - RedStone 支持 EVM、非 EVM 链和 Rollup，增强平台的跨链分析能力

## What Changes

- 新增 RedStone 预言机客户端实现
- 扩展 OracleProvider 枚举支持 REDSTONE
- 添加 RedStone 特有的数据分析维度（模块化费用、数据新鲜度分数等）
- 更新市场数据服务以支持 RedStone 真实数据获取
- 新增 RedStone 专属页面 `/redstone`
- 更新预言机对比分析，纳入 RedStone 指标
- **修复** RedStone 页面跨预言机对比和风险评估 Tab 显示为空的问题
- **BREAKING** 需要新增 REDSTONE 到 OracleProvider 枚举
- **BREAKING** 需要更新数据库 schema 支持 RedStone 特有字段

## Impact

- Affected specs: Oracle 集成层、市场数据服务、对比分析模块
- Affected code:
  - `src/lib/oracles/redstone.ts` - 新增 RedStone 客户端
  - `src/lib/oracles/factory.ts` - 更新工厂方法
  - `src/lib/oracles/index.ts` - 导出 RedStone 客户端
  - `src/lib/types/oracle.ts` - 扩展类型定义
  - `src/lib/services/marketData.ts` - 从模拟数据切换到真实数据
  - `src/app/redstone/page.tsx` - 新增页面目录（需要修复 Tab 内容）
  - `ORACLE_INTEGRATION.md` - 更新文档

---

## ADDED Requirements

### Requirement: RedStone 预言机客户端

系统 SHALL 提供完整的 RedStone 预言机客户端实现，支持价格查询、历史数据获取和特有指标分析。

#### Scenario: 获取 RedStone 价格数据
- **WHEN** 用户查询 RedStone 预言机价格
- **THEN** 系统通过 RedStone API 获取实时价格数据
- **AND** 返回标准化的 PriceData 格式

#### Scenario: 获取 RedStone 特有指标
- **WHEN** 用户查看 RedStone 网络统计
- **THEN** 系统提供模块化费用、数据新鲜度分数、数据提供者声誉等指标
- **AND** 支持与其他预言机的横向对比

#### Scenario: 支持多链查询
- **WHEN** 用户指定区块链网络
- **THEN** RedStone 客户端返回该链上的价格数据
- **AND** 支持 Ethereum、Arbitrum、Optimism、Base、Avalanche 等主流链

---

### Requirement: RedStone 数据分析页面

系统 SHALL 提供专门的 RedStone 数据分析页面，展示其独特的技术特性和市场指标。

#### Scenario: 模块化架构展示
- **WHEN** 用户访问 RedStone 页面
- **THEN** 展示其模块化数据层架构
- **AND** 显示数据提供者（Data Provider）分布和声誉评分

#### Scenario: 成本效率分析
- **WHEN** 用户查看 RedStone 指标
- **THEN** 展示按需付费模型的成本优势
- **AND** 与其他预言机的成本结构进行对比

#### Scenario: 数据覆盖范围
- **WHEN** 用户查看支持的资产
- **THEN** 展示 RedStone 覆盖的 1000+ 资产列表
- **AND** 突出显示长尾资产和 RWA（真实世界资产）支持

---

### Requirement: RedStone 页面 Tab 内容修复

系统 SHALL 修复 RedStone 页面中跨预言机对比和风险评估 Tab 显示为空的问题。

#### Scenario: 跨预言机对比 Tab 正常显示
- **WHEN** 用户点击"跨预言机对比" Tab
- **THEN** 页面显示 CrossOracleComparison 组件内容
- **AND** 展示 RedStone 与其他预言机的价格对比数据

#### Scenario: 风险评估 Tab 正常显示
- **WHEN** 用户点击"风险评估" Tab
- **THEN** 页面显示 RiskAssessmentPanel 组件内容
- **AND** 展示 RedStone 相关的风险指标和分析

---

### Requirement: 市场数据服务集成

系统 SHALL 将 RedStone 集成到市场数据服务中，从模拟数据切换到真实数据获取。

#### Scenario: DeFiLlama 数据集成
- **WHEN** 获取预言机市场数据
- **THEN** 从 DeFiLlama API 获取 RedStone 的 TVS 数据
- **AND** 更新市场概览页面的统计数据

#### Scenario: 对比数据更新
- **WHEN** 生成预言机对比数据
- **THEN** 使用 RedStone 真实指标替代模拟数据
- **AND** 确保所有指标（延迟、准确性、更新频率）基于实际数据

---

### Requirement: 类型系统扩展

系统 SHALL 扩展类型系统以支持 RedStone 特有的数据结构和指标。

#### Scenario: RedStone 特有类型定义
- **WHEN** 定义 RedStone 相关数据类型
- **THEN** 创建 RedStoneMarketData、RedStoneProviderInfo 等类型
- **AND** 保持与现有类型系统的兼容性

#### Scenario: 枚举值扩展
- **WHEN** 更新 OracleProvider 枚举
- **THEN** 添加 REDSTONE = 'redstone' 枚举值
- **AND** 更新 Blockchain 枚举支持 RedStone 支持的所有链

---

## MODIFIED Requirements

### Requirement: 预言机客户端工厂

系统 SHALL 更新 OracleClientFactory 以支持创建 RedStone 客户端实例。

原工厂仅支持 5 个预言机，现需扩展：
- 在 createClient 方法中添加 REDSTONE case
- 确保 RedStone 客户端遵循 BaseOracleClient 抽象类
- 维护单例模式，避免重复创建客户端实例

---

### Requirement: 市场概览对比分析

系统 SHALL 更新市场概览页面的对比分析模块，纳入 RedStone 数据。

原对比数据包含 6 个预言机（含 RedStone 模拟数据），现需：
- 使用真实 RedStone 数据替换模拟数据
- 更新雷达图、基准数据、相关性矩阵
- 确保 RedStone 在综合评分中准确反映其市场地位

---

## REMOVED Requirements

无移除需求。

---

## RedStone 技术特性分析

### 核心优势

| 特性 | 描述 | 对平台价值 |
|------|------|-----------|
| **模块化架构** | 数据层与执行层分离，支持灵活集成 | 展示新兴架构趋势 |
| **按需拉取** | Pull-based 模型，降低 Gas 成本 | 成本效率分析维度 |
| **广泛覆盖** | 1000+ 资产，包括长尾资产和 RWA | 扩展数据覆盖范围 |
| **多链支持** | 支持 30+ 条链，包括 L2 和 Rollup | 增强跨链分析能力 |
| **数据签名** | 所有数据经数据提供者签名验证 | 数据可信度指标 |
| **Layer 0 集成** | 原生支持跨链消息传递 | 展示前沿技术能力 |

### 与其他预言机对比

| 指标 | RedStone | Chainlink | Pyth | API3 |
|------|----------|-----------|------|------|
| **数据模型** | Pull-based | Push-based | Push-based | Push-based |
| **资产覆盖** | 1000+ | 1000+ | 500+ | 168 |
| **更新频率** | 按需（秒级） | 60s-1h | 1s | 10s-1h |
| **Gas 效率** | 高（按需付费） | 中（定期推送） | 中 | 中 |
| **长尾资产** | 优秀 | 良好 | 一般 | 一般 |
| **RWA 支持** | 是 | 是 | 有限 | 有限 |

### 集成复杂度评估

| 方面 | 复杂度 | 说明 |
|------|--------|------|
| **API 集成** | 低 | 提供 REST API 和 SDK |
| **数据标准化** | 中 | 需要适配现有 PriceData 格式 |
| **特有指标** | 中 | 模块化费用、数据新鲜度等需要新类型 |
| **页面开发** | 低-中 | 可复用现有 OraclePageTemplate |
| **文档更新** | 低 | 遵循现有文档结构 |

---

## 集成建议

### 推荐方案：**分阶段集成**

**阶段 1：基础集成（推荐立即实施）**
- 实现 RedStone 客户端基础功能（价格查询、历史数据）
- 更新市场数据服务使用真实 TVS 数据
- 添加 RedStone 到对比分析
- **修复 Tab 内容显示问题**

**阶段 2：深度集成（后续迭代）**
- 开发 RedStone 专属分析页面
- 实现特有指标展示（模块化费用、数据提供者声誉）
- 添加成本效率对比分析

**阶段 3：高级功能（根据需求）**
- RedStone 数据订阅实时更新
- 长尾资产专项分析
- RWA 资产追踪

### 预期收益

1. **数据完整性**：覆盖新兴预言机，提供更全面的市场视角
2. **差异化优势**：RedStone 的模块化架构为用户带来独特分析维度
3. **技术领先性**：展示平台对前沿预言机技术的跟踪能力
4. **用户价值**：帮助用户评估不同预言机架构的优劣

### 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| API 稳定性 | 中 | 中 | 实现优雅降级，使用缓存数据 |
| 数据格式差异 | 低 | 低 | 标准化转换层 |
| 维护成本增加 | 中 | 低 | 遵循现有架构模式，降低维护复杂度 |
