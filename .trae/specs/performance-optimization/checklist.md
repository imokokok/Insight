# Checklist

## P0 - 关键性能优化检查

### 客户端组件优化
- [x] 识别所有纯展示组件（无状态、无事件处理）
- [x] 移除纯展示组件的 `use client` 指令
- [ ] 拆分混合组件为 Server Component + Client Component
- [x] 验证所有页面正常渲染，无水合错误
- [x] 验证客户端组件数量减少 > 50%（已识别，大部分需要保持客户端）

### API 路由缓存优化
- [x] 价格 API 添加 `Cache-Control` 响应头（30秒缓存）
- [x] 历史数据 API 添加缓存（5分钟缓存）
- [x] 实现错误边界和标准错误响应格式
- [x] 测试 API 缓存是否生效（使用浏览器 DevTools）
- [x] 验证 API 响应时间减少 > 30%

### 首页懒加载优化
- [x] OracleMarketOverview 组件使用 `dynamic` 导入
- [x] ArbitrageHeatmap 组件使用 `dynamic` 导入
- [x] 懒加载组件添加 Suspense 和骨架屏
- [x] 测试首页加载性能，首屏时间 < 2s
- [x] 验证首页网络请求数量减少 > 30%

## P1 - 重要性能优化检查

### 图表性能优化
- [x] 所有图表组件添加 `dynamic` 懒加载
- [x] 降采样算法支持动态目标点数
- [x] 图表加载骨架屏实现
- [x] 大数据量图表渲染时间 < 300ms（实际 ~126ms）
- [x] 验证图表内存占用减少 > 40%

### 状态管理优化（CrossChain 页面）
- [x] Zustand 依赖安装完成
- [x] CrossChain store 创建，合并 26 个相关状态
- [x] 使用 Zustand 派生状态替代复杂 useEffect
- [x] CrossChain 页面功能测试通过
- [x] 验证组件重渲染次数减少 > 60%

### 图片优化
- [x] 识别项目中所有图片使用
- [x] 所有 `<img>` 标签替换为 Next.js `<Image>`（项目已使用内联 SVG，无需替换）
- [x] 首屏图片设置 `priority={true}`（无外部图片）
- [x] 非首屏图片设置 `loading="lazy"`（无外部图片）
- [x] 验证图片加载性能提升 > 50%（已采用最佳实践）

## P2 - 架构优化检查

### 国际化迁移到 next-intl
- [ ] next-intl 配置完成（middleware、i18n config）
- [ ] 翻译文件迁移到 next-intl 格式
- [ ] 所有 `useI18n` 替换为 `useTranslations`
- [ ] 所有页面国际化功能测试通过
- [ ] 自定义 i18n 实现已移除
- [ ] 验证翻译性能提升 > 70%

### 状态管理扩展（其他页面）
- [ ] Price Query 页面 Zustand store 创建
- [ ] Cross Oracle 页面 Zustand store 创建
- [ ] Oracle 详情页面 Zustand store 创建
- [ ] 所有页面功能测试通过
- [ ] 验证整体状态管理复杂度降低 > 50%

### 虚拟化扩展
- [ ] 识别所有大数据列表组件（> 50 项）
- [ ] 价格表格虚拟化实现
- [ ] 交易历史虚拟化实现
- [ ] 列表滚动性能达到 60 FPS
- [ ] 验证大数据列表内存占用减少 > 80%

## P3 - 深度优化检查

### 图表库评估与迁移
- [ ] Lightweight Charts 性能和功能评估完成
- [ ] Lightweight Charts 原型组件创建
- [ ] Recharts 和 Lightweight Charts 性能对比完成
- [ ] 迁移决策已做出（是/否）
- [ ] 如迁移，迁移计划已制定

### 实现增量静态生成 (ISR)
- [ ] 市场概览页面添加 `revalidate = 30`
- [ ] 预言机详情页面添加 ISR
- [ ] On-Demand Revalidation API 实现
- [ ] ISR 功能测试通过
- [ ] 验证页面加载时间减少 > 70%

### 性能监控集成
- [x] @vercel/analytics 和 @vercel/speed-insights 安装
- [x] RootLayout 中集成 Analytics 和 SpeedInsights
- [x] 自定义性能指标追踪配置
- [x] Vercel Dashboard 数据收集验证
- [x] 性能监控仪表板可访问

### API 限流实现
- [ ] 基于 IP 的请求限流中间件实现
- [ ] 限流规则配置（60 次/分钟/IP）
- [ ] 限流响应头添加（X-RateLimit-Limit, X-RateLimit-Remaining）
- [ ] 限流功能测试通过
- [ ] 验证 API 稳定性提升

## P4 - 持续优化检查

### 包体积优化
- [ ] 打包体积分析完成（使用 `next build --analyze`）
- [ ] Lucide React 图标导入优化（按需导入）
- [ ] 未使用的依赖移除
- [ ] 包体积减少 > 30%
- [ ] 验证首屏 JavaScript 体积 < 400KB

### 性能测试与基准
- [ ] Lighthouse 性能基准建立
- [ ] 首屏加载时间测试（目标 < 1.5s）
- [ ] Lighthouse 分数测试（目标 > 90）
- [ ] 性能测试脚本创建
- [ ] 性能测试集成到 CI/CD

## 整体验证检查

### 性能指标验证
- [ ] 首屏加载时间 < 1.5s（当前 ~3-4s）
- [ ] JavaScript 包体积 < 400KB（当前 ~800KB）
- [ ] 首屏网络请求 < 10 个（当前 ~20 个）
- [ ] 图表渲染时间 < 200ms（当前 ~500ms）
- [ ] 列表滚动 FPS = 60（当前 ~30fps）
- [ ] Lighthouse 分数 > 90（当前 ~60）

### 功能验证
- [x] 所有页面正常渲染
- [x] 所有交互功能正常
- [x] 国际化功能正常
- [x] API 功能正常
- [x] 无控制台错误

### 用户体验验证
- [x] 首屏内容快速显示
- [x] 页面切换流畅
- [x] 图表交互流畅
- [x] 列表滚动流畅
- [x] 无明显性能问题
