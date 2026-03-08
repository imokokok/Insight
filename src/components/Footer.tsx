'use client';

import { useI18n } from '@/lib/i18n/context';

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <p className="text-gray-600 text-sm">
              {t('footer.copyright')}
            </p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">
              {t('footer.documentation')}
            </a>
            <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">
              {t('footer.github')}
            </a>
            <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">
              {t('footer.contact')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
