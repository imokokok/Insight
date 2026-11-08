import { AiPageContent } from './AiPageContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insight AI — Decision-Input Integrity for Agents',
  description:
    'Give AI agents decision-input integrity onchain: cross-source comparison, execution preflights, Oracle Watch, and signed evidence through four MCP product tools (trade_guard, trade_proof, oracle_watch_window, position_lifecycle). Oracle risk is the first assessment domain.',
  keywords: [
    'decision-input integrity',
    'AI agent safety',
    'AI agent oracle',
    'AI crypto',
    'MCP server',
    'Model Context Protocol',
    'oracle manipulation detection',
    'pre-trade safety check',
    'oracle watch',
    'DeFi AI agent',
    'Cursor MCP',
    'Claude Desktop MCP',
    'Eliza oracle',
  ],
  openGraph: {
    title: 'Insight AI — Decision-Input Integrity for Agents',
    description:
      'Execution preflights, Oracle Watch, and four MCP product tools. Give agents inspectable evidence before they act.',
    type: 'website',
  },
};

export default function AiPage() {
  return <AiPageContent />;
}
