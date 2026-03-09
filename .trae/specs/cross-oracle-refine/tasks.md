# Cross-Oracle Comparison Page Refinement - The Implementation Plan (Decomposed and Prioritized Task List)

## [ ] Task 1: 简化卡片样式，去除hover效果
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 去除所有卡片的hover:shadow-md和transition-shadow类
  - 保持卡片的基本样式不变
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgement` TR-1.1: 验证所有卡片没有悬停阴影效果
- **Notes**: 只移除hover相关的类，其他样式保持不变

## [ ] Task 2: 去除价格表格中的symbol列
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 从表格头部移除symbol列
  - 从表格内容移除symbol列的渲染
  - 保持其他列的功能不变
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `programmatic` TR-2.1: 验证表格中不再有symbol列
  - `programmatic` TR-2.2: 验证其他列都正常显示和工作
- **Notes**: 因为整个页面都是同一个交易对，symbol列是冗余信息

## [ ] Task 3: 合并符号选择和预言机选择到一个卡片
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 将符号选择和预言机选择放在同一个Card组件中
  - 使用合适的布局（左右或上下排列）
  - 保持原有的功能不变
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgement` TR-3.1: 验证筛选区域在同一个卡片中
  - `programmatic` TR-3.2: 验证符号选择功能正常
  - `programmatic` TR-3.3: 验证预言机选择功能正常
- **Notes**: 可以使用flex布局或grid布局

## [ ] Task 4: 简化统计数据展示
- **Priority**: P1
- **Depends On**: None
- **Description**: 
  - 简化统计卡片的样式，去除过度装饰
  - 可以考虑将统计数据直接展示在标题栏下方，不使用Card包装
  - 保持数据的可读性
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `human-judgement` TR-4.1: 验证统计数据展示简洁
  - `programmatic` TR-4.2: 验证统计数据正确显示
- **Notes**: 可以尝试不使用Card组件包装统计数据

## [ ] Task 5: 保持功能完整性测试
- **Priority**: P1
- **Depends On**: [Task 1, Task 2, Task 3, Task 4]
- **Description**: 
  - 测试所有现有功能是否正常工作
  - 运行lint检查确保代码质量
  - 验证响应式设计
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `programmatic` TR-5.1: 运行lint检查，确保没有错误
  - `programmatic` TR-5.2: 验证所有筛选功能正常
  - `programmatic` TR-5.3: 验证表格排序功能正常
  - `human-judgement` TR-5.4: 验证响应式布局正常
- **Notes**: 确保所有现有功能都正常工作
