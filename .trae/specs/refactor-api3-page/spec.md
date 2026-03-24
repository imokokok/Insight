# API3 页面重构规范

## Why
当前 API3 页面布局复杂、信息冗余，数据密度低，无法充分展示 API3 作为第一方预言机网络的核心特性。需要参考 Chainlink 页面的简洁布局，减少不必要的信息，提升数据密度，让用户能够快速获取关键信息。

## What Changes
- 重构 API3 页面布局，采用 Chainlink 页面的侧边栏导航模式
- 简化 Tab 结构，从 11 个 Tab 精简为 6 个核心 Tab
- 提升数据密度，减少冗余信息展示
- 突出 API3 第一方预言机、dAPI、Airnode 等核心特性
- 统一使用绿色主题色，保持品牌一致性
- 添加实时状态栏和价格展示

## Impact
- 受影响文件:
  - `src/app/[locale]/api3/page.tsx` - 主页面重构
  - `src/app/[locale]/api3/components/` - 新增组件目录
  - `src/app/[locale]/api3/hooks/` - 新增 hooks 目录
  - `src/app/[locale]/api3/types.ts` - 新增类型定义
  - `src/lib/config/oracles.tsx` - 更新 API3 Tab 配置
- 依赖: `useAPI3Data` hooks, `API3Client`, `OracleConfig`

## ADDED Requirements

### Requirement: 页面布局重构
The system SHALL provide与 Chainlink 页面一致的侧边栏导航布局。

#### Scenario: 页面加载
- **WHEN** 用户访问 API3 页面
- **THEN** 页面显示左侧边栏导航 + 右侧内容区的布局
- **AND** 顶部显示实时状态栏、价格信息和操作按钮
- **AND** 显示 4 个核心统计卡片

### Requirement: 侧边栏导航
The system SHALL提供 6 个核心 Tab 的侧边栏导航。

#### Scenario: 导航切换
- **WHEN** 用户点击侧边栏 Tab
- **THEN** 内容区切换到对应视图
- **AND** 当前 Tab 高亮显示
- **AND** 支持移动端抽屉式菜单

Tab 列表:
1. market - 市场数据
2. network - 网络健康
3. airnode - Airnode 部署
4. dapi - dAPI 覆盖
5. ecosystem - 生态系统
6. risk - 风险评估

### Requirement: 市场数据视图
The system SHALL提供数据密度高的市场数据视图。

#### Scenario: 市场数据展示
- **WHEN** 用户选择 market Tab
- **THEN** 显示价格趋势图表（占 2/3 宽度）
- **AND** 显示快速统计数据（占 1/3 宽度）
- **AND** 显示网络状态指标
- **AND** 显示数据源列表

### Requirement: 网络健康视图
The system SHALL提供网络健康监控视图。

#### Scenario: 网络状态展示
- **WHEN** 用户选择 network Tab
- **THEN** 显示 4 个核心网络指标卡片
- **AND** 显示网络健康面板
- **AND** 显示每小时活动图表
- **AND** 显示性能指标进度条

### Requirement: Airnode 部署视图
The system SHALL展示 Airnode 部署状态和统计。

#### Scenario: Airnode 数据展示
- **WHEN** 用户选择 airnode Tab
- **THEN** 显示 Airnode 部署列表
- **AND** 显示网络统计信息
- **AND** 突出第一方预言机优势

### Requirement: dAPI 覆盖视图
The system SHALL展示 dAPI 覆盖范围和统计。

#### Scenario: dAPI 数据展示
- **WHEN** 用户选择 dapi Tab
- **THEN** 显示 dAPI 覆盖面板
- **AND** 显示数据源可追溯性
- **AND** 显示价格偏差监控

### Requirement: 生态系统和风险评估视图
The system SHALL提供生态系统和风险评估视图。

#### Scenario: 其他 Tab 展示
- **WHEN** 用户选择 ecosystem Tab
- **THEN** 显示生态系统面板
- **WHEN** 用户选择 risk Tab
- **THEN** 显示风险评估面板

## MODIFIED Requirements

### Requirement: API3 配置更新
更新 `oracleConfigs[OracleProvider.API3]` 的 tabs 配置:

**Before:**
```typescript
tabs: [
  { id: 'market', labelKey: 'api3.tabs.market' },
  { id: 'network', labelKey: 'api3.tabs.network' },
  { id: 'airnode', labelKey: 'api3.tabs.airnode' },
  { id: 'dapi', labelKey: 'api3.tabs.dapi' },
  { id: 'staking', labelKey: 'api3.tabs.staking' },
  { id: 'advantages', labelKey: 'api3.tabs.advantages' },
  { id: 'analytics', labelKey: 'api3.tabs.analytics' },
  { id: 'gas', labelKey: 'api3.tabs.gas' },
  { id: 'cross-oracle', labelKey: 'api3.tabs.crossOracle' },
  { id: 'ecosystem', labelKey: 'api3.tabs.ecosystem' },
  { id: 'risk', labelKey: 'api3.tabs.risk' },
]
```

**After:**
```typescript
tabs: [
  { id: 'market', labelKey: 'api3.menu.marketData' },
  { id: 'network', labelKey: 'api3.menu.networkHealth' },
  { id: 'airnode', labelKey: 'api3.menu.airnode' },
  { id: 'dapi', labelKey: 'api3.menu.dapi' },
  { id: 'ecosystem', labelKey: 'api3.menu.ecosystem' },
  { id: 'risk', labelKey: 'api3.menu.riskAssessment' },
]
```

## REMOVED Requirements

### Requirement: 移除的 Tab
以下 Tab 将被移除，其内容整合到其他 Tab 中:
- staking - 质押数据整合到 market Tab
- advantages - 第一方优势整合到 airnode Tab
- analytics - 分析图表整合到 market Tab
- gas - Gas 费用对比移除
- cross-oracle - 跨预言机对比移除

## UI/UX 规范

### 布局规范
- 最大宽度: 1600px
- 侧边栏宽度: 256px (w-64)
- 卡片圆角: rounded-lg (8px)
- 按钮圆角: rounded-md (6px)

### 颜色规范
- 主题色: green (emerald)
- 主按钮: bg-emerald-600
- 激活 Tab: bg-emerald-50 text-emerald-600 border-emerald-600
- 成功状态: text-emerald-600

### 数据密度
- 统计卡片: 4 列网格
- 图表高度: 300px
- 紧凑的间距: gap-4
- 小字体标签: text-xs

## 性能要求
- 使用 React.memo 优化组件重渲染
- 使用 useMemo 缓存计算结果
- 支持数据预取
- 懒加载非首屏内容
