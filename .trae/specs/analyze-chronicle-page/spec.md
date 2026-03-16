# Chronicle 页面特性分析与优化建议 Spec

## Why
Chronicle 作为 MakerDAO 生态系统的原生预言机，其页面需要充分展示其独特的技术特性（Scuttlebutt 安全协议、MakerDAO 深度集成、验证者网络）。当前页面虽然实现了基础功能，但存在 Tab 功能区分不够明确、部分 Panel 数据展示不够丰富、Tab 间存在功能重叠等问题，需要优化以提升用户体验和信息展示效果。

## What Changes
- **优化 Tab 结构**: 重新组织 Tab 顺序，合并功能重叠的 Tab，增强各 Tab 的独特性
- **增强 Network Tab**: 丰富网络健康面板的内容，整合验证者网络概览
- **优化 Risk Tab**: 与 Scuttlebutt 安全协议面板形成功能互补而非重叠
- **数据关联展示**: 在相关 Tab 之间建立数据关联，提升信息连贯性

## Impact
- 受影响文件:
  - `src/app/chronicle/page.tsx` - Tab 结构和内容组织
  - `src/lib/config/oracles.tsx` - Tab 配置更新
  - `src/components/oracle/panels/ChronicleScuttlebuttPanel.tsx` - 安全面板优化
  - `src/components/oracle/panels/ChronicleRiskAssessmentPanel.tsx` - 风险评估面板优化

## ADDED Requirements

### Requirement: Tab 结构优化
The system SHALL 提供清晰、无重叠的 Tab 功能分区

#### Scenario: Tab 功能区分明确
- **GIVEN** 用户访问 Chronicle 页面
- **WHEN** 用户切换不同 Tab
- **THEN** 每个 Tab 展示独特且明确的功能内容
- **AND** Tab 之间不存在功能重复

### Requirement: Network Tab 增强
The system SHALL 在网络 Tab 中展示全面的网络健康信息

#### Scenario: 网络健康信息丰富
- **GIVEN** 用户点击 network Tab
- **WHEN** 页面加载
- **THEN** 展示节点状态、验证者概览、网络统计、实时活动图表
- **AND** 提供网络健康度评估

### Requirement: Risk 与 Security 功能互补
The system SHALL 明确区分 Risk Tab 和 Scuttlebutt Tab 的功能定位

#### Scenario: Risk Tab 专注风险评估
- **GIVEN** 用户点击 risk Tab
- **WHEN** 页面加载
- **THEN** 展示量化风险指标、风险因素分析、历史事件统计
- **AND** 与 Scuttlebutt Tab 的安全协议特性形成功能互补

#### Scenario: Scuttlebutt Tab 专注安全协议
- **GIVEN** 用户点击 scuttlebutt Tab
- **WHEN** 页面加载
- **THEN** 展示 Scuttlebutt 协议特性、安全机制、验证状态
- **AND** 不重复展示 Risk Tab 的风险评估内容

## MODIFIED Requirements

### Requirement: Chronicle 页面 Tab 配置
**当前配置:**
```typescript
tabs: [
  { id: 'market', labelKey: 'chronicle.tabs.market' },
  { id: 'network', labelKey: 'chronicle.tabs.network' },
  { id: 'scuttlebutt', labelKey: 'chronicle.tabs.scuttlebutt' },
  { id: 'makerdao', labelKey: 'chronicle.tabs.makerdao' },
  { id: 'validators', labelKey: 'chronicle.tabs.validators' },
  { id: 'risk', labelKey: 'chronicle.tabs.risk' },
]
```

**优化后配置:**
```typescript
tabs: [
  { id: 'market', labelKey: 'chronicle.tabs.market' },      // 市场数据（保持）
  { id: 'makerdao', labelKey: 'chronicle.tabs.makerdao' },  // MakerDAO 集成（优先级提升）
  { id: 'validators', labelKey: 'chronicle.tabs.validators' }, // 验证者网络（保持）
  { id: 'network', labelKey: 'chronicle.tabs.network' },    // 网络健康（整合验证者概览）
  { id: 'scuttlebutt', labelKey: 'chronicle.tabs.scuttlebutt' }, // 安全协议（专注安全机制）
  { id: 'risk', labelKey: 'chronicle.tabs.risk' },          // 风险评估（专注风险指标）
]
```

## Current State Analysis

### 已实现特性
| Tab | 功能内容 | 数据丰富度 | 独特性 |
|-----|---------|-----------|--------|
| market | 市场数据面板、价格趋势图、快速统计 | ⭐⭐⭐⭐⭐ | 通用市场数据 |
| network | 网络健康面板 | ⭐⭐⭐ | 内容较单薄 |
| scuttlebutt | 安全级别、审计分数、安全特性、历史事件 | ⭐⭐⭐⭐⭐ | **独特 - Scuttlebutt 协议** |
| makerdao | TVL、DAI供应量、支持资产列表 | ⭐⭐⭐⭐⭐ | **独特 - MakerDAO 集成** |
| validators | 验证者列表、声誉分数、质押数据 | ⭐⭐⭐⭐⭐ | **独特 - 验证者网络** |
| risk | 风险评分、事件摘要、风险因素 | ⭐⭐⭐⭐ | 与 scuttlebutt 有重叠 |

### 存在问题
1. **network Tab 内容单薄** - 仅展示基础网络健康信息，未充分利用 validatorMetrics 数据
2. **risk 与 scuttlebutt 功能重叠** - 两者都涉及安全和审计相关内容，需要明确区分
3. **Tab 顺序可优化** - MakerDAO 作为 Chronicle 的核心应用场景，优先级应提升
4. **数据关联性不足** - 各 Panel 之间缺乏数据关联和交叉引用

### 建议优化方向
1. **Network Tab**: 整合验证者网络概览，展示节点分布、网络拓扑、实时状态
2. **Scuttlebutt Tab**: 专注展示 Scuttlebutt 协议的独特安全机制
3. **Risk Tab**: 专注量化风险评估指标，与 Scuttlebutt 形成功能互补
4. **数据关联**: 在 MakerDAO Tab 中引用验证者数据，展示集成深度
