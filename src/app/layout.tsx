import './globals.css';

import { Suspense } from 'react';

import localFont from 'next/font/local';

import { AppInitializer } from '@/components/AppInitializer';
import { ClientUtilities } from '@/components/ClientUtilities';
import { ConditionalAnalytics } from '@/components/cookies/ConditionalAnalytics';
import { ErrorBoundary } from '@/components/error-boundary';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { NavigationProgress } from '@/components/navigation/NavigationProgress';
import { PublicChrome } from '@/components/PublicChrome';

import type { Metadata } from 'next';

const inter = localFont({
  src: './fonts/inter-latin-variable.woff2',
  variable: '--font-geist-sans',
  display: 'swap',
  weight: '100 900',
});

const jetbrainsMono = localFont({
  src: './fonts/jetbrains-mono-latin-variable.woff2',
  variable: '--font-geist-mono',
  display: 'swap',
  weight: '100 800',
});

const manrope = localFont({
  src: './fonts/manrope-latin-variable.woff2',
  variable: '--font-display',
  display: 'swap',
  weight: '200 800',
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
