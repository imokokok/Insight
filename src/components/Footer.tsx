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

const PLATFORM_LINKS = [
  ['Home', '/'],
  ['Price Query', '/price-query'],
  ['Price Insight', '/price-insight'],
  ['Oracle Directory', '/reputation'],
  ['Daily Reports', '/reports'],
  ['API', '/api'],
  ['Pricing', '/pricing'],
  ['AI Agents', '/ai'],
  ['Guard SDK', '/sdk'],
] as const;

const SAFETY_LINKS = [
  ['Safety Check', '/safety-check'],
  ['Pre-Trade Safety Check', '/ai#safety-check'],
  ['Oracle Watch', '/ai#oracle-watch'],
  ['Stablecoin Depeg', '/stablecoin-depeg'],
  ['Wrapped Asset Peg', '/wrapped-assets'],
] as const;

const RESOURCE_LINKS = [
  ['Documentation', '/docs', DocumentationIcon],
  ['API Reference', '/docs/api', DocumentationIcon],
  ['AI / MCP Docs', '/ai', DocumentationIcon],
  ['Guard SDK Docs', '/docs/sdk', DocumentationIcon],
  ['GitHub', 'https://github.com/imokokok/Insight', GitHubIcon],
] as const;

const SOCIAL_LINKS = [
  ['Email', '/contact', EmailIcon],
  ['Twitter', 'https://x.com/imokokok27', TwitterIcon],
  ['Discord', 'https://discord.gg/YSNgebjBqh', DiscordIcon],
  ['Telegram', 'https://t.me/+6_HoDnRoDK0zNWI1', TelegramIcon],
] as const;

function FooterLinkGroup({
  index,
  title,
  links,
}: {
  index: string;
  title: string;
  links: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <nav className="evidence-footer-group" aria-label={title}>
      <p>
        <span>{index}</span> {title}
      </p>
      <ul>
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href}>{label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer() {
  return (
    <footer className="evidence-footer">
      <div className="evidence-footer-frame">
        <div className="evidence-footer-ruler" aria-hidden="true">
          <span>Insight / oracle evidence</span>
          <span>Reference archive</span>
          <span>2026</span>
        </div>

        <div className="evidence-footer-lead">
          <Link href="/" className="evidence-footer-brand" aria-label="Insight home">
            <Image
              src="/logos/insight-glacier-cut.svg"
              alt="Insight Logo"
              width={36}
              height={45}
              className="h-[45px] w-auto"
            />
            <span>Insight</span>
          </Link>
          <div>
            <p className="instrument-label">The record continues</p>
            <h2>Evidence before execution.</h2>
            <p>
              Oracle transparency and risk infrastructure for DeFi protocols, operators, developers,
              and autonomous agents.
            </p>
          </div>
        </div>

        <div className="evidence-footer-index">
          <FooterLinkGroup index="01" title="Platform" links={PLATFORM_LINKS} />
          <FooterLinkGroup index="02" title="Safety" links={SAFETY_LINKS} />

          <nav className="evidence-footer-group" aria-label="Resources">
            <p>
              <span>03</span> Resources
            </p>
            <ul>
              {RESOURCE_LINKS.map(([label, href, Icon]) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    <Icon aria-hidden="true" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="evidence-footer-social">
          <p>Signal channels</p>
          <div>
            {SOCIAL_LINKS.map(([label, href, Icon]) => {
              const isExternal = href.startsWith('http');
              const content = (
                <>
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </>
              );
              return isExternal ? (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                >
                  {content}
                </a>
              ) : (
                <Link key={label} href={href} aria-label={label}>
                  {content}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="evidence-footer-legal">
          <p>© 2026 Insight. All rights reserved.</p>
          <nav aria-label="Legal">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/refund">Refund Policy</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <p>Verify critical values on-chain before execution.</p>
        </div>
      </div>
    </footer>
  );
}
