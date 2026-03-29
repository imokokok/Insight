# Band Protocol 预言机页面专业审查 Spec

## Why

用户请求对 Band Protocol 预言机页面进行专业审查，评估其是否能够覆盖 Band Protocol 预言机的核心功能，并提供改进建议。Band Protocol 是基于 Cosmos SDK 构建的跨链数据预言机平台，其核心特性包括跨链数据传输、验证者网络、Oracle Scripts、BandChain 等，需要评估当前页面是否充分展示这些核心功能。

## What Changes

- 评估现有功能模块的完整性
- 识别缺失的 Band Protocol 核心功能展示
- 提供数据真实性和准确性改进建议
- 建议新增功能模块以提升用户体验

## Impact

- Affected specs: Band Protocol 预言机页面
- Affected code:
  - `src/app/[locale]/band-protocol/` 目录下的所有文件
  - `src/hooks/oracles/band.ts`
  - `src/lib/oracles/bandProtocol.ts`
  - `src/i18n/messages/*/oracles/band.json`

## 当前实现评估

### 已实现功能模块

| 模块 | 文件 | 完成度 | 数据来源 |
|------|------|--------|----------|
| Hero 区域 | `BandProtocolHero.tsx` | 85% | 混合（API + 配置） |
| 市场视图 | `BandProtocolMarketView.tsx` | 80% | 混合 |
| 网络视图 | `BandProtocolNetworkView.tsx` | 75% | API |
| 验证者视图 | `BandProtocolValidatorsView.tsx` | 90% | API |
| 跨链视图 | `BandProtocolCrossChainView.tsx` | 70% | API |
| 数据源视图 | `BandProtocolDataFeedsView.tsx` | 40% | 硬编码 |
| 风险评估视图 | `BandProtocolRiskView.tsx` | 50% | 硬编码 |

### Band Protocol 核心功能覆盖评估

| 核心功能 | 是否覆盖 | 覆盖程度 | 优先级 |
|----------|----------|----------|--------|
| 价格数据展示 | ✅ | 高 | - |
| 历史价格趋势 | ✅ | 高 | - |
| 验证者网络状态 | ✅ | 高 | - |
| 跨链数据传输统计 | ✅ | 中 | - |
| 数据源列表 | ⚠️ | 低 | 高 |
| Oracle Scripts 展示 | ❌ | 无 | 高 |
| IBC 连接状态 | ❌ | 无 | 高 |
| BandChain 区块浏览器 | ❌ | 无 | 中 |
| 质押详情 | ⚠️ | 低 | 中 |
| 数据源提供商信息 | ❌ | 无 | 中 |
| 治理信息 | ❌ | 无 | 低 |
| API 文档链接 | ❌ | 无 | 中 |

## 发现的问题

### 问题 1: 数据源视图使用硬编码数据（高优先级）

**位置**: `src/app/[locale]/band-protocol/components/BandProtocolDataFeedsView.tsx`

**描述**: 
- 数据源列表完全硬编码，仅包含 8 个数据源
- Band Protocol 实际支持 180+ 数据源
- 缺少实时价格、更新时间等动态信息

**影响**: 用户无法了解真实的数据源覆盖范围，数据不具时效性

**建议**: 
- 从 Band Protocol API 获取真实数据源列表
- 添加实时价格和更新时间
- 支持搜索和筛选功能

### 问题 2: 风险评估数据硬编码（中优先级）

**位置**: `src/app/[locale]/band-protocol/components/BandProtocolRiskView.tsx`

**描述**:
- 历史风险事件硬编码
- 行业基准对比数据硬编码
- 风险指标数值静态

**影响**: 风险评估数据不反映真实情况

**建议**:
- 从链上数据计算真实风险指标
- 从安全审计报告获取真实事件
- 实时计算行业基准对比

### 问题 3: 缺少 Oracle Scripts 展示（高优先级）

