# 统一预言机页面框架规范

## Why
当前各个预言机页面（API3、Tellor、DIA、Chronicle、WINkLink、RedStone）各自实现了独立的页面结构和样式，导致：
1. 代码重复，维护困难
2. 用户体验不一致
3. 新增预言机页面成本高
4. 样式和布局混乱

通过统一页面框架，可以让所有预言机页面使用一致的显示架构，同时保留每个页面的独特功能。

## What Changes
- **统一页面布局结构**: 所有预言机页面使用相同的布局框架（PageHeader + TabNavigation + Content Area）
- **统一状态管理**: 使用统一的数据获取和状态管理 hook 模式
- **统一错误和加载处理**: 所有页面使用相同的 LoadingState 和 ErrorFallback 组件
- **统一统计卡片**: 使用 StatCard 组件统一展示统计数据
- **统一标签页配置**: 在 OracleConfig 中配置每个预言机的标签页
- **保留独特功能**: 每个预言机的专属功能面板保持不变

## Impact
- Affected specs: OraclePageTemplate, TabNavigation, OracleConfig
- Affected code: 
  - `/src/app/api3/page.tsx` 和 `API3PageContent.tsx`
  - `/src/app/tellor/page.tsx` 和 `TellorPageContent.tsx`
  - `/src/app/dia/page.tsx` 和 `DIAPageContent.tsx`
  - `/src/app/chronicle/page.tsx` 和 `ChroniclePageContent.tsx`
  - `/src/app/winklink/page.tsx` 和 `WINkLinkPageContent.tsx`
  - `/src/app/redstone/page.tsx`
  - `/src/lib/config/oracles.tsx`

## ADDED Requirements

### Requirement: 统一页面框架
The system SHALL provide a unified page framework for all oracle pages.

#### Scenario: 统一布局结构
- **GIVEN** 用户访问任意预言机页面
- **WHEN** 页面加载完成
- **THEN** 页面应显示统一的布局结构：
  - PageHeader（标题、副标题、刷新/导出按钮）
  - TabNavigation（标签导航）
  - 内容区域（根据选中标签显示不同内容）
  - 统一的统计卡片区域

#### Scenario: 统一标签页配置
- **GIVEN** OracleConfig 配置了 tabs 字段
- **WHEN** 渲染 TabNavigation 组件
- **THEN** 应根据配置显示对应的标签页

#### Scenario: 统一加载状态
- **GIVEN** 页面正在加载数据
- **WHEN** 渲染页面内容
- **THEN** 应显示统一的 LoadingState 组件，包含旋转动画和加载文字

#### Scenario: 统一错误处理
- **GIVEN** 数据加载失败
- **WHEN** 渲染页面内容
- **THEN** 应显示统一的 ErrorFallback 组件，包含错误信息和重试按钮

#### Scenario: 统一统计卡片
- **GIVEN** 页面有统计数据
- **WHEN** 渲染统计区域
- **THEN** 应使用 StatCard 组件统一展示，包含标题、数值、变化趋势和图标

#### Scenario: 保留独特功能
- **GIVEN** 某个预言机有专属功能（如 API3 的 Airnode、Tellor 的 Price Stream）
- **WHEN** 切换到对应的标签页
- **THEN** 应正确显示该预言机的专属功能面板

## MODIFIED Requirements

### Requirement: OracleConfig 扩展
The OracleConfig interface SHALL support tab configuration.

```typescript
interface OracleTab {
  id: string;
  labelKey: string; // i18n key
  icon?: ReactNode;
}

interface OracleConfig {
  // ... existing fields
  tabs: OracleTab[];
  customPanels?: {
    [tabId: string]: React.ComponentType<any>;
  };
}
```

### Requirement: OraclePageTemplate 增强
The OraclePageTemplate SHALL support custom tabs and panels.

- 接受 customTabs 属性来覆盖默认标签页
- 接受 customPanels 属性来渲染自定义面板
- 保持向后兼容，支持现有的 provider-based 标签页

## REMOVED Requirements

### Requirement: 独立页面内容组件
**Reason**: 统一使用 OraclePageTemplate 框架
**Migration**: 
- API3PageContent → 使用 OraclePageTemplate + customPanels
- TellorPageContent → 使用 OraclePageTemplate + customPanels
- DIAPageContent → 使用 OraclePageTemplate + customPanels
- ChroniclePageContent → 使用 OraclePageTemplate + customPanels
- WINkLinkPageContent → 使用 OraclePageTemplate + customPanels
- RedStone page.tsx → 使用 OraclePageTemplate
