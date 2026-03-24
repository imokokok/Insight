# API3 页面重构任务列表

## 任务概览
将 API3 页面重构成 Chainlink 页面那样的布局，减少不必要信息，提升数据密度，充分展示 API3 预言机的特性。

---

## 任务 1: 创建 API3 页面基础架构
**描述**: 创建 API3 页面所需的目录结构和类型定义

- [ ] 1.1 创建 `src/app/[locale]/api3/components/` 目录
- [ ] 1.2 创建 `src/app/[locale]/api3/hooks/` 目录
- [ ] 1.3 创建 `src/app/[locale]/api3/types.ts` 类型定义文件
  - 定义 `API3TabId` 类型
  - 定义 `API3PageState` 接口
  - 定义视图组件 Props 接口

---

## 任务 2: 创建 useAPI3Page Hook
**描述**: 创建管理 API3 页面状态和逻辑的自定义 Hook
**依赖**: 任务 1

- [ ] 2.1 创建 `src/app/[locale]/api3/hooks/useAPI3Page.ts`
  - 管理 activeTab 状态
  - 调用 useAPI3AllData 获取数据
  - 实现刷新和导出功能
  - 返回页面所需的所有状态和操作

---

## 任务 3: 创建 API3Sidebar 组件
**描述**: 创建侧边栏导航组件
**依赖**: 任务 1

- [ ] 3.1 创建 `src/app/[locale]/api3/components/API3Sidebar.tsx`
  - 实现 6 个 Tab 的导航
  - 使用 emerald 绿色主题
  - 支持激活状态高亮
  - 使用图标增强可读性

---

## 任务 4: 创建 API3MarketView 组件
**描述**: 创建市场数据视图组件
**依赖**: 任务 1

- [ ] 4.1 创建 `src/app/[locale]/api3/components/API3MarketView.tsx`
  - 价格趋势图表（占 2/3 宽度）
  - 快速统计数据（占 1/3 宽度）
  - 网络状态指标
  - 数据源列表
  - 整合原 staking 数据

---

## 任务 5: 创建 API3NetworkView 组件
**描述**: 创建网络健康视图组件
**依赖**: 任务 1

- [ ] 5.1 创建 `src/app/[locale]/api3/components/API3NetworkView.tsx`
  - 4 个核心网络指标卡片
  - NetworkHealthPanel 集成
  - 每小时活动图表
  - 性能指标进度条

---

## 任务 6: 创建 API3AirnodeView 组件
**描述**: 创建 Airnode 部署视图组件
**依赖**: 任务 1

- [ ] 6.1 创建 `src/app/[locale]/api3/components/API3AirnodeView.tsx`
  - Airnode 部署列表
  - 网络统计信息
  - 第一方预言机优势展示（整合原 advantages Tab 内容）

---

## 任务 7: 创建 API3DapiView 组件
**描述**: 创建 dAPI 覆盖视图组件
**依赖**: 任务 1

- [ ] 7.1 创建 `src/app/[locale]/api3/components/API3DapiView.tsx`
  - DapiCoveragePanel 集成
  - 数据源可追溯性面板
  - 价格偏差监控

---

## 任务 8: 创建 API3EcosystemView 组件
**描述**: 创建生态系统视图组件
**依赖**: 任务 1

- [ ] 8.1 创建 `src/app/[locale]/api3/components/API3EcosystemView.tsx`
  - EcosystemPanel 集成
  - 简洁的布局展示

---

## 任务 9: 创建 API3RiskView 组件
**描述**: 创建风险评估视图组件
**依赖**: 任务 1

- [ ] 9.1 创建 `src/app/[locale]/api3/components/API3RiskView.tsx`
  - API3RiskAssessmentPanel 集成
  - 简洁的风险指标展示

---

## 任务 10: 创建组件索引文件
**描述**: 创建组件统一导出文件
**依赖**: 任务 3-9

- [ ] 10.1 创建 `src/app/[locale]/api3/components/index.ts`
  - 导出所有视图组件
  - 导出 Sidebar 组件

---

## 任务 11: 重构主页面 page.tsx
**描述**: 重构 API3 主页面，采用新的布局
**依赖**: 任务 2, 3, 10

- [ ] 11.1 重写 `src/app/[locale]/api3/page.tsx`
  - 集成 LiveStatusBar
  - 顶部价格信息和操作按钮
  - 4 个核心统计卡片
  - 侧边栏 + 内容区布局
  - 移动端抽屉菜单支持
  - 使用 emerald 绿色主题

---

## 任务 12: 更新 API3 配置
**描述**: 更新 oracles.tsx 中的 API3 Tab 配置
**依赖**: 无

- [ ] 12.1 修改 `src/lib/config/oracles.tsx`
  - 精简 tabs 数组为 6 个 Tab
  - 更新 labelKey 为新的命名格式

---

## 任务依赖关系
```
任务 1 (基础架构)
  ├── 任务 2 (useAPI3Page Hook)
  │     └── 任务 11 (主页面)
  ├── 任务 3 (Sidebar)
  │     └── 任务 11 (主页面)
  ├── 任务 4-9 (视图组件)
  │     └── 任务 10 (组件索引)
  │           └── 任务 11 (主页面)
  └── 任务 12 (配置更新) [可并行]
```

---

## 验收标准
- [ ] 页面布局与 Chainlink 页面一致
- [ ] 侧边栏导航正常工作，6 个 Tab 可切换
- [ ] 移动端抽屉菜单正常工作
- [ ] 数据密度提升，信息展示更紧凑
- [ ] 绿色主题色统一
- [ ] 无控制台错误
- [ ] 类型检查通过
