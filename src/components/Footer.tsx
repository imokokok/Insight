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
    <footer className="border-t border-slate-900/15 bg-[#f8f7f4] text-slate-700">
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="mb-10 flex items-center justify-between border-b border-slate-900/15 pb-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-700">
            Insight — Reference index
          </p>
          <p className="hidden text-xs text-slate-400 sm:block">Evidence before execution.</p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Image src="/logos/insight-fisheye.svg" alt="Insight Logo" width={30} height={23} />
              <span className="text-xl font-bold text-slate-950">Insight</span>
            </Link>
            <p className="mb-6 max-w-xs text-sm leading-relaxed text-slate-600">
              Oracle transparency and risk infrastructure for DeFi. 15-minute price verification,
              cross-oracle comparison, position safety checks, and programmatic data access across
              10+ providers and 40+ blockchain networks.
            </p>

            <div className="flex items-center space-x-4">
              {socialLinks.map((social) => {
                const isExternal =
                  social.href.startsWith('http') || social.href.startsWith('mailto:');
                const className =
                  'text-slate-400 transition-colors duration-200 hover:text-blue-700';
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
            <h3 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
              Platform
            </h3>
            <ul className="space-y-3">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-600 transition-colors duration-200 hover:text-blue-700"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
              Safety
            </h3>
            <ul className="space-y-3">
              {safetyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-600 transition-colors duration-200 hover:text-blue-700"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
              Resources
            </h3>
            <ul className="space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="flex items-center space-x-2 text-sm text-slate-600 transition-colors duration-200 hover:text-blue-700"
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

      <div className="border-t border-slate-900/15">
        <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="font-mono text-xs text-slate-500">© 2026 Insight. All rights reserved.</p>
            <div className="flex items-center space-x-6">
              <Link
                href="/privacy"
                className="text-sm text-slate-500 transition-colors duration-200 hover:text-blue-700"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-slate-500 transition-colors duration-200 hover:text-blue-700"
              >
                Terms of Service
              </Link>
              <Link
                href="/refund"
                className="text-sm text-slate-500 transition-colors duration-200 hover:text-blue-700"
              >
                Refund Policy
              </Link>
              <Link
                href="/contact"
                className="text-sm text-slate-500 transition-colors duration-200 hover:text-blue-700"
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
