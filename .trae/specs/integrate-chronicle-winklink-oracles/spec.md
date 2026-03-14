# Chronicle Labs 和 WINkLink 预言机完整集成 Spec

## Why
当前系统已支持 Chainlink、Band Protocol、UMA、Pyth、API3、RedStone、DIA 和 Tellar 等预言机。为了提供更全面的预言机数据覆盖，需要完整集成 Chronicle Labs 和 WINkLink 两个主流预言机服务，包括：
1. 后端预言机客户端实现
2. 前端专属页面展示
3. 专属特性面板组件

Chronicle Labs 是 MakerDAO 的原生预言机解决方案，以其高安全性和去中心化特性著称。WINkLink 是 TRON 生态系统的官方预言机，为 TRON 网络提供可靠的链下数据。

## What Changes

### 后端变更
- **新增 Chronicle Labs 预言机客户端** (`src/lib/oracles/chronicle.ts`)
- **新增 WINkLink 预言