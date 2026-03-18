'use client';

import React, { createContext, useContext, useId } from 'react';

// ============================================
// AriaLabel Component
// ============================================

export interface AriaLabelProps {
  children: React.ReactNode;
  label: string;
  description?: string;
  errorMessage?: string;
  required?: boolean;
  disabled?: boolean;
  hiddenLabel?: boolean;
}

export function AriaLabel({
  children,
  label,
  description,
  errorMessage,
  required,
  disabled,
  hiddenLabel = false,
}: AriaLabelProps) {
  const labelId = useId();
  const descriptionId = useId();
  const errorId = useId();

  const ariaDescribedBy = [
    description && descriptionId,
    errorMessage && errorId,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className="aria-label-wrapper">
      <label
        id={labelId}
        className={hiddenLabel ? 'sr-only' : 'block text-sm font-medium text-gray-700 mb-1'}
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> ({'required'})</span>}
      </label>

      {description && (
        <div id={descriptionId} className="text-sm text-gray-500 mb-2">
          {description}
        </div>
      )}

      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{
            'aria-labelledby'?: string;
            'aria-describedby'?: string;
            'aria-invalid'?: boolean;
            'aria-errormessage'?: string;
            'aria-required'?: boolean;
            'aria-disabled'?: boolean;
          }>, {
            'aria-labelledby': labelId,
            'aria-describedby': ariaDescribedBy,
            'aria-invalid': errorMessage ? true : undefined,
            'aria-errormessage': errorMessage ? errorId : undefined,
            'aria-required': required,
            'aria-disabled': disabled,
          });
        }
        return child;
      })}

      {errorMessage && (
        <div id={errorId} className="text-sm text-red-600 mt-1" role="alert">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

// ============================================
// AriaDescribedBy Component
// ============================================

export function AriaDescribedBy({
  children,
  description,
}: {
  children: React.ReactNode;
  description: string;
}) {
  const descriptionId = useId();

  return (
    <>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{ 'aria-describedby'?: string }>, {
            'aria-describedby': descriptionId,
          });
        }
        return child;
      })}
      <span id={descriptionId} className="sr-only">
        {description}
      </span>
    </>
  );
}

// ============================================
// AriaLive Component
// ============================================

export interface AriaLiveProps {
  children: React.ReactNode;
  level?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  className?: string;
}

export function AriaLive({
  children,
  level = 'polite',
  atomic = false,
  relevant,
  className = '',
}: AriaLiveProps) {
  return (
    <div
      aria-live={level}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={className}
    >
      {children}
    </div>
  );
}

// ============================================
// AriaExpanded Component
// ============================================

export interface AriaExpandedProps {
  children: React.ReactElement;
  expanded: boolean;
  controlsId: string;
}

export function AriaExpanded({ children, expanded, controlsId }: AriaExpandedProps) {
  return React.cloneElement(children as React.ReactElement<{
    'aria-expanded'?: boolean;
    'aria-controls'?: string;
  }>, {
    'aria-expanded': expanded,
    'aria-controls': controlsId,
  });
}

// ============================================
// AriaPressed Component
// ============================================

export interface AriaPressedProps {
  children: React.ReactElement;
  pressed: boolean;
}

export function AriaPressed({ children, pressed }: AriaPressedProps) {
  return React.cloneElement(children as React.ReactElement<{ 'aria-pressed'?: boolean }>, {
    'aria-pressed': pressed,
  });
}

// ============================================
// AriaSelected Component
// ============================================

export interface AriaSelectedProps {
  children: React.ReactElement;
  selected: boolean;
}

export function AriaSelected({ children, selected }: AriaSelectedProps) {
  return React.cloneElement(children as React.ReactElement<{ 'aria-selected'?: boolean }>, {
    'aria-selected': selected,
  });
}

// ============================================
// AriaHidden Component
// ============================================

export interface AriaHiddenProps {
  children: React.ReactNode;
  hidden?: boolean;
  label?: string;
}

export function AriaHidden({ children, hidden = true, label }: AriaHiddenProps) {
  if (hidden) {
    return <span aria-hidden="true">{children}</span>;
  }

  return (
    <span role="img" aria-label={label}>
      {children}
    </span>
  );
}

// ============================================
// AriaModal Component
// ============================================

export interface AriaModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  className?: string;
}

