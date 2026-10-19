import { permanentRedirect } from 'next/navigation';

type LegacySearchParams = Record<string, string | string[] | undefined>;

export const metadata = {
  title: 'Oracle Evidence - Insight',
  description: 'The Price Query workspace is now part of Oracle Evidence.',
};

export default async function PriceQueryPage({
  searchParams,
}: {
  searchParams: Promise<LegacySearchParams>;
}) {
  const legacyParams = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(legacyParams)) {
    if (typeof value === 'string') params.set(key, value);
    else value?.forEach((item) => params.append(key, item));
  }
  params.set('stage', 'observe');

  permanentRedirect(`/price-insight?${params.toString()}`);
}
