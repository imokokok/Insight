# Base agent registration

This is the operational record for Insight's Base identity and attribution.

| Item                       | Value                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Network                    | Base mainnet (`8453`)                                                                                                                                              |
| ERC-8004 Identity Registry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`                                                                                                                       |
| Agent ID                   | `1201765`                                                                                                                                                          |
| Agent URI                  | `https://www.oracleinsight.xyz/.well-known/agent8004.json`                                                                                                         |
| Registrar / owner          | `0x5FBbbCbF2Ade44F5c604E5E55f11945E1ADdD231`                                                                                                                       |
| Registration transaction   | [`0x27af6b012b233e5a03cc025e7257ef795aab4923bc60b4fe9c23f4d5bb2c4c8a`](https://basescan.org/tx/0x27af6b012b233e5a03cc025e7257ef795aab4923bc60b4fe9c23f4d5bb2c4c8a) |
| Base Builder Code          | `bc_mukkhhgf`                                                                                                                                                      |

The registration transaction included the Builder Code using the ERC-8021 data
suffix. The code is public attribution metadata; the signing key remains in
the secret store and is never committed.

Insight currently provides read-only Base decision-input checks and x402
service endpoints; it does not use a local Base transaction-sending path. If a
future Base path sends a transaction on Insight's behalf, it must attach the
Builder Code as an ERC-8021 suffix, for example with `Attribution.toDataSuffix`
from `ox/erc8021`, before signing. A transaction must not be sent without that
attribution.
