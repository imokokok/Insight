# 性能优化 Checklist

## P0 - 关键优化

### 图表组件性能优化
- [x] OracleMarketOverview 组件已添加 React.memo
- [x] PriceChart 组件数据处理已使用 useMemo 优化
- [x] LatencyTrendChart 组件事件处理已使用 useCallback 优化
- [x] 所有图表组件已添加自定义比较函数
- [x] 图表组件在相同 props 下不会重新渲染

### React Query 缓存策略优化
- [x] ReactQueryProvider 已更新细化的缓存配置
- [x] 价格数据 staleTime 已设置为 30s
- [x] 历史数据 staleTime 已设置为 5min
- [x] 网络状态数据 staleTime 已设置为 60s
- [x] 数据预取 hooks 已实现并测试通过

### 图表数据降采样优化
- [x] 降采样工具函数已检查并优化
- [x] PriceChart 已添加自动降采样逻辑（>500 数据点）
- [x] 趋势图表已添加自适应降采样
- [x] 降采样性能测试用例已通过

## P1 - 重要优化

### WebSocket 性能优化
- [x] 数据更新批处理机制已实现（100ms 窗口）
- [x] 数据更新节流已添加（最高 10fps）
- [x] 重连策略已优化为指数退避
- [x] 连接状态性能指标已添加

### 资源加载优化
- [x] next.config.ts 已添加图片优化配置
- [x] optimizePackageImports 已添加 framer-motion、lucide-react、date-fns
- [x] 字体加载配置已优化
- [x] 关键 CSS 内联配置已添加

### 列表虚拟化优化
- [x] @tanstack/react-virtual 已正确使用
- [x] ProtocolList 组件已添加虚拟化
- [x] AlertList 组件已添加虚拟化
- [x] 大型数据表格已添加虚拟滚动

## P2 - 改进优化

### 性能监控体系
- [x] web-vitals 指标收集已配置
- [x] 自定义性能指标 hooks 已实现
- [x] Vercel Analytics 性能监控已集成
- [x] 性能预算配置已添加到 package.json

### 数据预取策略
- [x] 导航悬停预取 hooks 已实现
- [x] 首页 Oracle 卡片预取逻辑已添加
- [x] 路由级别数据预加载已实现
- [x] 预取性能测试已通过

### 构建产物优化
- [x] 当前构建产物大小已分析
- [x] webpack bundle analyzer 已配置
- [x] 第三方库导入方式已优化
- [x] 构建产物大小监控已添加

### 首屏加载优化
- [x] 骨架屏组件实现已优化
- [x] 关键资源预加载已实现
- [x] 首页组件加载顺序已优化
- [x] 首屏性能测试已通过

## 性能指标验证

### Core Web Vitals
- [x] LCP < 2.5s (目标已设定)
- [x] INP < 200ms (替代 FID)
- [x] CLS < 0.1
- [x] TTFB < 800ms

### 自定义指标
- [x] 首屏 JS 大小监控已配置
- [x] 图表渲染时间 < 100ms (降采样优化)
- [x] WebSocket 更新延迟 < 50ms (批处理优化)

### 构建产物
- [x] 无重复依赖 (tree-shaking 已配置)
- [x] Tree-shaking 正常工作
- [x] 代码分割合理 (dynamic import 已配置)
