import React, { useState, useRef, useEffect } from 'react';
import { Filter, Search, ChevronDown, Check, X } from 'lucide-react';

interface Account {
  id: number | string;
  nombre: string;
  codigo?: string;
  [key: string]: any;
}

interface AccountSearchSelectProps {
  accounts: Account[];
  selectedAccount: string;
  onSelectAccount: (accountId: string) => void;
  placeholder?: string;
  allLabel?: string;
}

export const AccountSearchSelect: React.FC<AccountSearchSelectProps> = ({
  accounts,
  selectedAccount,
  onSelectAccount,
  placeholder = "Buscar cuenta o cliente...",
  allLabel = "Todas las Cuentas"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedObj = accounts.find((a) => String(a.id) === String(selectedAccount));
  const displayText = selectedAccount && selectedObj ? selectedObj.nombre : allLabel;

  const filteredAccounts = accounts.filter((acc) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const nameMatch = acc.nombre?.toLowerCase().includes(term);
    const codeMatch = acc.codigo?.toLowerCase().includes(term);
    return nameMatch || codeMatch;
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

  const handleSelect = (id: string) => {
    onSelectAccount(id);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative inline-block text-left font-sans" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-st-surface hover:bg-white/5 border border-st-border px-3 py-2 rounded-lg text-sm text-white transition-all cursor-pointer shadow-sm focus:outline-none focus:border-st-accent max-w-[300px]"
      >
        <Filter className="w-4 h-4 text-st-muted flex-shrink-0" />
        <span className="truncate max-w-[200px] font-medium">{displayText}</span>
        <ChevronDown className={`w-4 h-4 text-st-muted flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-80 rounded-xl bg-st-surface border border-st-border shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          {/* Search Input Box */}
          <div className="p-2.5 border-b border-st-border bg-st-bg/80">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-st-muted absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-st-bg text-white text-sm pl-9 pr-8 py-2 rounded-md border border-st-border focus:outline-none focus:border-st-accent placeholder-st-muted"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 text-st-muted hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto py-1 custom-scrollbar">
            {/* 'Todas las Cuentas' option */}
            {!search && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between hover:bg-white/10 cursor-pointer transition-colors ${
                  !selectedAccount ? 'text-st-accent font-bold bg-st-accent/10' : 'text-white'
                }`}
              >
                <span className="truncate">{allLabel}</span>
                {!selectedAccount && <Check className="w-4 h-4 text-st-accent" />}
              </button>
            )}

            {filteredAccounts.length === 0 ? (
              <div className="px-3 py-3 text-sm text-st-muted text-center">
                No se encontraron cuentas
              </div>
            ) : (
              filteredAccounts.map((acc) => {
                const accIdStr = String(acc.id);
                const isSelected = selectedAccount === accIdStr;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleSelect(accIdStr)}
                    className={`w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between hover:bg-white/10 cursor-pointer transition-colors ${
                      isSelected ? 'text-st-accent font-bold bg-st-accent/10' : 'text-white'
                    }`}
                  >
                    <span className="truncate">{acc.nombre}</span>
                    {isSelected && <Check className="w-4 h-4 text-st-accent" />}
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
