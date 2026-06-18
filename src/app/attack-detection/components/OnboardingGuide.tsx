'use client';

import { useState } from 'react';

import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export function OnboardingGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">How to read this page</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 space-y-3 text-sm text-gray-600 leading-relaxed">
          <p>
            This tool monitors whether oracle price feeds are being manipulated or malfunctioning.
            DeFi protocols (lending, derivatives) rely on these prices — when they go wrong,
            positions get unfairly liquidated or funds get stolen.
          </p>

          <div>
            <p className="font-medium text-gray-700 mb-1">What the threat level means:</p>
            <ul className="space-y-1 ml-4">
              <li>
                <span className="inline-block w-16 font-medium text-emerald-700">LOW</span>— All
                clear. Oracles are operating normally.
              </li>
              <li>
                <span className="inline-block w-16 font-medium text-amber-700">MEDIUM</span>— Minor
                anomalies. Worth watching but not yet dangerous.
              </li>
              <li>
                <span className="inline-block w-16 font-medium text-orange-700">HIGH</span>—
                Significant manipulation signals. Check your DeFi positions.
              </li>
              <li>
                <span className="inline-block w-16 font-medium text-red-700">CRITICAL</span>—
                Multiple attack signals triggered. Act immediately.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-gray-700 mb-1">How to use this page:</p>
            <ol className="space-y-1 ml-4 list-decimal">
              <li>
                Check the <strong>Threat Level</strong> card at the top — if it&apos;s HIGH or
                CRITICAL, read the explanation below it for what triggered the alert.
              </li>
              <li>
                The <strong>Spot/TWAP Chart</strong> shows price deviation over time. Spikes above
                the dashed line are suspicious.
              </li>
              <li>
                The <strong>Attack Signature</strong> tab breaks down 8 detection dimensions. Each
                row explains what it measures and whether it&apos;s normal.
              </li>
              <li>
                The <strong>Alert History</strong> tab records past alerts for review.
              </li>
            </ol>
          </div>

          <div>
            <p className="font-medium text-gray-700 mb-1">What this tool can and cannot detect:</p>
            <ul className="space-y-1 ml-4">
              <li>
                <span className="text-emerald-600 font-medium">✓ Detects:</span> stale oracle
                prices, low-liquidity pool exploitation, liquidity drain before manipulation,
                cross-oracle divergence, pool state anomalies.
              </li>
              <li>
                <span className="text-red-600 font-medium">✗ Cannot detect:</span> single-block
                flash loan attacks that complete in one transaction and revert instantly. These
                require mempool monitoring, which is beyond polling-based detection.
              </li>
            </ul>
          </div>

          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            Tip: Select the <strong>TWAP</strong> oracle in the left panel to enable liquidity-based
            detection. Without TWAP, only price deviation and cross-oracle signals are active.
          </p>
        </div>
      )}
    </div>
  );
}
