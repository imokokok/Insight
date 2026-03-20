# Tasks - 代码规范合规性检查

- [x] Task 1: TypeScript 枚举规范检查
  - [x] SubTask 1.1: 扫描所有 `.ts` 和 `.tsx` 文件中的 `enum` 定义
  - [x] SubTask 1.2: 识别未使用 `const enum` 的枚举定义
  - [x] SubTask 1.3: 生成枚举规范违规报告

- [x] Task 2: TypeScript 类型定义规范检查
  - [x] SubTask 2.1: 扫描所有 `type` 定义，识别对象形状定义
  - [x] SubTask 2.2: 扫描所有 `interface` 定义，识别联合类型误用
  - [x] SubTask 2.3: 生成类型定义规范违规报告

- [x] Task 3: any 类型使用检查
  - [x] SubTask 3.1: 运行 TypeScript 编译器检查隐式 any
  - [x] SubTask 3.2: 扫描显式 `any` 类型使用
  - [x] SubTask 3.3: 生成 any 类型使用报告

- [x] Task 4: React 组件规范检查
  - [x] SubTask 4.1: 检查 Client Components 是否正确标记 `'use client'`
  - [x] SubTask 4.2: 检查 Server Components 是否不必要地标记 `'use client'`
  - [x] SubTask 4.3: 检查 Props 接口命名是否遵循 `ComponentNameProps` 格式
  - [x] SubTask 4.4: 生成 React 组件规范违规报告

- [x] Task 5: 导入导出规范检查
  - [x] SubTask 5.1: 检查导入语句顺序是否符合规范
  - [x] SubTask 5.2: 检查是否使用路径别名 `@/` 而非深层相对路径
  - [x] SubTask 5.3: 检查类型导入是否使用 `type` 关键字
  - [x] SubTask 5.4: 生成导入导出规范违规报告

- [x] Task 6: 样式规范检查
  - [x] SubTask 6.1: 检查是否使用 `cn` 函数合并类名
  - [x] SubTask 6.2: 检查 Tailwind CSS 类名顺序
  - [x] SubTask 6.3: 生成样式规范违规报告

- [x] Task 7: 状态管理规范检查
  - [x] SubTask 7.1: 检查 React Query Query Keys 是否使用工厂模式
  - [x] SubTask 7.2: 检查 Query 配置是否符合规范（staleTime, gcTime 等）
  - [x] SubTask 7.3: 生成状态管理规范违规报告

- [x] Task 8: 错误处理规范检查
  - [x] SubTask 8.1: 检查是否使用自定义错误类（AppError 及其子类）
  - [x] SubTask 8.2: 检查 API 路由是否正确处理错误
  - [x] SubTask 8.3: 生成错误处理规范违规报告

- [x] Task 9: 命名约定检查
  - [x] SubTask 9.1: 检查组件文件是否使用 PascalCase 命名
  - [x] SubTask 9.2: 检查 Hook 文件是否使用 camelCase + use 前缀命名
  - [x] SubTask 9.3: 检查布尔值变量是否使用 is/has/should 前缀
  - [x] SubTask 9.4: 检查函数是否使用动词开头命名
  - [x] SubTask 9.5: 生成命名约定违规报告

- [x] Task 10: 注释规范检查
  - [x] SubTask 10.1: 检查重要文件是否缺少文件头注释
  - [x] SubTask 10.2: 检查公共函数是否缺少 JSDoc 文档
  - [x] SubTask 10.3: 生成注释规范违规报告

- [x] Task 11: 汇总报告生成
  - [x] SubTask 11.1: 汇总所有规范违规项
  - [x] SubTask 11.2: 按严重程度分类（必须修复、建议修复、可选优化）
  - [x] SubTask 11.3: 生成最终合规性检查报告

# Task Dependencies
- Task 11 依赖 Task 1-10
- Task 1-10 可并行执行
