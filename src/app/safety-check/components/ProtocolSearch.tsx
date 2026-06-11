'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

import { Search, ChevronDown, Shield, X } from 'lucide-react';

import { PROTOCOL_REGISTRY, type ProtocolConfig } from '@/lib/protocols/protocolRegistry';
import { cn } from '@/lib/utils';

interface ProtocolSearchProps {
  selectedProtocol: ProtocolConfig | null;
  onSelect: (protocol: ProtocolConfig) => void;
  disabled?: boolean;
}

export function ProtocolSearch({ selectedProtocol, onSelect, disabled }: ProtocolSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return PROTOCOL_REGISTRY;
    return PROTOCOL_REGISTRY.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.chain.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (protocol: ProtocolConfig) => {
    onSelect(protocol);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={cn(
          'flex items-center gap-3 bg-white border rounded-lg px-3 py-2.5 shadow-sm transition-all',
          isOpen
            ? 'border-primary-400 ring-2 ring-primary-100'
            : 'border-gray-200 hover:border-gray-300',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {selectedProtocol && !isOpen ? (
          <div className="flex items-center justify-between flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-4 h-4 text-primary-600 flex-shrink-0" />
              <span className="font-medium text-gray-900 truncate text-sm">
                {selectedProtocol.name}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                {selectedProtocol.chain}
              </span>
            </div>
            <button
              onClick={handleClear}
              disabled={disabled}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              type="button"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="搜索协议（如 Aave、Compound）..."
              disabled={disabled}
              className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400 min-w-0"
            />
            <ChevronDown
              className={cn('w-4 h-4 text-gray-400 transition-transform', isOpen && 'rotate-180')}
            />
          </>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">未找到匹配的协议</div>
            ) : (
              filtered.map((protocol) => (
                <button
                  key={protocol.id}
                  onClick={() => handleSelect(protocol)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left',
                    selectedProtocol?.id === protocol.id && 'bg-primary-50'
                  )}
                  type="button"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{protocol.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full capitalize">
                        {protocol.chain}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{protocol.description}</p>
                  </div>
                  {protocol.tvlUsd && (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      ${(protocol.tvlUsd / 1e9).toFixed(1)}B TVL
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
