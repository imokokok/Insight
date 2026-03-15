# Tasks

- [x] Task 1: 修正导航配置中的 Tellar 为 Tellor
  - [x] 在 `src/components/navigation/config.ts` 中将 `/tellar` 路由修改为 `/tellor`
  - [x] 将 `navbar.tellar` 修改为 `navbar.tellor`
  - [x] 将 `navbar.tellarDesc` 修改为 `navbar.tellorDesc`

- [x] Task 2: 修正国际化翻译文件
  - [x] 在 `src/i18n/en.json` 中将 `tellar` 键名修改为 `tellor`
  - [x] 在 `src/i18n/zh-CN.json` 中将 `tellar` 键名修改为 `tellor`
  - [x] 确保翻译内容正确（使用 "Tellor" 而非 "Tellar"）

- [x] Task 3: 删除重复的颜色配置
  - [x] 在 `src/lib/config/colors.ts` 中删除错误的 `tellar: '#06B6D4'` 配置
  - [x] 保留正确的 `tellor: '#AA96DA'` 配置

- [x] Task 4: 更新相关 spec 文档
  - [x] 更新 `integrate-dia-tellar-oracles` spec 中的命名

# Task Dependencies
- Task 2 和 Task 3 可以并行执行
- Task 1 依赖于 Task 2（导航引用国际化键名）
