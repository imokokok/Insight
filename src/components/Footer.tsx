'use client';

import Image from 'next/image';
import Link from 'next/link';

import { useTranslations } from '@/i18n';

import {
  TwitterIcon,
  GitHubIcon,
  DiscordIcon,
  TelegramIcon,
  DocumentationIcon,
  ApiIcon,
} from './icons/SocialIcons';

export default function Footer() {
  const t = useTranslations();

  const platformLinks = [
    { label: t('navbar.home'), href: '/' },
    { label: t('navbar.priceQuery'), href: '/price-query' },
    { label: t('navbar.crossOracle'), href: '/cross-oracle' },
    { label: t('navbar.crossChain'), href: '/cross-chain' },
  ];

  const resourceLinks = [
    { label: t('footer.documentation'), href: '/docs', icon: DocumentationIcon },
    { label: t('footer.github'), href: 'https://github.com', icon: GitHubIcon },
    { label: t('footer.api'), href: '/api', icon: ApiIcon },
  ];

  const socialLinks = [
    { label: 'Twitter', href: 'https://twitter.com', icon: TwitterIcon },
    { label: 'GitHub', href: 'https://github.com', icon: GitHubIcon },
    { label: 'Discord', href: 'https://discord.com', icon: DiscordIcon },
    { label: 'Telegram', href: 'https://telegram.org', icon: TelegramIcon },
  ];

  return (
    <footer className="bg-slate-900 text-slate-300">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Image src="/logos/owl-logo-white.svg" alt="Insight Logo" width={32} height={28} />
              <span className="text-white font-bold text-xl">Insight</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs">
              {t('footer.description')}
            </p>

            {/* Social Links */}
            <div className="flex items-center space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors duration-200"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div className="lg:col-span-2">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
              {t('footer.links.platform')}
            </h3>
            <ul className="space-y-3">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-slate-400 hover:text-white text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div className="lg:col-span-3">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
              {t('footer.links.resources')}
            </h3>
            <ul className="space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="text-slate-400 hover:text-white text-sm transition-colors duration-200 flex items-center space-x-2"
                  >
                    <link.icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-slate-500 text-sm">{t('footer.copyright')}</p>
            <div className="flex items-center space-x-6">
              <Link
                href="/privacy"
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors duration-200"
              >
                {t('footer.privacy')}
              </Link>
              <Link
                href="/terms"
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors duration-200"
              >
                {t('footer.terms')}
              </Link>
              <Link
                href="/contact"
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors duration-200"
              >
                {t('footer.contact')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
