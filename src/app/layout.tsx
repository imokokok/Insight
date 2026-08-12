import './globals.css';

import { Inter, JetBrains_Mono } from 'next/font/google';
import { cookies } from 'next/headers';

import { createServerClient } from '@supabase/ssr';

import { AppInitializer } from '@/components/AppInitializer';
import { ConditionalAnalytics } from '@/components/cookies/ConditionalAnalytics';
import { CookieConsent } from '@/components/cookies/CookieConsent';
import { ErrorBoundary } from '@/components/error-boundary';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { PublicChrome } from '@/components/PublicChrome';
import { ConnectionStatusIndicator } from '@/components/realtime/ConnectionStatus';
import { isOpsOwner } from '@/lib/ops/auth';
import { QueryProvider } from '@/providers/QueryProvider';

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

export const metadata: Metadata = {
  title: 'Insight — Oracle Transparency & Risk Infrastructure for DeFi',
  description:
    'Independent oracle transparency and risk infrastructure for DeFi. Cross-oracle price verification, deviation analytics, and liquidation risk signals across Chainlink, RedStone, API3 and more.',
  icons: {
    icon: '/logos/owl-logo-icon.svg',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Server-side: resolve whether the current session user is an ops owner so
  // the client Navbar can show/hide the internal "Console" tab. We only ever
  // pass the resulting boolean down — OPS_OWNER_USER_IDS itself stays server-only
  // and never reaches the client bundle.
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let userId: string | undefined;
  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only: we never write auth cookies from a Server Component.
        },
      },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id;
  }

  const showConsole = isOpsOwner(userId);

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <QueryProvider>
          <ErrorBoundary>
            <AppInitializer>
              <PublicChrome>
                <Navbar isOpsOwner={showConsole} />
              </PublicChrome>
              <main className="flex-1" style={{ backgroundColor: 'var(--background)' }}>
                {children}
              </main>
              <PublicChrome>
                <Footer />
                <ConnectionStatusIndicator
                  showLabel={false}
                  showReconnectButton={true}
                  className="fixed bottom-4 right-4 z-40"
                />
                <FeedbackButton />
                <CookieConsent />
              </PublicChrome>
            </AppInitializer>
          </ErrorBoundary>
        </QueryProvider>
        <ConditionalAnalytics />
      </body>
    </html>
  );
}
