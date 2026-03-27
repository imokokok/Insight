# 部署指南

> Insight 项目部署文档

## 目录

- [环境要求](#环境要求)
- [Vercel 部署](#vercel-部署)
- [Docker 部署](#docker-部署)
- [环境变量](#环境变量)

## 环境要求

- Node.js 18.17.0+
- npm 9.0.0+
- PostgreSQL 14+ (如果使用 Supabase)

## Vercel 部署

### 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/insight)

### 手动部署

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel

# 4. 生产部署
vercel --prod
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
