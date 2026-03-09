# Cross-Oracle Comparison Page Enhancements - The Implementation Plan (Decomposed and Prioritized Task List)

## [ ] Task 1: 添加国际化翻译文本
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 在 en.json 和 zh-CN.json 中添加新增功能的翻译文本
  - 包括统计卡片标题、新增表格列等
- **Acceptance Criteria Addressed**: [AC-2, AC-3, AC-4]
- **Test Requirements**:
  - `programmatic` TR-1.1: 验证所有新增翻译键在两个语言文件中都存在
  - `human-judgement` TR-1.2: 检查翻译文本的准确性和一致性
- **Notes**: 保持与现有翻译风格一致

## [ ] Task 2: 优化页面整体布局
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 重新组织页面组件顺序：标题栏 → 统计卡片 → 筛选区域 → 价格表格 → 价格趋势图
  - 优化组件间距，使用更合理的间距值
  - 改善视觉层次，重要内容更突出
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgement` TR-2.1: 验证组件顺序合理，信息流动自然
  - `human-judgement` TR-2.2: 验证间距适中，视觉层次清晰
- **Notes**: 参考项目中其他页面的布局风格

## [ ] Task 3: 实现价格差异计算和显示
- **Priority**: P0
- **Depends On**: [Task 1]
- **Description**: 
  - 计算选中预言机的平均价格
  - 计算每个预言机价格相对于平均价格的偏差百分比
  - 在表格中添加偏差百分比列
  - 使用颜色区分正偏差（绿色）和负偏差（红色）
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `programmatic` TR-3.1: 验证偏差百分比计算正确（(价格 - 平均价格) / 平均价格 * 100）
  - `programmatic` TR-3.2: 验证正偏差显示为绿色，负偏差显示为红色
  - `programmatic` TR-3.3: 验证当只有1个预言机选中时不显示偏差列
- **Notes**: 处理价格为0或平均价格为0的边界情况

## [ ] Task 4: 实现关键统计卡片
- **Priority**: P0
- **Depends On**: [Task 1, Task 3]
- **Description**: 
  - 创建3个统计卡片：平均价格、最高/最低价格、价格区间
  - 将统计卡片放在标题栏下方，筛选区域上方
  - 使用现有的 Card 组件保持样式一致
  - 添加响应式设计，在移动端垂直排列，在桌面端水平排列
- **Acceptance Criteria Addressed**: [AC-3, AC-5]
- **Test Requirements**:
  - `programmatic` TR-4.1: 验证平均价格计算正确（所有选中预言机价格的平均值）
  - `programmatic` TR-4.2: 验证最高/最低价格正确识别
  - `programmatic` TR-4.3: 验证价格区间计算正确（最高价格 - 最低价格）
  - `human-judgement` TR-4.4: 验证统计卡片在不同屏幕尺寸下的布局正确性
- **Notes**: 保持与 Chainlink 页面统计卡片相似的样式

## [ ] Task 5: 优化筛选区域布局
- **Priority**: P1
- **Depends On**: [Task 2]
- **Description**: 
  - 优化符号选择和预言机选择的布局
  - 使筛选区域更紧凑高效
  - 确保在移动端和桌面端都有良好的展示效果
- **Acceptance Criteria Addressed**: [AC-6, AC-5]
- **Test Requirements**:
  - `human-judgement` TR-5.1: 验证筛选区域布局紧凑高效
  - `human-judgement` TR-5.2: 验证筛选区域在不同屏幕尺寸下正确显示
- **Notes**: 保持现有功能不变，仅优化布局

## [ ] Task 6: 实现表格排序功能
- **Priority**: P1
- **Depends On**: [Task 3]
- **Description**: 
  - 为价格和时间戳列添加可点击的表头
  - 实现排序逻辑，支持升序和降序
  - 添加视觉指示器显示当前排序状态
  - 点击同一列切换排序方向
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `programmatic` TR-6.1: 验证点击价格列可以按价格排序
  - `programmatic` TR-6.2: 验证点击时间戳列可以按时间排序
  - `programmatic` TR-6.3: 验证再次点击同一列可以切换升序/降序
  - `human-judgement` TR-6.4: 验证排序指示器清晰可见
- **Notes**: 保持预言机列不可排序

## [ ] Task 7: 完善响应式布局和测试
- **Priority**: P2
- **Depends On**: [Task 4, Task 5, Task 6]
- **Description**: 
  - 检查和完善所有组件的响应式布局
  - 进行端到端测试，确保所有功能协同工作
  - 检查所有边界情况的处理
  - 确保代码符合项目的代码规范
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6]
- **Test Requirements**:
  - `programmatic` TR-7.1: 运行 lint 检查，确保没有代码规范问题
  - `programmatic` TR-7.2: 验证在各种预言机组合下页面正常工作
  - `human-judgement` TR-7.3: 验证所有响应式布局正确
  - `human-judgement` TR-7.4: 验证用户体验流畅，功能直观易用
- **Notes**: 不要过度优化，保持代码简洁易读
