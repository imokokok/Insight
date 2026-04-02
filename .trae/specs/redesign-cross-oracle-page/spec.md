# 多预言机对比页面完全重构 Spec

## Why
虽然之前已完成功能优化，但页面布局和展示方式仍未充分体现"预言机数据质量检测与风险预警平台"的核心定位。需要：
1. 更突出地展示风险预警信息
2. 更直观地呈现数据质量评分
3. 更清晰地对比各预言机特性
4. 去除冗余信息，聚焦核心价值

## What Changes
- **全新页面布局**：采用更现代化的卡片式布局，突出风险和质量信息
- **风险预警区域前置**：将风险预警作为页面最突出的元素
- **数据质量仪表盘**：设计专门的质量评分展示区域
- **预言机对比矩阵**：直观展示各预言机的特性和差异
- **简化价格展示**：价格信息简洁呈现，不过度强调
- **移除冗余组件**：StatsOverview、复杂统计指标等

## Impact
- Affected files:
  - `src/app/[locale]/cross-oracle/page.tsx` - 完全重写布局
  - `src/app/[locale]/cross-oracle/components/` - 多个组件重构
  - `src/i18n/messages/` - 新增文案

## ADDED Requirements

### Requirement: 风险预警仪表盘
The system SHALL 在页面顶部 prominently 展示风险预警信息

#### Scenario: 有价格异常时
- **GIVEN** 检测到价格异常
- **THEN** 页面顶部显示醒目的风险预警卡片
- **AND** 显示异常数量、风险等级分布
- **AND** 提供快速查看详情的入口

#### Scenario: 无异常时
- **GIVEN** 数据正常
- **THEN** 显示绿色安全状态指示

### Requirement: 数据质量评分仪表盘
The system SHALL 提供直观的数据质量评分展示

#### Scenario: 展示质量评分
- **GIVEN** 查询结果已返回
- **THEN** 显示综合质量评分（大数字+环形图）
- **AND** 显示三个维度的分项评分
- **AND** 提供改进建议

### Requirement: 预言机对比矩阵
The system SHALL 以矩阵形式展示各预言机的核心特性

#### Scenario: 对比预言机
- **GIVEN** 用户选择多个预言机
- **THEN** 显示对比表格/卡片
- **AND** 包含：支持币种数、平均延迟、更新频率、特性标签

### Requirement: 简洁价格展示
The system SHALL 简洁地展示价格对比信息

#### Scenario: 展示价格
- **GIVEN** 价格数据已返回
- **THEN** 显示中位数价格和价格区间
- **AND** 以简洁表格展示各预言机价格
- **AND** 突出显示异常价格

## MODIFIED Requirements

### Requirement: 页面布局重构
**原设计**: 顶部StatsOverview + Header + StatsSection + ComparisonTabs
**新设计**:
1. **风险预警区**（顶部，全宽）- 最醒目位置
2. **控制面板**（左侧边栏，固定）- 币种、预言机、时间选择
3. **质量评分仪表盘**（右侧主区域顶部）- 综合评分+分项评分
4. **价格对比区**（右侧主区域中部）- 简洁价格表格+趋势图
5. **预言机特性对比**（右侧主区域底部）- 特性矩阵

### Requirement: 移除冗余组件
**移除**:
- StatsOverview - 信息重复
- StatsSection - 过于复杂
- 复杂统计指标（方差、加权均价等）
- 历史快照相关UI
- 全屏图表功能

**保留并简化**:
- HeaderSection - 简化版本
- ControlPanel - 优化版本
- PriceTable - 简化版本
- ExportSection

### Requirement: Tab结构简化
**原设计**: 3个Tab（价格对比、质量分析、预言机档案）
**新设计**: 单页展示，无需Tab切换
- 所有核心信息在一个页面展示
- 通过滚动查看不同区域
- 使用锚点快速跳转

## REMOVED Requirements

### Requirement: Tab导航
**Reason**: 单页展示更符合"仪表盘"定位
**Migration**: 使用页面内锚点导航替代

### Requirement: 复杂技术指标展示
**Reason**: 过于专业，与核心定位不符
**Migration**: 保留基础指标，专业数据可导出
