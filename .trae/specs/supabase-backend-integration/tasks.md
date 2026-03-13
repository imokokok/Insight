# Tasks

- [x] Task 1: 创建 Supabase 数据库表结构
  - [x] SubTask 1.1: 创建 `users` 表扩展（用户偏好设置）
  - [x] SubTask 1.2: 创建 `price_records` 表（价格历史记录）
  - [x] SubTask 1.3: 创建 `user_snapshots` 表（用户快照）
  - [x] SubTask 1.4: 创建 `user_favorites` 表（用户收藏）
  - [x] SubTask 1.5: 创建 `price_alerts` 表（价格告警）
  - [x] SubTask 1.6: 创建 `alert_events` 表（告警事件记录）
  - [x] SubTask 1.7: 创建必要的索引和 RLS 策略
  - [x] SubTask 1.8: 生成 TypeScript 类型定义

- [x] Task 2: 实现用户认证系统
  - [x] SubTask 2.1: 创建 `src/lib/supabase/auth.ts` 认证工具函数
  - [x] SubTask 2.2: 创建 `src/contexts/AuthContext.tsx` 认证上下文
  - [x] SubTask 2.3: 创建登录/注册页面组件
  - [x] SubTask 2.4: 实现会话持久化和自动刷新
  - [x] SubTask 2.5: 添加受保护路由中间件

- [x] Task 3: 实现数据库查询层
  - [x] SubTask 3.1: 创建 `src/lib/supabase/queries.ts` 查询函数
  - [x] SubTask 3.2: 实现价格记录的 CRUD 操作
  - [x] SubTask 3.3: 实现快照的 CRUD 操作
  - [x] SubTask 3.4: 实现收藏的 CRUD 操作
  - [x] SubTask 3.5: 实现告警的 CRUD 操作

- [x] Task 4: 集成价格数据存储
  - [x] SubTask 4.1: 修改 Oracle 客户端，添加数据库写入逻辑
  - [x] SubTask 4.2: 实现价格数据的批量写入
  - [x] SubTask 4.3: 实现历史价格查询优先从数据库
  - [x] SubTask 4.4: 添加数据过期和清理逻辑

- [x] Task 5: 迁移快照功能到数据库
  - [x] SubTask 5.1: 修改 `src/lib/types/snapshot.ts` 使用数据库
  - [x] SubTask 5.2: 更新 `SnapshotManager` 组件
  - [x] SubTask 5.3: 实现 localStorage 数据迁移工具
  - [x] SubTask 5.4: 添加快照分享功能

- [x] Task 6: 实现用户收藏功能
  - [x] SubTask 6.1: 创建收藏管理组件
  - [x] SubTask 6.2: 在价格查询页面添加收藏按钮
  - [x] SubTask 6.3: 创建收藏列表页面
  - [x] SubTask 6.4: 实现快速访问收藏配置

- [x] Task 7: 实现价格告警系统
  - [x] SubTask 7.1: 创建告警配置组件
  - [x] SubTask 7.2: 实现告警条件检测逻辑
  - [x] SubTask 7.3: 创建告警通知组件
  - [x] SubTask 7.4: 实现告警历史查看

- [x] Task 8: 实现 Supabase Realtime 订阅
  - [x] SubTask 8.1: 创建 `src/lib/supabase/realtime.ts` 实时订阅工具
  - [x] SubTask 8.2: 实现价格更新实时推送
  - [x] SubTask 8.3: 实现告警触发实时通知
  - [x] SubTask 8.4: 添加连接状态管理和重连逻辑

- [x] Task 9: 更新 API 路由
  - [x] SubTask 9.1: 修改 `/api/oracles` 路由集成数据库
  - [x] SubTask 9.2: 创建 `/api/snapshots` 路由
  - [x] SubTask 9.3: 创建 `/api/favorites` 路由
  - [x] SubTask 9.4: 创建 `/api/alerts` 路由
  - [x] SubTask 9.5: 创建 `/api/auth` 路由

- [x] Task 10: 添加用户设置页面
  - [x] SubTask 10.1: 创建用户设置页面布局
  - [x] SubTask 10.2: 实现偏好设置存储
  - [x] SubTask 10.3: 实现通知偏好设置
  - [x] SubTask 10.4: 实现数据导出功能

# Task Dependencies
- [Task 2] depends on [Task 1] (认证需要用户表)
- [Task 3] depends on [Task 1] (查询需要表结构)
- [Task 4] depends on [Task 3] (数据存储需要查询层)
- [Task 5] depends on [Task 2, Task 3] (快照需要认证和查询)
- [Task 6] depends on [Task 2, Task 3] (收藏需要认证和查询)
- [Task 7] depends on [Task 2, Task 3] (告警需要认证和查询)
- [Task 8] depends on [Task 1] (实时订阅需要表结构)
- [Task 9] depends on [Task 3, Task 4] (API 需要查询层和数据层)
- [Task 10] depends on [Task 2] (设置需要认证)
