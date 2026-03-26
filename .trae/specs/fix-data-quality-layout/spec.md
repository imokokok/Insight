# 数据质量指标布局优化规范

## Why
当前多预言机对比页面的数据质量指标区域（新鲜度、完整度、可靠性、综合评分）存在两个问题：
1. 四个卡片没有占满整行，右侧留有空白，视觉上不协调
2. 可靠性卡片中的历史准确率显示精度太高（如 `98.50849179729133%`），影响可读性

## What Changes
- 优化 DataQualityIndicators 组件的 compact 模式布局，使卡片占满整行
- 限制历史准确率显示精度，最多保留1位小数
- 调整卡片间距和宽度，提升视觉平衡感

## Impact
- Affected specs: 多预言机对比页面（cross-oracle）
- Affected code:
  - src/components/ui/DataQualityIndicators.tsx

## ADDED Requirements

### Requirement: 数据质量指标布局优化
The system SHALL provide 更合理的卡片布局：

#### Scenario: Compact 模式布局
- **WHEN** 数据质量指标以 compact 模式显示
- **THEN** 卡片应：
  1. 均匀分布占满整行宽度
  2. 保持适当的间距
  3. 在不同屏幕尺寸下自适应

#### Scenario: 历史准确率精度控制
- **WHEN** 显示历史准确率
- **THEN** 应限制小数位数最多1位，如 `98.5%`

## MODIFIED Requirements

### Requirement: DataQualityIndicators 组件
**Current**: 卡片布局使用 `flex-wrap`，可能导致右侧空白
**Modified**: 使用 `grid` 布局确保卡片均匀分布占满整行

**Current**: 历史准确率直接显示原始值
**Modified**: 使用 `toFixed(1)` 限制小数位数
