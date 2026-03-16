# Tasks

- [x] Task 1: 更新区块链枚举定义
  - [x] SubTask 1.1: 在 `src/types/oracle/enums.ts` 中添加 TRON、TON、NEAR、AURORA、CELO 枚举值
  - [x] SubTask 1.2: 确保枚举值命名符合现有规范（小写连字符格式）

- [x] Task 2: 更新区块链名称映射
  - [x] SubTask 2.1: 在 `src/lib/constants/index.ts` 的 chainNames 中添加新区块链名称
  - [x] SubTask 2.2: 确保名称显示友好（如 "TRON"、"TON"、"Near"）

- [x] Task 3: 更新区块链颜色配置
  - [x] SubTask 3.1: 在 `src/lib/config/colors.ts` 的 chainColors 中添加新区块链品牌颜色
  - [x] SubTask 3.2: 在 `src/lib/constants/index.ts` 的 chainColors 映射中添加对应颜色引用

- [x] Task 4: 扩展 Chainlink 链支持
  - [x] SubTask 4.1: 在 `src/lib/oracles/chainlink.ts` 的 supportedChains 中添加 Avalanche、BNB_CHAIN、BASE、SOLANA

- [x] Task 5: 扩展 Pyth 链支持
  - [x] SubTask 5.1: 在 `src/lib/oracles/pythNetwork.ts` 的 supportedChains 中添加 Avalanche、BNB_CHAIN、APTOS、SUI

- [x] Task 6: 扩展 API3 链支持
  - [x] SubTask 6.1: 在 `src/lib/oracles/api3.ts` 的 supportedChains 中添加 Avalanche、BNB_CHAIN、BASE

- [x] Task 7: 扩展 Band Protocol 链支持
  - [x] SubTask 7.1: 在 `src/lib/oracles/bandProtocol.ts` 的 supportedChains 中添加 Avalanche、BNB_CHAIN、COSMOS、OSMOSIS、JUNO

- [x] Task 8: 扩展 UMA 链支持
  - [x] SubTask 8.1: 在 `src/lib/oracles/uma/client.ts` 的 supportedChains 中添加 Arbitrum、Optimism、BASE

- [x] Task 9: 扩展 Chronicle 链支持
  - [x] SubTask 9.1: 在 `src/lib/oracles/chronicle.ts` 的 supportedChains 中添加 Avalanche

- [x] Task 10: 更新 WINkLink 链支持
  - [x] SubTask 10.1: 在 `src/lib/oracles/winklink.ts` 的 supportedChains 中将 BNB_CHAIN 改为 TRON，保留 BNB_CHAIN

- [x] Task 11: 更新国际化文件
  - [x] SubTask 11.1: 链名称通过 chainNames 常量直接定义，无需额外国际化

- [x] Task 12: 验证和测试
  - [x] SubTask 12.1: 运行 TypeScript 类型检查确保无类型错误
  - [x] SubTask 12.2: 验证所有预言机客户端的 supportedChains 配置正确

# Task Dependencies
- Task 1 必须在 Task 2、3 之前完成（枚举定义是基础）
- Task 2、3 可以并行执行
- Task 4-10 可以并行执行（各预言机客户端独立）
- Task 11 可以与 Task 4-10 并行执行
- Task 12 必须在所有其他任务完成后执行
