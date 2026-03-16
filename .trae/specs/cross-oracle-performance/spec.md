# 跨预言机性能分析对比优化 - Product Requirement Document

## Overview
- **Summary**: 优化跨预言机比较页面的性能分析对比功能，解决硬编码问题并完善显示内容，提供更好的用户体验和更完整的性能数据分析。
- **Purpose**: 解决当前性能分析对比功能显示不完全、硬编码的问题，让用户能够更全面、更直观地比较不同预言机的性能表现。
- **Target Users**: 使用跨预言机比较页面的数据分析人员、开发者和研究人员。

## Goals
- 实现预言机性能分析对比功能的动态切换，避免硬编码
- 完善性能分析的显示内容，提供更全面的性能指标
- 充分利用 LatencyDistributionHistogram 组件的功能
- 提供清晰、直观的性能数据展示

## Non-Goals (Out of Scope)
- 不改变预言机数据的获取方式
- 不添加新的预言机数据源
- 不重构整个跨预言机比较页面的架构

## Background & Context
当前跨预言机比较页面的性能分析对比功能存在以下问题：
1. 预言机选择是硬编码的，无法动态切换
2. LatencyDistributionHistogram 组件的丰富功能（多个视图模式、时间范围切换等）没有被充分利用
3. 性能数据显示不完全，缺少很多重要的性能指标
4. 整体展示效果不够清晰和直观

## Functional Requirements
- **FR-1**: 实现预言机性能分析的动态切换功能，用户可以选择查看单个预言机的性能数据
- **FR-2**: 充分利用 LatencyDistributionHistogram 组件的所有功能（直方图、CDF、趋势图视图）
- **FR-3**: 完善性能分析摘要，显示更全面的性能指标
- **FR-4**: 实现时间范围的动态切换
- **FR-5**: 确保所有显示内容都是动态生成的，避免硬编码

## Non-Functional Requirements
- **NFR-1**: 页面加载速度保持与原来一致
- **NFR-2**: 响应式设计，在不同屏幕尺寸上都能良好显示
- **NFR-3**: 代码保持与现有代码风格一致

## Constraints
- **Technical**: 使用现有的 React、Tailwind CSS 和 Recharts 技术栈
- **Business**: 在现有功能基础上进行优化，不改变核心数据获取逻辑
- **Dependencies**: 依赖现有的 useCrossOraclePage hook 和 LatencyDistributionHistogram 组件

## Assumptions
- 现有预言机数据已经包含足够的信息来计算性能指标
- 用户希望看到更详细的性能分析数据
- LatencyDistributionHistogram 组件已经完善且可以直接使用

## Acceptance Criteria

### AC-1: 预言机动态切换
- **Given**: 用户在跨预言机比较页面的性能分析标签页
- **When**: 用户点击选择不同的预言机
- **Then**: 性能分析图表会更新显示所选预言机的数据
- **Verification**: `programmatic`
- **Notes**: 确保每个预言机都能被正确选择和显示

### AC-2: 完整的视图模式
- **Given**: 用户在查看性能分析
- **When**: 用户切换不同的视图模式（直方图、CDF、趋势图）
- **Then**: 图表会相应地更新显示
- **Verification**: `programmatic`
- **Notes**: 所有三种视图模式都应该正常工作

### AC-3: 时间范围切换
- **Given**: 用户在查看性能趋势图
- **When**: 用户切换不同的时间范围
- **Then**: 趋势图会更新显示对应时间范围的数据
- **Verification**: `programmatic`
- **Notes**: 支持 1h、6h、24h、7d 等时间范围

### AC-4: 完善的性能摘要
- **Given**: 用户查看性能分析页面
- **When**: 页面加载完成
- **Then**: 用户能看到完整的性能指标，包括响应时间、准确率、稳定性等
- **Verification**: `human-judgment`
- **Notes**: 性能指标应该清晰易读

### AC-5: 没有硬编码
- **Given**: 查看性能分析功能的代码
- **When**: 检查预言机选择和显示逻辑
- **Then**: 所有内容都是动态生成的，没有硬编码的预言机名称或数据
- **Verification**: `programmatic`
- **Notes**: 代码审查确认没有硬编码

## Open Questions
- [ ] 是否需要添加更多性能指标？
- [ ] 是否需要支持多预言机对比显示？
