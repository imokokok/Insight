import TelegramLinkContent from './TelegramLinkContent';

export const metadata = {
  title: 'Link Telegram - Insight',
  description: 'Connect a Telegram bot chat to your authenticated Insight account.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function TelegramLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ challenge?: string }>;
}) {
  const { challenge } = await searchParams;
  return <TelegramLinkContent challenge={challenge ?? ''} />;
}
