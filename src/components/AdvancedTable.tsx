import { ReactNode } from 'react';

interface AdvancedTableProps {
  children: ReactNode;
  className?: string;
  striped?: boolean;
  bordered?: boolean;
}

export default function AdvancedTable({
  children,
  className = '',
  striped = true,
  bordered = false,
}: AdvancedTableProps) {
  const baseClasses = 'w-full text-left border-collapse';
  const stripedClasses = striped ? 'table-striped' : '';
  const borderedClasses = bordered ? 'border border-gray-200' : '';

  return (
    <div className={`overflow-x-auto rounded-2xl shadow-lg ${borderedClasses}`}>
      <table className={`${baseClasses} ${stripedClasses} ${className}`}>{children}</table>
    </div>
  );
}

interface AdvancedTableHeaderProps {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}

export function AdvancedTableHeader({
  children,
  className = '',
  sticky = false,
}: AdvancedTableHeaderProps) {
  const stickyClasses = sticky ? 'sticky top-0 z-10' : '';

  return (
    <thead className={`bg-gradient-to-r from-gray-50 to-gray-100 ${stickyClasses} ${className}`}>
      {children}
    </thead>
  );
}

interface AdvancedTableBodyProps {
  children: ReactNode;
  className?: string;
}

export function AdvancedTableBody({ children, className = '' }: AdvancedTableBodyProps) {
  return <tbody className={`bg-white ${className}`}>{children}</tbody>;
}

interface AdvancedTableRowProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export function AdvancedTableRow({
  children,
  className = '',
  hoverable = true,
  onClick,
}: AdvancedTableRowProps) {
  const hoverClasses = hoverable
    ? 'hover:bg-blue-50/50 transition-colors duration-200 cursor-default'
    : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';

  return (
    <tr
      className={`border-b border-gray-100 last:border-b-0 transition-all duration-300 ${hoverClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

interface AdvancedTableHeadProps {
  children: ReactNode;
  className?: string;
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export function AdvancedTableHead({
  children,
  className = '',
  sortable = false,
  sorted = null,
  onSort,
}: AdvancedTableHeadProps) {
  const sortableClasses = sortable ? 'cursor-pointer select-none' : '';

  return (
    <th
      className={`px-6 py-4 text-sm font-semibold text-gray-700 uppercase tracking-wider ${sortableClasses} ${className}`}
      onClick={sortable ? onSort : undefined}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="text-gray-400">
            {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕'}
          </span>
        )}
      </div>
    </th>
  );
}

interface AdvancedTableCellProps {
  children: ReactNode;
  className?: string;
}

export function AdvancedTableCell({ children, className = '' }: AdvancedTableCellProps) {
  return <td className={`px-6 py-4 text-sm text-gray-600 ${className}`}>{children}</td>;
}

interface AdvancedTableCaptionProps {
  children: ReactNode;
  className?: string;
}

export function AdvancedTableCaption({ children, className = '' }: AdvancedTableCaptionProps) {
  return (
    <caption className={`px-6 py-4 text-sm text-gray-500 bg-gray-50 ${className}`}>
      {children}
    </caption>
  );
}
