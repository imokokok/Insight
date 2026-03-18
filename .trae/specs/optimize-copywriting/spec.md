# 预言机数据分析平台文案优化规范

## 背景与目标

当前项目的国际化文案存在以下问题：
1. **术语不统一**：同一概念使用多种表达方式（如 Oracle/Provider/Source 混用）
2. **表述口语化**：部分文案过于随意，缺乏专业数据分析平台的严谨性
3. **信息密度低**：部分描述过于冗长，未能精准传达核心信息
4. **中英文不匹配**：部分中文文案与英文含义存在偏差

## 优化原则

### 1. 术语标准化
- 统一使用行业通用术语
- 建立术语对照表，确保中英文严格对应
- 避免同一概念的多重表述

### 2. 专业化表达
- 使用金融/数据分析领域的专业词汇
- 保持客观、准确的描述风格
- 避免模糊性形容词

### 3. 简洁精准
- 去除冗余修饰词
- 突出核心信息
- 保持文案的信息密度

### 4. 一致性
- 相同场景使用相同表述
- 保持中英文语义严格对应
- 统一大小写和标点规范

## 关键术语对照表

| 英文 | 中文 | 说明 |
|------|------|------|
| Oracle | 预言机 | 统一使用，不混用 Provider/Source |
| Price Feed | 价格馈送 | 指预言机提供的价格数据服务 |
| Data Publisher | 数据发布者 | Pyth 等预言机的数据提供方 |
| Validator | 验证者 | 区块链网络验证节点 |
| Node Operator | 节点运营者 | 预言机节点运营方 |
| TVS | 保障价值 | Total Value Secured |
| Deviation | 偏差 | 价格偏离程度 |
| Latency | 延迟 | 数据更新延迟 |
| Confidence Interval | 置信区间 | 价格可信度范围 |

## 需要优化的文案类别

### 1. 导航与菜单 (navbar)
- 优化描述性文案，使其更专业
- 统一各预言机页面的副标题风格

### 2. 首页文案 (home)
- 提升 Hero 区域的专业感
- 优化功能介绍描述

### 3. 跨预言机分析 (crossOracle)
- 统一指标命名
- 优化图表说明文案

### 4. 跨链分析 (crossChain)
- 标准化统计指标名称
- 优化技术术语表达

### 5. 各预言机详情页
- 统一统计卡片文案
- 优化风险评估描述

### 6. 通用组件 (common)
- 统一状态描述
- 优化操作按钮文案

## 具体优化示例

### Before → After

**示例 1 - 首页描述**
```
Before:
"Comprehensive analysis and comparison of mainstream oracle protocols including Chainlink, Band Protocol, UMA, Pyth, and API3. Real-time price monitoring, protocol performance evaluation, empowering Web3 developers and analysts to make informed decisions."

After:
"Professional oracle data analytics platform providing real-time price monitoring, multi-dimensional performance evaluation, and cross-protocol comparative analysis. Supporting Chainlink, Pyth, Band Protocol, and other major oracle networks."
```

**示例 2 - 跨预言机分析副标题**
```
Before:
"Multi-source Oracle Real-time Price Comparison & Deviation Analysis"

After:
"Real-Time Multi-Oracle Price Comparison & Deviation Analytics"
```

**示例 3 - 状态描述**
```
Before:
"excellent": "Excellent"
"good": "Good"
"fair": "Fair"
"poor": "Poor"

After:
"excellent": "Optimal"
"good": "Normal"
"fair": "Suboptimal"
"poor": "Critical"
```

## 实施范围

### 高优先级
1. 首页 Hero 区域文案
2. 导航菜单描述
3. 核心功能页面标题和副标题
4. 通用状态描述

### 中优先级
1. 各预言机详情页统计标签
2. 图表和可视化组件说明
3. 风险提示文案

### 低优先级
1. 设置页面文案
2. 帮助和提示信息
3. 错误提示信息

## 验收标准

1. 所有优化后的文案符合专业金融数据分析平台定位
2. 中英文文案严格对应，无歧义
3. 术语使用统一，无混用现象
4. 文案简洁，信息密度高
5. 通过团队内部评审
