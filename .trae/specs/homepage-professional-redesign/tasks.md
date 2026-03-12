# 首页专业化重设计任务列表

## 任务依赖关系
- Task 1 (实时价格滚动条) 无依赖
- Task 2 (Hero 区域增强) 无依赖
- Task 3 (Bento Grid 优化) 无依赖
- Task 4 (Feature Cards 优化) 无依赖
- Task 5 (市场概览增强) 无依赖
- Task 6 (CTA 区域改进) 无依赖
- Task 7 (页面整合) 依赖于 Task 1-6

---

## Task 1: 创建实时价格滚动条组件
- [x] 创建 `src/app/home-components/LivePriceTicker.tsx`
  - [x] 实现无限滚动动画效果
  - [x] 展示主流交易对（BTC/USD, ETH/USD, LINK/USD, SOL/USD, AVAX/USD, MATIC/USD, UNI/USD, AAVE/USD）
  - [x] 显示价格、24h涨跌幅、迷你趋势图
  - [x] 正涨幅绿色，负涨幅红色
  - [x] 悬停暂停滚动
  - [x] 支持中英文

## Task 2: 增强 Hero 区域
- [x] 修改 `src/app/home-components/ProfessionalHero.tsx`
  - [x] 添加动态粒子/网格背景动画
  - [x] 优化核心指标展示，添加迷你趋势图
  - [x] 改进搜索框视觉层次（添加发光效果）
  - [x] 添加实时数据状态指示器（Live 徽章）
  - [x] 优化文字排版和间距
  - [x] 添加次要 CTA 按钮（查看文档）

## Task 3: 优化 Bento Grid
- [x] 修改 `src/app/home-components/BentoMetricsGrid.tsx`
  - [x] 优化卡片布局，添加更多动态指标
  - [x] 改进实时更新指示器（脉冲动画）
  - [x] 优化图表样式（更精致的 AreaChart/LineChart）
  - [x] 添加悬停时显示详细信息的 Tooltip
  - [x] 改进颜色方案和视觉层次
  - [x] 添加价格变动警报指示

## Task 4: 优化 Feature Cards
- [x] 修改 `src/app/home-components/FeatureCards.tsx`
  - [x] 为每个卡片添加预览图表或数据片段
  - [x] 改进悬停动效（缩放、阴影、箭头动画）
  - [x] 添加使用统计数据（如"已有 1000+ 次查询"）
  - [x] 优化移动端布局（单列展示）
  - [x] 改进图标样式

## Task 5: 增强市场概览
- [x] 修改 `src/app/home-components/OracleMarketOverview.tsx`
  - [x] 添加更多时间范围选项（1H, 24H, 7D, 30D, 90D, 1Y, ALL）
  - [x] 改进图表交互体验（悬停高亮、点击选中）
  - [x] 添加数据表格视图切换
  - [x] 优化颜色方案（更专业的配色）
  - [x] 添加市场概览摘要卡片

## Task 6: 改进 CTA 区域
- [x] 修改 `src/app/home-components/ProfessionalCTA.tsx`
  - [x] 添加多个转化入口（开始探索、查看 API、阅读文档）
  - [x] 改进视觉设计（渐变、光效）
  - [x] 添加邮件订阅输入框
  - [x] 优化响应式布局

## Task 7: 整合页面并优化
- [x] 修改 `src/app/page.tsx`
  - [x] 按新顺序整合所有组件
  - [x] 1. ProfessionalHero
  - [x] 2. LivePriceTicker
  - [x] 3. BentoMetricsGrid
  - [x] 4. OracleMarketOverview
  - [x] 5. ArbitrageHeatmap
  - [x] 6. FeatureCards
  - [x] 7. ProfessionalCTA
  - [x] 添加页面级别的动画效果
  - [x] 确保所有组件间距一致
  - [x] 验证响应式布局

## Task 8: 添加全局样式和动画
- [x] 更新 `src/app/globals.css`
  - [x] 添加滚动条样式
  - [x] 添加脉冲动画关键帧
  - [x] 添加淡入淡出动画
  - [x] 添加悬停效果工具类
  - [x] 确保动画性能优化
