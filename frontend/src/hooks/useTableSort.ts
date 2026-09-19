import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

interface UseTableSortConfig<T> {
  initialSortColumn?: keyof T;
  initialSortDirection?: SortDirection;
}

export function useTableSort<T>(data: T[], config?: UseTableSortConfig<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(config?.initialSortColumn || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(config?.initialSortDirection || null);

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
      else setSortDirection('asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === bVal) return 0;
      
      const aIsString = typeof aVal === 'string';
      const bIsString = typeof bVal === 'string';

      let comparison = 0;
      if (aIsString && bIsString) {
        comparison = (aVal as string).localeCompare(bVal as string);
      } else {
        comparison = (aVal as any) > (bVal as any) ? 1 : -1;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  return { sortedData, sortColumn, sortDirection, handleSort };
}
