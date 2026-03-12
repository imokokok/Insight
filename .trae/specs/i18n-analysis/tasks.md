# Tasks

- [x] Task 1: 评估迁移方案
  - [x] SubTask 1.1: 确认是否需要 SEO 优化
  - [x] SubTask 1.2: 确认是否需要 URL 路径国际化
  - [x] SubTask 1.3: 决定迁移到 next-intl 或优化现有实现

- [x] Task 2: 迁移到 next-intl（简化方案）
  - [x] SubTask 2.1: 创建 next-intl 配置文件
  - [x] SubTask 2.2: 重构 I18nProvider 使用 next-intl
  - [x] SubTask 2.3: 更新所有 useI18n 调用为使用新的 provider
  - [x] SubTask 2.4: 添加类型安全支持
  - [x] SubTask 2.5: 测试 SSR/SSG 水合
  - [x] SubTask 2.6: 测试语言切换功能

- [ ] Task 3: 可选 - 启用 URL 路由国际化（如需 SEO 优化）
  - [ ] SubTask 3.1: 创建 [locale] 动态路由目录
  - [ ] SubTask 3.2: 将页面移动到 [locale] 目录下
  - [ ] SubTask 3.3: 更新 layout.tsx 使用 NextIntlClientProvider
  - [ ] SubTask 3.4: 配置 next.config.ts 添加 next-intl 插件

# Task Dependencies
- Task 3 是可选的，取决于是否需要 SEO 优化
