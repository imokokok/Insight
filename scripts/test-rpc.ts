/**
 * RPC 端点健康检查脚本
 */

async function testRPCEndpoint(url: string, name: string): Promise<void> {
  console.log(`\n测试 ${name}...`);
  console.log(`URL: ${url}`);

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: [],
      }),
      // 5秒超时
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      console.log(`  ❌ HTTP 错误: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();

    if (data.error) {
      console.log(`  ❌ RPC 错误: ${data.error.message} (code: ${data.error.code})`);
      return;
    }

    if (data.result) {
      const blockNumber = parseInt(data.result, 16);
      console.log(`  ✅ 成功! 当前区块: ${blockNumber}, 延迟: ${latency}ms`);
    } else {
      console.log(`  ⚠️ 没有返回结果`);
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    console.log(
      `  ❌ 请求失败 (${latency}ms): ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function main() {
  console.log('=== RPC 端点健康检查 ===\n');

  const endpoints = [
    { url: 'https://eth-mainnet.g.alchemy.com/v2/8Ju5GRJhZ2OSXby33tDIW', name: 'Alchemy Ethereum' },
    { url: 'https://ethereum-rpc.publicnode.com', name: 'PublicNode' },
    { url: 'https://rpc.mevblocker.io', name: 'MEV Blocker' },
    { url: 'https://eth.drpc.org', name: 'dRPC' },
    { url: 'https://eth.llamarpc.com', name: 'LlamaRPC' },
  ];

  for (const endpoint of endpoints) {
    await testRPCEndpoint(endpoint.url, endpoint.name);
  }

  console.log('\n=== 检查完成 ===');
}

main().catch(console.error);
