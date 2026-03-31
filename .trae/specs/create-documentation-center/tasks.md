# 创建文档中心页面任务清单

## Task 1: 创建文档中心页面基础结构
- [x] 创建文档中心页面目录结构
  - [x] 创建 `src/app/[locale]/docs/` 目录
  - [x] 创建 `src/app/[locale]/docs/components/` 目录
  - [x] 创建 `src/app/[locale]/docs/page.tsx` 主页面

## Task 2: 创建文档中心组件
- [x] 创建 DocsHero 组件 - 页面顶部 Hero 区域
  - [x] 包含页面标题和简介
  - [x] 使用项目现有配色方案
- [x] 创建 DocsNavigation 组件 - 文档导航侧边栏
  - [x] 包含快速入门、功能指南、技术文档、开发者资源等分类
  - [x] 支持点击滚动到对应章节
- [x] 创建 DocsSection 组件 - 文档内容区块
  - [x] 支持标题、内容、图标等配置
  - [x] 保持与 methodology 页面一致的卡片式布局

## Task 3: 创建文档内容组件
- [x] 创建 QuickStartSection 组件 - 快速入门
  - [x] 平台介绍
  - [x] 注册登录指南
  - [x] 基本使用教程
- [x] 创建 FeaturesGuideSection 组件 - 功能指南
  - [x] 价格查询功能说明
  - [x] 跨预言机对比功能说明
  - [x] 跨链分析功能说明
  - [x] 告警管理功能说明
- [x] 创建 TechnicalDocsSection 组件 - 技术文档
  - [x] 方法论说明（链接到 /methodology）
  - [x] API 参考概览
  - [x] 架构设计概览
- [x]  create DeveloperResourcesSection 组件 - 开发者资源
  - [x] 集成指南
  - [x] 示例代码
  - [x] 常见问题

## Task 4: 添加国际化支持
- [x] 创建英文国际化文件
  - [x] 创建 `src/i18n/messages/en/docs.json`
  - [x] 包含所有文档中心相关的文案
- [x] 创建中文国际化文件
  - [x] 创建 `src/i18n/messages/zh-CN/docs.json`
  - [x] 包含所有文档中心相关的文案
- [x] 更新 i18n 配置
  - [x] 修改 `src/i18n/config.ts` 添加 docs 消息文件配置

## Task 5: 更新首页按钮链接
- [x] 修改 ProfessionalHero 组件
  - [x] 更新 `src/app/[locale]/home-components/ProfessionalHero.tsx`
  - [x] 将"查看文档"按钮链接从 `/price-query` 改为 `/docs`

## Task 6: 导出组件索引
- [x] 创建 `src/app/[locale]/docs/components/index.ts`
  - [x] 导出所有文档中心组件

# Task Dependencies
- Task 1 完成后才能开始 Task 2
- Task 2 完成后才能开始 Task 3
- Task 3 和 Task 4 可以并行执行
- Task 5 可以在任何时候执行（只需修改链接）
- Task 6 在 Task 2 和 Task 3 完成后执行
