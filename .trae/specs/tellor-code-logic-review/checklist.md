# Tellor预言机页面代码逻辑审查检查清单

## 严重问题修复检查

- [x] ABI编码使用 ethers.js 或 viem 正确实现
- [x] 函数选择器计算正确（keccak256 前4字节）
- [x] 参数编码符合 Ethereum ABI 规范
- [x] 移除所有自定义哈希函数
- [x] 移除虚假的验证数据（随机 txHash/blockHeight）
- [x] 数据来源清晰标注（on-chain/cache/mock）

## 类型定义检查

- [x] ReporterData 接口只定义一次
- [x] 所有类型定义与实际数据结构一致
- [x] 无 TypeScript 编译错误（Tellor相关）
- [ ] 无 any 类型滥用

## 数据层检查

- [x] TellorClient 使用单例模式
- [x] 数据获取有明确的错误处理
- [x] 失败时有清晰的回退机制
- [x] 用户能知道数据来源

## 性能检查

- [x] 组件内无每次渲染重新生成的数据
- [x] 使用 useMemo 缓存计算结果
- [x] 并发查询有优先级控制
- [x] 非关键数据延迟加载

## 合约配置检查

- [x] Ethereum 主网合约地址正确
- [x] Arbitrum 合约地址已配置
- [x] Polygon 合约地址已配置
- [x] Optimism 合约地址已配置
- [x] Base 合约地址已配置
- [x] RPC 端点有备用配置

## 代码质量检查

- [x] 无控制台错误或警告（Tellor相关）
- [x] 无未使用的导入（已修复主要问题）
- [x] 无硬编码的敏感信息
- [x] 代码风格一致
