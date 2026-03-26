'use client';

import { type ReactNode, useEffect, useCallback } from 'react';

import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function MobileSidebar({ isOpen, onClose, title, children, className }: MobileSidebarProps) {
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-opacity duration-300',
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
      aria-hidden={!isOpen}
    >
      <div
        className={cn(
          'absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      <div
        className={cn(
          'absolute top-0 left-0 h-full w-[280px] max-w-[85vw] bg-white shadow-xl',
          'transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-sidebar-title"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <h2 id="mobile-sidebar-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-md text-gray-500 hover:text-gray-700',
              'hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2'
            )}
            aria-label="关闭侧边栏"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-65px)]">{children}</div>
      </div>
    </div>
  );
}

export default MobileSidebar;
