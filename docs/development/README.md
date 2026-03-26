# 开发文档

> Insight 项目开发相关文档

## 文档导航

- [贡献指南](./contributing.md) - 如何为项目做出贡献
- [测试指南](./testing.md) - 测试策略与实践
- [代码风格](./code-style.md) - 代码规范与风格指南

## 快速开始

### 环境要求

- Node.js 18.17.0+
- npm 9.0.0+
- Git 2.30.0+

### 安装

```bash
git clone https://github.com/your-org/insight.git
cd insight
npm install
```

### 开发

```bash
# 启动开发服务器
npm run dev

# 运行测试
npm test

# 运行代码检查
npm run lint

# 构建项目
npm run build
```

## 项目结构

```
src/
├── app/              # Next.js App Router
├── components/       # React 组件
├── hooks/           # 自定义 Hooks
├── lib/             # 核心库
├── types/           # TypeScript 类型
└── i18n/            # 国际化
```

## 开发规范

### 代码提交

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat(oracles): add Pyth Network support
fix(ui): resolve tooltip positioning issue
docs(readme): update installation guide
```

### 分支命名

```
feat/<feature-name>
fix/<bug-description>
refactor/<component>
docs/<documentation>
```

## 获取帮助

- [GitHub Issues](https://github.com/your-org/insight/issues)
- [Discord](https://discord.gg/insight)
- [邮件](mailto:support@insight.io)
