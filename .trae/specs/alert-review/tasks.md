# Tasks

## 高优先级任务

- [x] Task 1: 修复数据库Schema - 添加name字段
  - [x] SubTask 1.1: 创建数据库迁移文件添加name字段到price_alerts表
  - [x] SubTask 1.2: 更新database.types.ts中的类型定义
  - [x] SubTask 1.3: 验证现有告警创建流程正常工作

- [x] Task 2: 统一告警系统架构
  - [x] SubTask 2.1: 分析两套告警系统的使用场景
  - [x] SubTask 2.2: 确定保留哪套系统或如何共存
  - [x] SubTask 2.3: 更新相关文档说明架构决策

## 中优先级任务

- [x] Task 3: 集成通知设置到告警系统
  - [x] SubTask 3.1: 创建通知设置读取hook
  - [x] SubTask 3.2: 在AlertNotification中应用浏览器通知设置
  - [x] SubTask 3.3: 在AlertDetector中应用通知设置
  - [ ] SubTask 3.4: 实现邮件通知基础架构(可选)

- [x] Task 4: 告警消息国际化
  - [x] SubTask 4.1: 在zh-CN.json和en.json中添加告警消息翻译键
  - [x] SubTask 4.2: 更新formatConditionMet函数使用i18n
  - [x] SubTask 4.3: 更新detector.ts中的消息格式化

## 低优先级任务

- [ ] Task 5: 添加批量操作功能
  - [ ] SubTask 5.1: 在AlertList中添加多选功能
  - [ ] SubTask 5.2: 实现批量启用/禁用API
  - [ ] SubTask 5.3: 实现批量删除API
  - [ ] SubTask 5.4: 在AlertHistory中添加批量确认功能

- [ ] Task 6: 添加告警模板UI
  - [ ] SubTask 6.1: 在AlertConfig中显示预设模板
  - [ ] SubTask 6.2: 实现模板选择和应用功能

- [ ] Task 7: 添加告警统计功能
  - [ ] SubTask 7.1: 创建告警统计API端点
  - [ ] SubTask 7.2: 在告警页面显示统计图表
  - [ ] SubTask 7.3: 添加触发频率分析

# Task Dependencies
- [Task 3] 建议在 [Task 2] 完成后进行
- [Task 4] 可以与 [Task 3] 并行进行
- [Task 5, 6, 7] 可以并行进行，互不依赖
