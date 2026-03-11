# 项目代码全面整理规范

## Why
当前项目存在以下问题需要全面整理：
1. **代码冗余**：多个Oracle页面存在重复的组件、类型定义和工具函数
2. **风格不一致**：不同页面的组件结构、交互模式、命名规范存在差异
3. **维护困难**：缺乏统一的开发规范，新功能开发效率低下
4. **可扩展性差**：组件复用性低，新增Oracle需要大量重复工作

## What Changes

### 第一阶段：代码重构优化
- 统一类型定义（Oracle类型、图表数据类型、筛选条件类型）
- 提取共享组件（通用图表组件、筛选组件、卡片组件）
- 重构工具函数库（统一格式化、计算、转换逻辑）
- 优化数据获取hooks

### 第二阶段：交互体验优化
- 统一Oracle页面模板结构
- 标准化Tab导航交互模式
- 统一筛选器组件和行为
- 统一数据导出功能

### 第三阶段：开发规范制定
- 建立组件开发规范
- 建立类型定义规范
- 建立Hooks使用规范
- 创建组件模板

## Impact
- 受影响的规范: 所有现有13个Oracle优化规范
- 受影响的代码:
  - `src/components/oracle/` - 所有Oracle组件
  - `src/app/*/page.tsx` - 所有页面
  - `src/lib/types/` - 类型定义
  - `src/lib/oracles/` - Oracle工具库
  - `src/hooks/` - 自定义Hooks

---

## ADDED Requirements

### Requirement: 统一类型定义
系统应为所有Oracle页面提供统一的类型定义，包括Oracle提供商枚举、数据结构、图表数据类型等。

#### Scenario: 使用统一类型
- **WHEN** 开发者创建新的Oracle组件
- **THEN** 使用项目统一的类型定义
- **AND** 类型涵盖：OracleProvider, PriceData, ValidatorData, ChartData等核心类型
- **AND** 类型定义包含完整的JSDoc注释

### Requirement: 共享组件库
系统应提供可复用的共享代码冗组件库，减少余。

#### Scenario: 使用共享组件
- **WHEN** 需要创建新的图表组件
- **THEN** 优先使用共享组件库中的组件
- **AND** 共享组件包括：ChartWrapper, FilterPanel, StatsCard, DataTable等
- **AND** 组件支持灵活的props定制

### Requirement: Oracle页面模板
所有Oracle页面应使用统一的页面模板结构。

#### Scenario: 创建新Oracle页面
- **WHEN** 需要添加新的Oracle提供商页面
- **THEN** 使用OraclePageTemplate创建页面
- **AND** 模板包含统一的Header、TabNavigation、Content布局
- **AND** 支持自定义Tab配置和数据源

### Requirement: 开发规范文档
项目应建立完善的开发规范，确保代码一致性。

#### Scenario: 遵循开发规范
- **WHEN** 开发者编写新代码
- **AND** 遵循组件命名规范（PascalCase）
- **AND** 遵循类型定义规范（接口优先）
- **AND** 遵循Hooks使用规范（自定义Hook以use开头）

---

## MODIFIED Requirements

### Requirement: OraclePageTemplate增强
扩展OraclePageTemplate支持更多配置选项和内置功能。

**优化内容**：
- 添加内置的Loading和Error状态处理
- 支持自定义页面布局配置
- 集成通用筛选逻辑

### Requirement: 图表组件统一
统一所有图表组件的风格和行为。

**优化内容**：
- 统一图表颜色主题
- 统一Tooltip样式
- 统一导出功能

### Requirement: Tab导航组件增强
增强TabNavigation组件的功能。

**优化内容**：
- 支持URL同步（可选）
- 支持快捷键导航
- 支持自定义Tab渲染

---

## REMOVED Requirements
- 无

---

## 整理任务清单

### 任务1：代码重构优化
- [ ] 1.1 审查现有类型定义，识别冗余和不一致
- [ ] 1.2 创建统一的Oracle核心类型（OracleTypes.ts）
- [ ] 1.3 提取共享图表组件
- [ ] 1.4 提取共享筛选组件
- [ ] 1.5 重构工具函数库
- [ ] 1.6 优化数据获取Hooks

### 任务2：交互体验优化
- [ ] 2.1 增强OraclePageTemplate功能
- [ ] 2.2 统一TabNavigation组件
- [ ] 2.3 统一筛选器交互模式
- [ ] 2.4 统一数据导出功能

### 任务3：开发规范制定
- [ ] 3.1 编写组件开发规范
- [ ] 3.2 编写类型定义规范
- [ ] 3.3 编写Hooks使用规范
- [ ] 3.4 创建组件代码模板
