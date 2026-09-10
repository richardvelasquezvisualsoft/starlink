import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
  badge?: string;
  data?: any;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string | number | null | undefined;
  onChange: (value: any, option?: SelectOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Seleccionar opci\u00f3n...",
  searchPlaceholder = "Escribir para buscar...",
  emptyText = "No se encontraron resultados",
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(
    (opt) => String(opt.value) === String(value)
  );

  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const labelMatch = opt.label?.toLowerCase().includes(term);
    const sublabelMatch = opt.sublabel?.toLowerCase().includes(term);
    const badgeMatch = opt.badge?.toLowerCase().includes(term);
    return labelMatch || sublabelMatch || badgeMatch;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (opt: SelectOption) => {
    onChange(opt.value, opt);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className={`relative font-sans text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 bg-st-surface border rounded-xl text-sm transition-all cursor-pointer shadow-sm focus:outline-none ${
          isOpen
            ? 'border-brand-primary ring-1 ring-brand-primary/30'
            : 'border-st-border hover:border-brand-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              <span className="text-st-primary font-medium truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-st-muted text-xs truncate">({selectedOption.sublabel})</span>
              )}
            </div>
          ) : (
            <span className="text-st-muted truncate">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-st-muted flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-brand-primary' : ''
          }`}
        />
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 w-full rounded-xl bg-st-surface border border-st-border shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Search Input Sticky Header */}
          <div className="p-2.5 border-b border-st-border bg-st-subtle sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-brand-primary absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-st-surface text-st-primary text-sm pl-9 pr-8 py-2 rounded-lg border border-st-border focus:outline-none focus:border-brand-primary placeholder-st-muted"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 text-st-muted hover:text-st-primary cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options Dropdown List */}
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-4 text-xs text-st-muted text-center italic">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(value) === String(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-st-accent/15 cursor-pointer transition-colors ${
                      isSelected ? 'text-st-accent font-bold bg-st-accent/10 border-l-2 border-st-accent' : 'text-white'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[11px] text-st-muted truncate">{opt.sublabel}</span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-st-accent shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
