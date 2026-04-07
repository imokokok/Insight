/**
 * 测试Tellor Playground API
 */

async function testTellorPlaygroundAPI() {
  console.log('=== 测试Tellor Playground API ===\n');

  const queryId = '0xa6f013ee236804827b77696d350e9f0ac3e879328f2a3021d473a0b778ad78ac'; // BTC/USD

  try {
    console.log('尝试从Tellor Playground获取数据...');
    console.log(`Query ID: ${queryId}`);

    // 尝试Tellor Playground API
    const response = await fetch(`https://api.tellorscan.com/price/${queryId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    console.log(`HTTP状态: ${response.status}`);

    if (!response.ok) {
      console.log(`❌ HTTP错误: ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log('\n响应数据:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`❌ 请求失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testTellorScanAPI() {
  console.log('\n\n=== 测试Tellor Scan API ===\n');

  const queryId = '0xa6f013ee236804827b77696d350e9f0ac3e879328f2a3021d473a0b778ad78ac';

  try {
    // 尝试Tellor Scan API (GraphQL)
    const response = await fetch('https://api.thegraph.com/subgraphs/name/tellor-io/tellor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            oracleValue(
              id: "${queryId}"
            ) {
              id
              value
              timestamp
              reporter
            }
          }
        `,
      }),
    });

    console.log(`HTTP状态: ${response.status}`);

    if (!response.ok) {
      console.log(`❌ HTTP错误: ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log('\n响应数据:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`❌ 请求失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  await testTellorPlaygroundAPI();
  await testTellorScanAPI();
  console.log('\n=== 测试完成 ===');
}

main().catch(console.error);
