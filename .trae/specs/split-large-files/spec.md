# 大文件拆分规格

## Why

当前代码库中存在多个超大文件，影响代码可维护性和开发效率：

1. **ComparisonTabs.tsx (734行)** - 包含4个Tab的渲染逻辑，props数量超过70个
2. **useCrossOraclePage.ts (500行)** - 虽然已部分拆分，但主hook仍然过大
3. **oraclePanels/ 目录下的配置文件** - 每个配置文件都超过300行，包含大量重复的UI配置逻辑

这些问题导致：
- 代码难以阅读和维护
- 组件职责不单一
- 重复代码较多
- 难以进行单元测试

## What Changes

### 1. 拆分 ComparisonTabs 组件

将 ComparisonTabs 拆分为独立的 Tab 组件：

```
app/[locale]/cross-oracle/components/tabs/
├── OverviewTab.tsx          # 概览Tab (从 ComparisonTabs 提取)
├── AnalysisTab.tsx          # 分析Tab (从 ComparisonTabs 提取)
├── ChainsTab.tsx            # 链覆盖Tab (从 ComparisonTabs 提取)
├── HistoryTab.tsx           # 历史Tab (从 ComparisonTabs 提取)
└── index.ts                 # 统一导出
```

### 2. 简化 oraclePanels 配置

创建共享的渲染工具函数，减少重复代码：

```
components/oracle/common/oraclePanels/
├── utils/
│   ├── renderUtils.tsx      # 共享的渲染工具函数
│   ├── statsUtils.ts        # 统计指标生成工具
│   └── chartUtils.ts        # 图表配置生成工具
├── ChainlinkPanelConfig.tsx # 简化后的配置
├── PythPanelConfig.tsx      # 简化后的配置
└── ...其他配置文件
```

### 3. 优化 useCrossOraclePage

进一步拆分剩余的逻辑：

```
app/[locale]/cross-oracle/hooks/
├── useKeyboardNavigation.ts # 键盘导航逻辑
├── useClickOutside.ts       # 点击外部关闭逻辑
└── usePriceFetching.ts      # 价格获取逻辑简化
```

## Impact

### 受影响文件

- `ComparisonTabs.tsx` - 大幅精简，只保留Tab切换逻辑
- `oraclePanels/*.tsx` - 使用共享工具函数简化
- `useCrossOraclePage.ts` - 进一步提取通用逻辑

### 预期效果

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| ComparisonTabs 行数 | 734 | <150 | 80% |
| 配置文件平均行数 | 300+ | <150 | 50% |
| 重复代码 | 多 | 少 | 显著 |
| 可维护性 | 低 | 高 | 显著 |

## ADDED Requirements

### Requirement: ComparisonTabs 拆分
系统 SHALL 将 ComparisonTabs 拆分为独立的 Tab 组件。

#### Scenario: Tab 组件独立
- **WHEN** 开发者查看代码
- **THEN** 每个 Tab 有独立的组件文件
- **AND** ComparisonTabs 只负责 Tab 切换逻辑

### Requirement: oraclePanels 配置简化
系统 SHALL 创建共享工具函数简化面板配置。

#### Scenario: 减少重复代码
- **WHEN** 添加新的预言机面板配置
- **THEN** 使用共享工具函数生成通用UI
- **AND** 只需配置差异化的内容

### Requirement: Hook 进一步拆分
系统 SHALL 将 useCrossOraclePage 中的通用逻辑提取为独立 hook。

#### Scenario: 逻辑复用
- **WHEN** 其他组件需要相同逻辑
- **THEN** 可以直接使用提取的 hook
- **AND** 无需复制代码

## MODIFIED Requirements

### Requirement: 组件结构
**原实现:** ComparisonTabs 包含所有 Tab 渲染逻辑

**修改后:**
- 每个 Tab 独立为单独的组件
- ComparisonTabs 只负责布局和 Tab 切换
- Props 通过 Context 或精简后的接口传递

### Requirement: 面板配置
**原实现:** 每个面板配置文件包含大量重复的UI渲染逻辑

**修改后:**
- 使用共享工具函数生成通用UI
- 配置文件只包含差异化配置
- 统一的配置接口

## REMOVED Requirements

### Requirement: 单一超大组件
**原因:** 难以维护和测试
**迁移:** 拆分为多个小组件

### Requirement: 重复代码
**原因:** 违反 DRY 原则
**迁移:** 提取为共享工具函数

## 技术实现要点

### 1. Tab 组件拆分原则

- 每个 Tab 组件不超过 200 行
- 通过 Context 获取共享数据
- 保持组件职责单一

### 2. 配置简化原则

- 提取通用的 stats、KPI、图表渲染逻辑
- 配置文件只包含数据源和差异化配置
- 使用工厂模式生成通用UI

### 3. Hook 拆分原则

- 每个 hook 只负责一个明确的功能
- 保持 hook 代码行数 < 100 行
- 可独立测试

## 拆分策略

### 不要过度拆分

以下情况不拆分：
- 文件行数 < 200 行
- 逻辑紧密耦合，拆分后反而增加复杂度
- 仅被一个地方使用的私有逻辑

### 适度拆分

以下情况需要拆分：
- 文件行数 > 300 行
- 包含多个独立的功能模块
- 有明确的复用需求
- 测试困难

## 预期效果

- 代码可读性显著提升
- 组件职责更加清晰
- 重复代码大幅减少
- 单元测试更加容易编写
