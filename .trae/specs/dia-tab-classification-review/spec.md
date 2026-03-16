# DIA Tab 分类合理性审查 Spec

## Why
DIA 预言机页面的 Tab 分类需要与其他预言机页面保持一致性，同时确保分类逻辑清晰、用户易于理解。当前 DIA 的 Tab 分类为：market、network、transparency、coverage、verification，需要评估其合理性。

## What Changes
- 分析当前 DIA Tab 分类的合理性
- 与其他预言机页面（Pyth、API3、Chainlink 等）的 Tab 结构进行对比
- 提出 Tab 分类优化建议（如有必要）

## Impact
- 受影响文件：
  - `/src/lib/config/oracles.tsx` - Tab 配置
  - `/src/app/dia/page.tsx` - 页面实现
  - `/src/i18n/*.json` - 国际化文案

## ADDED Requirements
### Requirement: Tab 分类分析
系统应提供对 DIA 页面 Tab 分类的详细分析报告。

#### Scenario: 分析当前 Tab 结构
- **GIVEN** DIA 页面当前有 5 个 Tab
- **WHEN** 审查每个 Tab 的内容和目的
- **THEN** 应能清晰说明每个 Tab 的职责

#### Scenario: 对比其他预言机页面
- **GIVEN** 其他预言机页面（Pyth、API3、Chainlink 等）的 Tab 结构
- **WHEN** 进行横向对比
- **THEN** 应能识别出一致性差异

## Current DIA Tab 结构

| Tab ID | Label Key | 内容描述 |
|--------|-----------|----------|
| market | dia.tabs.market | 市场数据面板 + 价格趋势图 + 快速统计 |
| network | dia.tabs.network | 网络健康面板（节点状态、延迟等） |
| transparency | dia.tabs.transparency | 数据源透明度面板（数据源列表、可信度评分） |
| coverage | dia.tabs.coverage | 跨链覆盖面板（资产覆盖、链分布） |
| verification | dia.tabs.verification | 数据源验证面板（验证状态、验证记录） |

## 对比分析

### 与 Pyth Network 对比
| Pyth Tab | DIA 对应 Tab | 说明 |
|----------|--------------|------|
| market | ✅ market | 一致 |
| network | ✅ network | 一致 |
| publishers | ❌ 无 | DIA 使用 transparency/coverage/verification 替代 |
| ecosystem | ❌ 无 | DIA 缺少生态系统 Tab |
| risk | ❌ 无 | DIA 缺少风险评估 Tab |
| cross-oracle | ❌ 无 | DIA 缺少跨预言机对比 Tab |

### 与 API3 对比
| API3 Tab | DIA 对应 Tab | 说明 |
|----------|--------------|------|
| market (overview) | ✅ market | 一致 |
| network | ✅ network | 一致 |
| airnode | ❌ 无 | API3 特有的 Airnode 部署 |
| coverage | ⚠️ 同名不同义 | API3 是覆盖池，DIA 是跨链覆盖 |
| advantages | ❌ 无 | DIA 缺少优势说明 Tab |
| advanced | ❌ 无 | DIA 缺少高级功能 Tab |

### 与 Chainlink 对比
| Chainlink Tab | DIA 对应 Tab | 说明 |
|---------------|--------------|------|
| market | ✅ market | 一致 |
| network | ✅ network | 一致 |
| ecosystem | ❌ 无 | DIA 缺少生态系统 Tab |
| risk | ❌ 无 | DIA 缺少风险评估 Tab |
| cross-oracle | ❌ 无 | DIA 缺少跨预言机对比 Tab |

## 问题识别

### 1. transparency、coverage、verification 三个 Tab 内容重叠
- **transparency**: 展示数据源列表、可信度评分、状态
- **coverage**: 展示跨链资产覆盖情况
- **verification**: 展示数据源验证记录

**问题**: transparency 和 verification 都涉及数据源，概念上容易混淆。

### 2. 缺少通用 Tab
与其他预言机页面相比，DIA 缺少：
- **ecosystem**: 生态系统集成展示
- **risk**: 风险评估面板
- **cross-oracle**: 跨预言机价格对比

### 3. coverage 命名歧义
- API3 的 coverage 指"覆盖池"（staking 相关）
- DIA 的 coverage 指"跨链资产覆盖"
- 相同命名但完全不同的含义，容易造成混淆

## 建议优化方案

### 方案 A：合并相关 Tab（推荐）
将 transparency 和 verification 合并为 **data-sources** Tab：

```
tabs: [
  { id: 'market', labelKey: 'dia.tabs.market' },
  { id: 'network', labelKey: 'dia.tabs.network' },
  { id: 'data-sources', labelKey: 'dia.tabs.dataSources' },  // 合并 transparency + verification
  { id: 'coverage', labelKey: 'dia.tabs.crossChainCoverage' }, // 重命名避免歧义
  { id: 'ecosystem', labelKey: 'dia.tabs.ecosystem' },  // 新增
  { id: 'risk', labelKey: 'dia.tabs.risk' },  // 新增
]
```

### 方案 B：保持现状
如果当前 Tab 内容确实需要独立展示，可以保持现有结构，但需要：
1. 在 UI 上明确区分 transparency 和 verification 的不同
2. 将 coverage 重命名为 cross-chain 避免与 API3 混淆

## 结论

**当前 Tab 分类基本合理**，但存在以下改进空间：

1. **transparency 和 verification 可以合并**：两者都围绕数据源展开，合并后用户体验更流畅
2. **coverage 建议重命名**：改为 cross-chain 或 cross-chain-coverage，避免与 API3 的 coverage pool 混淆
3. **考虑添加 ecosystem 和 risk Tab**：与其他预言机页面保持一致性

**建议优先级**：
- P0: 将 coverage 重命名为 cross-chain（避免歧义）
- P1: 合并 transparency 和 verification
- P2: 添加 ecosystem Tab
- P3: 添加 risk Tab
