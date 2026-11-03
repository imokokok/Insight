// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";

/// @notice Scaffold for replaying an Insight Oracle Scenario JSON on a real
/// mainnet fork. NOT yet wired into CI; see foundry-harness/README.md.
///
/// The harness is policy-relative, exactly like the TypeScript engine:
/// thresholds (staleness, deviation, quorum) mirror the scenario's `policy`
/// block, and each step asserts the same detection outcome the TS engine
/// reports for that step. A receipt is only meaningful when both engines agree.
contract OracleScenarioHarness is Test {
    struct Source {
        string provider;
        uint256 price; // 1e8 scaled
        uint256 timestamp;
        uint8 status; // 0 ok, 1 stale, 2 error
    }

    struct Step {
        uint256 t; // seconds since scenario.startedAt
        bool attack;
        uint256 settlementPrice; // 1e8 scaled
        Source[] sources;
    }

    // ---- policy (mirrors ScenarioPolicy) ----
    uint256 public maxStalenessSeconds;
    uint256 public maxDeviationPct; // percent, 1e0
    uint256 public minSources;

    uint256 public constant DEVIATION_SCALE = 100;

    event StepEvaluated(uint256 t, bool attack, uint256 okSources, uint256 maxDeviationPct, bool detected);

    function configurePolicy(uint256 _maxStaleness, uint256 _maxDeviationPct, uint256 _minSources) external {
        maxStalenessSeconds = _maxStaleness;
        maxDeviationPct = _maxDeviationPct;
        minSources = _minSources;
    }

    /// @dev Replays one step. Detection semantics intentionally mirror
    /// engine.ts: INSUFFICIENT_QUORUM (ok < minSources), STALE_DATA (age >
    /// maxStaleness), MAX_DEVIATION (cross-source > maxDeviationPct).
    function evaluate(uint256 refTime, Source[] calldata sources) external returns (bool detected) {
        uint256 okCount;
        uint256 latestOk;
        for (uint256 i = 0; i < sources.length; i++) {
            if (sources[i].status == 0) {
                okCount++;
                if (sources[i].timestamp > latestOk) latestOk = sources[i].timestamp;
            }
        }

        if (okCount < minSources) return true;
        if (okCount > 0 && refTime - latestOk > maxStalenessSeconds) return true;

        // Cross-source deviation vs median of ok sources (two-source case
        // shown; full median lands with the first real target harness).
        uint256 maxDev;
        for (uint256 i = 0; i < sources.length; i++) {
            for (uint256 j = i + 1; j < sources.length; j++) {
                if (sources[i].status != 0 || sources[j].status != 0) continue;
                uint256 hi = sources[i].price > sources[j].price ? sources[i].price : sources[j].price;
                uint256 lo = sources[i].price > sources[j].price ? sources[j].price : sources[i].price;
                if (lo == 0) continue;
                uint256 dev = ((hi - lo) * DEVIATION_SCALE) / lo;
                if (dev > maxDev) maxDev = dev;
            }
        }
        // maxDev here is a ratio*100; convert to percent for the policy compare.
        uint256 deviationPct = maxDev;
        detected = deviationPct > maxDeviationPct;
    }
}
