import type { Metadata } from 'next';

import '../globals.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import { AppInitializer } from '@/components/AppInitializer';
import { ErrorBoundary } from '@/components/ErrorBoundaries';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { ConnectionStatusIndicator } from '@/components/realtime/ConnectionStatus';
import { ToastProvider } from '@/components/ui';
import { PerformanceMetricsCollector } from '@/components/PerformanceMetricsCollector';
import { routing } from '@/i18n/routing';
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';

export const metadata: Metadata = {
  title: 'Insight',
  description: 'Professional oracle analytics platform',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// 排除需要动态渲染的路由
export const dynamicParams = true;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages({ locale });

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <ReactQueryProvider>
            <ToastProvider>
              <ErrorBoundary>
                <AppInitializer>
                  <PerformanceMetricsCollector />
                  <Navbar />
                  <main className="flex-1" style={{ backgroundColor: 'var(--background)' }}>
                    {children}
                  </main>
                  <Footer />
                  <ConnectionStatusIndicator
                    showLabel={false}
                    showReconnectButton={true}
                    className="fixed bottom-4 right-4 z-50"
                  />
                </AppInitializer>
              </ErrorBoundary>
            </ToastProvider>
          </ReactQueryProvider>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
