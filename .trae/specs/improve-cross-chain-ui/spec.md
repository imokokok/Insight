# 跨链价格分析页面 UI/UX 改进规范

## Why

当前跨链价格分析页面作为专业的预言机数据分析平台核心功能，存在以下影响专业形象和用户体验的问题：

1. **视觉层次混乱** - 统计指标、图表、表格之间缺乏清晰的信息层级，用户难以快速获取关键信息
2. **色彩使用不专业** - 颜色搭配缺乏金融数据平台的严谨性，部分对比度不足影响可读性
3. **数据展示冗余** - 12个统计指标一次性展示造成认知负担，缺乏信息优先级管理
4. **交互反馈不明确** - 按钮状态、加载状态、异常状态缺乏一致的视觉反馈机制
5. **空间利用低效** - 热力图、表格等核心组件占据过多垂直空间，用户需要频繁滚动
6. **移动端体验差** - 响应式设计不完善，小屏幕设备上数据展示不完整

## What Changes

- **重构信息架构** - 建立清晰的三层信息结构：关键指标层 → 深度分析层 → 详细数据层
- **优化色彩系统** - 统一使用金融级配色方案，确保所有文本对比度符合 WCAG AA 标准
- **简化统计展示** - 将12个统计指标精简为6个核心指标，其余放入可展开的详细面板
- **统一交互组件** - 标准化按钮、标签、卡片的悬停/点击/禁用状态样式
- **优化空间布局** - 采用更紧凑的网格系统，减少不必要的边距和间距
- **增强移动端适配** - 重新设计移动端布局，确保关键数据在窄屏上完整展示
- **改进数据表格** - 优化表格列宽、对齐方式、条件格式规则
- **优化图表展示** - 统一图表配色、坐标轴样式、图例位置

## Impact

- Affected specs: 跨链价格分析页面（cross-chain）
- Affected code:
  - src/app/[locale]/cross-chain/page.tsx
  - src/app/[locale]/cross-chain/components/
  - src/lib/config/colors.ts
  - src/components/ui/ (统计卡片、表格组件)
  - src/i18n/messages/ (国际化文本调整)

## ADDED Requirements

### Requirement: 信息架构重构
The system SHALL provide 清晰的三层信息结构：

#### Scenario: 关键指标层
- **WHEN** 用户访问跨链价格分析页面
- **THEN** 页面顶部应显示6个核心指标：
  1. 平均价格（带趋势指示）
  2. 价格区间（最高/最低）
  3. 标准差（离散程度）
  4. 中位数价格
  5. 数据点数量
  6. 一致性评级

#### Scenario: 深度分析层
- **WHEN** 用户需要深入分析
- **THEN** 应提供：
  1. 价格热力图（跨链价格差异可视化）
  2. 交互式价格图表（支持缩放/平移）
  3. 相关性分析矩阵
  4. 稳定性分析表格

#### Scenario: 详细数据层
- **WHEN** 用户需要查看具体数据
- **THEN** 应提供：
  1. 价格对比表格（带排序和筛选）
  2. 价格分布直方图
  3. 箱线图分析

### Requirement: 色彩系统优化
The system SHALL provide 金融级专业配色方案：

#### Scenario: 主色调使用
- **WHEN** 展示价格数据
- **THEN** 应使用：
  - 上涨/正向：#059669（深绿，WCAG AA 对比度 4.6:1）
  - 下跌/负向：#dc2626（深红，WCAG AA 对比度 5.7:1）
  - 中性/警告：#d97706（深橙，WCAG AA 对比度 5.2:1）
  - 主要操作：#2563eb（蓝色，WCAG AA 对比度 6.1:1）

#### Scenario: 背景层次
- **WHEN** 渲染页面背景
- **THEN** 应使用三层背景系统：
  - 页面背景：#f9fafb（gray-50）
  - 卡片背景：#ffffff（白色）
  - 悬浮背景：#f3f4f6（gray-100）

#### Scenario: 文本层次
- **WHEN** 显示文本内容
- **THEN** 应使用四级文本颜色：
  - 主要文本：#111827（gray-900，对比度 16:1）
  - 次要文本：#374151（gray-700，对比度 11:1）
  - 辅助文本：#6b7280（gray-500，对比度 6.6:1）
  - 禁用文本：#9ca3af（gray-400，对比度 4.6:1）

### Requirement: 统计指标精简
The system SHALL provide 精简的核心指标展示：

#### Scenario: 默认展示
- **WHEN** 页面加载完成
- **THEN** 默认只显示6个核心统计卡片：
  1. 平均价格 - 带趋势箭头和百分比
  2. 价格区间 - 显示最高和最低价格
  3. 标准差 - 显示百分比和绝对值
  4. 中位数价格 - 基准参考值
  5. 数据点数量 - 样本规模
  6. 一致性评级 - 综合质量评分

#### Scenario: 展开详细指标
- **WHEN** 用户点击"查看全部"按钮
- **THEN** 应展开显示额外6个指标：
  1. IQR（四分位距）
  2. 偏度
  3. 峰度
  4. 95%置信区间
  5. 变异系数
  6. 数据完整性评分

### Requirement: 交互状态统一
The system SHALL provide 一致的交互状态样式：