export function AriaModal({
  children,
  isOpen,
  onClose,
  title,
  description,
  className = '',
}: AriaModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div className="relative bg-white p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-auto">
        <h2 id={titleId} className="text-xl font-bold mb-2">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="text-gray-600 mb-4">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

// ============================================
// AriaAlert Component
// ============================================

export interface AriaAlertProps {
  children: React.ReactNode;
  type?: 'alert' | 'status';
  className?: string;
}

export function AriaAlert({ children, type = 'alert', className = '' }: AriaAlertProps) {
  return (
    <div role={type} aria-live={type === 'alert' ? 'assertive' : 'polite'} className={className}>
      {children}
    </div>
  );
}

// ============================================
// AriaProgress Component
// ============================================

export interface AriaProgressProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function AriaProgress({
  value,
  max = 100,
  label,
  showValue = true,
  className = '',
}: AriaProgressProps) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showValue && (
            <span className="text-sm text-gray-500">{percentage}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="w-full bg-gray-200 h-2"
      >
        <div
          className="bg-blue-600 h-2 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================
// AriaTabs Component
// ============================================

interface AriaTabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AriaTabsContext = createContext<AriaTabsContextType | undefined>(undefined);

export function useAriaTabs() {
  const context = useContext(AriaTabsContext);
  if (!context) {
    throw new Error('useAriaTabs must be used within AriaTabsProvider');
  }
  return context;
}

export function AriaTabs({
  children,
  defaultTab,
}: {
  children: React.ReactNode;
  defaultTab: string;
}) {
  const [activeTab, setActiveTab] = React.useState(defaultTab);

  return (
    <AriaTabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </AriaTabsContext.Provider>
  );
}

export function AriaTabList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="tablist" className={className}>
      {children}
    </div>
  );
}

export function AriaTab({
  id,
  children,
  className = '',
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { activeTab, setActiveTab } = useAriaTabs();
  const isActive = activeTab === id;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`${id}-panel`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => setActiveTab(id)}
      className={`${className} ${isActive ? 'active' : ''}`}
    >
      {children}
    </button>
  );
}

export function AriaTabPanel({
  id,
  children,
  className = '',
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { activeTab } = useAriaTabs();
  const isActive = activeTab === id;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`${id}-panel`}
      aria-labelledby={id}
      className={className}
    >
      {children}
    </div>
  );
}

// ============================================
// AriaAccordion Component
// ============================================

export function AriaAccordion({
  children,
  allowMultiple = false,
}: {
  children: React.ReactNode;
  allowMultiple?: boolean;
}) {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <AccordionContext.Provider value={{ expandedItems, toggleItem }}>
      {children}
    </AccordionContext.Provider>
  );
}

interface AccordionContextType {
  expandedItems: Set<string>;
  toggleItem: (id: string) => void;
}

const AccordionContext = createContext<AccordionContextType | undefined>(undefined);

function useAccordion() {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('useAccordion must be used within AriaAccordion');
  }
  return context;
}

export function AriaAccordionItem({
  id,
  title,
  children,
  className = '',
}: {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const { expandedItems, toggleItem } = useAccordion();
  const isExpanded = expandedItems.has(id);

  return (
    <div className={className}>
      <button
        id={`${id}-header`}
        aria-expanded={isExpanded}
        aria-controls={`${id}-panel`}
        onClick={() => toggleItem(id)}
        className="w-full text-left"
      >
        {title}
      </button>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-header`}
        hidden={!isExpanded}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================
// AriaBreadcrumb Component
// ============================================

export function AriaBreadcrumb({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center space-x-2">{children}</ol>
    </nav>
  );
}

export function AriaBreadcrumbItem({
  children,
  href,
  isCurrent = false,
}: {
  children: React.ReactNode;
  href?: string;
  isCurrent?: boolean;
}) {
  return (
    <li className="flex items-center">
      {isCurrent ? (
        <span aria-current="page" className="text-gray-900 font-medium">
          {children}
        </span>
      ) : href ? (
        <a href={href} className="text-blue-600 hover:text-blue-800">
          {children}
        </a>
      ) : (
        <span>{children}</span>
      )}
    </li>
  );
}

// ============================================
// AriaMenu Component
// ============================================

export function AriaMenu({
  children,
  label,
  className = '',
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <ul role="menu" aria-label={label} className={className}>
      {children}
    </ul>
  );
}

export function AriaMenuItem({
  children,
  onClick,
  disabled = false,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <li role="none">
      <button
        role="menuitem"
        onClick={onClick}
        disabled={disabled}
        className={className}
      >
        {children}
      </button>
    </li>
  );
}

// ============================================
// AriaTooltip Component
// ============================================

export function AriaTooltip({
  children,
  content,
  position = 'top',
}: {
  children: React.ReactElement;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}) {
  const tooltipId = useId();

  return (
    <>
      {React.cloneElement(children as React.ReactElement<{ 'aria-describedby'?: string }>, {
        'aria-describedby': tooltipId,
      })}
      <span id={tooltipId} role="tooltip" className="sr-only">
        {content}
      </span>
    </>
  );
}
