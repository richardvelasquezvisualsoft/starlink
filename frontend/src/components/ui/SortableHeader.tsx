import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface SortableHeaderProps {
  label: React.ReactNode;
  column: string;
  currentSortColumn: string | null;
  currentSortDirection: 'asc' | 'desc' | null;
  onSort: (column: string) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  column,
  currentSortColumn,
  currentSortDirection,
  onSort,
  className = '',
  align = 'left'
}) => {
  const isActive = currentSortColumn === column;
  
  const alignmentClass = 
    align === 'center' ? 'justify-center text-center' :
    align === 'right' ? 'justify-end text-right' : 'justify-start text-left';

  return (
    <th 
      className={`px-4 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider border-b border-[#222222] cursor-pointer hover:bg-white/5 transition-colors select-none group ${className}`}
      onClick={() => onSort(column)}
    >
      <div className={`flex items-center gap-1.5 ${alignmentClass}`}>
        <span>{label}</span>
        <span className="flex-shrink-0 text-[#94A3B8] flex items-center justify-center w-4 h-4">
          {isActive && currentSortDirection === 'asc' && <ChevronUp className="w-3.5 h-3.5 text-[#00A8E8]" />}
          {isActive && currentSortDirection === 'desc' && <ChevronDown className="w-3.5 h-3.5 text-[#00A8E8]" />}
          {(!isActive || !currentSortDirection) && <ChevronsUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />}
        </span>
      </div>
    </th>
  );
};
