'use client';

import Image from 'next/image';
import Link from 'next/link';

import {
  TwitterIcon,
  GitHubIcon,
  DiscordIcon,
  TelegramIcon,
  DocumentationIcon,
  EmailIcon,
} from './icons/SocialIcons';

export default function Footer() {
  const platformLinks = [
    { label: 'Home', href: '/' },
    { label: 'Price Query', href: '/price-query' },
    { label: 'Price Insight', href: '/price-insight' },
    { label: 'Oracle Directory', href: '/reputation' },
    { label: 'Daily Reports', href: '/reports' },
    { label: 'API', href: '/api' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'AI Agents', href: '/ai' },
  ];

  const safetyLinks = [
    { label: 'Safety Check', href: '/safety-check' },
    { label: 'Pre-Trade Safety Check', href: '/ai#safety-check' },
    { label: 'Oracle Watch', href: '/ai#oracle-watch' },
    { label: 'Stablecoin Depeg', href: '/stablecoin-depeg' },
    { label: 'Wrapped Asset Peg', href: '/wrapped-assets' },
  ];

  const resourceLinks = [
    { label: 'Documentation', href: '/docs', icon: DocumentationIcon },
    { label: 'API Reference', href: '/docs/api', icon: DocumentationIcon },
    { label: 'AI / MCP Docs', href: '/ai', icon: DocumentationIcon },
    { label: 'GitHub', href: 'https://github.com/imokokok/Insight', icon: GitHubIcon },
  ];

  const socialLinks = [
    { label: 'Email', href: '/contact', icon: EmailIcon },
    { label: 'Twitter', href: 'https://x.com/imokokok27', icon: TwitterIcon },
    { label: 'Discord', href: 'https://discord.gg/YSNgebjBqh', icon: DiscordIcon },
    { label: 'Telegram', href: 'https://t.me/+6_HoDnRoDK0zNWI1', icon: TelegramIcon },
  ];

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Image src="/logos/owl-logo-white.svg" alt="Insight Logo" width={32} height={28} />
              <span className="text-white font-bold text-xl">Insight</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs">
              Oracle transparency and risk infrastructure for DeFi. 15-minute price verification,
              cross-oracle comparison, position safety checks, and programmatic data access across
              10+ providers and 40+ blockchain networks.
            </p>

            <div className="flex items-center space-x-4">
              {socialLinks.map((social) => {
                const isExternal =
                  social.href.startsWith('http') || social.href.startsWith('mailto:');
                const className = 'text-slate-400 hover:text-white transition-colors duration-200';
                const icon = <social.icon className="w-5 h-5" />;

                return isExternal ? (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                    aria-label={social.label}
                  >
                    {icon}
                  </a>
                ) : (
                  <Link
                    key={social.label}
                    href={social.href}
                    className={className}
                    aria-label={social.label}
                  >
                    {icon}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
              Platform
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

          <div className="lg:col-span-2">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
              Safety
            </h3>
            <ul className="space-y-3">
              {safetyLinks.map((link) => (
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

          <div className="lg:col-span-2">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
              Resources
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

      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-slate-500 text-sm">© 2026 Insight. All rights reserved.</p>
            <div className="flex items-center space-x-6">
              <Link
                href="/privacy"
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors duration-200"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors duration-200"
              >
                Terms of Service
              </Link>
              <Link
                href="/refund"
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors duration-200"
              >
                Refund Policy
              </Link>
              <Link
                href="/contact"
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors duration-200"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
