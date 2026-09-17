import { permanentRedirect } from 'next/navigation';

type LegacySearchParams = Record<string, string | string[] | undefined>;

export default async function WrappedAssetsPage({
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
  params.set('category', 'wrapped');

  permanentRedirect(`/peg-risk?${params.toString()}`);
}