#### Scenario: 按钮状态
- **WHEN** 渲染按钮组件
- **THEN** 应提供四种状态样式：
  - 默认状态：bg-white border-gray-300 text-gray-700
  - 悬停状态：hover:bg-gray-50 hover:border-gray-400
  - 点击状态：active:bg-gray-100
  - 禁用状态：opacity-50 cursor-not-allowed

#### Scenario: 卡片状态
- **WHEN** 渲染数据卡片
- **THEN** 应提供：
  - 默认状态：bg-white border border-gray-200 shadow-sm
  - 悬停状态：hover:shadow-md hover:border-gray-300
  - 选中状态：ring-2 ring-primary-500 ring-offset-2

#### Scenario: 标签状态
- **WHEN** 渲染可切换标签
- **THEN** 应提供：
  - 激活状态：bg-primary-600 text-white
  - 未激活状态：bg-gray-100 text-gray-700 hover:bg-gray-200

### Requirement: 空间布局优化
The system SHALL provide 紧凑高效的空间利用：

#### Scenario: 网格系统
- **WHEN** 布局页面内容
- **THEN** 应使用：
  - 统计卡片：grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3
  - 双栏布局：grid-cols-1 lg:grid-cols-2 gap-4
  - 表格区域：max-height 400px，支持内部滚动

#### Scenario: 间距规范
- **WHEN** 设置组件间距
- **THEN** 应使用：
  - 卡片内边距：p-4（16px）
  - 卡片间距：gap-4（16px）
  - 区块间距：mb-6（24px）
  - 元素间距：gap-2（8px）

### Requirement: 移动端适配
The system SHALL provide 完善的移动端体验：

#### Scenario: 响应式断点
- **WHEN** 页面在不同设备显示
- **THEN** 应适配：
  - 移动端（< 640px）：单列布局，简化图表
  - 平板端（640px - 1024px）：双列布局，优化触摸目标
  - 桌面端（> 1024px）：完整布局，显示所有功能

#### Scenario: 触摸优化
- **WHEN** 用户在触摸设备操作
- **THEN** 应提供：
  - 最小触摸目标：44px × 44px
  - 按钮间距：至少 8px
  - 图表支持手势操作（捏合缩放、滑动平移）

### Requirement: 数据表格优化
The system SHALL provide 专业的数据表格展示：

#### Scenario: 列宽优化
- **WHEN** 渲染价格对比表格
- **THEN** 应使用：
  - 区块链名称列：min-width 150px，固定左侧
  - 价格列：min-width 120px，右对齐
  - 差异列：min-width 120px，右对齐
  - 趋势列：width 100px，居中对齐

#### Scenario: 条件格式
- **WHEN** 显示价格差异数据
- **THEN** 应应用：
  - 差异 > 0.5%：text-danger-600，背景 danger-50
  - 差异 < -0.5%：text-success-600，背景 success-50
  - 异常值：添加警告图标和 amber 标签

### Requirement: 图表展示优化
The system SHALL provide 专业的图表展示：

#### Scenario: 图表配色
- **WHEN** 渲染价格图表
- **THEN** 应使用：
  - 网格线：#e5e7eb（gray-200），虚线
  - 坐标轴：#9ca3af（gray-400）
  - 数据线条：各链品牌色，线宽 2px
  - 异常点：#f59e0b（amber-500），填充

#### Scenario: 图例布局
- **WHEN** 显示多链数据
- **THEN** 图例应：
  - 位于图表上方或右侧
  - 支持点击隐藏/显示对应线条
  - 双击聚焦单条线条
  - 显示当前数值

## MODIFIED Requirements

### Requirement: CompactStatsGrid 组件重构
**Current**: 展示12个统计指标，使用模拟 Sparkline 数据
**Modified**: 
- 默认展示6个核心指标
- 添加"查看全部/收起"切换功能
- 移除模拟数据，使用真实趋势数据
- 优化卡片间距和排版

### Requirement: PriceComparisonTable 组件重构
**Current**: 列宽不合理，条件格式规则简单
**Modified**:
- 优化列宽配置，确保数据完整显示
- 增强条件格式，添加背景色高亮
- 改进异常值标记样式
- 添加表格密度切换选项

### Requirement: PriceSpreadHeatmap 组件重构
**Current**: 热力图单元格过大，图例占用空间多
**Modified**:
- 减小单元格尺寸至 48px × 48px
- 优化图例布局，使用水平渐变条
- 改进悬停提示样式
- 添加点击选中状态

### Requirement: InteractivePriceChart 组件重构
**Current**: 图表工具栏按钮样式不统一，坐标轴样式简单
**Modified**:
- 统一工具栏按钮样式
- 优化坐标轴标签格式
- 改进提示框样式和布局
- 添加图表标题和说明

### Requirement: CrossChainFilters 组件重构
**Current**: 过滤器面板过长，移动端体验差
**Modified**:
- 添加折叠/展开功能
- 优化移动端布局
- 改进表单控件样式
- 添加过滤器摘要显示

## REMOVED Requirements

### Requirement: 移除冗余统计指标
**Reason**: 12个指标一次性展示造成认知负担
**Migration**: 使用新的精简指标展示，高级指标放入可展开面板

### Requirement: 移除模拟 Sparkline 数据
**Reason**: 使用模拟数据降低平台专业可信度
**Migration**: 使用真实历史数据生成趋势图表

### Requirement: 简化热力图图例
**Reason**: 当前图例占用过多空间且信息重复
**Migration**: 使用更紧凑的水平渐变图例
