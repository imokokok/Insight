'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

import { Search, ChevronDown, Shield, X } from 'lucide-react';

import { chainNames } from '@/lib/constants';
import type { EnrichedProtocolConfig } from '@/lib/protocols/dynamicData';
import { cn } from '@/lib/utils';
import type { Blockchain } from '@/types/oracle';

interface ProtocolSearchProps {
  protocols: EnrichedProtocolConfig[];
  selectedProtocol: EnrichedProtocolConfig | null;
  onSelect: (protocol: EnrichedProtocolConfig) => void;
  disabled?: boolean;
}

export function ProtocolSearch({
  protocols,
  selectedProtocol,
  onSelect,
  disabled,
}: ProtocolSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return protocols;
    return protocols.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.chain.toLowerCase().includes(q)
    );
  }, [query, protocols]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (protocol: EnrichedProtocolConfig) => {
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
          'flex items-center gap-3 border border-slate-300 bg-white px-3 py-2.5 transition-colors',
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
              <span className="border-l-2 border-blue-500 bg-blue-50 px-2 py-0.5 text-xs text-slate-600">
                {chainNames[selectedProtocol.chain as Blockchain] ?? selectedProtocol.chain}
              </span>
            </div>
            <button
              onClick={handleClear}
              disabled={disabled}
              className="p-1 transition-colors hover:bg-slate-100"
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
              placeholder="Search protocol (e.g. Aave, Compound)..."
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
        <div className="absolute z-50 mt-1 w-full overflow-hidden border border-slate-300 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
          <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                No matching protocols found
              </div>
            ) : (
              filtered.map((protocol) => (
                <button
                  key={protocol.id}
                  onClick={() => handleSelect(protocol)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-blue-50/60',
                    selectedProtocol?.id === protocol.id && 'bg-primary-50'
                  )}
                  type="button"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center border border-blue-200 bg-primary-50">
                    <Shield className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{protocol.name}</span>
                      <span className="border-l-2 border-slate-300 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-500">
                        {chainNames[protocol.chain as Blockchain] ?? protocol.chain}
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