**描述**: Band Protocol 的 Oracle Scripts 是其核心功能之一，允许开发者自定义数据请求逻辑，但页面完全没有展示

**影响**: 用户无法了解 Band Protocol 的核心能力

**建议**:
- 新增 Oracle Scripts 视图
- 展示常用 Oracle Scripts 列表
- 提供脚本详情和调用统计

### 问题 4: 缺少 IBC 连接状态（高优先级）

**描述**: Band Protocol 基于 Cosmos SDK，IBC（Inter-Blockchain Communication）是其核心功能，但页面没有展示 IBC 连接状态

**影响**: 用户无法了解 Band Protocol 的跨链能力

**建议**:
- 新增 IBC 连接视图
- 展示已连接的链和通道状态
- 显示 IBC 传输统计

### 问题 5: 缺少 BandChain 区块浏览器链接（中优先级）

**描述**: 页面没有提供到 BandChain 区块浏览器的链接

**影响**: 用户无法查看详细的链上数据

**建议**:
- 在 Hero 区域添加区块浏览器链接
- 在网络视图添加区块高度链接
- 提供交易详情链接

### 问题 6: 质押详情不足（中优先级）

**描述**: 虽然展示了质押率，但缺少质押详情

**影响**: 用户无法了解质押分布和奖励情况

**建议**:
- 新增质押分布图表
- 展示质押奖励计算器
- 显示解绑期信息

### 问题 7: 缺少数据源提供商信息（中优先级）

**描述**: 没有展示数据源提供商的信息

**影响**: 用户无法评估数据源的可靠性

**建议**:
- 展示数据源提供商列表
- 显示提供商信誉评分
- 提供提供商详情链接

### 问题 8: 缺少治理信息（低优先级）

**描述**: Band Protocol 有链上治理功能，但页面没有展示

**影响**: 用户无法了解治理提案和投票情况

**建议**:
- 新增治理视图
- 展示活跃提案
- 显示投票统计

### 问题 9: 缺少 API 文档链接（中优先级）

**描述**: 页面没有提供 API 文档链接

**影响**: 开发者难以集成

**建议**:
- 添加 API 文档链接
- 提供快速入门指南
- 展示 API 调用示例

### 问题 10: 跨链视图缺少历史对比（中优先级）

**位置**: `src/app/[locale]/band-protocol/components/BandProtocolCrossChainView.tsx`

**描述**: 跨链视图缺少历史数据对比功能

**影响**: 用户无法分析跨链数据趋势

**建议**:
- 添加历史数据对比功能
- 展示请求量趋势图
- 支持时间范围选择

## 改进建议

### 建议 1: 新增 Oracle Scripts 视图

**优先级**: 高

**功能描述**:
- 展示常用 Oracle Scripts 列表（如价格获取、随机数生成等）
- 显示每个脚本的调用次数、成功率、平均响应时间
- 提供脚本代码预览和文档链接
- 支持按类别筛选（价格、体育、随机数等）

**实现建议**:
```typescript
interface OracleScript {
  id: number;
  name: string;
  description: string;
  owner: string;
  schema: string;
  callCount: number;
  successRate: number;
  avgResponseTime: number;
  category: 'price' | 'sports' | 'random' | 'custom';
}
```

### 建议 2: 新增 IBC 连接视图

**优先级**: 高

**功能描述**:
- 展示已连接的链列表
- 显示每个连接的通道状态
- 展示 IBC 传输统计（传输量、成功率）
- 显示活跃的中继器

**实现建议**:
```typescript
interface IBCConnection {
  chainName: string;
  channelId: string;
  connectionId: string;
  status: 'active' | 'inactive';
  transfers24h: number;
  totalTransfers: number;
  relayers: string[];
}
```

### 建议 3: 改进数据源视图

**优先级**: 高

**功能描述**:
- 从 Band Protocol API 获取真实数据源列表
- 添加实时价格展示
- 显示最后更新时间
- 支持搜索和筛选
- 展示数据源提供商信息

