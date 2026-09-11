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
  const stageKey = stage.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <header
      className="editorial-header relative overflow-hidden border-b border-slate-900/15 pb-6 pt-3 sm:pb-8 sm:pt-5 lg:pb-9"
      data-stage={stageKey}
    >
      <div className="editorial-header-grid grid gap-4 sm:gap-6 lg:grid-cols-[0.68fr_1.32fr] lg:gap-12">
        <div className="editorial-header-aside flex flex-col justify-between gap-4">
          <div>
            <div className="editorial-chapter-mark" aria-label={`Chapter ${index}, ${stage}`}>
              <span>{index}</span>
              <i aria-hidden="true" />
              <strong>{stage}</strong>
            </div>
            <p className="editorial-header-note mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
              {eyebrow}
            </p>
          </div>

          <div className="editorial-signal-field" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <i />
            <b />
          </div>

          {action ? <div>{action}</div> : null}
        </div>

        <div className="editorial-header-main">
          <div className="editorial-calibration" aria-hidden="true">
            <span>Insight / Evidence system</span>
            <i />
            <span>Record {index}</span>
          </div>
          <h1 className="editorial-header-title font-display max-w-4xl text-3xl font-semibold leading-[0.96] tracking-[-0.055em] text-slate-950 sm:text-4xl lg:text-5xl xl:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">{description}</p>
          <ul className="editorial-evidence-list mt-6 grid grid-cols-3 divide-x divide-slate-900/10 border-y border-slate-900/15">
            {evidence.map((item, itemIndex) => (
              <li
                key={item}
                className="flex min-w-0 items-start gap-2 px-2 py-2.5 first:pl-0 sm:items-center sm:gap-3 sm:px-4 first:sm:pl-0"
              >
                <span className="font-mono text-[10px] text-blue-700">
                  {String(itemIndex + 1).padStart(2, '0')}
                </span>
                <span className="text-[9px] font-semibold uppercase leading-snug tracking-[0.06em] text-slate-600 sm:text-xs sm:tracking-[0.09em]">
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
