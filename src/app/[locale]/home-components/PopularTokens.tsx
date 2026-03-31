import { useTranslations } from '@/i18n';

interface PopularTokensProps {
  tokens: string[];
  onTokenClick: (token: string) => void;
}

export default function PopularTokens({ tokens, onTokenClick }: PopularTokensProps) {
  const t = useTranslations();

  return (
    <div className="max-w-xl mx-auto relative">
      <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2 scrollbar-hide px-4">
        <span className="text-xs text-gray-400 flex-shrink-0">{t('home.hero.popular')}:</span>
        {tokens.map((token) => (
          <button
            key={token}
            onClick={() => onTokenClick(token)}
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white/80 hover:bg-white border border-gray-200 hover:border-blue-300 rounded-full transition-all duration-200 hover:shadow-sm hover:text-blue-600"
          >
            {token}
          </button>
        ))}
      </div>
      <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none sm:hidden" />
    </div>
  );
}
