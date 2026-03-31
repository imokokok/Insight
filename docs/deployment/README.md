# 部署指南

> Insight 项目部署文档

## 目录

- [环境要求](#环境要求)
- [Vercel 部署](#vercel-部署)
- [Docker 部署](#docker-部署)
- [环境变量](#环境变量)

## 环境要求

- Node.js 20+
- npm 9.0.0+
- PostgreSQL 14+ (如果使用 Supabase)

## Vercel 部署

### 一键部署

使用 Vercel CLI 或 Git 集成进行部署：

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署预览
vercel

# 4. 生产部署
vercel --prod
```

### 手动部署

项目支持直接部署到 Vercel：

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start
```

### 配置环境变量

在 Vercel Dashboard 中设置以下环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## Docker 部署

### 构建镜像

```bash
# 构建
docker build -t insight:latest .

# 运行
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  insight:latest
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
    restart: unless-stopped
```

## 环境变量

### 必需变量

| 变量名                        | 描述                  | 示例                    |
| ----------------------------- | --------------------- | ----------------------- |
| NEXT_PUBLIC_SUPABASE_URL      | Supabase 项目 URL     | https://xxx.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 匿名密钥     | eyJhbG...               |
| SUPABASE_SERVICE_ROLE_KEY     | Supabase 服务角色密钥 | eyJhbG...               |

### 可选变量

| 变量名          | 描述          | 默认值 |
| --------------- | ------------- | ------ |
| NEXTAUTH_SECRET | NextAuth 密钥 | -      |
| NEXTAUTH_URL    | NextAuth URL  | http   |

---

## 性能监控集成

部署时可自动启用以下监控服务：

- **@vercel/analytics**: 流量和转化分析
- **@vercel/speed-insights**: 性能指标追踪
- **@sentry/nextjs**: 错误追踪和性能监控

所有监控服务均通过环境变量 `NEXT_PUBLIC_APP_ENV` 控制：

- `development`: 开发模式，启用详细日志
- `production`: 生产模式，上报真实数据
