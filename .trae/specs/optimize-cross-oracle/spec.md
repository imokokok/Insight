# 多预言机对比功能优化 Spec

## Why
当前多预言机对比功能存在以下问题：
1. 功能定位不清晰，与价格查询页面有重叠
2. 没有充分利用各预言机的特性差异
3. 币种选择没有考虑各预言机支持范围的差异
4. 缺少针对价格异常的风险预警功能
5. 部分功能过于复杂，使用率低

## What Changes
- **重构核心定位**：从"价格对比工具"转变为"预言机数据质量检测与风险预警平台"
- **优化币种选择**：根据已选预言机动态显示共同支持的币种
- **新增风险预警**：价格异常检测与预警（非套利机会）
- **简化功能模块**：移除低使用率的功能，聚焦核心价值
- **强化预言机特性展示**：突出各预言机的差异化优势
- **优化数据展示**：更清晰的价格偏差分析和质量评分

## Impact
- Affected specs: cross-oracle 页面整体重构
- Affected code: 
  - `src/app/[locale]/cross-oracle/page.tsx`
  - `src/app/[locale]/cross-oracle/components/ControlPanel.tsx`
  - `src/app/[locale]/cross-oracle/components/tabs/OverviewTab.tsx`
  - `src/app/[locale]/cross-oracle/hooks/useOracleData.ts`
  - `src/app/[locale]/cross-oracle/constants.ts`
  - 相关类型定义和工具函数

## ADDED Requirements

### Requirement: 动态币种选择器
The system SHALL 根据已选预言机动态显示共同支持的币种

#### Scenario: 用户选择预言机后
- **GIVEN** 用户已选择多个预言机
- **WHEN** 打开币种选择器
- **THEN** 只显示所有已选预言机共同支持的币种
- **AND** 显示每个币种支持的预言机数量

#### Scenario: 无共同币种
- **GIVEN** 用户选择的预言机没有共同支持的币种
- **WHEN** 打开币种选择器
- **THEN** 显示提示信息，建议调整预言机选择

### Requirement: 价格异常风险预警
The system SHALL 检测并预警价格异常，帮助用户识别数据风险

#### Scenario: 检测到价格偏差
- **GIVEN** 多个预言机返回同一币种的价格
- **WHEN** 某预言机价格与均价偏差超过阈值（>1%）
- **THEN** 标记该数据点为异常
- **AND** 显示风险预警提示
- **AND** 提供可能的原因分析

#### Scenario: 数据延迟预警
- **GIVEN** 预言机数据更新
- **WHEN** 某预言机数据更新时间明显滞后
- **THEN** 显示数据新鲜度警告

### Requirement: 预言机特性对比卡片
The system SHALL 展示各预言机的核心特性对比

#### Scenario: 查看预言机信息
- **GIVEN** 用户在选择预言机时
- **WHEN** 悬停或点击预言机选项
- **THEN** 显示该预言机的核心特性标签
- **AND** 显示支持的币种数量
- **AND** 显示平均响应延迟

### Requirement: 数据质量评分卡
The system SHALL 提供综合的数据质量评估

#### Scenario: 查看质量评分
- **GIVEN** 查询结果已返回
- **THEN** 显示数据一致性评分
- **AND** 显示数据新鲜度评分
- **AND** 显示数据完整性评分
- **AND** 提供改进建议

## MODIFIED Requirements

### Requirement: 简化 Tab 结构
**原设计**: overview, analysis, chains, history 四个 Tab
**新设计**: 
- **价格对比** (PriceComparison): 核心价格对比和趋势图
- **质量分析** (QualityAnalysis): 数据质量评分和风险预警
- **预言机档案** (OracleProfiles): 各预言机特性详细介绍

### Requirement: 优化统计指标展示
**原设计**: 显示均价、加权均价、最大最小值、标准差、方差等多个指标
**新设计**:
- 核心指标：中位数价格、价格区间、偏差率
- 重点突出：价格一致性评级（优秀/良好/一般/差）
- 风险指标：异常数据源数量、最大偏差值

### Requirement: 移除低使用率功能
**移除功能**:
- 历史快照对比功能（使用率低，维护成本高）
- 复杂的技术指标分析（MA、相关性矩阵等）
- 全屏图表功能（使用率低）
- 可访问颜色模式（移到全局设置）

**保留功能**:
- 价格趋势图
- 价格表格（带异常标记）
- 数据导出
- 收藏配置

## REMOVED Requirements

### Requirement: 历史快照功能
**Reason**: 使用率低，且与核心定位"实时数据质量检测"不符
**Migration**: 如有需要，可后续作为独立功能重新设计

### Requirement: 复杂技术指标分析
**Reason**: 过于专业，目标用户群体使用率低
**Migration**: 保留基础统计指标，专业分析可导出数据后使用专业工具

### Requirement: Chains Tab
**Reason**: 与价格对比核心定位关联度低，且数据展示不够直观
**Migration**: 在预言机档案中展示链支持信息
