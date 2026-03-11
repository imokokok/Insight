# 预言机数据分析平台项目优化规范

## Why
作为预言机数据分析平台，当前项目存在以下可优化的方面：
- Next.js 配置缺少生产环境优化选项
- 组件未实现代码分割，大型组件直接打包影响首屏加载
- 图表组件库 recharts 整个被打包，缺乏按需加载
- 空 catch 块存在风险，错误被静默忽略

通过适度的项目级优化，可以提升构建性能和运行时体验。

## What Changes
- 优化 Next.js 生产构建配置
- 为大型组件添加动态导入（代码分割）
- 优化 recharts 按需导入
- 修复空 catch 块风险

## Impact
- 受影响的规范: 项目构建配置
- 受影响的代码:
  - `next.config.ts`
  - `src/components/oracle/OraclePageTemplate.tsx`
  - `src/utils/chartExport.ts`

## ADDED Requirements

### Requirement: Next.js 生产构建优化
系统应为生产环境构建添加性能优化配置。

#### Scenario: 生产环境构建
- **WHEN** 运行 `npm run build`
- **THEN** 构建输出包含优化的 bundle
- **AND** 启用 SWC minification
- **AND** 启用 bundle 分析（可选）

### Requirement: 组件代码分割
系统应为大型组件实现代码分割，减少首屏加载时间。

#### Scenario: 延迟加载大型组件
- **WHEN** 用户访问预言机详情页面
- **THEN** 只加载当前页面需要的组件
- **AND** 其他组件在需要时再加载

#### Scenario: 图表组件按需加载
- **WHEN** 页面不包含图表
- **THEN** 不加载 recharts 相关代码

### Requirement: 错误处理优化
系统应修复空 catch 块，避免错误被静默忽略。

#### Scenario: 捕获异常处理
- **WHEN** 发生异常
- **THEN** 至少记录错误日志
- **AND** 不影响用户主要操作

## MODIFIED Requirements
无修改的需求。

## REMOVED Requirements
无移除的需求。
