# 市场概览页面 UI 简化规范

## Why

当前市场概览页面虽然功能丰富，但存在**过度使用卡片样式**的问题，导致页面显得臃肿、不够专业：

1. **卡片嵌套过多** - 页面主体被多层白色卡片包裹，产生大量边框和阴影，视觉噪音严重
2. **空间浪费** - 每个卡片都有 padding 和 margin，实际内容区域被压缩
3. **缺乏呼吸感** - 密集的卡片布局让页面显得拥挤，用户难以聚焦核心信息
4. **不够现代** - 专业金融数据平台（如 Bloomberg、CoinMarketCap）倾向于使用更简洁的扁平设计

需要采用**极简设计哲学**，减少卡片使用，通过留白、排版和色彩层次来组织信息。

## What Changes

- **移除外层卡片容器** - 统计区域、图表区域、侧边栏、资产表格不再使用白色卡片包裹
- **采用扁平化设计** - 使用细分割线（hairline）替代卡片边框来区分区域
- **精简统计指标展示** - 将 6 个统计卡片合并为 1 行简洁的关键指标栏
- **优化图表区域** - 图表直接展示，控件使用 subtle 的底部分隔线
- **简化侧边栏** - 预言机列表使用极简列表样式，无卡片边框
- **资产表格扁平化** - 表格无外层卡片，使用 zebra striping 或细线分隔行
- **统一留白系统** - 使用 24px/32px 的大留白替代卡片间距

## Impact

- Affected specs: 市场概览页面（market-overview）
- Affected code:
  - src/app/[locale]/market-overview/page.tsx
  - src/app/[locale]/market-overview/components/MarketStats.tsx
  - src/app/[locale]/market-overview/components/ChartContainer.tsx
  - src/app/[locale]/market-overview/components/MarketSidebar.tsx
  - src/app/[locale]/market-overview/components/AssetsTable.tsx

## ADDED Requirements

### Requirement: 极简统计指标栏

The system SHALL provide 单行关键指标展示：

#### Scenario: 水平指标栏

- **WHEN** 显示市场统计数据
- **THEN** 使用单行水平布局展示所有关键指标
- **AND** 指标之间使用细竖线（|）或 24px 间距分隔
- **AND** 无卡片背景、无边框、无圆角
- **AND** 指标格式：标签（小字灰色）+ 数值（大字深色）+ 变化（带颜色的小字）

#### Scenario: 指标优先级

- **WHEN** 在窄屏幕显示
- **THEN** 优先显示 TVS、24h Change、Active Chains 三个核心指标
- **AND** 其他指标可横向滚动或折叠到 "More" 下拉

### Requirement: 扁平化图表区域

The system SHALL provide 无边框的图表展示：

#### Scenario: 图表直接展示

- **WHEN** 显示主图表区域
- **THEN** 图表直接渲染，无外层白色卡片包裹
- **AND** 图表标题和控件使用底部分隔线（border-b）与图表区分
- **AND** 分隔线使用 gray-100，1px 厚度

#### Scenario: 控件极简样式

- **WHEN** 显示图表控件（时间范围、图表类型）
- **THEN** 使用 text-only 按钮或 subtle 的 hover 背景
- **AND** 激活状态使用文字颜色变化（primary-600）而非背景色
- **AND** 无圆角按钮组，使用间距分隔

### Requirement: 无边框侧边栏

The system SHALL provide 极简的预言机列表：

#### Scenario: 列表扁平化

- **WHEN** 显示预言机列表
- **THEN** 使用纯文本列表，无卡片背景
- **AND** 列表项之间使用 1px 细线分隔（gray-100）
- **AND** hover 时使用 subtle 背景色（gray-50）而非边框变化

#### Scenario: 选中状态简化

- **WHEN** 选中某个预言机
- **THEN** 使用文字颜色变化（primary-600）或左侧 2px 色条标识
- **AND** 无背景色变化、无阴影

### Requirement: 扁平化资产表格

The system SHALL provide 无边框的表格展示：

#### Scenario: 表格直接展示

- **WHEN** 显示资产表格
- **THEN** 表格无外层卡片包裹
- **AND** 表头使用细底边框（gray-200）区分
- **AND** 表格行使用 zebra striping（gray-50/white 交替）或 hover 效果

#### Scenario: 精简表格样式

- **WHEN** 显示表格内容
- **THEN** 减少单元格 padding（py-2 px-3）
- **AND** 排名、价格变化等使用更 subtle 的视觉样式
- **AND** 无额外的徽章边框，使用颜色点或文字颜色区分

### Requirement: 统一留白系统

The system SHALL provide 一致的留白设计：

#### Scenario: 区域分隔

- **WHEN** 分隔不同内容区域
- **THEN** 使用 32px（space-y-8）的大间距替代卡片间距
- **AND** 不使用边框或阴影来分隔区域
- **AND** 依靠留白自然区分内容层次

#### Scenario: 内容内边距

- **WHEN** 设置内容区域内边距
- **THEN** 水平方向保持 px-4 sm:px-6 lg:px-8
- **AND** 垂直方向使用 py-6 或 py-8
- **AND** 组件内部减少 padding，依靠留白组织

## MODIFIED Requirements

### Requirement: 页面整体布局

**Current**: 多层卡片嵌套（bg-white + border + rounded-lg + p-3）
**Modified**:
- 移除所有外层卡片的 bg-white、border、rounded-lg
- 使用 bg-insight（页面背景色）作为统一背景
- 通过 space-y-8 的大间距分隔区域

### Requirement: MarketStats 组件

**Current**: 6 个卡片网格布局，每个卡片有边框、背景、圆角
**Modified**:
- 改为单行水平布局
- 无卡片样式，纯文本展示
- 指标间使用分隔线或间距
- 数值使用 tabular-nums 保持对齐

### Requirement: ChartContainer 组件

**Current**: 白色卡片包裹，内部多层控件
**Modified**:
- 无外层卡片，图表直接展示
- 标题栏使用底部分隔线
- 控件使用 text-only 样式
- 图表区域使用最小 padding

### Requirement: MarketSidebar 组件

**Current**: 白色卡片包裹，列表项有边框
**Modified**:
- 无外层卡片
- 列表使用细线分隔
- 选中状态使用左侧色条或文字颜色
- 更紧凑的列表项高度（40-44px）

### Requirement: AssetsTable 组件

**Current**: 白色卡片包裹表格
**Modified**:
- 无外层卡片
- 表头使用细边框
- 行使用 zebra striping
- 更紧凑的单元格 padding

## REMOVED Requirements

### Requirement: 卡片悬停效果

**Reason**: 扁平化设计不需要卡片的 hover:border-gray-300 效果
**Migration**: 直接移除所有卡片的 transition-all duration-200 hover:border-gray-300

### Requirement: 卡片圆角

**Reason**: 专业数据平台倾向于使用更锐利的边角
**Migration**: 移除所有 rounded-lg，使用直角或极小的圆角（rounded-sm）

### Requirement: 卡片阴影和边框

**Reason**: 扁平化设计依靠留白而非边框组织内容
**Migration**: 移除所有 bg-white border border-gray-200，使用透明背景
