import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Market Overview - Insight',
  description: 'Comprehensive oracle market analysis and overview',
};

export default function MarketOverviewLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
