# 首页专业度提升任务列表

## 任务依赖关系
- Task 1 和 Task 2 可以并行执行
- Task 3 依赖于 Task 1 完成
- Task 4、5、6 可以并行执行
- Task 7 依赖于所有前置任务完成

---

## Task 1: Hero 背景与视觉层次优化
**描述**: 简化 Hero 背景动画，优化标题排版和搜索框样式

- [x] SubTask 1.1: 简化 HeroBackground 组件
  - 降低网格背景透明度（0.08 → 0.04）
  - 移除噪点纹理叠加
  - 简化渐变光晕动画为静态或微动效
  
- [x] SubTask 1.2: 优化标题排版
  - 调整字体大小（3xl-6xl → 2xl-5xl）
  - 增加行高（leading-tight → leading-snug）
  - 调整副标题颜色（gray-600 → gray-700）
  
- [x] SubTask 1.3: 优化搜索框样式
  - 调整圆角（rounded-2xl → rounded-xl）
  - 移除聚焦时的缩放动效
  - 简化阴影效果
  
- [x] SubTask 1.4: 简化实时徽章
  - 简化为简洁的 Live 指示器
  - 降低脉冲动画频率

---

## Task 2: 全局样式统一配置
**描述**: 在 globals.css 中定义统一的设计令牌

- [x] SubTask 2.1: 定义圆角规范
  - 卡片：--radius-card: 0.5rem
  - 按钮：--radius-button: 0.375rem
  - 输入框：--radius-input: 0.5rem
  
- [x] SubTask 2.2: 定义阴影规范
  - 卡片默认：--shadow-card: 0 1px 2px rgba(0,0,0,0.05)
  - 卡片悬停：--shadow-card-hover: 0 4px 6px rgba(0,0,0,0.07)
  
- [x] SubTask 2.3: 定义间距规范
  - 区块间距：--spacing-section: 5rem
  - 卡片内边距：--spacing-card: 1.5rem
  
- [x] SubTask 2.4: 定义边框规范
  - 默认边框：--border-default: 1px solid var(--gray-100)
  - 悬停边框：--border-hover: 1px solid var(--gray-200)

---

## Task 3: 指标卡片组件优化
**描述**: 统一 ProfessionalHero 中的指标卡片样式

- [x] SubTask 3.1: 统一卡片圆角
  - 添加 rounded-lg 到所有指标卡片
  
- [x] SubTask 3.2: 优化迷你图表
  - 增加图表高度（h-14 → h-16）
  - 降低渐变填充透明度
  - 移除图表动画
  
- [x] SubTask 3.3: 简化数据标签
  - 移除涨跌幅标签边框
  - 统一趋势图标尺寸

---

## Task 4: 实时价格滚动条优化
**描述**: 优化 LivePriceTicker 组件的视觉效果

- [x] SubTask 4.1: 调整滚动速度
  - 将动画时长从 35s 调整为 26s
  
- [x] SubTask 4.2: 优化卡片样式
  - 使用更细的边框（gray-200 → gray-100）
  - 添加圆角 rounded-lg
  
- [x] SubTask 4.3: 优化布局
  - 增加渐变遮罩宽度（w-20 → w-24）
  - 调整卡片间距

---

## Task 5: Bento 网格专业度提升
**描述**: 重构 BentoMetricsGrid 组件

- [x] SubTask 5.1: 优化网格布局
  - 统一卡片尺寸或采用更规律的布局
  - 调整卡片间距（gap-4 → gap-6）
  
- [x] SubTask 5.2: 重新定位 Live 指示器
  - 从右上角移至标题行右侧
  
- [x] SubTask 5.3: 优化图表样式
  - 降低坐标轴和网格线颜色深度
  - 简化面积图渐变
  
- [x] SubTask 5.4: 精简信息密度
  - 将描述文字移至 Tooltip
  - 统一卡片内边距（p-5 → p-6）

---

## Task 6: 市场概览图表优化
**描述**: 改进 OracleMarketOverview 组件的数据可视化

- [x] SubTask 6.1: 优化饼图
  - 调整标签字体（font-medium → font-normal）
  - 优化百分比标签位置
  
- [x] SubTask 6.2: 优化折线图
  - 统一线条粗细为 2px
  - 数据点仅在悬停时显示
  
- [x] SubTask 6.3: 优化时间选择器
  - 增强选中状态的视觉权重
  - 统一按钮样式
  
- [x] SubTask 6.4: 优化统计卡片
  - 统一卡片圆角和阴影
  - 调整图标背景色

---

## Task 7: CTA 区域与最终整合
**描述**: 优化 ProfessionalCTA 组件并进行最终整合

- [x] SubTask 7.1: 优化 CTA 背景
  - 添加微妙渐变效果
  - 调整背景色增加层次感
  
- [x] SubTask 7.2: 优化按钮样式
  - 移除 scale-105 hover 效果
  - 改为颜色加深效果
  
- [x] SubTask 7.3: 调整文案层次
  - 增加标题与描述的间距
  - 优化整体视觉呼吸感
  
- [x] SubTask 7.4: 最终检查
  - 验证所有组件圆角一致性
  - 验证所有阴影一致性
  - 验证响应式表现

---

## Task Dependencies
- Task 3 depends on Task 1
- Task 7 depends on Task 3, 4, 5, 6
