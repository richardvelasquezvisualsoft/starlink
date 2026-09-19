import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  isDark?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  isDark
}) => {
  const location = useLocation();
  const dark = isDark !== undefined ? isDark : !location.pathname.startsWith('/cliente');
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Determine starting and ending item indexes
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers array with intelligent ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className={`px-5 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium select-none ${
      dark 
        ? 'border-st-border bg-st-surface text-st-muted' 
        : 'border-gray-200 bg-white text-gray-600 shadow-xs'
    }`}>
      {/* Left: Mostrando X-Y de Z */}
      <div className={dark ? 'text-st-muted font-medium' : 'text-gray-600 font-semibold'}>
        Mostrando <span className={`font-bold ${dark ? 'text-white' : 'text-gray-900 font-extrabold'}`}>{startItem}-{endItem}</span> de <span className={`font-bold ${dark ? 'text-white' : 'text-gray-900 font-extrabold'}`}>{totalItems}</span>
      </div>

      {/* Center: Controls (< Page Numbers >) */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`w-8 h-8 flex items-center justify-center rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer ${
            dark
              ? 'border-st-border bg-st-bg text-st-muted hover:text-white hover:bg-white/5'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Página Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((p, idx) =>
          typeof p === 'number' ? (
            <button
              key={idx}
              type="button"
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentPage === p
                  ? 'bg-st-accent text-white shadow-sm font-black'
                  : dark
                    ? 'bg-st-bg border border-st-border text-st-muted hover:text-white hover:bg-white/5'
                    : 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-100 font-semibold'
              }`}
            >
              {p}
            </button>
          ) : (
            <span key={idx} className={`w-6 text-center font-bold ${dark ? 'text-st-muted' : 'text-gray-400'}`}>
              ...
            </span>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`w-8 h-8 flex items-center justify-center rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer ${
            dark
              ? 'border-st-border bg-st-bg text-st-muted hover:text-white hover:bg-white/5'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Página Siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Items per page selector */}
      {onPageSizeChange && (
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:border-st-accent cursor-pointer ${
              dark
                ? 'bg-st-bg border border-st-border text-white'
                : 'bg-white border border-gray-300 text-gray-900 shadow-xs'
            }`}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt} className={dark ? 'bg-st-surface text-white' : 'bg-white text-black font-semibold'}>
                {opt} por página
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default Pagination;
