import type { ReactNode } from 'react';

interface EditorialStatePageProps {
  index: string;
  eyebrow: string;
  code: string;
  title: string;
  description: string;
  icon: ReactNode;
  actions?: ReactNode;
  detail?: ReactNode;
  fullHeight?: boolean;
}

export function EditorialStatePage({
  index,
  eyebrow,
  code,
  title,
  description,
  icon,
  actions,
  detail,
  fullHeight = false,
}: EditorialStatePageProps) {
  return (
    <main
      className={`editorial-workspace flex items-center px-5 py-12 sm:px-8 lg:px-12 ${fullHeight ? 'min-h-screen' : 'min-h-[70vh]'}`}
    >
      <div className="editorial-frame mx-auto w-full max-w-[1440px] border-y border-slate-900/15 py-10 sm:py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.62fr_1.38fr] lg:gap-16">
          <div className="flex flex-col justify-between gap-10">
            <div>
              <p className="editorial-index">
                {index} — {eyebrow}
              </p>
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate-600">
                The interface has paused here so the next action remains explicit and recoverable.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center border border-blue-200 bg-blue-50 text-blue-700">
              {icon}
            </div>
          </div>

          <div>
            <p className="font-mono text-6xl font-semibold tracking-[-0.07em] text-blue-700 sm:text-7xl">
              {code}
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1] tracking-[-0.05em] text-slate-950 sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              {description}
            </p>
            {detail && <div className="mt-6 max-w-2xl">{detail}</div>}
            {actions && (
              <div className="mt-9 flex flex-col gap-3 border-t border-slate-900/15 pt-6 sm:flex-row">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
