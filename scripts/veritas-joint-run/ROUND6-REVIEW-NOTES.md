# Round-6 package review notes

Independent local review of `insight-round6-verification-2026-09-09.zip` reproduced the VERITAS
round-6 verifier at 25 pass / 1 fail / 1 note, including all five public-chain checks. It also
reproduced the corrected round-4 verifier at 30 pass / 1 fail / 3 note. F15, F16 and N12 therefore
remain closed.

Two record-level discrepancies do not change those findings:

1. `round-4-samples-corrected/SHA256SUMS.txt` lists six files, but three are absent from that
   subfolder. The verifier skips missing files and prints "6 files checked" after hashing only the
   three present files. The directory is execution-standalone, but not complete against its own
   inner manifest. The outer VERITAS manifest correctly pins every file actually shipped.
2. The email and findings prose say the pool sample was 50 total / 13 WETH-to-USDC / 7 qualifying /
   165 seconds. The pinned `pool-sample.txt` says 50 / 14 / 8 / 144 seconds. Re-querying Ethereum
   blocks 25,936,096 through 25,936,191 reproduced 50 / 14 / 8 / 144. Under the same model this is
   about 52.1% completion and 1.92 expected attempts, rather than 50.3% / 1.99. Both support the
   same decision: retain 0.1 WETH and plan for two to three attempts.
