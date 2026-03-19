# Checklist

## 统计卡片 (StatsGrid)
- [x] StatsGrid 主统计区域内边距为 py-2.5 px-3
- [x] 主指标字体大小为 text-xl font-bold
- [x] 标签字体大小为 text-[10px] uppercase tracking-wider
- [x] 对比差异使用 bg-gray-50 背景，不使用彩色背景
- [x] 展开/收起按钮样式简洁，hover 状态明显
- [x] 展开区域动画流畅，max-h 过渡自然

## 统计项 (StatItem)
- [x] StatItem 支持 compact 模式
- [x] 数值使用等宽字体 (font-mono)
- [x] 趋势指示器大小适中，颜色正确
- [x] subValue 样式为 text-[10px] text-gray-400

## 结果表格 (PriceResultsTable)
- [x] 表格行高为 py-2
- [x] 选中行有左侧边框高亮 (border-l-2 border-blue-500)
- [x] 选中行背景为 bg-blue-50/30
- [x] 高偏差标记使用 subtle 的背景色
- [x] 分页器按钮样式简洁统一
- [x] 表头样式与其他表格一致

## 选择器 (Selectors)
- [x] 各选择器之间有清晰的分隔 (bg-gray-50/50 rounded-lg p-3)
- [x] SegmentedControl 选中状态明显
- [x] MultiSelect 选中项有颜色标识
- [x] 高级选项展开有平滑动画
- [x] 查询按钮样式与整体风格一致

## 图表 (PriceChart)
- [x] 指标控制区域布局紧凑
- [x] 图例交互反馈清晰
- [x] 图表标题样式为 text-sm font-semibold
- [x] 工具栏按钮样式统一

## 整体布局
- [x] 区块间距统一为 gap-6
- [x] 卡片圆角统一为 rounded-lg
- [x] 阴影统一为 shadow-sm 或无边框
- [x] QueryHeader 按钮布局合理
- [x] 移动端布局正常，无溢出
- [x] 加载状态样式正确
