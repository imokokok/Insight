# 优化文案专业性规格文档

## Why
当前项目中的部分文案存在以下问题，影响了作为专业预言机数据分析平台的形象：
1. 部分中文文案过于口语化，缺乏专业术语的严谨性
2. 中英文文案风格不一致，影响品牌一致性
3. 部分描述不够精准，未能准确传达数据分析的专业性
4. 部分缩写和简称不够规范（如"Wtd"应为"Weighted"）
5. 标签和标题的用词需要更符合金融数据分析领域的专业习惯

## What Changes
- **优化中文文案**：将口语化表达改为专业术语，提升严谨性
- **统一术语风格**：确保中英文文案在专业性和风格上保持一致
- **规范缩写**：使用完整的专业术语或行业标准缩写
- **提升数据描述准确性**：使统计指标和数据描述更加精确
- **优化导航和标签文案**：使其更符合专业数据平台的用户习惯

## Impact
- **Affected specs**: i18n国际化文件
- **Affected code**: 
  - `/src/i18n/zh-CN.json` - 中文文案优化
  - `/src/i18n/en.json` - 英文文案同步优化

## ADDED Requirements
### Requirement: 专业文案标准
系统应提供符合专业预言机数据分析平台形象的文案。

#### Scenario: 中文文案专业化
- **WHEN** 用户浏览中文界面时
- **THEN** 所有文案应使用专业术语，避免口语化表达

#### Scenario: 英文文案专业化
- **WHEN** 用户浏览英文界面时
- **THEN** 文案应符合金融数据分析领域的专业表达习惯

#### Scenario: 术语一致性
- **WHEN** 同一概念在不同位置出现时
- **THEN** 应使用一致的术语表达

## MODIFIED Requirements
### Requirement: Cross-Oracle 模块文案优化

#### 当前问题与优化方案：

1. **标题优化**
   - 当前: "跨预言机比较" / "Cross-Oracle Comparison"
   - 优化: "跨预言机价格分析" / "Cross-Oracle Price Analysis"

2. **副标题优化**
   - 当前: "多预言机价格比对与监控" / "Multi-oracle price comparison and monitoring"
   - 优化: "多源预言机实时价格对比与偏差分析" / "Multi-source Oracle Real-time Price Comparison & Deviation Analysis"

3. **统计指标优化**
   - 当前: "Wtd" (加权缩写)
   - 优化: "Weighted" / "加权"

4. **标签优化**
   - 当前: "基于标准差" / "Based on Std Dev"
   - 优化: "基于标准差评估" / "Std Dev-based Assessment"

5. **数据质量描述优化**
   - 当前: "一致性评级" / "Consistency Rating"
   - 优化: "价格一致性评分" / "Price Consistency Score"

6. **Tab标签优化**
   - 当前: "核心概览" / "Overview"
   - 优化: "数据概览" / "Data Overview"

7. **图表描述优化**
   - 当前: "价格趋势（过去24小时）" / "Price Trend (Last 24 Hours)"
   - 优化: "24小时价格走势" / "24h Price Trend"

8. **筛选器文案优化**
   - 当前: "筛选" / "Filter"
   - 优化: "数据筛选" / "Data Filter"

### Requirement: 通用统计术语优化

1. **标准差相关**
   - 当前: "基于标准差" / "Based on Std Dev"
   - 优化: "标准差基准" / "Std Dev Benchmark"

2. **价格偏差描述**
   - 当前: "偏离平均值" / "Deviation from Average"
   - 优化: "均值偏离度" / "Mean Deviation"

3. **数据新鲜度**
   - 当前: "新鲜度" / "Freshness"
   - 优化: "数据时效" / "Data Timeliness"

## REMOVED Requirements
无移除需求
