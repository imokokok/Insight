# 修复剩余无圆角组件规格

## Why
之前的 `unify-rounded-corners` 任务虽然完成了大部分组件的圆角统一，但仍有一些组件遗漏，使用了无圆角样式（`rounded-none` 或没有圆角类）。这些组件不符合项目规范中定义的"专业微小圆角"设计标准，需要统一修复。

## What Changes
- **修复明确使用 `rounded-none` 的组件**：将不必要的 `rounded-none` 替换为适当的圆角类
- **为无圆角的 bordered 组件添加圆角**：给使用 `border` 类但没有 `rounded` 类的组件添加适当的圆角
- **保持设计一致性**：确保所有 UI 元素遵循项目圆角规范

## Impact
- 受影响文件：
  - `src/app/[locale]/cross-chain/page.tsx` - 按钮和下拉菜单
  - `src/app/[locale]/cross-chain/components/CrossChainFilters.tsx` - 复选框和按钮
  - `src/components/ui/Skeleton.tsx` - 骨架屏变体
  - `src/app/[locale]/market-overview/page.tsx` - 卡片容器
  - `src/app/[locale]/api3/page.tsx` - 卡片和容器
  - `src/app/[locale]/chainlink/page.tsx` - 统计卡片
  - `src/app/[locale]/pyth-network/page.tsx` - 输入框、按钮、卡片
  - `src/app/[locale]/winklink/page.tsx` - 统计卡片
  - `src/app/[locale]/tellor/page.tsx` - 统计卡片
  - `src/app/[locale]/redstone/page.tsx` - 列表和标签
  - `src/components/oracle/panels/RedStoneRiskAssessmentPanel.tsx` - 按钮和列表
  - `src/components/oracle/charts/CrossChainTrendChart.tsx` - 统计卡片
  - `src/components/oracle/charts/RequestTrendChart.tsx` - 统计卡片

## ADDED Requirements

### Requirement: 统一圆角应用
所有 UI 组件 SHALL 按照以下标准应用圆角：

#### 圆角规范矩阵
| 组件类型 | 圆角类 | 说明 |
|----------|--------|------|
| 卡片/面板 | `rounded-lg` (8px) | 所有卡片、面板、容器 |
| 按钮 | `rounded-md` (6px) | 所有按钮 |
| 输入框 | `rounded-md` (6px) | 所有输入框、选择器 |
| 复选框 | `rounded` (4px) | 复选框 |
| 下拉菜单 | `rounded-lg` (8px) | 下拉菜单容器 |
| 标签/徽章 | `rounded-md` (6px) | 小型标签 |
| 统计卡片 | `rounded-lg` (8px) | 数据展示卡片 |
| 列表容器 | `rounded-lg` (8px) | 列表外部容器 |

#### 需要修复的具体位置

**1. Cross-Chain 页面 (`src/app/[locale]/cross-chain/page.tsx`)**
- 行 660: 色盲模式切换按钮 - `rounded-none` → `rounded-md`
- 行 566: 收藏夹下拉按钮 - 添加 `rounded-md`
- 行 601: 收藏夹下拉菜单 - 添加 `rounded-lg`
- 行 710: CSV 导出按钮 - 添加 `rounded-md`
- 行 718: JSON 导出按钮 - 添加 `rounded-md`
- 行 724: 自动刷新控制区 - 添加 `rounded-md`

**2. Cross-Chain 过滤器 (`src/app/[locale]/cross-chain/components/CrossChainFilters.tsx`)**
- 行 234: 复选框 - `rounded-none` → `rounded`
- 行 203-217: 区块链选择按钮 - 添加 `rounded-md`
- 行 263-267: 重置图表按钮 - 添加 `rounded-md`
- 行 315: 阈值输入框 - 添加 `rounded-md`
- 行 339: ATR 乘数输入框 - 添加 `rounded-md`

**3. Skeleton 组件 (`src/components/ui/Skeleton.tsx`)**
- 行 29: rectangular 变体 - `rounded-none` → `rounded-md`

**4. 市场概览页面 (`src/app/[locale]/market-overview/page.tsx`)**
- 统计卡片容器 - 添加 `rounded-lg`

**5. API3 页面 (`src/app/[locale]/api3/page.tsx`)**
- 数据卡片 - 添加 `rounded-lg`
- 信息容器 - 添加 `rounded-md`

**6. Chainlink 页面 (`src/app/[locale]/chainlink/page.tsx`)**
- 统计网格 - 添加 `rounded-lg`

**7. Pyth Network 页面 (`src/app/[locale]/pyth-network/page.tsx`)**
- 搜索输入框 - 添加 `rounded-md`
- 刷新按钮 - 添加 `rounded-md`
- 统计网格 - 添加 `rounded-lg`
- 价格统计卡片 - 添加 `rounded-lg`
- 链选择卡片 - 添加 `rounded-lg`
- 类别标签 - 添加 `rounded-md`

**8. WINkLink 页面 (`src/app/[locale]/winklink/page.tsx`)**
- 统计网格 - 添加 `rounded-lg`

**9. Tellor 页面 (`src/app/[locale]/tellor/page.tsx`)**
- 统计网格 - 添加 `rounded-lg`

**10. RedStone 页面 (`src/app/[locale]/redstone/page.tsx`)**
- 数据源列表 - 添加 `rounded-lg`
- 状态标签 - 添加 `rounded-md`
- 价格源列表 - 添加 `rounded-lg`

**11. RedStone 风险评估面板 (`src/components/oracle/panels/RedStoneRiskAssessmentPanel.tsx`)**
- 风险等级标签 - 添加 `rounded-md`
- 数据源列表 - 添加 `rounded-lg`

**12. CrossChain 趋势图表 (`src/components/oracle/charts/CrossChainTrendChart.tsx`)**
- 统计卡片 - 添加 `rounded-lg`

**13. Request 趋势图表 (`src/components/oracle/charts/RequestTrendChart.tsx`)**
- 统计卡片 - 添加 `rounded-lg`

## MODIFIED Requirements
无修改需求，全部为新增圆角类。

## REMOVED Requirements
无移除需求。
