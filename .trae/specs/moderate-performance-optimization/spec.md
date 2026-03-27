# 适度性能优化 Spec

## Why

项目已有较完善的性能优化基础设施（性能预算、监控工具、代码分割等），但存在一些明显的优化机会：部分图片未使用 Next.js Image 组件、大型图表库未充分优化、粒子动画可能影响低端设备性能。本规范旨在进行适度、务实的优化，避免过度工程化。

## What Changes

- **图片优化**: 将关键页面的原生 `<img>` 标签替换为 Next.js Image 或 OptimizedImage 组件
- **图表库优化**: 对 Recharts 组件进行懒加载优化，减少首屏 JS 负担
- **粒子动画降级**: 为 ParticleNetwork 添加性能降级策略，支持 `prefers-reduced-motion`
- **验证现有优化**: 确认现有性能配置正确生效

## Impact

- Affected specs: 首页、Oracle 详情页、图表组件
- Affected code:
  - `src/app/[locale]/home-components/ParticleNetwork.tsx`
  - `src/components/charts/LazyCharts.tsx`
  - 各 Oracle Hero 组件中的图片

## ADDED Requirements

### Requirement: 图片组件统一

The system SHALL use optimized image components for better performance:

#### Scenario: Hero 区域图片优化

- **WHEN** 用户访问 Oracle 详情页（Chainlink、Pyth、API3 等）
- **THEN** Hero 区域的 Logo 图片使用 OptimizedImage 或 Next.js Image 组件
- **AND** 图片启用 lazy loading（非首屏）
- **AND** 首屏图片设置 priority 属性

### Requirement: 图表组件懒加载

The system SHALL lazy load heavy chart components:

#### Scenario: Recharts 组件懒加载

- **WHEN** 页面包含 Recharts 图表组件
- **THEN** 非首屏图表使用 LazyCharts 或 dynamic import 延迟加载
- **AND** 加载时显示合理的占位符
- **AND** 首屏关键图表保持同步加载

### Requirement: 粒子动画性能降级

The system SHALL provide graceful degradation for particle animations:

#### Scenario: 尊重用户动画偏好

- **WHEN** 用户系统设置 `prefers-reduced-motion: reduce`
- **THEN** ParticleNetwork 组件停止动画或显示静态背景
- **AND** 不影响页面其他功能

#### Scenario: 低端设备降级

- **WHEN** 设备性能较差（检测方式：内存不足或 FPS 过低）
- **THEN** 自动降低粒子数量或禁用粒子效果
- **AND** 记录降级事件用于分析

### Requirement: 性能配置验证

The system SHALL verify existing performance configurations are working:

#### Scenario: Bundle 分析验证

- **WHEN** 运行 `ANALYZE=true npm run build`
- **THEN** 生成 Bundle 分析报告
- **AND** 验证 optimizePackageImports 对 recharts、framer-motion 生效
- **AND** 验证无重复依赖

## MODIFIED Requirements

无

## REMOVED Requirements

无
