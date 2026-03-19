# Tasks

- [x] Task 1: 修复 StatCard 样式不一致问题
  - [x] 为 Tellor 页面的 StatCard 添加 `isFirst` prop
  - [x] 确保第一个卡片无边框，后续卡片有左边框分隔线
  - [x] 参考 Chainlink 页面的实现方式

- [x] Task 2: 统一颜色使用
  - [x] 将 TellorReportersPanel 中的硬编码颜色替换为 themeColor 相关类
  - [x] 统一使用 Tailwind 标准色值（cyan-600 等）
  - [x] 确保与其他预言机页面颜色逻辑一致

- [x] Task 3: 优化间距和视觉层次
  - [x] 统一 DashboardCard 的内边距设置
  - [x] 优化统计数据网格的间距（gap 值）
  - [x] 调整表格行的悬停效果，使其更 subtle

- [x] Task 4: 增强数据可视化细节
  - [x] 优化 Reporter 排名的视觉区分（前3名使用金色/银色/铜色）
  - [x] 检查 RiskPanel 中进度条颜色逻辑是否正确（低风险=绿色）
  - [x] 统一状态标签的样式（open/resolved/rejected）

- [x] Task 5: 验证和测试
  - [x] 在本地运行项目，检查 Tellor 页面渲染效果
  - [x] 对比 Chainlink 页面，确保视觉一致性
  - [x] 检查响应式布局是否正常
