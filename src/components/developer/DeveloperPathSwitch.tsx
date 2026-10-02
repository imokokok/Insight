import Link from 'next/link';

import { ArrowUpRight, Bot, Braces, ShieldCheck } from 'lucide-react';

type DeveloperPath = 'api' | 'ai' | 'sdk';

const paths = [
  {
    id: 'api',
    href: '/api',
    title: 'REST API',
    detail: 'Query evidence from your own stack',
    icon: Braces,
  },
  {
    id: 'ai',
    href: '/ai',
    title: 'AI / MCP',
    detail: 'Put risk tools inside agent workflows',
    icon: Bot,
  },
  {
    id: 'sdk',
    href: '/sdk',
    title: 'Guard SDK',
    detail: 'Gate execution and retain a receipt',
    icon: ShieldCheck,
  },
] as const;

export function DeveloperPathSwitch({ current }: { current: DeveloperPath }) {
  return (
    <nav className="developer-path-switch" aria-label="Integration paths">
      <div className="developer-path-heading">
        <span>Choose your integration path</span>
        <span>One evidence layer / three entry points</span>
      </div>
      <div className="developer-path-grid">
        {paths.map((path, index) => {
          const Icon = path.icon;
          const active = path.id === current;
          return (
            <Link
              key={path.id}
              href={path.href}
              aria-current={active ? 'page' : undefined}
              className={`developer-path-card ${active ? 'is-active' : ''}`}
            >
              <span className="developer-path-number">0{index + 1} / 03</span>
              <Icon className="developer-path-icon" aria-hidden="true" />
              <span className="developer-path-copy">
                <strong>{path.title}</strong>
                <small>{path.detail}</small>
              </span>
              <ArrowUpRight className="developer-path-arrow" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
