import { cn } from '@/lib/utils';

interface EvidenceProcessItem {
  label: string;
  detail: string;
}

interface EvidenceProcessRailProps {
  label: string;
  items: readonly EvidenceProcessItem[];
  activeIndex?: number;
  className?: string;
}

export function EvidenceProcessRail({
  label,
  items,
  activeIndex = items.length - 1,
  className,
}: EvidenceProcessRailProps) {
  const boundedActiveIndex = Math.min(Math.max(activeIndex, 0), Math.max(items.length - 1, 0));

  return (
    <section className={cn('evidence-process-rail', className)} aria-label={label}>
      <div className="evidence-process-meta">
        <span>{label}</span>
        <span>
          {String(boundedActiveIndex + 1).padStart(2, '0')} /{' '}
          {String(items.length).padStart(2, '0')}
        </span>
      </div>
      <ol>
        {items.map((item, itemIndex) => (
          <li
            key={item.label}
            className={cn(
              itemIndex < boundedActiveIndex && 'is-complete',
              itemIndex === boundedActiveIndex && 'is-active'
            )}
            aria-current={itemIndex === boundedActiveIndex ? 'step' : undefined}
          >
            <div className="evidence-process-index" aria-hidden="true">
              <span>{String(itemIndex + 1).padStart(2, '0')}</span>
              <i />
            </div>
            <div>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
