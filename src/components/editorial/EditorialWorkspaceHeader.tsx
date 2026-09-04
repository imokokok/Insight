import type { ReactNode } from 'react';

interface EditorialWorkspaceHeaderProps {
  index: string;
  stage: string;
  eyebrow: string;
  title: string;
  description: string;
  evidence: readonly string[];
  action?: ReactNode;
}

export function EditorialWorkspaceHeader({
  index,
  stage,
  eyebrow,
  title,
  description,
  evidence,
  action,
}: EditorialWorkspaceHeaderProps) {
  return (
    <header className="border-b border-slate-900/15 pb-9 pt-4 sm:pb-12 sm:pt-8 lg:pb-14">
      <div className="grid gap-8 lg:grid-cols-[0.68fr_1.32fr] lg:gap-16">
        <div className="flex flex-col justify-between gap-8">
          <div>
            <p className="editorial-index">
              {index} — {stage}
            </p>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-600">{eyebrow}</p>
          </div>
          {action ? <div>{action}</div> : null}
        </div>

        <div>
          <h1 className="max-w-4xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-slate-950 sm:text-5xl lg:text-6xl xl:text-7xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {description}
          </p>
          <ul className="mt-9 grid border-y border-slate-900/15 sm:grid-cols-3 sm:divide-x sm:divide-slate-900/10">
            {evidence.map((item, itemIndex) => (
              <li key={item} className="flex items-center gap-3 px-0 py-3 sm:px-4 first:sm:pl-0">
                <span className="font-mono text-[10px] text-blue-700">
                  {String(itemIndex + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.09em] text-slate-600">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  );
}
