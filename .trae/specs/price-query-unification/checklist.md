# 喂价查询功能统一整合 - Verification Checklist

## 功能验证检查点

- [ ] Checkpoint 1: /price-query 页面可以正常访问，返回 200 状态码
- [ ] Checkpoint 2: 页面有清晰的标题和基础布局，风格与现有页面一致
- [ ] Checkpoint 3: 可以多选预言机提供商（Chainlink、Band Protocol、UMA、Pyth Network、API3）
- [ ] Checkpoint 4: 可以多选区块链（Ethereum、Arbitrum、Optimism、Polygon、Solana）
- [ ] Checkpoint 5: 可以选择交易对（BTC、ETH、SOL、USDC等）
- [ ] Checkpoint 6: 有查询/刷新按钮，点击可以触发数据获取
- [ ] Checkpoint 7: 实时价格表格正确显示所有匹配条件的查询结果
- [ ] Checkpoint 8: 表格包含预言机、链、价格、时间戳等必要信息
- [ ] Checkpoint 9: 历史价格趋势图表正确显示数据
- [ ] Checkpoint 10: 图表支持多条线同时显示（不同预言机/链组合）
- [ ] Checkpoint 11: CSV 格式数据可以成功导出并下载
- [ ] Checkpoint 12: JSON 格式数据可以成功导出并下载
- [ ] Checkpoint 13: 导出文件包含完整的元数据和查询结果
- [ ] Checkpoint 14: 页面有跳转到 /cross-oracle 的按钮
- [ ] Checkpoint 15: 页面有跳转到 /cross-chain 的按钮
- [ ] Checkpoint 16: 快速跳转按钮样式清晰可见，点击可以正常跳转
- [ ] Checkpoint 17: 导航栏中有 /price-query 页面的入口
- [ ] Checkpoint 18: 导航栏入口点击可以正常跳转到新页面
- [ ] Checkpoint 19: 英文翻译完整，页面在英文环境下显示正常
- [ ] Checkpoint 20: 中文翻译完整，页面在中文环境下显示正常
- [ ] Checkpoint 21: 页面在移动端（< 768px）显示效果良好
- [ ] Checkpoint 22: 页面在平板端（768px - 1024px）显示效果良好
- [ ] Checkpoint 23: 页面在桌面端（> 1024px）显示效果良好
- [ ] Checkpoint 24: /chainlink 页面功能和外观完全保持不变
- [ ] Checkpoint 25: /cross-chain 页面功能和外观完全保持不变
- [ ] Checkpoint 26: /cross-oracle 页面功能和外观完全保持不变
- [ ] Checkpoint 27: /api3、/band-protocol、/uma、/pyth-network 页面功能和外观完全保持不变
- [ ] Checkpoint 28: 首页（/）功能和外观完全保持不变
- [ ] Checkpoint 29: 所有现有导航链接都正常工作
- [ ] Checkpoint 30: 没有引入任何控制台错误或警告
