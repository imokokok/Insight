# Tasks

- [x] Task 1: 添加快捷操作浮动按钮组件
  - [x] SubTask 1.1: 创建FloatingActionButton组件，包含刷新、导出、返回顶部按钮
  - [x] SubTask 1.2: 实现导出格式选择下拉菜单（CSV、JSON、Excel）
  - [x] SubTask 1.3: 添加平滑滚动到顶部的功能
  - [x] SubTask 1.4: 在cross-oracle页面集成浮动按钮组件

- [x] Task 2: 优化价格比较表格交互
  - [x] SubTask 2.1: 添加价格偏差的背景色条形图可视化
  - [x] SubTask 2.2: 实现最高/最低价格行的高亮显示
  - [x] SubTask 2.3: 添加行悬停时的详细信息预览气泡
  - [x] SubTask 2.4: 实现键盘导航支持（上下箭头、Enter键）

- [x] Task 3: 优化筛选器布局
  - [x] SubTask 3.1: 将筛选器改为下拉面板形式
  - [x] SubTask 3.2: 添加"清除筛选"按钮
  - [x] SubTask 3.3: 优化筛选条件的组合显示

- [x] Task 4: 增强异常值提示功能
  - [x] SubTask 4.1: 在页面顶部添加异常值提示条组件
  - [x] SubTask 4.2: 实现点击提示条跳转到异常行的功能
  - [x] SubTask 4.3: 添加异常值统计信息显示

- [x] Task 5: 优化移动端适配
  - [x] SubTask 5.1: 将统计卡片改为可横向滑动的卡片列表
  - [x] SubTask 5.2: 添加图表全屏查看功能
  - [x] SubTask 5.3: 优化表格在移动端的显示（可横向滚动）

- [x] Task 6: 实现数据快照功能
  - [x] SubTask 6.1: 实现保存当前数据快照到localStorage
  - [x] SubTask 6.2: 创建快照管理组件（查看、删除快照）
  - [x] SubTask 6.3: 实现快照对比视图组件

# Task Dependencies
- [Task 2] 依赖 [Task 1]（浮动按钮中的导出功能需要表格优化完成）
- [Task 4] 依赖 [Task 2]（异常值跳转需要表格行高亮功能）
- [Task 6] 可以独立进行
