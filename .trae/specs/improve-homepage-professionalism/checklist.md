# 首页专业度提升检查清单

## 设计一致性检查

### 圆角规范
- [x] Hero 搜索框使用 rounded-xl
- [x] 所有指标卡片使用 rounded-lg
- [x] 所有按钮使用 rounded-md 或 rounded-lg
- [x] 所有输入框使用 rounded-lg
- [x] 所有标签/徽章使用 rounded-full
- [x] 价格滚动条卡片使用 rounded-lg
- [x] Bento 网格卡片使用 rounded-lg
- [x] 市场概览统计卡片使用 rounded-lg

### 阴影规范
- [x] 卡片默认使用 shadow-sm
- [x] 卡片悬停使用 shadow-md
- [x] 搜索框聚焦不使用 colored shadow
- [x] 下拉菜单使用 shadow-lg
- [x] 移除所有 scale transform 动画

### 边框规范
- [x] 所有边框颜色统一为 gray-100（比 gray-200 更淡）
- [x] 悬停状态边框为 gray-200
- [x] 选中状态边框为 gray-300

### 间距规范
- [x] 区块间距统一为 py-20（或 5rem）
- [x] 卡片内边距统一为 p-6
- [x] 组件间距统一为 gap-6
- [x] 标题与内容间距为 mb-8

### 字体规范
- [x] 标题使用 font-semibold 或 font-bold
- [x] 正文使用 font-normal
- [x] 数据/数字使用 font-tabular-nums
- [x] 副标题颜色为 gray-700

---

## 组件级检查

### HeroBackground 组件
- [x] 网格背景透明度为 0.04
- [x] 移除噪点纹理叠加
- [x] 渐变光晕为静态或微动效
- [x] 底部渐变过渡自然

### ProfessionalHero 组件
- [x] 主标题字体大小为 2xl-5xl
- [x] 行高为 leading-snug
- [x] 副标题颜色为 gray-700
- [x] 搜索框圆角为 rounded-xl
- [x] 搜索框聚焦无缩放动效
- [x] 实时徽章简洁（单元素）
- [x] 脉冲动画频率降低
- [x] 指标卡片有圆角
- [x] 迷你图表高度为 h-16
- [x] 图表无动画
- [x] 涨跌幅标签无边框

### LivePriceTicker 组件
- [x] 滚动动画时长为 26s
- [x] 价格卡片边框为 gray-100
- [x] 价格卡片有圆角 rounded-lg
- [x] 渐变遮罩宽度为 w-24
- [x] 鼠标悬停暂停功能正常

### BentoMetricsGrid 组件
- [x] 卡片尺寸统一或规律布局
- [x] 卡片间距为 gap-6
- [x] Live 指示器不在右上角遮挡内容
- [x] 坐标轴和网格线为 gray-100
- [x] 面积图渐变柔和
- [x] 描述文字在 Tooltip 中
- [x] 卡片内边距为 p-6

### OracleMarketOverview 组件
- [x] 饼图标签字体为 font-normal
- [x] 百分比标签位置准确无重叠
- [x] 折线图线条粗细统一为 2px
- [x] 数据点仅在悬停时显示
- [x] 时间选择器选中状态视觉权重足够
- [x] 统计卡片圆角和阴影统一
- [x] 图标背景色统一

### ProfessionalCTA 组件
- [x] 背景有微妙渐变效果
- [x] 按钮 hover 无 scale 效果
- [x] 按钮 hover 为颜色加深
- [x] 标题与描述间距为 mb-8

---

## 性能检查
- [x] 页面首屏渲染时间 < 2s
- [x] 动画优先使用 CSS
- [x] 图表组件延迟加载正常
- [x] 无过度动画影响性能

## 响应式检查
- [x] 移动端字体大小适当
- [x] 平板端卡片布局为 2 列
- [x] 移动端搜索框全宽显示
- [x] 各断点布局无错乱

## 可访问性检查
- [x] 颜色对比度符合 WCAG 标准
- [x] 动画支持 prefers-reduced-motion
- [x] 焦点状态清晰可见
- [x] 语义化标签正确使用
