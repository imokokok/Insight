# Insight pre-trade safety check via x402: pay $0.02 USDC on Base per check.
#
# Usage:
#   pip install "x402[httpx,evm]"
#   EVM_PRIVATE_KEY=0x... python pre-trade.py
#
# The wallet needs a small USDC balance on Base mainnet.
# Docs: https://www.oracleinsight.xyz/docs/x402

import asyncio
import json
import os

from eth_account import Account
from x402 import x402Client
from x402.http.clients import x402HttpxClient
from x402.mechanisms.evm import EthAccountSigner
from x402.mechanisms.evm.exact.register import register_exact_evm_client

URL = (
    "https://www.oracleinsight.xyz/api/v1/safety/pre-trade"
    "?asset=ETH&chainId=1&action=swap&tradeAmountUsd=1000"
)


async def main():
    account = Account.from_key(os.environ["EVM_PRIVATE_KEY"])
    print("payer:", account.address)

    client = x402Client()
    register_exact_evm_client(client, EthAccountSigner(account))

    async with x402HttpxClient(client) as http:
        response = await http.get(URL)
        await response.aread()
        print("HTTP", response.status_code)
        print(json.dumps(json.loads(response.text), indent=2))


asyncio.run(main())
