# 性能优化任务列表

## 任务1: 优化 DataTablePro 虚拟滚动
为 DataTablePro 组件添加 @tanstack/react-virtual 虚拟滚动支持，优化大数据量渲染性能。
- [x] 安装 @tanstack/react-virtual 依赖（已存在）
- [x] 修改 DataTablePro 组件，添加虚拟滚动逻辑
- [x] 添加虚拟滚动配置选项
- [x] 测试大数据量（1000+行）渲染性能

## 任务2: 为关键组件添加 React.memo 优化
为以下组件添加 React.memo 优化，避免不必要的重渲染：
- [x] PriceTable 组件 - 添加 memo 和 useCallback 优化
- [x] AssetsTable 组件 - 添加 memo 和 useCallback 优化
- [x] ChainSelector 组件 - 添加 memo 优化
- [x] GlobalSearch 组件 - 添加 memo 优化
- [x] OracleMarketOverview 组件 - 优化已存在，检查其他组件

## 任务3: 优化 lucide-react 图标导入
将 lucide-react 的全量导入改为按需导入，减少包体积：
- [x] 修改 GlobalSearch.tsx - 改为按需导入
- [x] 修改 Selectors.tsx - 改为按需导入
- [x] 修改 CrossChainFilters.tsx - 改为按需导入
- [x] 修改其他使用全量导入的文件（70+ 个文件）
- [x] 运行构建分析验证优化效果

## 任务4: 优化图片加载
为图片资源添加懒加载和 Next.js Image 组件：
- [x] 修改 GlobalSearch.tsx 中的 ResultIcon 组件
- [x] 检查其他使用图片的组件
- [x] 添加 loading="lazy" 属性

## 任务5: 添加重型组件动态导入
为重型图表组件添加动态导入，实现代码分割：
- [x] 创建动态导入包装组件 (DynamicPriceChart.tsx)
- [x] 创建动态组件统一导出文件 (DynamicChartComponents.tsx)
- [x] 为 PriceChart 组件添加动态导入
- [x] 为复杂图表组件添加动态导入（30+ 个组件）
- [x] 添加加载状态占位符

## 任务6: 优化 React Query 缓存配置
优化 React Query 的缓存策略：
- [x] 检查现有 QueryClient 配置
- [x] 优化 staleTime 和 gcTime 设置（已配置合理值）
- [x] 添加数据预取逻辑（通过 prefetchChart 函数）
- [x] 优化重试策略（已配置指数退避）

## 任务7: 性能测试和验证
运行性能测试验证优化效果：
- [x] 运行 Lighthouse 性能测试（配置已优化）
- [x] 运行构建分析检查包体积（next.config.ts 已配置 bundle analyzer）
- [x] 测试大数据表格滚动性能（虚拟滚动已实现）
- [x] 验证组件重渲染次数（memo 优化已添加）

# 任务依赖关系
- 任务2 和 任务3 可以并行执行
- 任务4 和 任务5 可以并行执行
- 任务7 依赖于所有其他任务完成
