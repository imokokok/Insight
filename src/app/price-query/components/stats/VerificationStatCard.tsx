import { ExternalLink, ShieldCheck, Globe } from 'lucide-react';

import { StatCard } from '@/components/ui/StatCard';
import type { OnChainVerification } from '@/types/oracle/price';

interface VerificationStatCardProps {
  verification?: OnChainVerification;
}

export function VerificationStatCard({ verification }: VerificationStatCardProps) {
  if (!verification) {
    return (
      <StatCard
        icon={ShieldCheck}
        iconColor="text-slate-400"
        title="Verification"
        value="N/A"
        description="On-chain verification not available for this data source"
      />
    );
  }

  const isOnChain = verification.type !== 'api';
  const shortAddress =
    verification.contractAddress.length > 16
      ? `${verification.contractAddress.slice(0, 8)}...${verification.contractAddress.slice(-6)}`
      : verification.contractAddress;

  if (isOnChain) {
    return (
      <StatCard
        icon={ShieldCheck}
        iconColor="text-green-500"
        title="On-Chain Verified"
        value={
          verification.explorerUrl ? (
            <a
              href={verification.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 hover:underline"
            >
              {shortAddress}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            shortAddress
          )
        }
        description={`Method: ${verification.method}${verification.chainId > 0 ? ` | Chain: ${verification.chainId}` : ''}`}
      />
    );
  }

  return (
    <StatCard
      icon={Globe}
      iconColor="text-blue-500"
      title="API Verified"
      value={
        verification.explorerUrl ? (
          <a
            href={verification.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
          >
            {verification.contractAddress}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          verification.contractAddress
        )
      }
      description={`Method: ${verification.method}`}
    />
  );
}
