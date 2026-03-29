# Tasks

- [x] Task 1: 修复 ChronicleClient 模拟数据问题 (P0)
  - [x] SubTask 1.1: 评估可用的 Chronicle API 端点
  - [x] SubTask 1.2: 实现真实数据获取方法
  - [x] SubTask 1.3: 添加数据缓存层
  - [x] SubTask 1.4: 添加错误处理和降级机制

- [x] Task 2: 修复 client 实例化位置问题 (P0)
  - [x] SubTask 2.1: 将 hooks/oracles/chronicle.ts 中的 client 移到 hook 内部
  - [x] SubTask 2.2: 使用 useMemo 包装 client 创建
  - [x] SubTask 2.3: 移除 useChroniclePage 中未使用的 client

- [x] Task 3: 修复类型安全问题 (P1)
  - [x] SubTask 3.1: 重新设计 ChronicleDataTable 泛型类型
  - [x] SubTask 3.2: 移除所有 `as unknown as` 类型断言
  - [x] SubTask 3.3: 统一 NetworkStats 和 ChronicleNetworkStats 类型定义

- [x] Task 4: 修复排序逻辑缺陷 (P1)
  - [x] SubTask 4.1: 实现类型感知的排序函数
  - [x] SubTask 4.2: 添加字符串 localeCompare 支持
  - [ ] SubTask 4.3: 添加单元测试（可选，未实现）

- [x] Task 5: 改进错误处理 (P1)
  - [x] SubTask 5.1: 为 refetchAll 添加错误处理
  - [x] SubTask 5.2: 为 exportData 添加 null 值处理
  - [ ] SubTask 5.3: 添加统一的错误边界（可选，未实现）

- [x] Task 6: 消除代码重复 (P2)
  - [x] SubTask 6.1: 提取 formatCurrency 到公共工具函数
  - [x] SubTask 6.2: 统一 Mock 数据定义
  - [x] SubTask 6.3: 删除 ChroniclePriceDeviationView 中重复的 CheckCircle 组件

- [x] Task 7: 性能优化 (P2)
  - [x] SubTask 7.1: 实现按需加载数据
  - [x] SubTask 7.2: 修复 useMemo 使用不当的问题
  - [x] SubTask 7.3: 修复 Sparkline 随机数据问题

- [x] Task 8: 配置优化 (P2)
  - [x] SubTask 8.1: 从配置获取 ChronicleSidebar 主题颜色
  - [x] SubTask 8.2: 检查其他硬编码配置

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 5 depends on Task 2
- Task 6 depends on Task 3
