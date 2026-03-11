# 首页重构任务列表

- [ ] Task 1: 重构 Hero 区域
  - [ ] SubTask 1.1: 设计深色背景 Hero 区域，包含 subtle 网格背景效果
  - [ ] SubTask 1.2: 实现平台标题和副标题展示
  - [ ] SubTask 1.3: 添加主要 CTA 按钮（开始探索、查看文档）
  - [ ] SubTask 1.4: 展示核心数据指标（5+ 预言机、6+ 链、1000+ 数据源）

- [ ] Task 2: 重构实时价格展示区域
  - [ ] SubTask 2.1: 设计扁平化表格样式，无卡片阴影
  - [ ] SubTask 2.2: 展示预言机代币价格（LINK、BAND、UMA、PYTH、API3）
  - [ ] SubTask 2.3: 添加 24h 价格变化指示器
  - [ ] SubTask 2.4: 实现趋势迷你图（sparkline）
  - [ ] SubTask 2.5: 添加实时更新状态指示器

- [ ] Task 3: 重构功能导航区域
  - [ ] SubTask 3.1: 设计网格布局的功能入口
  - [ ] SubTask 3.2: 实现跨预言机比较入口
  - [ ] SubTask 3.3: 实现跨链比较入口
  - [ ] SubTask 3.4: 实现价格查询入口
  - [ ] SubTask 3.5: 实现 Chainlink 详情入口
  - [ ] SubTask 3.6: 添加 hover 效果（subtle 背景变化）

- [ ] Task 4: 重构平台统计展示区域
  - [ ] SubTask 4.1: 设计大号数字统计展示样式
  - [ ] SubTask 4.2: 展示集成预言机数量（5+）
  - [ ] SubTask 4.3: 展示支持区块链数量（6+）
  - [ ] SubTask 4.4: 展示数据源数量（1000+）
  - [ ] SubTask 4.5: 展示日均更新次数（1M+）

- [ ] Task 5: 重构预言机协议展示区域
  - [ ] SubTask 5.1: 设计预言机网格/横向布局
  - [ ] SubTask 5.2: 添加 Chainlink 协议卡片
  - [ ] SubTask 5.3: 添加 Band Protocol 协议卡片
  - [ ] SubTask 5.4: 添加 UMA 协议卡片
  - [ ] SubTask 5.5: 添加 Pyth Network 协议卡片
  - [ ] SubTask 5.6: 添加 API3 协议卡片
  - [ ] SubTask 5.7: 实现点击跳转到详情页功能

- [ ] Task 6: 重构数据洞察区域
  - [ ] SubTask 6.1: 设计扁平化洞察卡片样式
  - [ ] SubTask 6.2: 实现价格异常预警展示
  - [ ] SubTask 6.3: 实现数据质量评分展示
  - [ ] SubTask 6.4: 实现市场趋势展示

- [ ] Task 7: 整体样式优化
  - [ ] SubTask 7.1: 更新全局样式，添加首页专用 CSS 变量
  - [ ] SubTask 7.2: 确保响应式设计（移动端、平板、桌面）
  - [ ] SubTask 7.3: 优化字体层次结构
  - [ ] SubTask 7.4: 确保充足的留白空间

- [ ] Task 8: 验证与测试
  - [ ] SubTask 8.1: 验证所有链接可正常跳转
  - [ ] SubTask 8.2: 验证数据获取和展示正常
  - [ ] SubTask 8.3: 验证响应式布局在各设备上显示正常
  - [ ] SubTask 8.4: 运行 lint 检查

# Task Dependencies
- Task 2 依赖 Task 1（Hero 区域完成后进行价格展示）
- Task 3、4、5、6 可并行执行
- Task 7 依赖 Task 1-6 完成
- Task 8 依赖 Task 7 完成
