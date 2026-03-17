# Tasks

- [x] Task 1: 创建搜索历史本地存储工具函数
  - [x] SubTask 1.1: 在 `/src/lib/utils/searchHistory.ts` 创建搜索历史的读取、保存、清除函数
  - [x] SubTask 1.2: 定义搜索历史项的数据结构（symbol, timestamp）
  - [x] SubTask 1.3: 实现去重逻辑和最大记录数限制（10条）

- [x] Task 2: 增强 ProfessionalHero 搜索框组件
  - [x] SubTask 2.1: 添加搜索建议下拉框的状态管理（isDropdownOpen, highlightedIndex, filteredSymbols）
  - [x] SubTask 2.2: 实现搜索建议列表的渲染（包含热门币种和搜索历史）
  - [x] SubTask 2.3: 实现搜索过滤逻辑（根据输入实时过滤币种列表）
  - [x] SubTask 2.4: 实现键盘导航（上下方向键、回车、ESC）
  - [x] SubTask 2.5: 添加点击外部关闭下拉框的逻辑

- [x] Task 3: 添加热门币种快捷标签
  - [x] SubTask 3.1: 在搜索框下方添加热门币种标签行（BTC, ETH, SOL, AVAX, LINK, UNI, AAVE, MKR）
  - [x] SubTask 3.2: 实现点击标签直接跳转功能
  - [x] SubTask 3.3: 添加标签的悬停效果和过渡动画

- [x] Task 4: 集成搜索历史功能
  - [x] SubTask 4.1: 在搜索建议下拉框顶部显示搜索历史（最多3条）
  - [x] SubTask 4.2: 添加清除历史按钮
  - [x] SubTask 4.3: 在搜索提交时保存到历史记录

- [x] Task 5: 视觉优化和动画效果
  - [x] SubTask 5.1: 添加下拉框的展开/收起动画
  - [x] SubTask 5.2: 优化高亮项的视觉效果
  - [x] SubTask 5.3: 添加匹配文字的高亮显示

# Task Dependencies
- Task 2 依赖 Task 1（需要使用搜索历史工具函数）
- Task 4 依赖 Task 1 和 Task 2
- Task 3 可以并行执行
- Task 5 依赖 Task 2
