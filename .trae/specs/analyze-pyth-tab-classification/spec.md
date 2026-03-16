# Pyth Network 页面 Tab 分类合理性分析 Spec

## Why
Pyth Network 是一个高性能的预言机网络，具有独特的架构特点（1秒更新频率、90+ 数据发布者、跨链支持等）。当前页面的 tab 分类需要更好地反映 Pyth 的核心特性和用户关注点，以提供更合理的导航体验。

## What Changes
- 分析当前 Pyth Network 页面的 tab 分类结构
- 评估每个 tab 的合理性和必要性
- 提出优化建议，使 tab 分类更符合 Pyth 的架构特点和用户需求

## Impact
- 受影响页面: `/src/app/pyth-network/page.tsx`
- 受影响配置: `/src/lib/config/oracles.tsx` 中的 PYTH tabs 配置
- 用户体验: 提升 Pyth Network 页面的信息架构和导航效率

## ADDED Requirements
### Requirement: Tab 分类分析
系统应提供对 Pyth Network 当前 tab 分类的全面分析。

#### Scenario: 当前 Tab 结构审查
- **GIVEN** Pyth Network 页面当前的 tab 配置
- **WHEN** 审查每个 tab 的内容和目的
- **THEN** 应识别出分类的优点和潜在问题

#### Scenario: 优化建议
- **GIVEN** Pyth 网络的架构特点
- **WHEN** 对比其他预言机页面的 tab 设计
- **THEN** 应提出具体的 tab 重组或重命名建议

## 当前 Tab 分类分析

### 现有 Tabs (6个)
1. **market** (市场数据) - 展示价格趋势、市场统计
2. **network** (网络健康) - 网络状态、节点信息
3. **publishers** (发布者) - 数据发布者列表和统计
4. **ecosystem** (生态系统) - 生态系统概览
5. **risk** (风险评估) - 风险分析
6. **cross-oracle** (跨预言机对比) - 与其他预言机对比

### 分析结果

#### ✅ 合理的分类

1. **market (市场数据)**
   - **状态**: 合理
   - **理由**: 作为默认 tab，展示价格图表和关键市场指标，符合用户首要需求
   - **内容**: 包含 PriceChart、MarketDataPanel、快速统计数据

2. **network (网络健康)**
   - **状态**: 合理
   - **理由**: Pyth 的高频更新特性（1秒）使网络健康成为关键关注点
   - **内容**: NetworkHealthPanel 展示节点状态、延迟等指标

3. **publishers (发布者)**
   - **状态**: 合理且必要
   - **理由**: Pyth 的核心架构特点是 90+ 数据发布者，这是区别于其他预言机的关键特性
   - **内容**: 展示发布者列表、质押量、准确率
   - **建议**: 这是 Pyth 的特色 tab，应该保留并可能增强

#### ⚠️ 需要优化的分类

4. **ecosystem (生态系统)**
   - **状态**: 内容不足
   - **问题**: 当前仅显示描述文本，没有实质性内容
   - **建议**: 
     - 方案 A: 移除该 tab，将生态系统信息整合到 market tab
     - 方案 B: 丰富内容，添加集成协议列表、使用统计等

5. **risk (风险评估)**
   - **状态**: 内容不足
   - **问题**: 当前仅显示描述文本，没有实质性内容
   - **建议**:
     - 方案 A: 移除该 tab，将风险信息整合到 network tab
     - 方案 B: 添加具体的风险指标、历史风险事件等

6. **cross-oracle (跨预言机对比)**
   - **状态**: 内容不足且位置不当
   - **问题**: 
     - 当前仅显示描述文本
     - 跨预言机对比更适合作为全局功能，而非单个预言机的 tab
   - **建议**:
     - 方案 A: 移除该 tab，引导用户到专门的 cross-oracle 页面
     - 方案 B: 如果保留，需要添加实际的对比数据和图表

### 对比其他预言机 Tab 设计

| 预言机 | Tab 数量 | 特色 Tabs |
|--------|----------|-----------|
| Chainlink | 5 | market, network, ecosystem, risk, cross-oracle |
| UMA | 6 | validators, disputes (特色功能) |
| API3 | 6 | airnode, coverage, advantages (特色功能) |
| Tellor | 5 | price-stream, market-depth, multi-chain |
| Chronicle | 5 | scuttlebutt, makerdao, validators |
| DIA | 5 | transparency, coverage, verification |
| WINkLink | 5 | tron, staking, gaming (TRON生态特色) |

**观察**: 成功的预言机页面都有体现其**核心架构特色**的专属 tabs。

### 优化建议方案

#### 方案一: 精简优化 (推荐)
保留 4 个核心 tabs，移除内容不足的 tabs：

1. **market** (市场数据) - 保留并增强
2. **network** (网络健康) - 保留，可添加风险指标
3. **publishers** (发布者) - 保留并增强，这是 Pyth 的核心特色
4. **price-feeds** (价格源) - 新增，展示 Pyth 的 500+ 价格源

**优点**:
- 减少用户认知负担
- 每个 tab 都有丰富内容
- 突出 Pyth 的核心优势（高频更新、多发布者、多价格源）

#### 方案二: 内容丰富化
保留现有 6 个 tabs，但充实 ecosystem、risk、cross-oracle 的内容：

- **ecosystem**: 添加集成协议列表、TVL 统计、使用趋势
- **risk**: 添加数据质量风险、发布者集中度风险、历史偏差事件
- **cross-oracle**: 添加与其他预言机的价格对比图表

**优点**:
- 信息更全面
- 保留现有结构

**缺点**:
- 开发工作量大
- cross-oracle 作为单个页面的 tab 仍显突兀

#### 方案三: 重组分类
重新组织 tabs 以更好地反映用户旅程：

1. **overview** (概览) - 合并 market + network 关键指标
2. **publishers** (发布者) - 强化展示
3. **price-feeds** (价格源) - 展示所有支持的价格源
4. **analytics** (分析) - 深度数据分析

## 建议的 Tab 顺序

基于用户关注度和信息架构逻辑：

1. **market** (默认) - 用户最关心的价格和市值信息
2. **publishers** - Pyth 的核心差异化特性
3. **network** - 技术健康状态
4. **price-feeds** - 产品能力展示

## 结论

当前 Pyth Network 页面的 tab 分类存在以下问题：
1. ecosystem、risk、cross-oracle 三个 tab 内容严重不足
2. 没有突出 Pyth 的 500+ 价格源这一核心优势
3. tab 顺序可以更符合用户关注优先级

**推荐采用方案一