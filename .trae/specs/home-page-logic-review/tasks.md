# Tasks

- [x] Task 1: 修复预言机路径配置错误
  - [x] SubTask 1.1: 更新 `searchConfig.ts` 中所有预言机的 path 属性，移除 `/oracle` 前缀
  - [x] SubTask 1.2: 验证所有预言机路径与实际页面路由匹配

- [x] Task 2: 重构 Enter 键处理逻辑
  - [x] SubTask 2.1: 创建统一的 `handleSelectItem` 函数处理下拉项选择
  - [x] SubTask 2.2: 在 `handleSubmit` 和 `handleKeyDown` 中复用该函数

- [x] Task 3: 优化类型定义
  - [x] SubTask 3.1: 定义明确的 `DropdownItem` 类型接口
  - [x] SubTask 3.2: 更新 `dropdownItems` 使用新类型

- [x] Task 4: 验证 SSR 水合问题
  - [x] SubTask 4.1: 检查是否需要将 `ssr` 设置为 `false`
  - [x] SubTask 4.2: 测试首页加载是否正常

# Task Dependencies

- [Task 2] 可以独立于其他任务进行
- [Task 3] 可以独立于其他任务进行
- [Task 4] 应该在 [Task 1] 完成后进行验证
