# 跨预言机性能分析对比优化 - The Implementation Plan (Decomposed and Prioritized Task List)

## [ ] Task 1: 在 useCrossOraclePage 中添加按单个预言机筛选延迟数据的功能
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 添加状态来跟踪当前选中的性能分析预言机
  - 添加计算单个预言机延迟数据的功能
  - 修改 latencyData 以支持按预言机筛选
- **Acceptance Criteria Addressed**: [AC-1, AC-5]
- **Test Requirements**:
  - `programmatic` TR-1.1: 能够正确获取单个预言机的延迟数据
  - `programmatic` TR-1.2: 切换预言机时延迟数据正确更新
  - `human-judgement` TR-1.3: 代码中没有硬编码的预言机名称
- **Notes**: 保持现有功能的同时添加新状态

## [ ] Task 2: 优化性能分析页面的预言机选择和显示
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 修改 page.tsx 中的 renderPerformanceTab 函数
  - 添加预言机选择器组件
  - 动态显示当前选中预言机的名称
- **Acceptance Criteria Addressed**: [AC-1, AC-4, AC-5]
- **Test Requirements**:
  - `programmatic` TR-2.1: 预言机选择器能够显示所有选中的预言机
  - `programmatic` TR-2.2: 点击选择不同预言机时页面正确更新
  - `human-judgement` TR-2.3: 预言机选择界面清晰易用
- **Notes**: 保持与现有 UI 风格一致

## [ ] Task 3: 充分利用 LatencyDistributionHistogram 组件的功能
- **Priority**: P0
- **Depends On**: Task 2
- **Description**: 
  - 正确传递 oracleName 属性给 LatencyDistributionHistogram
  - 确保组件的所有视图模式都能正常工作
  - 验证时间范围切换功能
- **Acceptance Criteria Addressed**: [AC-2, AC-3]
- **Test Requirements**:
  - `programmatic` TR-3.1: 直方图视图正常显示
  - `programmatic` TR-3.2: CDF 视图正常显示
  - `programmatic` TR-3.3: 趋势图视图正常显示
  - `programmatic` TR-3.4: 时间范围切换功能正常
- **Notes**: 参考 LatencyDistributionHistogram 组件的完整接口

## [ ] Task 4: 完善性能分析摘要显示
- **Priority**: P1
- **Depends On**: Task 2
- **Description**: 
  - 优化性能摘要卡片的布局和显示
  - 添加更多有用的性能指标
  - 确保数据动态更新
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `human-judgement` TR-4.1: 性能摘要信息完整且清晰
  - `programmatic` TR-4.2: 切换预言机时摘要正确更新
  - `human-judgement` TR-4.3: 布局美观，信息易读
- **Notes**: 保持与现有卡片样式一致

## [ ] Task 5: 测试和验证所有功能
- **Priority**: P1
- **Depends On**: Task 3, Task 4
- **Description**: 
  - 完整测试所有新功能
  - 验证没有回归问题
  - 检查响应式布局
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4, AC-5]
- **Test Requirements**:
  - `programmatic` TR-5.1: 所有验收标准都满足
  - `human-judgement` TR-5.2: 整体用户体验良好
  - `programmatic` TR-5.3: 没有 TypeScript 或 lint 错误
- **Notes**: 在不同屏幕尺寸上测试
