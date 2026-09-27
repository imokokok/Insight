import { AiPageContent } from './AiPageContent';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insight AI — Oracle Risk Intelligence for Agents',
  description:
    'Bring oracle transparency and risk intelligence to AI agents: cross-source comparison, pre-trade assessments, Oracle Watch, and signed evidence through 40 MCP tools.',
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
    title: 'Insight AI — Oracle Risk Intelligence for Agents',
    description:
      'Cross-oracle risk assessments, Oracle Watch, and 40 MCP tools. Give agents inspectable oracle evidence before they act.',
    type: 'website',
  },
};

export default function AiPage() {
  return <AiPageContent />;
}
