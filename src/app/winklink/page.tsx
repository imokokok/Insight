import { Metadata } from 'next';
import { WINkLinkPageContent } from './WINkLinkPageContent';

export const metadata: Metadata = {
  title: 'WINkLink - TRON Ecosystem Oracle',
  description:
    'WINkLink is the official oracle for the TRON ecosystem, providing reliable off-chain data for gaming, DeFi, and entertainment applications.',
};

export default function WINkLinkPage() {
  return <WINkLinkPageContent />;
}
