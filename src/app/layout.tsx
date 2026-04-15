import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insight',
  description: 'Professional oracle analytics platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
