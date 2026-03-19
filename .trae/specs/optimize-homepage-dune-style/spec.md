# 首页 Dune 风格设计优化规范

## Why
当前首页功能完善，但视觉风格偏向传统的卡片式设计（使用大量 `border` 和 `bg-white`），与 Dune Analytics 的简洁、数据驱动的设计风格有差距。Dune 的设计风格特点是：
1. **无卡片边框** - 使用分隔线而非边框来区分区域
2. **数据优先** - 减少装饰性元素，突出数据本身
3. **简洁的配色** - 使用中性背景，让图表和数据成为视觉焦点
4. **紧凑的布局** - 减少内边距，提高信息密度
5. **统一的视觉语言** - 整体风格一致，没有突兀的视觉元素

需要参照 Dune 的设计风格，去除卡片样式，使首页更加专业和数据驱动。

## What Changes

### 1. 全局背景优化
- **背景色** - 使用统一的浅灰背景 `#fafafa` 或 `#f8fafc`
- **移除** 各区块之间的白色背景切换
- **分隔线** - 使用细线分隔不同区块，而非背景色变化

### 2. Hero 区域优化
- **搜索框** - 保持现有设计，但去除外层容器的边框
- **指标卡片** - 去除 `border border-gray-200` 和 `bg-white`
- **指标展示** - 使用大号字体展示数据，弱化标签
- **趋势图** - 简化样式，去除多余装饰

### 3. LivePriceTicker 优化
- **去除** 外层容器的边框和背景色
- **价格卡片** - 使用简洁的无边框设计
- **滚动区域** - 使用分隔线或渐变遮罩替代背景色

### 4. BentoMetricsGrid 优化
- **Bento 卡片** - 去除所有边框和白色背景
- **使用** 网格间距和细微阴影来区分卡片
- **图表区域** - 简化图表样式，突出数据线条
- **实时指示器** - 简化样式，使用更小的标记

### 5. OracleMarketOverview 优化
- **统计卡片** - 去除边框，使用简洁布局
- **图表容器** - 去除边框，使用全宽布局
- **表格** - 使用无边框设计，细分隔线分隔行
- **侧边栏** - 简化样式，去除卡片边框

### 6. ArbitrageHeatmap 优化
- **主容器** - 去除边框和白色背景
- **统计卡片** - 使用简洁的无边框设计
- **链卡片** - 简化样式，使用颜色填充替代边框

### 7. CTA 区域优化
- **保持** 深色背景设计（作为视觉收尾）
- **简化** 内部元素样式

### 8. 整体配色调整
- **背景** - 统一使用 `#fafafa` 或 `#f8fafc`
- **分隔线** - 使用 `#e5e7eb` 或更浅的颜色
- **文字** - 使用深灰色（`#111827`）作为主文字，浅灰色（`#6b7280`）作为辅助文字
- **强调色** - 保留现有的 emerald 绿色作为强调色

## Impact
- 受影响文件：
  - `src/app/[locale]/page.tsx` - 主页面布局
  - `src/app/[locale]/home-components/ProfessionalHero.tsx` - Hero 区域
  - `src/app/[locale]/home-components/LivePriceTicker.tsx` - 实时价格滚动
  - `src/app/[locale]/home-components/BentoMetricsGrid.tsx` - Bento 指标网格
  - `src/app/[locale]/home-components/OracleMarketOverview.tsx` - 市场概览
  - `src/app/[locale]/home-components/ArbitrageHeatmap.tsx` - 套利热力图
  - `src/app/[locale]/home-components/ProfessionalCTA.tsx` - CTA 区域

## ADDED Requirements

### Requirement: Dune 风格全局样式
首页 SHALL 使用 Dune 风格的无卡片设计

#### Scenario: 用户访问首页
- **WHEN** 用户打开首页
- **THEN** 不显示卡片边框和白色背景
- **AND** 使用分隔线和间距来组织内容
- **AND** 数据展示优先，装饰性元素最小化
- **AND** 整体背景色统一

### Requirement: Hero 区域 Dune 风格
Hero 区域的指标卡片 SHALL 使用无边框设计

#### Scenario: 用户查看 Hero 区域
- **WHEN** 用户查看核心指标
- **THEN** 指标使用大号字体
- **AND** 标签使用小字号灰色文字
- **AND** 不使用卡片边框和背景
- **AND** 趋势图简洁展示

### Requirement: Bento 网格 Dune 风格
BentoMetricsGrid SHALL 使用简洁的无边框设计

#### Scenario: 用户查看 Bento 网格
- **WHEN** 用户查看指标卡片
- **THEN** 卡片没有边框
- **AND** 使用网格间距区分卡片
- **AND** 图表简洁，突出数据线条
- **AND** 实时指示器简洁

### Requirement: 市场概览 Dune 风格
OracleMarketOverview SHALL 使用简洁的无边框设计

#### Scenario: 用户查看市场概览
- **THEN** 统计卡片无边框
- **AND** 图表容器无边框
- **AND** 表格使用无边框设计
- **AND** 侧边栏简化样式

### Requirement: 套利热力图 Dune 风格
ArbitrageHeatmap SHALL 使用简洁的无边框设计

#### Scenario: 用户查看套利热力图
- **THEN** 主容器无边框
- **AND** 统计卡片使用简洁设计
- **AND** 链卡片使用颜色填充替代边框

## MODIFIED Requirements
无

## REMOVED Requirements
无