**实现建议**:
- 使用 Band Protocol REST API: `https://laozi1.bandchain.org/api/oracle/v1/request_prices`
- 添加实时更新机制
- 实现搜索和分页功能

### 建议 4: 新增区块浏览器集成

**优先级**: 中

**功能描述**:
- 在 Hero 区域添加区块浏览器链接
- 在网络视图添加区块高度链接
- 提供交易详情链接
- 支持地址搜索

**实现建议**:
- 集成 BandChain 区块浏览器: `https://cosmoscan.io/`
- 添加快捷链接组件

### 建议 5: 改进风险评估视图

**优先级**: 中

**功能描述**:
- 从链上数据计算真实风险指标
- 从安全审计报告获取真实事件
- 实时计算行业基准对比
- 添加风险趋势图

**实现建议**:
- 使用链上数据计算去中心化指标
- 集成 CertiK、PeckShield 等审计报告
- 实现实时风险评分计算

### 建议 6: 新增质押详情视图

**优先级**: 中

**功能描述**:
- 展示质押分布图表
- 显示质押奖励计算器
- 显示解绑期信息
- 展示质押者列表

**实现建议**:
- 使用 Band Protocol Staking API
- 实现奖励计算器组件
- 添加质押分布饼图

### 建议 7: 新增治理视图

**优先级**: 低

**功能描述**:
- 展示活跃提案
- 显示投票统计
- 提供提案详情
- 显示治理参数

**实现建议**:
- 使用 Band Protocol Governance API
- 实现提案列表组件
- 添加投票进度条

## 数据源改进建议

### 真实 API 集成

Band Protocol 提供以下 API 端点，建议集成：

| 数据类型 | API 端点 | 用途 |
|----------|----------|------|
| 价格数据 | `/api/oracle/v1/request_prices` | 获取实时价格 |
| 数据源 | `/api/oracle/v1/data_sources` | 获取数据源列表 |
| Oracle Scripts | `/api/oracle/v1/oracle_scripts` | 获取脚本列表 |
| 验证者 | `/api/staking/v1/validators` | 获取验证者列表 |
| 区块 | `/api/blocks` | 获取区块数据 |
| IBC 连接 | `/api/ibc` | 获取 IBC 连接状态 |

### 数据更新频率建议

| 数据类型 | 建议更新频率 | 原因 |
|----------|--------------|------|
| 价格数据 | 30秒 | 价格实时性要求高 |
| 网络状态 | 1分钟 | 网络状态变化较慢 |
| 验证者列表 | 5分钟 | 验证者变化不频繁 |
| 数据源列表 | 10分钟 | 数据源变化不频繁 |
| IBC 连接 | 5分钟 | 连接状态变化较慢 |

## 总结

### 当前实现优点

1. **页面架构清晰** - 使用模块化设计，易于维护
2. **UI 设计现代** - 使用 Tailwind CSS，视觉效果好
3. **响应式设计** - 支持移动端和桌面端
4. **国际化支持** - 支持中英文切换
5. **验证者视图完善** - 功能完整，数据真实

### 主要改进方向

1. **数据真实性** - 替换硬编码数据为真实 API 数据
2. **核心功能覆盖** - 新增 Oracle Scripts、IBC 连接等核心功能展示
3. **用户体验** - 添加区块浏览器链接、API 文档等
4. **数据深度** - 增加历史数据对比、趋势分析等

### 优先级排序

1. **高优先级**（建议立即实施）
   - 改进数据源视图（真实数据）
   - 新增 Oracle Scripts 视图
   - 新增 IBC 连接视图

2. **中优先级**（建议近期实施）
   - 改进风险评估视图
   - 新增区块浏览器集成
   - 新增质押详情视图
   - 新增 API 文档链接

3. **低优先级**（建议后续实施）
   - 新增治理视图
   - 添加更多数据可视化
