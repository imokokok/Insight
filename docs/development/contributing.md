# 贡献指南

> 感谢您对 Insight 项目的关注！本指南将帮助您快速上手开发。

## 目录

- [开发环境搭建](#开发环境搭建)
- [项目结构](#项目结构)
- [代码提交规范](#代码提交规范)
- [PR 流程](#pr-流程)
- [代码审查标准](#代码审查标准)

## 开发环境搭建

### 前置要求

- **Node.js**: 18.17.0 或更高版本
- **npm**: 9.0.0 或更高版本
- **Git**: 2.30.0 或更高版本

### 环境变量配置

创建 `.env.local` 文件：

```bash
# 数据库
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 认证
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# 可选：第三方服务
SENTRY_DSN=your_sentry_dsn
```

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/your-org/insight.git
cd insight

# 2. 安装依赖
npm install

# 3. 设置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入您的配置

# 4. 启动开发服务器
npm run dev

# 5. 打开浏览器访问
open http://localhost:3000
```

### 验证安装

```bash
# 运行类型检查
npm run typecheck

# 运行代码检查
npm run lint

# 运行测试
npm run test

# 构建项目
npm run build
```

## 项目结构

```
insight/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/          # 国际化路由
│   │   ├── api/               # API 路由
│   │   └── ...
│   ├── components/            # React 组件
│   │   ├── oracle/           # 预言机组件
│   │   ├── ui/               # 基础 UI 组件
│   │   └── ...
│   ├── hooks/                # 自定义 Hooks
│   ├── lib/                  # 核心库
│   │   ├── oracles/         # 预言机客户端
│   │   ├── api/             # API 层
│   │   └── errors/          # 错误处理
│   ├── types/               # TypeScript 类型
│   └── i18n/                # 国际化
├── docs/                     # 文档
├── public/                   # 静态资源
├── scripts/                  # 脚本工具
├── tests/                    # 测试文件
├── .trae/                    # Trae AI 配置
├── package.json
└── README.md
```

## 代码提交规范

### Conventional Commits

我们遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 提交类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(oracles): add Pyth Network support` |
| `fix` | 修复 bug | `fix(charts): resolve tooltip positioning issue` |
| `docs` | 文档更新 | `docs(readme): update installation guide` |
| `style` | 代码格式 | `style(components): format with prettier` |
| `refactor` | 重构 | `refactor(hooks): simplify usePriceData logic` |
| `perf` | 性能优化 | `perf(queries): add caching for price data` |
| `test` | 测试相关 | `test(api): add unit tests for oracle handlers` |
| `chore` | 构建/工具 | `chore(deps): update dependencies` |
| `ci` | CI/CD | `ci(github): add automated testing workflow` |

### 提交范围

常用范围：
- `oracles` - 预言机相关
- `components` - 组件
- `hooks` - Hooks
- `api` - API 路由
- `lib` - 核心库
- `styles` - 样式
- `i18n` - 国际化
- `tests` - 测试
- `docs` - 文档

### 提交示例

```bash
# 新功能
feat(oracles): add real-time price updates for Chainlink

Implement WebSocket connection for real-time price updates.
Closes #123

# 修复
fix(ui): resolve mobile navigation overlap issue

The navigation was overlapping content on screens smaller than 768px.

# 重构
refactor(queries): migrate from SWR to React Query

BREAKING CHANGE: The usePrice hook API has changed.
```

### 提交信息规范

- **subject** 使用现在时态，首字母小写，不加句号
- **body** 详细说明变更原因和实现方式
- **footer** 用于引用 issue 或说明破坏性变更

## PR 流程

### 创建分支

```bash
# 从 main 分支创建新分支
git checkout main
git pull origin main

# 创建功能分支
git checkout -b feat/oracle-pyth-support

# 创建修复分支
git checkout -b fix/chart-tooltip-position
```

### 分支命名规范

```
feat/<feature-name>          # 新功能
fix/<bug-description>        # 修复
refactor/<component>         # 重构
docs/<documentation>         # 文档
chore/<maintenance>          # 维护
```

### 开发流程

```bash
# 1. 进行开发...
# 编辑代码

# 2. 运行测试
npm run test

# 3. 运行代码检查
npm run lint

# 4. 运行类型检查
npm run typecheck

# 5. 提交代码
git add .
git commit -m "feat(oracles): add Pyth Network support"

# 6. 推送到远程
git push origin feat/oracle-pyth-support
```

### 创建 PR

1. 访问 GitHub 仓库
2. 点击 "New Pull Request"
3. 选择源分支和目标分支（main）
4. 填写 PR 标题和描述

### PR 模板

```markdown
## 描述
简要描述这个 PR 做了什么

## 变更类型
- [ ] 新功能
- [ ] Bug 修复
- [ ] 重构
- [ ] 文档更新
- [ ] 性能优化

## 测试
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试通过

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 没有引入新的警告

## 相关 Issue
Closes #123
```

## 代码审查标准

### 审查清单

#### 代码质量

- [ ] 代码清晰易读
- [ ] 命名规范一致
- [ ] 没有冗余代码
- [ ] 适当的注释
- [ ] 错误处理完善

#### 类型安全

- [ ] TypeScript 类型完整
- [ ] 没有 `any` 类型
- [ ] 接口定义清晰
- [ ] 泛型使用正确

#### 性能

- [ ] 避免不必要的重渲染
- [ ] 适当的缓存策略
- [ ] 懒加载大型组件
- [ ] 图片优化

#### 测试

- [ ] 单元测试覆盖
- [ ] 集成测试覆盖
- [ ] 边界条件测试
- [ ] 错误场景测试

#### 可访问性

- [ ] 语义化 HTML
- [ ] ARIA 属性
- [ ] 键盘导航
- [ ] 颜色对比度

### 审查流程

1. **自动检查**
   - CI 流水线运行测试
   - 代码覆盖率检查
   - 代码风格检查

2. **人工审查**
   - 至少 1 名维护者审查
   - 解决所有评论
   - 获得批准后合并

3. **合并要求**
   - 所有检查通过
   - 代码审查批准
   - 无冲突

### 审查评论规范

```
# 提问
"这里为什么要用 useCallback？是否有性能考虑？"

# 建议
"建议将这个逻辑提取到单独的函数中，提高可读性"

# 必须修复
"必须修复：这里缺少错误处理，可能导致崩溃"

# 表扬
"很好的实现！这种处理方式很优雅"
```

## 开发规范

### 代码风格

- 使用 ESLint 和 Prettier 保持代码风格一致
- 运行 `npm run lint:fix` 自动修复风格问题

### 文件命名

| 类型 | 命名方式 | 示例 |
|------|----------|------|
| 组件 | PascalCase | `PriceCard.tsx` |
| Hooks | camelCase + use | `usePriceData.ts` |
| 工具函数 | camelCase | `formatPrice.ts` |
| 类型定义 | PascalCase | `OracleTypes.ts` |
| 常量 | SCREAMING_SNAKE_CASE | `ORACLE_PROVIDERS.ts` |

### 导入顺序

```typescript
// 1. React 和 Next.js
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. 第三方库
import { useQuery } from '@tanstack/react-query';

// 3. 项目内部绝对导入
import { Button } from '@/components/ui/Button';
import { usePriceData } from '@/hooks/usePriceData';

// 4. 相对导入
import { utils } from './utils';

// 5. 类型导入
import type { PriceData } from '@/types/oracle';
```

## 常见问题

### 安装依赖失败

```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 类型检查失败

```bash
# 检查 TypeScript 配置
npx tsc --noEmit

# 查看详细错误
npx tsc --noEmit --pretty
```

### 测试失败

```bash
# 运行特定测试
npm test -- PriceCard.test.tsx

# 调试模式
npm test -- --verbose

# 更新快照
npm test -- --updateSnapshot
```

## 获取帮助

- **GitHub Issues**: [提交问题](https://github.com/your-org/insight/issues)
- **Discord**: [加入社区](https://discord.gg/insight)
- **邮件**: support@insight.io

## 许可证

通过提交 PR，您同意您的代码将根据项目的 [MIT 许可证](../LICENSE) 进行许可。
