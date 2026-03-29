'use client';

import { ExternalLink } from 'lucide-react';

export interface BlockExplorerLinkProps {
  blockHeight: number | string;
  className?: string;
  showIcon?: boolean;
  explorerUrl?: string;
}

export function BlockExplorerLink({
  blockHeight,
  className = '',
  showIcon = true,
  explorerUrl = 'https://cosmoscan.io',
}: BlockExplorerLinkProps) {
  const blockHeightNum = typeof blockHeight === 'string' ? parseInt(blockHeight.replace(/,/g, '')) : blockHeight;
  const href = `${explorerUrl}/blocks/${blockHeightNum}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline transition-colors ${className}`}
    >
      <span>{typeof blockHeight === 'number' ? blockHeight.toLocaleString() : blockHeight}</span>
      {showIcon && <ExternalLink className="w-3 h-3" />}
    </a>
  );
}

export interface ExplorerLinkProps {
  href: string;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export function ExplorerLink({ href, label, icon, className = '' }: ExplorerLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-gray-700 hover:text-gray-900 transition-colors ${className}`}
    >
      {icon}
      <span>{label}</span>
      <ExternalLink className="w-3 h-3 text-gray-400" />
    </a>
  );
}

export default BlockExplorerLink;
