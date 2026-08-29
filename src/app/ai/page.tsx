import { AiPageContent } from './AiPageContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insight AI — Oracle Safety for AI Agents',
  description:
    'Give your AI agents an oracle immune system. Pre-trade safety checks, always-on Oracle Watch, 34 MCP tools, and cross-oracle manipulation detection for Claude, Cursor, Windsurf, Eliza and any MCP-compatible client.',
  keywords: [
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
    title: 'Insight AI — Oracle Safety for AI Agents',
    description:
      'Pre-trade oracle safety checks + always-on Oracle Watch + 34 MCP tools. Let AI agents verify on-chain price integrity before executing trades.',
    type: 'website',
  },
};

export default function AiPage() {
  return <AiPageContent />;
}
