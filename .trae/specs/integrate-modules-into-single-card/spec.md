# 多预言机对比模块整合 Spec

## Why
当前多预言机对比页面的各个功能模块（价格对比、风险预警、数据质量检测）是单独以独立卡片的形式展示的，视觉上显得分散且不够统一。用户希望将这些模块整合到一个大的统一卡片中，按照功能模块分区展示，使页面更加紧凑、美观。

## What Changes
- **整合布局**：将价格对比、风险预警、数据质量检测三个模块整合到一个大的卡片容器中
- **分区展示**：在大卡片内使用清晰的分区（section）来区分不同功能模块
- **视觉统一**：使用统一的设计风格，减少卡片间的间距和边框重复
- **模块标题**：为每个功能模块添加清晰的标题和分隔

## Impact
- Affected files:
  - `src/app/[locale]/cross-oracle/components/QueryResults.tsx` - 重构为统一卡片布局
  - `src/app/[locale]/cross-oracle/components/SimplePriceTable.tsx` - 移除外部卡片容器
  - `src/app/[locale]/cross-oracle/components/RiskAlertDashboard.tsx` - 移除外部卡片容器
  - `src/app/[locale]/cross-oracle/components/QualityDashboard.tsx` - 移除外部卡片容器

## MODIFIED Requirements

### Requirement: QueryResults 统一卡片布局
**原设计**: 三个独立卡片垂直排列，每个卡片有自己的边框和阴影
**新设计**:
1. **外层容器** - 一个大的统一卡片（白色背景、圆角、阴影）
2. **内部分区**:
   - **价格对比区** - 顶部，显示价格对比表格和统计
   - **风险预警区** - 中部，显示异常检测信息
   - **数据质量区** - 底部，显示质量评分
3. **分隔线** - 使用 subtle 的分隔线区分不同区域
4. **模块标题** - 每个区域有清晰的标题和图标

### Requirement: 子组件移除卡片容器
**修改**:
- SimplePriceTable: 移除外层卡片容器，只保留内容
- RiskAlertDashboard: 移除外层卡片容器，只保留内容
- QualityDashboard: 移除外层卡片容器，只保留内容
- 所有样式统一由 QueryResults 外层卡片控制
