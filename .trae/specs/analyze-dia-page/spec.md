# DIA 页面特性分析与改进建议

## Why
DIA（去中心化信息资产）是一个开源的跨链数据预言机平台，专注于提供透明且可验证的金融数据馈送。当前DIA页面需要评估其是否充分展示DIA的核心特性，以及tab功能是否区分明确、符合用户预期。

## 现状分析

### 当前Tab结构
1. **market** - 市场数据：价格趋势、快速统计、市场概览
2. **network** - 网络健康：网络统计、节点状态
3. **data-sources** - 数据源：数据源透明度、数据源验证
4. **cross-chain** - 跨链覆盖：跨链资产覆盖情况
5. **ecosystem** - 生态系统：集成协议展示
6. **risk** - 风险评估：风险指标分析

### 当前已实现特性
- ✅ 价格数据获取与展示
- ✅ 历史价格图表
- ✅ 市场数据统计
- ✅ 网络健康监控
- ✅ 数据源透明度展示
- ✅ 数据源验证记录
- ✅ 跨链资产覆盖统计
- ✅ 生态系统集成展示
- ✅ 风险评估面板

### DIA核心特性对比

| DIA核心特性 | 当前支持状态 | 说明 |
|------------|-------------|------|
| 开源透明数据源 | ✅ 已支持 | data-sources tab展示 |
| 跨链数据覆盖 | ✅ 已支持 | cross-chain tab展示 |
| 数据可验证性 | ✅ 已支持 | 验证记录展示 |
| 多数据源聚合 | ✅ 已支持 | 数据源面板展示 |
| NFT数据支持 | ⚠️ 部分支持 | 跨链覆盖中有NFT统计但无详细展示 |
| 自定义数据馈送 | ❌ 未支持 | 缺少自定义数据源配置展示 |
| 社区数据源贡献 | ❌ 未支持 | 缺少社区贡献者统计 |
| 数据质量评分 | ⚠️ 基础支持 | 仅有可信度评分，缺少完整质量指标 |

## 存在的问题

### 1. Tab功能区分不够明确
- **data-sources** 和 **cross-chain** 两个tab内容有重叠，都是关于数据覆盖范围
- **ecosystem** tab内容较为单一，缺少深度信息
- 缺少专门的**质押/Staking** tab，虽然统计卡片显示了质押APR

### 2. 特性展示不完整
- 缺少NFT数据专题展示（DIA支持NFT地板价数据）
- 缺少自定义数据馈送（Custom Feeds）展示
- 缺少数据源贡献者/社区统计
- 缺少数据更新频率的详细分析

### 3. 数据深度不够
- 数据源透明度只有基础列表，缺少趋势分析
- 跨链覆盖缺少历史变化趋势
- 验证记录缺少统计图表

## What Changes

### Tab结构优化
- **BREAKING** 重新组织tab顺序，按用户关注度排序
- **BREAKING** 合并 data-sources 和 cross-chain 相关内容
- 新增 **staking** tab 展示质押详情
- 新增 **nft-data** tab 展示NFT数据支持
- 优化 ecosystem tab 内容深度

### 功能增强
- 数据源透明度增加趋势图表
- 跨链覆盖增加链间对比分析
- 验证记录增加统计面板
- 增加数据质量评分详情

### UI/UX改进
- 统计卡片增加更多DIA特有指标
- 优化空状态展示
- 增加数据刷新时间显示

## Impact
- Affected specs: DIA页面用户体验、数据展示完整性
- Affected code: 
  - `/src/app/dia/page.tsx`
  - `/src/components/oracle/panels/DIA*.tsx`
  - `/src/hooks/useDIAData.ts`
  - `/src/lib/oracles/dia.ts`
  - `/src/lib/config/oracles.tsx`
  - `/src/i18n/zh-CN.json`

## ADDED Requirements

### Requirement: Tab功能明确区分
The system SHALL provide clearly differentiated tab functionalities for DIA page.

#### Scenario: Tab导航清晰
- **WHEN** 用户浏览DIA页面
- **THEN** 每个tab都有明确独特的功能定位
- **AND** tab之间内容不重复

### Requirement: DIA核心特性完整展示
The system SHALL display all DIA core features comprehensively.

#### Scenario: 特性完整展示
- **WHEN** 用户浏览各tab
- **THEN** 能看到DIA的所有核心特性
- **AND** 包括NFT数据、自定义馈送等特色功能

## MODIFIED Requirements

### Requirement: 数据源Tab优化
**Current**: data-sources tab仅展示数据源列表
**Modified**: 增加趋势分析、质量评分详情、贡献者统计

### Requirement: 跨链覆盖Tab优化
**Current**: 仅展示资产列表和链分布
**Modified**: 增加链间对比、历史趋势、覆盖率分析

## REMOVED Requirements
无
