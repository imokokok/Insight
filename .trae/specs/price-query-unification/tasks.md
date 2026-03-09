# 喂价查询功能统一整合 - The Implementation Plan (Decomposed and Prioritized Task List)

## [ ] Task 1: 创建新的统一喂价查询页面基础结构
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 创建 /src/app/price-query/page.tsx 页面文件
  - 设置页面的基础布局和标题
  - 复用现有的 AdvancedCard、AdvancedTable、StatCard 等组件
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `programmatic` TR-1.1: 访问 /price-query 路径返回 200 状态码
  - `human-judgement` TR-1.2: 页面有清晰的页面标题和基础布局
- **Notes**: 确保与现有页面风格保持一致

## [ ] Task 2: 实现多维度选择器组件
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 实现预言机多选功能（支持同时选择多个预言机提供商
  - 实现区块链多选功能（支持同时选择多个链
  - 实现交易对选择功能
  - 添加查询按钮和刷新功能
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgement` TR-2.1: 可以多选预言机提供商
  - `human-judgement` TR-2.2: 可以多选区块链
  - `human-judgement` TR-2.3: 可以选择交易对
  - `human-judgement` TR-2.4: 有查询/刷新按钮
- **Notes**: 参考 /cross-oracle 和 /cross-chain 页面的选择器实现

## [ ] Task 3: 实现实时价格数据获取和表格展示
- **Priority**: P0
- **Depends On**: Task 2
- **Description**: 
  - 根据选中的预言机、链和交易对获取实时价格数据
  - 展示包含预言机、链、价格、时间戳等信息的表格
  - 复用 AdvancedTable 组件
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `programmatic` TR-3.1: 查询返回数据成功获取所有匹配条件的价格数据
  - `human-judgement` TR-3.2: 表格正确显示所有查询结果
- **Notes**: 处理预言机不支持某些链的情况

## [ ] Task 4: 实现历史价格趋势图表
- **Priority**: P0
- **Depends On**: Task 3
- **Description**: 
  - 获取历史价格数据
  - 使用 Recharts 展示历史价格趋势图表
  - 支持多条线同时显示（不同预言机/链组合
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `human-judgement` TR-4.1: 图表正确显示历史价格趋势
  - `human-judgement` TR-4.2: 图表支持多条线同时显示
- **Notes**: 参考现有页面的图表实现

## [ ] Task 5: 实现数据导出功能
- **Priority**: P1
- **Depends On**: Task 3
- **Description**: 
  - 实现 CSV 格式数据导出
  - 实现 JSON 格式数据导出
  - 包含元数据和查询结果
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `programmatic` TR-5.1: CSV 文件可以成功下载
  - `programmatic` TR-5.2: JSON 文件可以成功下载
  - `programmatic` TR-5.3: 导出文件包含完整数据
- **Notes**: 参考 /cross-chain 和 /cross-oracle 的导出实现

## [ ] Task 6: 实现快速跳转功能
- **Priority**: P1
- **Depends On**: Task 1
- **Description**: 
  - 在页面顶部添加跳转到现有专用页面的按钮
  - 提供清晰的按钮样式
- **Acceptance Criteria Addressed**: [AC-6]
- **Test Requirements**:
  - `human-judgement` TR-6.1: 有跳转到 /cross-oracle 的按钮
  - `human-judgement` TR-6.2: 有跳转到 /cross-chain 的按钮
  - `human-judgement` TR-6.3: 按钮样式清晰可见
- **Notes**: 按钮应该有适当的间距和视觉层次

## [ ] Task 7: 更新导航栏
- **Priority**: P1
- **Depends On**: Task 1
- **Description**: 
  - 在 Navbar 组件中添加 /price-query 页面的入口
  - 更新国际化文件
- **Acceptance Criteria Addressed**: [AC-7]
- **Test Requirements**:
  - `human-judgement` TR-7.1: 导航栏中有新页面入口
  - `human-judgement` TR-7.2: 点击可以正常跳转
- **Notes**: 确保中英文都有对应翻译

## [ ] Task 8: 添加国际化支持
- **Priority**: P1
- **Depends On**: Task 1
- **Description**: 
  - 在 src/i18n/en.json 中添加新页面所需的英文翻译
  - 在 src/i18n/zh-CN.json 中添加新页面所需的中文翻译
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `programmatic` TR-8.1: 英文翻译完整
  - `programmatic` TR-8.2: 中文翻译完整
- **Notes**: 参考现有页面的翻译键命名规范

## [ ] Task 9: 响应式设计和样式优化
- **Priority**: P2
- **Depends On**: Task 3, Task 4
- **Description**: 
  - 确保页面在移动端、平板和桌面端都有良好的显示效果
  - 优化页面布局和间距
  - 添加适当的动画效果
- **Acceptance Criteria Addressed**: [AC-9]
- **Test Requirements**:
  - `human-judgement` TR-9.1: 移动端显示效果良好
  - `human-judgement` TR-9.2: 平板显示效果良好
  - `human-judgement` TR-9.3: 桌面端显示效果良好
- **Notes**: 使用 Tailwind 的响应式类

## [ ] Task 10: 验证现有页面保持不变
- **Priority**: P0
- **Depends On**: 所有其他任务
- **Description**: 
  - 验证所有现有页面功能和外观完全保持不变
  - 确保没有引入任何回归问题
- **Acceptance Criteria Addressed**: [AC-8]
- **Test Requirements**:
  - `human-judgement` TR-10.1: /chainlink 页面功能正常
  - `human-judgement` TR-10.2: /cross-chain 页面功能正常
  - `human-judgement` TR-10.3: /cross-oracle 页面功能正常
  - `human-judgement` TR-10.4: 其他单个预言机页面功能正常
- **Notes**: 这是最重要的验证任务，确保没有破坏现有功能
