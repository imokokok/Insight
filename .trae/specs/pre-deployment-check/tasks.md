# Tasks

- [x] Task 1: 代码质量检查 - 运行 ESLint、Prettier 和 TypeScript 检查
  - [x] SubTask 1.1: 运行 ESLint 检查 (`npm run lint`)
  - [x] SubTask 1.2: 运行 Prettier 格式检查 (`npm run format:check`)
  - [x] SubTask 1.3: 运行 TypeScript 类型检查 (`npm run typecheck`)

- [x] Task 2: 测试验证 - 运行单元测试和 E2E 测试
  - [x] SubTask 2.1: 运行单元测试 (`npm run test`)
  - [x] SubTask 2.2: 检查测试覆盖率
  - [x] SubTask 2.3: 运行 E2E 测试 (`npm run test:e2e`)

- [x] Task 3: 构建验证 - 验证生产构建
  - [x] SubTask 3.1: 运行生产构建 (`npm run build`)
  - [x] SubTask 3.2: 验证构建输出目录
  - [x] SubTask 3.3: 检查构建警告

- [x] Task 4: 性能预算检查 - 验证性能指标
  - [x] SubTask 4.1: 检查 Web Vitals 预算配置
  - [x] SubTask 4.2: 检查 Bundle 大小预算
  - [x] SubTask 4.3: 分析构建输出大小

- [x] Task 5: 安全审计 - 检查安全漏洞
  - [x] SubTask 5.1: 运行 npm audit 检查依赖漏洞
  - [x] SubTask 5.2: 检查环境变量安全
  - [x] SubTask 5.3: 验证安全头部配置

- [x] Task 6: 国际化检查 - 验证 i18n 配置
  - [x] SubTask 6.1: 运行 i18n 检查 (`npm run i18n:check`)
  - [x] SubTask 6.2: 验证翻译文件完整性

- [x] Task 7: 环境变量验证 - 检查必要配置
  - [x] SubTask 7.1: 检查 .env.local 或环境变量配置
  - [x] SubTask 7.2: 验证 Supabase 配置
  - [x] SubTask 7.3: 验证其他必要环境变量

- [x] Task 8: 数据库迁移验证 - 检查数据库配置
  - [x] SubTask 8.1: 检查迁移文件存在性
  - [x] SubTask 8.2: 验证 RLS 策略配置
  - [x] SubTask 8.3: 检查索引配置

# Task Dependencies

- Task 1、Task 2、Task 6 可以并行执行
- Task 3 依赖于 Task 1 和 Task 2 完成（确保代码质量和测试通过后再构建）
- Task 4 依赖于 Task 3 完成（需要构建输出）
- Task 5、Task 7、Task 8 可以并行执行
