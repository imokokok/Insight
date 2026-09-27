import './globals.css';

import { Suspense } from 'react';

import { Inter, JetBrains_Mono, Manrope } from 'next/font/google';

import { AppInitializer } from '@/components/AppInitializer';
import { ClientUtilities } from '@/components/ClientUtilities';
import { ConditionalAnalytics } from '@/components/cookies/ConditionalAnalytics';
import { ErrorBoundary } from '@/components/error-boundary';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { NavigationProgress } from '@/components/navigation/NavigationProgress';
import { PublicChrome } from '@/components/PublicChrome';

import type { Metadata } from 'next';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.oracleinsight.xyz'),
  title: 'Insight — Oracle Transparency & Risk Intelligence for DeFi',
  description:
    'Oracle transparency and risk intelligence for DeFi. Cross-source price comparison, freshness, source independence, protocol risk analysis, and verifiable assessment evidence.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${manrope.variable}`}>
      <body className="antialiased min-h-screen flex flex-col">
        <ErrorBoundary>
          <AppInitializer>
            <PublicChrome>
              <Navbar />
            </PublicChrome>
            <Suspense fallback={null}>
              <NavigationProgress />
            </Suspense>
            <main className="flex-1" style={{ backgroundColor: 'var(--background)' }}>
              {children}
            </main>
            <PublicChrome>
              <Footer />
              <ClientUtilities />
            </PublicChrome>
          </AppInitializer>
        </ErrorBoundary>
        <ConditionalAnalytics />
      </body>
    </html>
  );
}
