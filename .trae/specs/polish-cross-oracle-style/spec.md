# 跨预言机价格分析样式微调规范

## Why

当前的跨预言机价格分析功能已经完成了 Dune 风格的基础优化，整体视觉效果已经比较简洁专业。但在实际使用中，还有一些细节可以进一步优化，使界面更加精致和易读，同时保持克制的改进，避免过度设计。

主要优化点：
1. **子选项卡视觉层次** - 当前的选项卡样式略显厚重，可以更轻盈
2. **指标展示** - 核心数据的视觉权重可以调整，让数据更突出
3. **图表区域** - 图表标题和容器的视觉关系可以优化
4. **交互反馈** - 增加更细腻的 hover 和选中状态

## What Changes

### 1. 子选项卡样式优化
- **当前**：使用 `bg-gray-100` 背景标识选中状态，略显厚重
- **优化**：使用底部下划线 + 文字颜色变化，更加简洁现代
- **hover 状态**：增加微妙的过渡动画

### 2. 核心指标卡片优化
- **当前**：使用 `bg-gray-50 border border-gray-100` 卡片样式
- **优化**：
  - 去除边框，使用更浅的背景色区分
  - 增大数值字号，增强数据主导性
  - 标签使用更细的字体权重
  - 增加微妙的 hover 效果

### 3. 图表容器优化
- **当前**：图表容器使用 `bg-gray-50 border border-gray-100`
- **优化**：
  - 去除边框，保持简洁
  - 图表标题使用更小的字号和更浅的颜色
  - 图表区域增加适当的内边距

### 4. 数据表格优化
- **当前**：表格样式已经比较简洁
- **优化**：
  - 表头使用更细的字体
  - 行 hover 效果更细腻
  - 高亮行的视觉处理更柔和

### 5. 设置面板优化
- **当前**：设置项使用卡片式布局
- **优化**：
  - 使用分隔线代替边框分隔不同设置区域
  - 按钮样式更加统一
  - 增加设置项之间的视觉呼吸感

## Impact

- 受影响文件：
  - `src/components/oracle/charts/CrossOracleComparison/CrossOracleSubTabs.tsx` - 子选项卡样式
  - `src/components/oracle/charts/CrossOracleComparison/OverviewTab.tsx` - 概览指标样式
  - `src/components/oracle/charts/CrossOracleComparison/ChartsTab.tsx` - 图表容器样式
  - `src/components/oracle/charts/CrossOracleComparison/DataTab.tsx` - 数据面板样式
  - `src/components/oracle/charts/CrossOracleComparison/SettingsTab.tsx` - 设置面板样式
  - `src/components/oracle/charts/CrossOracleComparison/PriceComparisonTable.tsx` - 表格样式

## ADDED Requirements

### Requirement: 子选项卡样式优化
子选项卡 SHALL 使用更简洁的下划线式选中状态

#### Scenario: 用户切换选项卡
- **WHEN** 用户查看子选项卡
- **THEN** 选中项使用底部下划线标识
- **AND** 文字颜色变化标识状态
- **AND** 过渡动画平滑自然

### Requirement: 核心指标展示优化
核心指标 SHALL 使用无边框的简洁设计

#### Scenario: 用户查看概览页
- **WHEN** 用户查看核心指标
- **THEN** 数值使用更大字号展示
- **AND** 标签使用细体字
- **AND** 无明显的边框装饰

### Requirement: 图表区域优化
图表容器 SHALL 保持简洁的无边框设计

#### Scenario: 用户查看图表
- **WHEN** 用户查看任何图表
- **THEN** 图表容器无边框
- **AND** 标题使用小字号灰色文字
- **AND** 图表本身占据完整宽度

## MODIFIED Requirements
无

## REMOVED Requirements
无
