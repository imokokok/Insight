# 最终版首页设计 Spec

## Why
当前 Insight 首页有9个模块，功能过于密集。参考 Dune Analytics、Nansen、DeFiLlama 等专业平台，首页应该保持简洁聚焦，只展示最核心的价值和功能，避免用户认知负荷过重。

## What Changes - 精简后的首页架构（5个模块）

### 整体设计理念
- **浅色主题**: 保持与现有页面一致的浅色主题（蓝白配色）
- **玻璃态设计**: 使用毛玻璃效果增加层次感
- **呼吸感**: 充足的留白，避免信息过载
- **聚焦核心**: 只展示最重要的功能和数据

### 1. Hero 区域 - 核心价值展示
**保留并优化**
- 全屏浅色渐变背景
- 居中大标题 + 副标题
- 搜索框 prominently placed
- 渐变 CTA 按钮
- **移除**: 实时滚动数据指标（移至数据仪表盘）

### 2. 核心指标仪表盘 - Bento Grid 布局
**保留并增强**
- 不规则网格布局（Bento Grid）
- 大卡片展示核心指标：TVS、活跃预言机、数据源数量
- 小卡片展示趋势图表
- 每个卡片都有精致的悬停效果
- **新增**: 将原来的"实时数据流"整合到这里，在卡片内展示实时数据

### 3. 预言机市场概览 - 交互式图表区
**保留**
- 市场份额饼图/环形图（可交互）
- TVS 趋势对比折线图
- 支持链数量对比柱状图
- 时间范围选择器（1D/7D/30D/ALL）

### 4. 跨链套利机会 - 实时热力图
**保留**
- 实时更新的价格差异热力图
- 突出显示套利机会
- 快速交易对切换
- **简化**: 减少链的数量，突出核心数据

### 5. CTA 区域 - 最终行动召唤
**保留并简化**
- 简洁有力的文案
- 主 CTA 按钮 + 次要链接
- **新增**: 将原来的"平台能力展示"和"社区生态"的关键信息整合到这里

## 移除的模块

1. **实时数据流** - 整合到"核心指标仪表盘"
2. **精选 Dashboard 预览** - 移至导航栏或独立页面
3. **平台能力展示** - 整合到 CTA 区域或移至关于页面
4. **社区与生态** - 整合到 CTA 区域或移至页脚

## Impact
- Affected specs: 首页整体架构精简
- Affected code:
  - `src/app/page.tsx` - 重写，减少组件引入
  - `src/app/home-components/` - 删除部分组件，更新现有组件
  - `src/i18n/zh-CN.json` 和 `en.json` - 更新翻译

## ADDED Requirements

### Requirement: 精简版首页架构
The system SHALL provide a simplified homepage with only 5 core modules.

#### Scenario: 用户访问首页
- **WHEN** 用户进入首页
- **THEN** 看到5个清晰的核心模块
- **AND** 信息层次清晰，不感到 overwhelm
- **AND** 核心功能突出

### Requirement: 整合实时数据到仪表盘
The system SHALL integrate real-time data display into the metrics dashboard.

#### Scenario: 用户查看核心指标
- **WHEN** 用户查看 Bento Grid 仪表盘
- **THEN** 看到核心指标卡片
- **AND** 卡片内展示实时更新的数据

## MODIFIED Requirements

### Requirement: 首页模块数量
**Current**: 9个模块
**Modified**:
- 精简至5个核心模块
- 合并相关功能
- 移除非核心展示模块

## REMOVED Requirements
- 移除独立的实时数据流模块
- 移除精选 Dashboard 预览模块
- 移除独立的平台能力展示模块
- 移除独立的社区与生态模块
