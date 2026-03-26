# Checklist

## 页面整体布局

- [x] 移除了所有外层卡片的 bg-white、border、rounded-lg
- [x] space-y-3 改为 space-y-8（32px 间距）
- [x] 使用 bg-insight 作为统一背景色
- [x] 整体内边距为 py-8
- [x] 无卡片阴影和悬停边框效果

## MarketStats 极简指标栏

- [x] 6 个卡片网格改为单行水平布局
- [x] 移除了所有卡片样式（bg-white、border、rounded-lg、shadow）
- [x] 指标间使用细竖线（|）或 24px 间距分隔
- [x] 标签使用 text-xs text-gray-500
- [x] 数值使用 text-xl font-semibold tabular-nums
- [x] 变化使用 text-xs 带颜色（success/danger）
- [x] 响应式：窄屏幕核心指标优先显示，其他可横向滚动

## ChartContainer 扁平化

- [x] 移除外层卡片的 bg-white、border、rounded-lg、p-3
- [x] 图表标题栏使用 border-b border-gray-100 分隔
- [x] 控件改为 text-only 样式
- [x] 激活状态使用文字颜色变化（primary-600）
- [x] 移除了按钮组的 bg-gray-50 和 rounded-md
- [x] 图表区域使用最小 padding（p-0 或 p-2）

## MarketSidebar 简化

- [x] 移除外层卡片的 bg-white、border、rounded-lg、p-3
- [x] 列表项使用 border-b border-gray-100 分隔
- [x] 选中状态使用左侧 2px 色条（border-l-2 border-primary-500）
- [x] hover 效果改为文字颜色变化
- [x] 列表项高度控制在 40-44px
- [x] 无背景色变化、无阴影

## AssetsTable 扁平化

- [x] 移除外层卡片的 bg-white、border、rounded-lg、p-3
- [x] 表头使用 border-b border-gray-200
- [x] 表格行使用 hover:bg-gray-50
- [x] 单元格 padding 减少到 py-2 px-3
- [x] 排名样式简化（无徽章边框，只保留背景色）
- [x] 价格变化移除热力图背景，保留箭头+颜色

## MarketHeader 优化

- [x] 标题区域使用 border-b border-gray-100 与下方分隔
- [x] 操作按钮改为 text-only 样式
- [x] 按钮间使用间距而非分隔线
- [x] 移除了按钮的 bg-gray-50 背景

## 代码质量

- [x] 所有组件使用 TypeScript，无类型错误
- [x] ESLint 检查无错误
- [x] 无 console.log 调试代码
- [x] 响应式布局正常（桌面/平板/移动端）
- [x] 所有交互功能正常

## 视觉效果

- [x] 页面整体显得简洁、专业
- [x] 无过度使用卡片样式
- [x] 留白充足，有呼吸感
- [x] 信息层次清晰，易于阅读
- [x] 符合专业金融数据平台风格
